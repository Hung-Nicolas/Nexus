package com.nexus.config;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Rate limiting por IP con tres buckets (mismos límites que el backend Express):
 * - auth:    20 req / 15 min, solo en POST /api/v1/auth/login
 * - gateway: 100 req / 1 min, solo en /api/v1/gateway
 * - api:     200 req / 1 min, en buscador + /stats
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String MENSAJE_LIMITE = "Demasiados intentos. Probá de nuevo en unos minutos.";

    private final Map<String, Bucket> bucketsAuth = new ConcurrentHashMap<>();
    private final Map<String, Bucket> bucketsGateway = new ConcurrentHashMap<>();
    private final Map<String, Bucket> bucketsApi = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String metodo = request.getMethod();
        String ip = obtenerIp(request);

        Bucket bucket = null;
        if ("POST".equals(metodo) && "/api/v1/auth/login".equals(path)) {
            bucket = bucketPara(ip, bucketsAuth, () -> Bandwidth.builder()
                    .capacity(20).refillGreedy(20, Duration.ofMinutes(15)).build());
        } else if ("/api/v1/gateway".equals(path)) {
            bucket = bucketPara(ip, bucketsGateway, () -> Bandwidth.builder()
                    .capacity(100).refillGreedy(100, Duration.ofMinutes(1)).build());
        } else if (path.startsWith("/api/v1/buscar/")
                || path.startsWith("/api/v1/registros/")
                || path.startsWith("/api/v1/tablas/")
                || "/api/v1/stats".equals(path)
                || "/api/v1/exportar".equals(path)) {
            bucket = bucketPara(ip, bucketsApi, () -> Bandwidth.builder()
                    .capacity(200).refillGreedy(200, Duration.ofMinutes(1)).build());
        }

        if (bucket != null && !bucket.tryConsume(1)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(objectMapper.writeValueAsString(Map.of("error", MENSAJE_LIMITE)));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Bucket bucketPara(String ip, Map<String, Bucket> buckets, Supplier<Bandwidth> bandwidth) {
        return buckets.computeIfAbsent(ip, k -> Bucket.builder().addLimit(bandwidth.get()).build());
    }

    private String obtenerIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For puede venir como lista "ip1, ip2"; tomamos la primera
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
