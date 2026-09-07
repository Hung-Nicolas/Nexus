package com.nexus.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Value("${nexus.cors.origins}")
    private String corsOrigen;

    @Value("${nexus.cors.origin-pattern}")
    private String corsOrigenPattern;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origenes = new ArrayList<>(List.of("http://localhost:5173"));
        Arrays.stream(corsOrigen.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .forEach(origenes::add);

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(origenes);
        if (corsOrigenPattern != null && !corsOrigenPattern.isBlank()) {
            config.setAllowedOriginPatterns(List.of(corsOrigenPattern));
        }
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
