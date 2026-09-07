package com.nexus.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

class JwtUtilsTest {

    private static final String SECRET = "test-secret-minimo-32-caracteres-ok";

    private final JwtUtils jwtUtils = new JwtUtils(SECRET, "15m", "7d");

    @Test
    void accessTokenContieneClaimsDelUsuario() {
        String token = jwtUtils.generarAccessToken(
                "550e8400-e29b-41d4-a716-446655440000", "regente@nexus.local", "Regente", "Nexus", "regente");

        Claims claims = jwtUtils.obtenerClaims(token);
        assertEquals("550e8400-e29b-41d4-a716-446655440000", claims.get("id", String.class));
        assertEquals("regente@nexus.local", claims.get("email", String.class));
        assertEquals("regente", claims.get("rol", String.class));
        assertTrue(jwtUtils.esTokenValido(token));
    }

    @Test
    void refreshTokenTieneClaimTypeRefresh() {
        String token = jwtUtils.generarRefreshToken("550e8400-e29b-41d4-a716-446655440000");

        Claims claims = jwtUtils.obtenerClaims(token);
        assertEquals("refresh", claims.get("type", String.class));
        assertEquals("550e8400-e29b-41d4-a716-446655440000", claims.get("id", String.class));
    }

    @Test
    void tokenInvalidoEsRechazado() {
        assertFalse(jwtUtils.esTokenValido("token.trucho.aqui"));
        assertThrows(JwtException.class, () -> jwtUtils.obtenerClaims("token.trucho.aqui"));
    }

    @Test
    void secretoCortoFallaAlCrear() {
        assertThrows(IllegalStateException.class, () -> new JwtUtils("corto", "15m", "7d"));
    }

    @Test
    void duracionInvalidaFallaAlCrear() {
        assertThrows(IllegalStateException.class, () -> new JwtUtils(SECRET, "quince-minutos", "7d"));
    }
}
