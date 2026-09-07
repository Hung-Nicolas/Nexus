package com.nexus.service;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.config.ConfigTablas;
import com.nexus.dto.GatewayRequest;
import com.nexus.dto.GatewayRequest.DatosGateway;
import com.nexus.model.Proyecto;
import com.nexus.repository.ProyectoRepository;

/**
 * API Gateway para proyectos externos: autentica por API key (header x-api-key),
 * valida permisos de solo lectura por tabla, ejecuta SELECTs controlados y audita
 * cada request en api_logs. Replica el contrato del backend Express.
 */
@Service
public class GatewayService {

    private static final Logger log = LoggerFactory.getLogger(GatewayService.class);
    private static final int LIMITE_DEFAULT = 100;
    private static final int LIMITE_MAX = 1000;
    private static final Pattern IDENTIFICADOR_VALIDO = Pattern.compile("^[a-zA-Z0-9_]+$");

    /** Resultado del gateway: status, body (meta + data|error) y slug del proyecto. */
    public record ResultadoGateway(int status, Map<String, Object> body, String slug) {}

    private final ProyectoRepository proyectoRepository;
    private final ConfigTablas configTablas;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GatewayService(ProyectoRepository proyectoRepository, ConfigTablas configTablas,
                          JdbcTemplate jdbcTemplate) {
        this.proyectoRepository = proyectoRepository;
        this.configTablas = configTablas;
        this.jdbcTemplate = jdbcTemplate;
    }

    public ResultadoGateway procesar(String apiKey, String ip, GatewayRequest request, String requestBodyJson) {
        long startedAt = System.currentTimeMillis();
        String tabla = request == null || request.tabla() == null ? null : request.tabla();

        if (tabla == null || !configTablas.esTablaPermitidaGateway(tabla)) {
            return fallo(ip, null, tabla, "Tabla no permitida", 400, startedAt, requestBodyJson);
        }

        if (apiKey == null || apiKey.isBlank()) {
            return fallo(ip, null, tabla, "Falta header x-api-key", 401, startedAt, requestBodyJson);
        }

        Proyecto proyecto = proyectoRepository.findByApiKey(apiKey).orElse(null);
        if (proyecto == null || !Boolean.TRUE.equals(proyecto.getActivo())) {
            return fallo(ip, proyecto == null ? null : proyecto.getSlug(), tabla,
                    "API key inválida o inactiva", 401, startedAt, requestBodyJson);
        }

        if (proyecto.getIpPermitida() != null && !proyecto.getIpPermitida().equals(ip)) {
            return fallo(ip, proyecto.getSlug(), tabla, "IP no permitida", 403, startedAt, requestBodyJson);
        }

        List<String> tablasPermitidas = parsearPermisos(proyecto.getPermisos());
        if (!tablasPermitidas.contains(tabla)) {
            return fallo(ip, proyecto.getSlug(), tabla, "Sin permiso de lectura para esta tabla", 403,
                    startedAt, requestBodyJson,
                    "Proyecto '" + proyecto.getSlug() + "' no tiene permiso de lectura sobre '" + tabla + "'");
        }

        List<Map<String, Object>> data = null;
        String errorMsg = null;
        int status = 200;

        try {
            data = ejecutarSelect(tabla, request.datos());
        } catch (DataAccessException e) {
            status = 400;
            errorMsg = mensajeSql(e);
        } catch (GatewayException e) {
            status = e.status;
            errorMsg = e.getMessage();
        }

        long duracionMs = System.currentTimeMillis() - startedAt;
        auditar(ip, proyecto.getSlug(), tabla, errorMsg == null, errorMsg, duracionMs, requestBodyJson, status);

        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("duracionMs", duracionMs);
        body.put("meta", meta);
        if (errorMsg != null) {
            body.put("error", errorMsg);
        } else {
            body.put("data", data);
        }

        return new ResultadoGateway(status, body, proyecto.getSlug());
    }

    // ─── Validaciones y ejecución ───

