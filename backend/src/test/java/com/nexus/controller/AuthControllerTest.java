package com.nexus.controller;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.dto.LoginRequest;
import com.nexus.dto.TokenResponse;
import com.nexus.dto.UsuarioResponse;
import com.nexus.exception.ApiException;
import com.nexus.exception.GlobalExceptionHandler;
import com.nexus.service.AuthService;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        AuthController authController = new AuthController(authService);
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void loginExitosoRetornaTokens() throws Exception {
        LoginRequest req = new LoginRequest("regente@nexus.local", "Regente123!");
        UsuarioResponse usr = new UsuarioResponse("uuid-1", "regente@nexus.local", "Regente", "Nexus", "regente");
        TokenResponse res = new TokenResponse("jwt-access", "jwt-refresh", usr);

        when(authService.login(any(LoginRequest.class))).thenReturn(res);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-access"))
                .andExpect(jsonPath("$.refreshToken").value("jwt-refresh"))
                .andExpect(jsonPath("$.usuario.email").value("regente@nexus.local"));
    }

    @Test
    void loginConEmailInvalidoRetorna400() throws Exception {
        LoginRequest req = new LoginRequest("no-es-un-email", "123456");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Email inválido"));
    }

    @Test
    void loginConPasswordCortoRetorna400() throws Exception {
        LoginRequest req = new LoginRequest("regente@nexus.local", "123");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("La contraseña debe tener al menos 6 caracteres"));
    }

    @Test
    void loginConCredencialesIncorrectasRetorna401() throws Exception {
        LoginRequest req = new LoginRequest("regente@nexus.local", "Incorrecto123");
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new ApiException(401, "Email o contraseña incorrectos"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Email o contraseña incorrectos"));
    }

    @Test
    void logoutExitoso() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"test-refresh\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));

        verify(authService).logout("test-refresh");
    }

    @Test
    void refreshExitosoRetornaNuevosTokens() throws Exception {
        UsuarioResponse usr = new UsuarioResponse("uuid-1", "regente@nexus.local", "Regente", "Nexus", "regente");
        TokenResponse res = new TokenResponse("new-access", "new-refresh", usr);

        when(authService.refresh("my-refresh-token")).thenReturn(res);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"my-refresh-token\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access"))
                .andExpect(jsonPath("$.refreshToken").value("new-refresh"));
    }

    @Test
    void meRetornaPerfilDeUsuario() throws Exception {
        UUID id = UUID.randomUUID();
        UsuarioResponse usr = new UsuarioResponse(id.toString(), "regente@nexus.local", "Admin", "General", "regente");
        when(authService.obtenerUsuarioActual(id)).thenReturn(usr);

        Authentication auth = new UsernamePasswordAuthenticationToken(id.toString(), null);

        mockMvc.perform(get("/api/v1/auth/me").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.email").value("regente@nexus.local"))
                .andExpect(jsonPath("$.usuario.rol").value("regente"));
    }
}
