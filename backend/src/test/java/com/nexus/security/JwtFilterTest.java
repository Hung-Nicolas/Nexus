package com.nexus.security;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@ExtendWith(MockitoExtension.class)
class JwtFilterTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private JwtFilter jwtFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtFilter = new JwtFilter(jwtUtils);
    }

    @Test
    void peticionSinHeaderAuthorizationContinuaSinAutenticacion() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        jwtFilter.doFilterInternal(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void peticionConTokenValidoSeteaSecurityContext() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token-valido");

        Claims claims = mock(Claims.class);
        when(claims.get("id", String.class)).thenReturn("uuid-123");
        when(claims.get("rol", String.class)).thenReturn("regente");
        when(jwtUtils.obtenerClaims("token-valido")).thenReturn(claims);

        jwtFilter.doFilterInternal(request, response, filterChain);

        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("uuid-123", SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void tokenExpiradoRetorna401() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token-expirado");
        when(jwtUtils.obtenerClaims("token-expirado")).thenThrow(new ExpiredJwtException(null, null, "Expirado"));

        StringWriter stringWriter = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(stringWriter));

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(401);
        assertEquals("{\"error\":\"Token expirado\"}", stringWriter.toString().trim());
    }

    @Test
    void tokenInvalidoRetorna401() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("Bearer token-invalido");
        when(jwtUtils.obtenerClaims("token-invalido")).thenThrow(new JwtException("Corrupto"));

        StringWriter stringWriter = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(stringWriter));

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(401);
        assertEquals("{\"error\":\"Token inválido\"}", stringWriter.toString().trim());
    }
}
