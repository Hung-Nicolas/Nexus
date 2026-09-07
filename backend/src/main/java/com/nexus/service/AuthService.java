package com.nexus.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtils jwtUtils;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtUtils jwtUtils,
                       @Value("${nexus.bcrypt-rounds}") int bcryptRounds) {
        this.usuarioRepository = usuarioRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = new BCryptPasswordEncoder(bcryptRounds);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();

        Usuario usuario = usuarioRepository.findByEmail(email)
                .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                .orElseThrow(() -> new ApiException(401, "Email o contraseña incorrectos"));

        if (!passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new ApiException(401, "Email o contraseña incorrectos");
        }

        return emitirTokens(usuario);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.deleteByTokenHash(hashToken(refreshToken));
    }

    @Transactional
    public TokenResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(401, "Refresh token requerido");
        }

        Claims claims;
        try {
            claims = jwtUtils.obtenerClaims(refreshToken);
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(401, "Refresh token inválido");
        }

        if (!"refresh".equals(claims.get("type", String.class)) || claims.get("id", String.class) == null) {
            throw new ApiException(401, "Refresh token inválido");
        }

        RefreshToken tokenGuardado = refreshTokenRepository.findValido(hashToken(refreshToken))
                .orElseThrow(() -> new ApiException(401, "Refresh token inválido o expirado"));

        // Rotación estricta: marcar el usado y emitir uno nuevo
        tokenGuardado.marcarUsado();

        return emitirTokens(tokenGuardado.getUsuario());
    }

    public UsuarioResponse obtenerUsuarioActual(UUID id) {
        return usuarioRepository.findById(id)
                .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                .map(this::aResponse)
                .orElseThrow(() -> new ApiException(401, "Usuario no encontrado"));
    }

    private TokenResponse emitirTokens(Usuario usuario) {
        String accessToken = jwtUtils.generarAccessToken(
                usuario.getId().toString(), usuario.getEmail(),
                usuario.getNombre(), usuario.getApellido(), usuario.getRol());
        String refreshToken = jwtUtils.generarRefreshToken(usuario.getId().toString());

        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC)
                .plusNanos(jwtUtils.getRefreshExpirationMs() * 1_000_000L);
        refreshTokenRepository.save(new RefreshToken(usuario, hashToken(refreshToken), expiresAt));

        return new TokenResponse(accessToken, refreshToken, aResponse(usuario));
    }

    private UsuarioResponse aResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId().toString(), usuario.getEmail(),
                usuario.getNombre(), usuario.getApellido(), usuario.getRol());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
