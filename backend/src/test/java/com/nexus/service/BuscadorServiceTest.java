package com.nexus.service;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import com.nexus.config.ConfigTablas;
import com.nexus.exception.ApiException;

@ExtendWith(MockitoExtension.class)
class BuscadorServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private TransactionTemplate transactionTemplate;

    private final ConfigTablas configTablas = new ConfigTablas();
    private final BuscadorSqlBuilder sqlBuilder = new BuscadorSqlBuilder();
    private final BuscadorRowNormalizer rowNormalizer = new BuscadorRowNormalizer();
    private BuscadorService buscadorService;

    @BeforeEach
    void setUp() {
        buscadorService = new BuscadorService(jdbcTemplate, transactionTemplate, configTablas, sqlBuilder, rowNormalizer);

        // Permitir ejecución inmediata del callback de transacción cuando aplique
        org.mockito.Mockito.lenient().when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
    }

    @Test
    void buscarTablaPermitidaEjecutaQueryYDevuelveFilas() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", "uuid-1", "nombre", "Lucía")));

        List<Map<String, Object>> res = buscadorService.buscar("alumnos", "Lucia", Map.of(), 20);

        assertNotNull(res);
        assertFalse(res.isEmpty());
        assertEquals("Lucía", res.get(0).get("nombre"));
        verify(jdbcTemplate).queryForObject(contains("SELECT set_config('app.current_role', 'authenticated', true)"), eq(String.class));
    }

    @Test
    void buscarTablaNoPermitidaLanza400() {
        ApiException ex = assertThrows(ApiException.class,
                () -> buscadorService.buscar("usuarios", null, null, 10));
        assertEquals(400, ex.getStatus());
        assertEquals("Tabla no permitida", ex.getMessage());
    }

    @Test
    void detalleRegistroExitoso() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class)))
                .thenReturn(List.of(Map.of("id", "uuid-99", "nombre", "Franco")));

        Map<String, Object> registro = buscadorService.detalle("alumnos", "id", "uuid-99");

        assertNotNull(registro);
        assertEquals("Franco", registro.get("nombre"));
    }

    @Test
    void detalleCampoInvalidoLanza400() {
        ApiException ex = assertThrows(ApiException.class,
                () -> buscadorService.detalle("alumnos", "id; DROP TABLE alumnos;", "uuid-1"));
        assertEquals(400, ex.getStatus());
        assertEquals("Campo inválido", ex.getMessage());
    }

    @Test
    void detalleCampoNoPermitidoEnCatalogoLanza400() {
        ApiException ex = assertThrows(ApiException.class,
                () -> buscadorService.detalle("alumnos", "password_hash", "uuid-1"));
        assertEquals(400, ex.getStatus());
        assertEquals("Campo inválido", ex.getMessage());
    }

    @Test
    void detalleRegistroInexistenteLanza404() {
        when(jdbcTemplate.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());

        ApiException ex = assertThrows(ApiException.class,
                () -> buscadorService.detalle("alumnos", "id", "no-existe"));
        assertEquals(404, ex.getStatus());
        assertEquals("Registro no encontrado", ex.getMessage());
    }

    @Test
    void opcionesFiltrosParaCursosDevuelveEspecialidadYAnio() {
        when(jdbcTemplate.queryForList(contains("SELECT DISTINCT especialidad"), eq(String.class)))
                .thenReturn(List.of("Computación", "Automotores"));
        when(jdbcTemplate.queryForList(contains("SELECT DISTINCT anio"), eq(String.class)))
                .thenReturn(List.of("1", "2", "3"));

        Map<String, Object> opciones = buscadorService.opcionesFiltros("cursos");

        assertNotNull(opciones);
        assertEquals(List.of("Computación", "Automotores"), opciones.get("cursos.especialidad"));
        assertEquals(List.of("1", "2", "3"), opciones.get("cursos.anio"));
    }
}
