package com.nexus.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class DashboardService {

    private static final List<String> TABLAS_CONTAR = List.of(
            "alumnos", "personal", "cursos", "materias", "responsables", "roles", "domicilios");

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    public DashboardService(JdbcTemplate jdbcTemplate, TransactionTemplate transactionTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
    }

    public Map<String, Object> obtenerStats() {
        return transactionTemplate.execute(tx -> {
            jdbcTemplate.update("SET LOCAL app.current_role = 'authenticated'");

            Map<String, Object> stats = new LinkedHashMap<>();
            for (String tabla : TABLAS_CONTAR) {
                Integer total = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*)::int AS total FROM public." + tabla, Integer.class);
                stats.put(tabla, total == null ? 0 : total);
            }
            // Proyectos conectados: siempre 1 por ahora (GIE)
            stats.put("proyectos", 1);
            return stats;
        });
    }
}
