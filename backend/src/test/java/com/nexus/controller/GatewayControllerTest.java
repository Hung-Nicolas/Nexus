package com.nexus.controller;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.dto.GatewayRequest;
import com.nexus.dto.GatewayRequest.DatosGateway;
import com.nexus.exception.GlobalExceptionHandler;
import com.nexus.service.GatewayService;
import com.nexus.service.GatewayService.ResultadoGateway;

@ExtendWith(MockitoExtension.class)
class GatewayControllerTest {

    @Mock
    private GatewayService gatewayService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        GatewayController controller = new GatewayController(gatewayService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void gatewayExitosoPropagaHeaderProyectoYStatus200() throws Exception {
        Map<String, Object> bodyRespuesta = Map.of(
                "meta", Map.of("duracionMs", 12),
                "data", List.of(Map.of("id", 1, "nombre", "Tomas"))
        );
        ResultadoGateway resultado = new ResultadoGateway(200, bodyRespuesta, "gie");

        when(gatewayService.procesar(eq("nx_key_valida"), any(), any(), any())).thenReturn(resultado);

        GatewayRequest req = new GatewayRequest("alumnos", new DatosGateway("*", new java.util.LinkedHashMap<>(), null, 10, 0));

        mockMvc.perform(post("/api/v1/gateway")
                        .header("x-api-key", "nx_key_valida")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Nexus-Proyecto", "gie"))
                .andExpect(jsonPath("$.data[0].nombre").value("Tomas"));
    }

    @Test
    void gatewaySinApiKeyRetorna401() throws Exception {
        Map<String, Object> bodyRespuesta = Map.of("error", "Falta header x-api-key");
        ResultadoGateway resultado = new ResultadoGateway(401, bodyRespuesta, null);

        when(gatewayService.procesar(eq(null), any(), any(), any())).thenReturn(resultado);

        GatewayRequest req = new GatewayRequest("alumnos", null);

        mockMvc.perform(post("/api/v1/gateway")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Falta header x-api-key"));
    }
}
