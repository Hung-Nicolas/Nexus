package com.nexus.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.TokenResponse;
import com.nexus.exception.ApiException;
import com.nexus.service.AuthService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(@RequestBody(required = false) Map<String, String> body) {
        authService.logout(body == null ? null : body.get("refreshToken"));
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("ok", true);
        return respuesta;
    }

    @PostMapping("/refresh")
    public TokenResponse refresh(@RequestBody(required = false) Map<String, String> body) {
        return authService.refresh(body == null ? null : body.get("refreshToken"));
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        UUID id;
        try {
            id = UUID.fromString(String.valueOf(authentication.getPrincipal()));
        } catch (IllegalArgumentException e) {
            throw new ApiException(401, "Usuario no encontrado");
        }
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("usuario", authService.obtenerUsuarioActual(id));
        return respuesta;
    }
}
