package com.nexus.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.nexus.config.ConfigTablas;
import com.nexus.config.ConfigTablas.ConfigTabla;
import com.nexus.exception.ApiException;

/**
 * Servicio de búsqueda de solo lectura sobre las tablas escolares de Nexus.
 * Orquesta la validación, contexto de seguridad RLS y delega la construcción
 * SQL a BuscadorSqlBuilder y la conversión a BuscadorRowNormalizer (Clean Code / SRP).
 */
@Service
public class BuscadorService {

    private static final int LIMITE_DEFAULT = 50;
    private static final int LIMITE_MAX = 200;

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final ConfigTablas configTablas;
    private final BuscadorSqlBuilder sqlBuilder;
    private final BuscadorRowNormalizer rowNormalizer;

    public BuscadorService(JdbcTemplate jdbcTemplate,
                           TransactionTemplate transactionTemplate,
                           ConfigTablas configTablas,
                           BuscadorSqlBuilder sqlBuilder,
                           BuscadorRowNormalizer rowNormalizer) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
        this.configTablas = configTablas;
        this.sqlBuilder = sqlBuilder;
        this.rowNormalizer = rowNormalizer;
    }

    public List<Map<String, Object>> buscar(String tabla, String termino,
                                            Map<String, String> filtros, Integer limite) {
        ConfigTabla config = configTablas.obtenerConfig(tabla);
        int limiteSeguro = Math.min(limite == null ? LIMITE_DEFAULT : limite, LIMITE_MAX);

        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            StringBuilder sql = new StringBuilder("SELECT ").append(sqlBuilder.selectConRelaciones(tabla, config));
            sql.append(" FROM public.").append(tabla);
            sql.append(sqlBuilder.joins(tabla, config));

            List<Object> params = new ArrayList<>();
            StringBuilder where = new StringBuilder();
            sqlBuilder.construirWhere(tabla, config, termino, filtros, where, params);
            if (where.length() > 0) {
                sql.append(" WHERE ").append(where);
            }

            sql.append(" ORDER BY ").append(tabla).append(".").append(config.orden().columna())
                    .append(config.orden().ascendente() ? " ASC" : " DESC");
            sql.append(" LIMIT ?");
            params.add(limiteSeguro);

            List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString(), params.toArray());
            return rowNormalizer.normalizarFilas(filas);
        });
    }

    public Map<String, Object> detalle(String tabla, String campo, String id) {
        ConfigTabla config = configTablas.obtenerConfig(tabla);
        if (campo == null || !BuscadorSqlBuilder.CAMPO_VALIDO.matcher(campo).matches() || !config.campos().contains(campo)) {
            throw new ApiException(400, "Campo inválido");
        }

        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            StringBuilder sql = new StringBuilder("SELECT ").append(sqlBuilder.selectConRelaciones(tabla, config));
            sql.append(" FROM public.").append(tabla);
            sql.append(sqlBuilder.joins(tabla, config));
            // ::text para que el parámetro sirva contra columnas uuid, enteras o texto
            sql.append(" WHERE ").append(tabla).append(".").append(campo).append("::text = ? LIMIT 1");

            List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString(), id);
            if (filas.isEmpty()) {
                throw new ApiException(404, "Registro no encontrado");
            }
            return rowNormalizer.normalizarFilas(filas).get(0);
        });
    }

    public Map<String, Object> opcionesFiltros(String tabla) {
        // La ruta exige tabla permitida aunque no tenga opciones
        configTablas.obtenerConfig(tabla);

        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            Map<String, Object> opciones = new LinkedHashMap<>();
            if ("cursos".equals(tabla)) {
                List<String> especialidades = jdbcTemplate.queryForList(
                        "SELECT DISTINCT especialidad FROM public.cursos WHERE especialidad IS NOT NULL ORDER BY especialidad",
                        String.class);
                List<String> anios = jdbcTemplate.queryForList(
                        "SELECT DISTINCT anio FROM public.cursos WHERE anio IS NOT NULL ORDER BY anio", String.class)
                        .stream().map(String::valueOf).toList();
                opciones.put("cursos.especialidad", especialidades);
                opciones.put("cursos.anio", anios);
            }
            if ("domicilios".equals(tabla)) {
                opciones.put("domicilios.localidad", jdbcTemplate.queryForList(
                        "SELECT DISTINCT localidad FROM public.domicilios ORDER BY localidad", String.class));
            }
            return opciones;
        });
    }

    /** SET LOCAL dentro de la transacción actual (requerido por el RLS del schema local). */
    private void aplicarContextoUsuario() {
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_role', 'authenticated', true)", String.class);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof String userId
                && userId.matches("^[0-9a-fA-F-]{36}$")) {
            jdbcTemplate.queryForObject(
                    "SELECT set_config('app.current_user_id', ?, true)", String.class, userId);
        }
    }
}
