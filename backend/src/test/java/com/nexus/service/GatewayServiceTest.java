package com.nexus.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.nexus.config.ConfigTablas;
import com.nexus.dto.GatewayRequest;
import com.nexus.dto.GatewayRequest.DatosGateway;
import com.nexus.model.Proyecto;
import com.nexus.repository.ProyectoRepository;
import com.nexus.service.GatewayService.ResultadoGateway;

@ExtendWith(MockitoExtension.class)
class GatewayServiceTest {

    @Mock
    private ProyectoRepository proyectoRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private final ConfigTablas configTablas = new ConfigTablas();
    private GatewayService gatewayService;
    private Proyecto proyecto;

    @BeforeEach
    void setUp() {
        gatewayService = new GatewayService(proyectoRepository, configTablas, jdbcTemplate);

        proyecto = new Proyecto();
        ReflectionTestUtils.setField(proyecto, "id", 1);
        ReflectionTestUtils.setField(proyecto, "nombre", "GIE");
        ReflectionTestUtils.setField(proyecto, "slug", "gie");
        ReflectionTestUtils.setField(proyecto, "apiKey", "nx_test_key_12345");
        ReflectionTestUtils.setField(proyecto, "permisos", "[\"alumnos\", \"cursos\"]");
        ReflectionTestUtils.setField(proyecto, "activo", true);
        ReflectionTestUtils.setField(proyecto, "ipPermitida", null);
    }

    @Test
    void tablaNoPermitidaRetorna400() {
        GatewayRequest req = new GatewayRequest("tabla_trucha", null);
        ResultadoGateway res = gatewayService.procesar("nx_key", "127.0.0.1", req, "{}");

        assertEquals(400, res.status());
        assertEquals("Tabla no permitida", res.body().get("error"));
        verify(jdbcTemplate).update(contains("INSERT INTO public.api_logs"), any(), any(), any(), eq(false), any(), any(), any(), eq(400));
    }

    @Test
    void faltaApiKeyRetorna401() {
        GatewayRequest req = new GatewayRequest("alumnos", null);
        ResultadoGateway res = gatewayService.procesar(null, "127.0.0.1", req, "{}");

        assertEquals(401, res.status());
        assertEquals("Falta header x-api-key", res.body().get("error"));
    }

    @Test
    void apiKeyInvalidaOInactivaRetorna401() {
        when(proyectoRepository.findByApiKey("nx_inexistente")).thenReturn(Optional.empty());

        GatewayRequest req = new GatewayRequest("alumnos", null);
        ResultadoGateway res = gatewayService.procesar("nx_inexistente", "127.0.0.1", req, "{}");

        assertEquals(401, res.status());
        assertEquals("API key inválida o inactiva", res.body().get("error"));
    }

    @Test
    void ipNoPermitidaRetorna403() {
        ReflectionTestUtils.setField(proyecto, "ipPermitida", "192.168.1.100");
        when(proyectoRepository.findByApiKey("nx_test_key_12345")).thenReturn(Optional.of(proyecto));

        GatewayRequest req = new GatewayRequest("alumnos", null);
        ResultadoGateway res = gatewayService.procesar("nx_test_key_12345", "10.0.0.5", req, "{}");

        assertEquals(403, res.status());
        assertEquals("IP no permitida", res.body().get("error"));
    }

    @Test
    void tablaSinPermisoEnJsonbRetorna403() {
        when(proyectoRepository.findByApiKey("nx_test_key_12345")).thenReturn(Optional.of(proyecto));

        // personal está en whitelist de gateway pero NO en los permisos de este proyecto
        GatewayRequest req = new GatewayRequest("personal", null);
        ResultadoGateway res = gatewayService.procesar("nx_test_key_12345", "127.0.0.1", req, "{}");

        assertEquals(403, res.status());
        assertTrue(String.valueOf(res.body().get("error")).contains("no tiene permiso de lectura"));
    }

    @Test
    void consultaExitosaRetorna200YData() {
        when(proyectoRepository.findByApiKey("nx_test_key_12345")).thenReturn(Optional.of(proyecto));
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", "uuid-1", "nombre", "Tomas")));

        DatosGateway datos = new DatosGateway("id, nombre", new java.util.LinkedHashMap<>(Map.of("nombre", "Tomas")), null, 50, 0);
        GatewayRequest req = new GatewayRequest("alumnos", datos);

        ResultadoGateway res = gatewayService.procesar("nx_test_key_12345", "127.0.0.1", req, "{}");

        assertEquals(200, res.status());
        assertNotNull(res.body().get("data"));
        assertEquals("gie", res.slug());
        verify(jdbcTemplate).update(contains("INSERT INTO public.api_logs"), eq("gie"), any(), any(), eq(true), any(), any(), any(), eq(200));
    }

    @Test
    void camposConInyeccionSqlRetorna400() {
        when(proyectoRepository.findByApiKey("nx_test_key_12345")).thenReturn(Optional.of(proyecto));

        DatosGateway datos = new DatosGateway("id; DROP TABLE alumnos;--", new java.util.LinkedHashMap<>(), null, 10, 0);
        GatewayRequest req = new GatewayRequest("alumnos", datos);

        ResultadoGateway res = gatewayService.procesar("nx_test_key_12345", "127.0.0.1", req, "{}");

        assertEquals(400, res.status());
        assertEquals("Campos inválidos", res.body().get("error"));
    }

    @Test
    void filtroConCaracteresInvalidosRetorna400() {
        when(proyectoRepository.findByApiKey("nx_test_key_12345")).thenReturn(Optional.of(proyecto));

        DatosGateway datos = new DatosGateway("*", new java.util.LinkedHashMap<>(Map.of("dni' OR '1'='1", "1234")), null, 10, 0);
        GatewayRequest req = new GatewayRequest("alumnos", datos);

        ResultadoGateway res = gatewayService.procesar("nx_test_key_12345", "127.0.0.1", req, "{}");

        assertEquals(400, res.status());
        assertTrue(String.valueOf(res.body().get("error")).contains("Filtro inválido"));
    }
}
