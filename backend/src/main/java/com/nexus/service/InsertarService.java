package com.nexus.service;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

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
 * Servicio de inserción manual de registros en las tablas de negocio.
 * Valida tipos, NOT NULL y existencia de FKs antes de insertar.
 * Opera con service_role para que el RLS local permita la escritura.
 */
@Service
public class InsertarService {

    private static final Pattern CAMPO_VALIDO = Pattern.compile("^[a-zA-Z0-9_]+$");
    private static final Set<String> COLUMNAS_IGNORADAS = Set.of("created_at");

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final ConfigTablas configTablas;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InsertarService(JdbcTemplate jdbcTemplate, TransactionTemplate transactionTemplate,
                           ConfigTablas configTablas) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
        this.configTablas = configTablas;
    }

    /**
     * Inserta un registro en la tabla indicada y devuelve el registro completo
     * con sus relaciones proyectadas.
     */
    public Map<String, Object> insertar(String tabla, Map<String, Object> datos) {
        if (tabla == null || !CAMPO_VALIDO.matcher(tabla).matches()) {
            throw new ApiException(400, "Identificador de tabla inválido");
        }
        ConfigTabla config = configTablas.obtenerConfig(tabla);

        return transactionTemplate.execute(tx -> {
            aplicarContextoServiceRole();

            List<ColumnaInfo> columnas = obtenerColumnasTabla(tabla);
            Map<String, ColumnaInfo> infoPorColumna = new LinkedHashMap<>();
            for (ColumnaInfo c : columnas) {
                infoPorColumna.put(c.nombre(), c);
            }

            // Validar y convertir los datos recibidos
            Map<String, Object> valoresConvertidos = validarYConvertir(tabla, datos, infoPorColumna, config);

            // Ejecutar INSERT y obtener la PK generada
            Object pkGenerado = ejecutarInsert(tabla, config.pk(), valoresConvertidos, infoPorColumna);

            // Devolver el registro insertado con relaciones
            return obtenerRegistroConRelaciones(tabla, config, config.pk(), pkGenerado);
        });
    }

    /**
     * Devuelve las opciones actuales para cada FK configurable de una tabla.
     * Se usa para llenar los selectores del formulario de alta.
     */
    public Map<String, List<Map<String, Object>>> opcionesFk(String tabla) {
        if (tabla == null || !CAMPO_VALIDO.matcher(tabla).matches()) {
            throw new ApiException(400, "Identificador de tabla inválido");
        }
        ConfigTabla config = configTablas.obtenerConfig(tabla);

        return transactionTemplate.execute(tx -> {
            aplicarContextoServiceRole();
            Map<String, List<Map<String, Object>>> opciones = new LinkedHashMap<>();

            for (Relacion rel : config.relaciones()) {
                String fk = rel.fk();
                ConfigTabla configRelacionada = configTablas.obtenerConfig(rel.tabla());
                String label = construirLabelFk(rel, configRelacionada);

                String sql = "SELECT " + rel.pk() + " AS value, " + label + " AS label FROM public." + rel.tabla()
                        + " ORDER BY " + configRelacionada.orden().columna()
                        + (configRelacionada.orden().ascendente() ? " ASC" : " DESC")
                        + " LIMIT 500";

                List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql);
                opciones.put(fk, filas);
            }
            return opciones;
        });
    }

    // ─── Validación y conversión ───

    private Map<String, Object> validarYConvertir(String tabla, Map<String, Object> datos,
                                                   Map<String, ColumnaInfo> infoPorColumna,
                                                   ConfigTabla config) {
        if (datos == null) {
            datos = Collections.emptyMap();
        }

        String pk = config.pk();
        Set<String> fks = config.relaciones().stream().map(Relacion::fk).collect(java.util.stream.Collectors.toSet());
        Map<String, Object> convertidos = new LinkedHashMap<>();

        for (ColumnaInfo columna : infoPorColumna.values()) {
            String nombre = columna.nombre();

            // Ignorar PK autogenerada, created_at y columnas no insertables
            if (nombre.equals(pk) || COLUMNAS_IGNORADAS.contains(nombre)) {
                continue;
            }

            Object valor = datos.get(nombre);
            boolean esNulo = valor == null || (valor instanceof String s && s.isBlank());

            // NOT NULL: la columna es obligatoria y no tiene default que la genere
            if ("NO".equals(columna.isNullable()) && esNulo && !tieneDefaultGenerador(columna)) {
                throw new ApiException(400, "El campo '" + nombre + "' es obligatorio");
            }

            if (esNulo) {
                // Si es FK, no permitir null a menos que la columna lo permita (lo cubre el check anterior)
                convertidos.put(nombre, null);
                continue;
            }

            Object convertido = convertirValor(valor, columna.tipo(), nombre);

            // Validar existencia de FK
            if (fks.contains(nombre)) {
                Relacion rel = config.relaciones().stream()
                        .filter(r -> r.fk().equals(nombre))
                        .findFirst()
                        .orElseThrow();
                validarFk(rel, convertido);
            }

            // Validar checks de enum conocidos (turno, vinculo, especialidad)
            validarCheckEnum(tabla, nombre, convertido);

            convertidos.put(nombre, convertido);
        }

        // Rechazar campos desconocidos
        Set<String> columnasValidas = infoPorColumna.keySet();
        Set<String> desconocidos = datos.keySet().stream()
                .filter(k -> !columnasValidas.contains(k))
                .collect(java.util.stream.Collectors.toSet());
        if (!desconocidos.isEmpty()) {
            throw new ApiException(400, "Campos desconocidos: " + String.join(", ", desconocidos));
        }

        return convertidos;
    }

    private boolean tieneDefaultGenerador(ColumnaInfo columna) {
        String def = columna.columnDefault();
        if (def == null) {
            return false;
        }
        String lower = def.toLowerCase();
        return lower.contains("nextval") || lower.contains("gen_random_uuid") || lower.contains("now()");
    }

    private Object convertirValor(Object valor, String tipo, String columna) {
        String tipoLower = tipo.toLowerCase();
        try {
            if (tipoLower.contains("int")) {
                if (valor instanceof Number n) {
                    return n.longValue();
                }
                return Long.parseLong(String.valueOf(valor).trim());
            }
            if ("uuid".equals(tipoLower)) {
                return UUID.fromString(String.valueOf(valor).trim());
            }
            if ("date".equals(tipoLower)) {
                return Date.valueOf(String.valueOf(valor).trim());
            }
            if (tipoLower.contains("timestamp")) {
                return Timestamp.valueOf(String.valueOf(valor).trim());
            }
            if ("boolean".equals(tipoLower) || "bool".equals(tipoLower)) {
                return Boolean.parseBoolean(String.valueOf(valor).trim());
            }
            return String.valueOf(valor).trim();
        } catch (IllegalArgumentException e) {
            throw new ApiException(400, "Valor inválido para '" + columna + "' (se esperaba " + tipo + ")");
        }
    }

    private void validarFk(Relacion rel, Object valor) {
        String sql = "SELECT COUNT(*) FROM public." + rel.tabla() + " WHERE " + rel.pk() + "::text = ?";
        Long count = jdbcTemplate.queryForObject(sql, Long.class, String.valueOf(valor));
        if (count == null || count == 0) {
            throw new ApiException(400, "La referencia '" + rel.fk() + "' no existe en " + rel.tabla());
        }
    }

    private void validarCheckEnum(String tabla, String columna, Object valor) {
        if (valor == null) {
            return;
        }
        String s = String.valueOf(valor);
        if ("turno".equals(columna) && !Set.of("Mañana", "Tarde", "Noche").contains(s)) {
            throw new ApiException(400, "Turno inválido");
        }
        if ("vinculo".equals(columna) && !Set.of("padre", "madre", "tutor", "otro").contains(s)) {
            throw new ApiException(400, "Vínculo inválido");
        }
        if ("especialidad".equals(columna) && s != null && !s.isBlank()
                && !Set.of("Computación", "Automotores").contains(s)) {
            throw new ApiException(400, "Especialidad inválida");
        }
    }

    // ─── Ejecución del INSERT ───

    private Object ejecutarInsert(String tabla, String pk, Map<String, Object> valores,
                                  Map<String, ColumnaInfo> infoPorColumna) {
        if (valores.isEmpty()) {
            throw new ApiException(400, "No se proporcionaron datos para insertar");
        }

        List<String> nombres = new ArrayList<>(valores.keySet());
        String columnasSql = String.join(", ", nombres);
        String placeholders = String.join(", ", Collections.nCopies(nombres.size(), "?"));

        String sql = "INSERT INTO public." + tabla + " (" + columnasSql + ") VALUES (" + placeholders + ") RETURNING " + pk;

        Object[] args = nombres.stream().map(valores::get).toArray();
        return jdbcTemplate.queryForObject(sql, Object.class, args);
    }

    // ─── Recuperación del registro insertado ───

    private Map<String, Object> obtenerRegistroConRelaciones(String tabla, ConfigTabla config,
                                                              String campoPk, Object pkValor) {
        StringBuilder sql = new StringBuilder("SELECT ").append(selectConRelaciones(tabla, config));
        sql.append(" FROM public.").append(tabla);
        sql.append(joins(tabla, config));
        sql.append(" WHERE ").append(tabla).append(".").append(campoPk).append("::text = ? LIMIT 1");

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql.toString(), String.valueOf(pkValor));
        if (filas.isEmpty()) {
            throw new ApiException(404, "Registro no encontrado después de insertar");
        }
        return normalizarFila(filas.get(0));
    }

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

    private Map<String, Object> normalizarFila(Map<String, Object> fila) {
        Map<String, Object> normalizada = new LinkedHashMap<>();
        fila.forEach((clave, valor) -> normalizada.put(clave, normalizarValor(valor)));
        return normalizada;
    }

    private Object normalizarValor(Object valor) {
        try {
            if (valor instanceof org.postgresql.util.PGobject pg
                    && ("jsonb".equals(pg.getType()) || "json".equals(pg.getType()))) {
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

    // ─── Construcción de labels para FK ───

    private String construirLabelFk(Relacion rel, ConfigTabla configRelacionada) {
        StringBuilder label = new StringBuilder("CONCAT_WS(' '");
        for (String c : rel.campos()) {
            label.append(", ").append(rel.tabla()).append(".").append(c).append("::text");
        }
        label.append(")");
        return label.toString();
    }

    // ─── Contexto RLS ───

    private void aplicarContextoServiceRole() {
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_role', 'service_role', true)", String.class);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof String userId) {
            jdbcTemplate.queryForObject(
                    "SELECT set_config('app.current_user_id', ?, true)", String.class, userId);
        }
    }

    // ─── Metadatos de columnas ───

    private List<ColumnaInfo> obtenerColumnasTabla(String tabla) {
        return jdbcTemplate.query(
                "SELECT column_name, data_type, is_nullable, column_default " +
                        "FROM information_schema.columns " +
                        "WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position",
                (rs, rowNum) -> new ColumnaInfo(
                        rs.getString("column_name"),
                        rs.getString("data_type"),
                        rs.getString("is_nullable"),
                        rs.getString("column_default")),
                tabla);
    }

    private record ColumnaInfo(String nombre, String tipo, String isNullable, String columnDefault) {}
}
