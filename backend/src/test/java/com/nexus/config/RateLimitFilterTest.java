package com.nexus.config;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private RateLimitFilter rateLimitFilter;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter();
    }

    @Test
    void peticionesPermitidasDentroDelLimitePasanAlFiltro() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/v1/buscar/alumnos");
        when(request.getMethod()).thenReturn("GET");
        when(request.getRemoteAddr()).thenReturn("192.168.1.50");

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void superarCapacidadDeLoginDevuelve429() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/v1/auth/login");
        when(request.getMethod()).thenReturn("POST");
        when(request.getRemoteAddr()).thenReturn("10.0.0.99");

        // Consumir los 20 tokens de capacidad
        for (int i = 0; i < 20; i++) {
            rateLimitFilter.doFilterInternal(request, response, filterChain);
        }

        StringWriter stringWriter = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(stringWriter));

        // Intento 21 debe ser bloqueado con 429
        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(response, atLeastOnce()).setStatus(429);
        assertTrue(stringWriter.toString().contains("Demasiados intentos"));
    }
}