    private List<Map<String, Object>> ejecutarSelect(String tabla, DatosGateway datos) {
        String campos = (datos == null || datos.campos() == null || datos.campos().isBlank())
                ? "*"
                : datos.campos();
        Map<String, Object> filtros = datos == null || datos.filtros() == null ? Map.of() : datos.filtros();
        Integer limite = datos == null || datos.limite() == null ? LIMITE_DEFAULT
                : Math.min(datos.limite(), LIMITE_MAX);
        int offset = datos == null || datos.offset() == null ? 0 : datos.offset();

        // Whitelist de campos (evitar inyección en el SELECT)
        List<String> camposSanitizados = new ArrayList<>();
        for (String campo : campos.split(",")) {
            String c = campo.trim();
            if (c.isEmpty()) {
                continue;
            }
            if (!"*".equals(c) && !IDENTIFICADOR_VALIDO.matcher(c).matches()) {
                throw new GatewayException(400, "Campos inválidos");
            }
            camposSanitizados.add(c);
        }
        if (camposSanitizados.isEmpty()) {
            throw new GatewayException(400, "Campos inválidos");
        }

        StringBuilder sql = new StringBuilder("SELECT ")
                .append(String.join(", ", camposSanitizados))
                .append(" FROM public.").append(tabla);

        List<Object> params = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        for (Map.Entry<String, Object> entry : filtros.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            if (!IDENTIFICADOR_VALIDO.matcher(entry.getKey()).matches()) {
                throw new GatewayException(400, "Filtro inválido: " + entry.getKey());
            }
            // ::text para comparar contra columnas int/uuid/text con el mismo parámetro
            conditions.add(entry.getKey() + "::text = ?");
            params.add(String.valueOf(entry.getValue()));
        }
        if (!conditions.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        if (datos != null && datos.orden() != null
                && datos.orden().columna() != null
                && IDENTIFICADOR_VALIDO.matcher(datos.orden().columna()).matches()) {
            String direction = Boolean.FALSE.equals(datos.orden().ascendente()) ? "DESC" : "ASC";
            sql.append(" ORDER BY ").append(datos.orden().columna()).append(" ").append(direction);
        }

        sql.append(" LIMIT ? OFFSET ?");
        params.add(limite);
        params.add(offset);

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    private List<String> parsearPermisos(String permisosJson) {
        try {
            if (permisosJson == null || permisosJson.isBlank()) {
                return List.of();
            }
            JsonNode nodo = objectMapper.readTree(permisosJson);
            if (!nodo.isArray()) {
                return List.of();
            }
            List<String> permisos = new ArrayList<>();
            nodo.forEach(p -> permisos.add(p.asText()));
            return permisos;
        } catch (Exception e) {
            return List.of();
        }
    }

    // ─── Auditoría ───

    private ResultadoGateway fallo(String ip, String slug, String tabla, String errorAuditoria,
                                     int status, long startedAt, String requestBodyJson) {
        return fallo(ip, slug, tabla, errorAuditoria, status, startedAt, requestBodyJson, errorAuditoria);
    }

    private ResultadoGateway fallo(String ip, String slug, String tabla, String errorAuditoria,
                                     int status, long startedAt, String requestBodyJson, String errorRespuesta) {
        long duracionMs = System.currentTimeMillis() - startedAt;
        auditar(ip, slug, tabla, false, errorAuditoria, duracionMs, requestBodyJson, status);

        Map<String, Object> body = new LinkedHashMap<>();
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("duracionMs", duracionMs);
        body.put("meta", meta);
        body.put("error", errorRespuesta);

        return new ResultadoGateway(status, body, slug);
    }

    private void auditar(String ip, String slug, String tabla, boolean exito, String error,
                         long duracionMs, String requestBodyJson, int responseStatus) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO public.api_logs "
                            + "(proyecto_slug, ip, metodo, tabla, operacion, exito, error, duracion_ms, request_body, response_status) "
                            + "VALUES (?, ?, 'POST', ?, 'select', ?, ?, ?, ?::jsonb, ?)",
                    slug, ip, tabla, exito, error, (int) duracionMs,
                    requestBodyJson == null || requestBodyJson.isBlank() ? "{}" : requestBodyJson,
                    responseStatus);
        } catch (Exception e) {
            log.error("[Nexus] Error al auditar gateway: {}", e.getMessage(), e);
        }
    }

    private String mensajeSql(DataAccessException e) {
        Throwable causa = e.getRootCause();
        if (causa instanceof SQLException sql && sql.getMessage() != null) {
            return sql.getMessage();
        }
        return e.getMessage();
    }

    /** Error de validación interno del gateway (con status HTTP asociado). */
    private static class GatewayException extends RuntimeException {
        private final int status;

        GatewayException(int status, String message) {
            super(message);
            this.status = status;
        }
    }
}
