package com.nexus.controller;

import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.dto.GatewayRequest;
import com.nexus.service.GatewayService;
import com.nexus.service.GatewayService.ResultadoGateway;

import jakarta.servlet.http.HttpServletRequest;

@RestController
public class GatewayController {

    private final GatewayService gatewayService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GatewayController(GatewayService gatewayService) {
        this.gatewayService = gatewayService;
    }

    @PostMapping("/api/v1/gateway")
    public ResponseEntity<Map<String, Object>> gateway(
            @RequestHeader(value = "x-api-key", required = false) String apiKey,
            @RequestBody(required = false) GatewayRequest body,
            HttpServletRequest request) throws Exception {

        String ip = obtenerIp(request);
        String requestBodyJson = body == null ? null : objectMapper.writeValueAsString(body);

        ResultadoGateway resultado = gatewayService.procesar(apiKey, ip, body, requestBodyJson);

        HttpHeaders headers = new HttpHeaders();
        if (resultado.slug() != null) {
            headers.add("X-Nexus-Proyecto", resultado.slug());
        }
        return ResponseEntity.status(resultado.status()).headers(headers).body(resultado.body());
    }

    private String obtenerIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
