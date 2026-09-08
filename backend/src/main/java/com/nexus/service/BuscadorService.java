package com.nexus.service;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.postgresql.util.PGobject;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.config.ConfigTablas;
import com.nexus.config.ConfigTablas.ConfigTabla;
import com.nexus.config.ConfigTablas.Relacion;
import com.nexus.exception.ApiException;

/**
 * Búsqueda de solo lectura sobre las tablas escolares (SQL dinámico vía JdbcTemplate).
 * Replica el contrato del backend Express: filas planas + relaciones como objetos JSON
 * (jsonb_build_object), ILIKE escapado, filtros por igualdad y límite acotado.
 */
@Service
public class BuscadorService {

    private static final int LIMITE_DEFAULT = 50;
    private static final int LIMITE_MAX = 200;
    private static final Pattern CAMPO_VALIDO = Pattern.compile("^[a-zA-Z0-9_]+$");

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final ConfigTablas configTablas;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BuscadorService(JdbcTemplate jdbcTemplate, TransactionTemplate transactionTemplate,
                           ConfigTablas configTablas) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
        this.configTablas = configTablas;
    }

    public List<Map<String, Object>> buscar(String tabla, String termino,
                                            Map<String, String> filtros, Integer limite) {
        ConfigTabla config = configTablas.obtenerConfig(tabla);
        int limiteSeguro = Math.min(limite == null ? LIMITE_DEFAULT : limite, LIMITE_MAX);

        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            StringBuilder sql = new StringBuilder("SELECT ").append(selectConRelaciones(tabla, config));
            sql.append(" FROM public.").append(tabla);
            sql.append(joins(tabla, config));

            List<Object> params = new ArrayList<>();
            StringBuilder where = new StringBuilder();
            construirWhere(tabla, config, termino, filtros, where, params);
            if (where.length() > 0) {
                sql.append(" WHERE ").append(where);
            }

            sql.append(" ORDER BY ").append(tabla).append(".").append(config.orden().columna())
                    .append(config.orden().ascendente() ? " ASC" : " DESC");
            sql.append(" LIMIT ?");
            params.add(limiteSeguro);

            List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString(), params.toArray());
            return normalizarFilas(filas);
        });
    }

    public Map<String, Object> detalle(String tabla, String campo, String id) {
        ConfigTabla config = configTablas.obtenerConfig(tabla);
        if (campo == null || !CAMPO_VALIDO.matcher(campo).matches()) {
            throw new ApiException(400, "Campo inválido");
        }

        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            StringBuilder sql = new StringBuilder("SELECT ").append(selectConRelaciones(tabla, config));
            sql.append(" FROM public.").append(tabla);
            sql.append(joins(tabla, config));
            // ::text para que el parámetro sirva contra columnas uuid, enteras o texto
            sql.append(" WHERE ").append(tabla).append(".").append(campo).append("::text = ? LIMIT 1");

            List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString(), id);
            if (filas.isEmpty()) {
                throw new ApiException(404, "Registro no encontrado");
            }
            return normalizarFilas(filas).get(0);
        });
    }

    public Map<String, Object> opcionesFiltros(String tabla) {
        // La ruta exige tabla permitida aunque no tenga opciones (igual que el backend Express)
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

    // ─── Construcción de SQL ───

    private String selectConRelaciones(String tabla, ConfigTabla config) {
        StringBuilder select = new StringBuilder();
        for (String campo : config.campos()) {
            if (select.length() > 0) {
                select.append(", ");
            }
            select.append(tabla).append(".").append(campo);
        }
        for (Relacion rel : config.relaciones()) {
            StringBuilder obj = new StringBuilder("jsonb_build_object(");
            for (String c : rel.campos()) {
                if (obj.length() > "jsonb_build_object(".length()) {
                    obj.append(", ");
                }
                obj.append("'").append(c).append("', ").append(rel.tabla()).append(".").append(c);
            }
            obj.append(") AS ").append(rel.tabla());
            select.append(", ").append(obj);
        }
        return select.toString();
    }

    private String joins(String tabla, ConfigTabla config) {
        StringBuilder joins = new StringBuilder();
        for (Relacion rel : config.relaciones()) {
            joins.append(" LEFT JOIN public.").append(rel.tabla()).append(" ").append(rel.tabla())
                    .append(" ON ").append(rel.tabla()).append(".").append(rel.pk())
                    .append(" = ").append(tabla).append(".").append(rel.fk());
        }
        return joins.toString();
    }

    private void construirWhere(String tabla, ConfigTabla config, String termino,
                                Map<String, String> filtros, StringBuilder where, List<Object> params) {
        List<String> conditions = new ArrayList<>();

        if (termino != null && !termino.isBlank()) {
            List<String> or = new ArrayList<>();
            if (termino.matches("\\d+")) {
                long num = Long.parseLong(termino);
                if ("alumnos".equals(tabla) || "personal".equals(tabla)) {
                    or.add(tabla + ".dni = ?");
                    params.add(num);
                } else if ("cursos".equals(tabla)) {
                    or.add(tabla + ".anio = ?");
                    params.add(num);
                } else if ("domicilios".equals(tabla)) {
                    or.add(tabla + ".numero = ?");
                    params.add(num);
                }
            }

            String pattern = "%" + escaparIlike(termino) + "%";
            for (String campo : config.buscarEn()) {
                or.add(tabla + "." + campo + " ILIKE ?");
                params.add(pattern);
            }

            if (!or.isEmpty()) {
                conditions.add("(" + String.join(" OR ", or) + ")");
            }
        }

        if (filtros != null) {
            for (Map.Entry<String, String> entry : filtros.entrySet()) {
                String value = entry.getValue();
                if (value == null || value.isEmpty()) {
                    continue;
                }
                if (!CAMPO_VALIDO.matcher(entry.getKey()).matches()) {
                    throw new ApiException(400, "Filtro inválido: " + entry.getKey());
                }
                // ::text para comparar contra columnas int/uuid/text con el mismo parámetro
                conditions.add(tabla + "." + entry.getKey() + "::text = ?");
                params.add(value);
            }
        }

        where.append(String.join(" AND ", conditions));
    }

    private String escaparIlike(String termino) {
        return termino.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    // ─── Contexto RLS ───

    /** SET LOCAL dentro de la transacción actual (requerido por el RLS del schema local). */
    private void aplicarContextoUsuario() {
        // set_config(..., true) equivale a SET LOCAL; "current_role" es palabra
        // reservada y no se puede usar como identificador calificado sin comillas.
        // Devuelve el valor seteado, por eso va con queryForObject y no update().
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_role', 'authenticated', true)", String.class);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof String userId
                && userId.matches("^[0-9a-fA-F-]{36}$")) {
            jdbcTemplate.queryForObject(
                    "SELECT set_config('app.current_user_id', ?, true)", String.class, userId);
        }
    }

    // ─── Normalización de resultados ───

    private List<Map<String, Object>> normalizarFilas(List<Map<String, Object>> filas) {
        List<Map<String, Object>> resultado = new ArrayList<>(filas.size());
        for (Map<String, Object> fila : filas) {
            Map<String, Object> normalizada = new LinkedHashMap<>();
            fila.forEach((clave, valor) -> normalizada.put(clave, normalizarValor(valor)));
            resultado.add(normalizada);
        }
        return resultado;
    }

    private Object normalizarValor(Object valor) {
        try {
            if (valor instanceof PGobject pg && ("jsonb".equals(pg.getType()) || "json".equals(pg.getType()))) {
                return objectMapper.readValue(pg.getValue(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            return null;
        }
        if (valor instanceof Date fechaSql) {
            return fechaSql.toLocalDate().toString();
        }
        if (valor instanceof Timestamp fechaHoraSql) {
            return fechaHoraSql.toLocalDateTime().toString();
        }
        return valor;
    }
}
