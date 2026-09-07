package com.nexus.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Genera y valida JWT (HS256). Access token: claims id/email/nombre/apellido/rol.
 * Refresh token: claim type=refresh. La duración usa el formato "15m", "7d", "12h".
 */
@Component
public class JwtUtils {

    private static final Pattern DURACION = Pattern.compile("^(\\d+)([dhm])$");

    private final SecretKey key;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtUtils(
            @Value("${nexus.jwt.secret}") String secret,
            @Value("${nexus.jwt.access-expires-in}") String accessExpiresIn,
            @Value("${nexus.jwt.refresh-expires-in}") String refreshExpiresIn) {

        byte[] secretoBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretoBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secretoBytes);
        this.accessExpirationMs = parseDuracion(accessExpiresIn);
        this.refreshExpirationMs = parseDuracion(refreshExpiresIn);
    }

    public String generarAccessToken(String id, String email, String nombre, String apellido, String rol) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("id", id);
        claims.put("email", email);
        claims.put("nombre", nombre);
        claims.put("apellido", apellido);
        claims.put("rol", rol);

        return Jwts.builder()
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessExpirationMs))
                .signWith(key)
                .compact();
    }

    public String generarRefreshToken(String id) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("id", id);
        claims.put("type", "refresh");

        return Jwts.builder()
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
                .signWith(key)
                .compact();
    }

    public Claims obtenerClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean esTokenValido(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private long parseDuracion(String duracion) {
        Matcher matcher = DURACION.matcher(duracion.trim());
        if (!matcher.matches()) {
            throw new IllegalStateException("Duración JWT inválida: " + duracion);
        }
        long valor = Long.parseLong(matcher.group(1));
        return switch (matcher.group(2)) {
            case "d" -> valor * 24 * 60 * 60 * 1000;
            case "h" -> valor * 60 * 60 * 1000;
            default -> valor * 60 * 1000;
        };
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }
}
