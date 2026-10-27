package com.nexus.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.nexus.dto.LoginRequest;
import com.nexus.dto.TokenResponse;
import com.nexus.dto.UsuarioResponse;
import com.nexus.exception.ApiException;
import com.nexus.model.RefreshToken;
import com.nexus.model.Usuario;
import com.nexus.repository.RefreshTokenRepository;
import com.nexus.repository.UsuarioRepository;
import com.nexus.security.JwtUtils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private JwtUtils jwtUtils;

    private AuthService authService;

    private final UUID usuarioId = UUID.randomUUID();
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        authService = new AuthService(usuarioRepository, refreshTokenRepository, jwtUtils, 12);

        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", usuarioId);
        ReflectionTestUtils.setField(usuario, "email", "regente@nexus.local");
        ReflectionTestUtils.setField(usuario, "passwordHash",
                new BCryptPasswordEncoder(12).encode("PasswordSeguro123!"));
        ReflectionTestUtils.setField(usuario, "nombre", "Tiziano");
        ReflectionTestUtils.setField(usuario, "apellido", "Espinoza");
        ReflectionTestUtils.setField(usuario, "rol", "regente");
        ReflectionTestUtils.setField(usuario, "activo", true);
    }

    @Test
    void loginExitoso() {
        when(usuarioRepository.findByEmail("regente@nexus.local")).thenReturn(Optional.of(usuario));
        when(jwtUtils.generarAccessToken(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn("access-token-jwt");
        when(jwtUtils.generarRefreshToken(anyString())).thenReturn("refresh-token-jwt");
        when(jwtUtils.getRefreshExpirationMs()).thenReturn(604800000L);

        TokenResponse response = authService.login(new LoginRequest("regente@nexus.local", "PasswordSeguro123!"));

        assertNotNull(response);
        assertEquals("access-token-jwt", response.accessToken());
        assertEquals("refresh-token-jwt", response.refreshToken());
        assertEquals("regente@nexus.local", response.usuario().email());
        assertEquals("regente", response.usuario().rol());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void loginUsuarioInexistenteLanza401() {
        when(usuarioRepository.findByEmail("inexistente@nexus.local")).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("inexistente@nexus.local", "pass")));
        assertEquals(401, ex.getStatus());
        assertEquals("Email o contraseña incorrectos", ex.getMessage());
    }

    @Test
    void loginUsuarioInactivoLanza401() {
        ReflectionTestUtils.setField(usuario, "activo", false);
        when(usuarioRepository.findByEmail("regente@nexus.local")).thenReturn(Optional.of(usuario));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("regente@nexus.local", "PasswordSeguro123!")));
        assertEquals(401, ex.getStatus());
    }

    @Test
    void loginPasswordIncorrectoLanza401() {
        when(usuarioRepository.findByEmail("regente@nexus.local")).thenReturn(Optional.of(usuario));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("regente@nexus.local", "PasswordErroneo")));
        assertEquals(401, ex.getStatus());
    }

    @Test
    void logoutEliminaTokenPorHash() throws Exception {
        String refreshToken = "raw-refresh-token";
        String expectedHash = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(refreshToken.getBytes(StandardCharsets.UTF_8)));

        authService.logout(refreshToken);

        verify(refreshTokenRepository).deleteByTokenHash(expectedHash);
    }

    @Test
    void logoutConTokenNuloNoInteractuaConRepo() {
        authService.logout(null);
        verify(refreshTokenRepository, never()).deleteByTokenHash(anyString());
    }

    @Test
    void refreshConTokenNuloLanza401() {
        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh(null));
        assertEquals(401, ex.getStatus());
        assertEquals("Refresh token requerido", ex.getMessage());
    }

    @Test
    void refreshConTokenInvalidoLanza401() {
        when(jwtUtils.obtenerClaims("invalido")).thenThrow(new JwtException("Firma corrupta"));

        ApiException ex = assertThrows(ApiException.class, () -> authService.refresh("invalido"));
        assertEquals(401, ex.getStatus());
    }

    @Test
    void refreshExitosoMarcaUsadoYEmitenuevosTokens() throws Exception {
        String tokenStr = "valid-refresh-token";
        String expectedHash = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(tokenStr.getBytes(StandardCharsets.UTF_8)));

        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("refresh");
        when(claims.get("id", String.class)).thenReturn(usuarioId.toString());
        when(jwtUtils.obtenerClaims(tokenStr)).thenReturn(claims);

        RefreshToken savedToken = new RefreshToken(usuario, expectedHash, OffsetDateTime.now().plusDays(7));
        when(refreshTokenRepository.findValido(expectedHash)).thenReturn(Optional.of(savedToken));

        when(jwtUtils.generarAccessToken(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn("new-access-jwt");
        when(jwtUtils.generarRefreshToken(anyString())).thenReturn("new-refresh-jwt");
        when(jwtUtils.getRefreshExpirationMs()).thenReturn(604800000L);

        TokenResponse res = authService.refresh(tokenStr);

        assertNotNull(res);
        assertEquals("new-access-jwt", res.accessToken());
        assertNotNull(savedToken.getUsedAt());
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void obtenerUsuarioActualExitoso() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.of(usuario));

        UsuarioResponse response = authService.obtenerUsuarioActual(usuarioId);

        assertNotNull(response);
        assertEquals(usuarioId.toString(), response.id());
        assertEquals("regente@nexus.local", response.email());
    }

    @Test
    void obtenerUsuarioActualInexistenteLanza401() {
        when(usuarioRepository.findById(usuarioId)).thenReturn(Optional.empty());

        ApiException ex = assertThrows(ApiException.class, () -> authService.obtenerUsuarioActual(usuarioId));
        assertEquals(401, ex.getStatus());
    }
}
