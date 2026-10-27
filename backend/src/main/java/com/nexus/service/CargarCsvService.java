package com.nexus.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.nexus.exception.ApiException;

/**
 * Servicio de carga masiva de datos desde archivos CSV.
 * Solo disponible para usuarios con rol regente.
 * Ejecuta upsert atómico por PK sobre tablas de negocio.
 */
@Service
public class CargarCsvService {

    private static final Set<String> TABLAS_PERMITIDAS_CARGA = Set.of(
            "alumnos", "personal", "responsables",
            "cursos", "materias", "roles", "domicilios",
            "personal_rol", "personal_materia");

    private static final Map<String, List<String>> PKS_POR_TABLA = Map.of(
            "alumnos", List.of("id"),
            "personal", List.of("id"),
            "responsables", List.of("id"),
            "cursos", List.of("id_curso"),
            "materias", List.of("id_materia"),
            "roles", List.of("id_rol"),
            "domicilios", List.of("id_domicilio"),
            "personal_rol", List.of("id_personal", "id_rol"),
            "personal_materia", List.of("id_personal", "id_materia"));

    private static final Set<String> COLUMNAS_IGNORADAS_UPDATE = Set.of("created_at");

    private record ColumnaInfo(String nombre, String tipo) {}

    private final JdbcTemplate jdbcTemplate;

    public CargarCsvService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Procesa un archivo CSV y ejecuta upsert atómico sobre la tabla indicada.
     *
     * @param tabla   nombre de la tabla destino.
     * @param archivo archivo CSV con encabezados que coincidan con columnas de la tabla.
     * @return resultado con tabla y cantidad de filas procesadas.
     */
    @Transactional(rollbackFor = Exception.class)
    public CargarCsvResult cargarCsv(String tabla, MultipartFile archivo) {
        validarIdentificador(tabla);
        if (!TABLAS_PERMITIDAS_CARGA.contains(tabla)) {
            throw new ApiException(400, "Tabla no permitida para carga: " + tabla);
        }
        if (archivo == null || archivo.isEmpty()) {
            throw new ApiException(400, "El archivo CSV está vacío");
        }

        aplicarContextoServiceRole();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(archivo.getInputStream(), StandardCharsets.UTF_8))) {

            String lineaEncabezados = reader.readLine();
            if (lineaEncabezados == null || lineaEncabezados.isBlank()) {
                throw new ApiException(400, "El CSV no tiene encabezados");
            }

            List<String> columnasCsv = parsearLinea(lineaEncabezados);
            if (columnasCsv.isEmpty()) {
                throw new ApiException(400, "El CSV no tiene columnas");
            }

            List<ColumnaInfo> columnasTabla = obtenerColumnasTabla(tabla);
            List<String> nombresColumnasTabla = columnasTabla.stream()
                    .map(ColumnaInfo::nombre)
                    .toList();
            List<String> pks = PKS_POR_TABLA.get(tabla);
            validarColumnas(columnasCsv, nombresColumnasTabla, pks);
            boolean esRelacion = pks.size() > 1;
            String sqlUpsert = construirUpsert(tabla, columnasCsv, pks, esRelacion);

            List<Object[]> filas = new ArrayList<>();
            String linea;
            int numeroFila = 2; // fila 1 es encabezado
            while ((linea = reader.readLine()) != null) {
                if (linea.isBlank()) {
                    numeroFila++;
                    continue;
                }
                // Normalizar terminación CRLF
                if (linea.endsWith("\r")) {
                    linea = linea.substring(0, linea.length() - 1);
                }
                List<String> valores = parsearLinea(linea);
                if (valores.size() != columnasCsv.size()) {
                    throw new ApiException(400,
                            "Fila " + numeroFila + ": la cantidad de columnas no coincide con el encabezado");
                }
                Object[] filaConvertida = new Object[valores.size()];
                for (int j = 0; j < valores.size(); j++) {
                    String tipo = columnasTabla.get(j).tipo();
                    filaConvertida[j] = convertirValor(valores.get(j), tipo, numeroFila, columnasCsv.get(j));
                }
                filas.add(filaConvertida);
                numeroFila++;
            }

            if (filas.isEmpty()) {
                throw new ApiException(400, "El CSV no contiene filas de datos");
            }

            jdbcTemplate.batchUpdate(sqlUpsert, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    Object[] fila = filas.get(i);
                    for (int j = 0; j < fila.length; j++) {
                        ps.setObject(j + 1, fila[j]);
                    }
                }

                @Override
                public int getBatchSize() {
                    return filas.size();
                }
            });

            ajustarSecuenciaSiCorresponde(tabla, pks.get(0));

            return new CargarCsvResult(tabla, filas.size(), "Carga completada correctamente");

        } catch (IOException e) {
            throw new ApiException(500, "Error leyendo el archivo: " + e.getMessage());
        }
    }

    private void aplicarContextoServiceRole() {
        jdbcTemplate.queryForObject(
                "SELECT set_config('app.current_role', 'service_role', true)", String.class);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof String userId) {
            jdbcTemplate.queryForObject(
                    "SELECT set_config('app.current_user_id', ?, true)", String.class, userId);
        }
    }

    private List<ColumnaInfo> obtenerColumnasTabla(String tabla) {
        return jdbcTemplate.query(
                "SELECT column_name, data_type FROM information_schema.columns " +
                        "WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position",
                (rs, rowNum) -> new ColumnaInfo(rs.getString("column_name"), rs.getString("data_type")),
                tabla);
    }

    private void validarColumnas(List<String> columnasCsv, List<String> columnasTabla, List<String> pks) {
        Set<String> invalidas = columnasCsv.stream()
                .filter(c -> !columnasTabla.contains(c))
                .collect(Collectors.toSet());
        if (!invalidas.isEmpty()) {
            throw new ApiException(400,
                    "Columnas inválidas en el CSV: " + String.join(", ", invalidas));
        }

        if (!columnasCsv.containsAll(pks)) {
            throw new ApiException(400,
                    "El CSV debe incluir las columnas PK: " + String.join(", ", pks));
        }
    }

    private String construirUpsert(String tabla, List<String> columnas, List<String> pks, boolean esRelacion) {
        String columnasSql = String.join(", ", columnas);
        String placeholders = String.join(", ", Collections.nCopies(columnas.size(), "?"));
        String conflict = String.join(", ", pks);

        StringBuilder sql = new StringBuilder();
        sql.append("INSERT INTO public.").append(tabla)
                .append(" (").append(columnasSql).append(")")
                .append(" VALUES (").append(placeholders).append(")")
                .append(" ON CONFLICT (").append(conflict).append(")");

        if (esRelacion) {
            sql.append(" DO NOTHING");
        } else {
            String update = columnas.stream()
                    .filter(c -> !pks.contains(c) && !COLUMNAS_IGNORADAS_UPDATE.contains(c))
                    .map(c -> c + " = EXCLUDED." + c)
                    .collect(Collectors.joining(", "));
            if (update.isEmpty()) {
                sql.append(" DO NOTHING");
            } else {
                sql.append(" DO UPDATE SET ").append(update);
            }
        }

        return sql.toString();
    }

    private void ajustarSecuenciaSiCorresponde(String tabla, String pk) {
        String seq = jdbcTemplate.queryForObject(
                "SELECT pg_get_serial_sequence('public." + tabla + "', ?)", String.class, pk);
        if (seq != null) {
            jdbcTemplate.execute(
                    "SELECT setval('" + seq + "', COALESCE((SELECT MAX(" + pk + ") FROM public." + tabla + "), 1))");
        }
    }

    private Object convertirValor(String valor, String tipo, int numeroFila, String columna) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        String tipoLower = tipo.toLowerCase();
        try {
            if (tipoLower.contains("int")) {
                return Long.parseLong(valor.trim());
            }
            if ("uuid".equals(tipoLower)) {
                return UUID.fromString(valor.trim());
            }
            if ("date".equals(tipoLower)) {
                return Date.valueOf(valor.trim());
            }
            if (tipoLower.contains("timestamp")) {
                return Timestamp.valueOf(valor.trim());
            }
            if ("boolean".equals(tipoLower) || "bool".equals(tipoLower)) {
                return Boolean.parseBoolean(valor.trim());
            }
            if (tipoLower.contains("numeric") || tipoLower.contains("decimal") || tipoLower.contains("real") || tipoLower.contains("double")) {
                return new BigDecimal(valor.trim());
            }
            return valor;
        } catch (IllegalArgumentException e) {
            throw new ApiException(400,
                    "Fila " + numeroFila + ", columna '" + columna + "': valor inválido para tipo " + tipo);
        }
    }

    private List<String> parsearLinea(String linea) {
        List<String> campos = new ArrayList<>();
        StringBuilder actual = new StringBuilder();
        boolean enComillas = false;

        for (int i = 0; i < linea.length(); i++) {
            char c = linea.charAt(i);
            if (c == '"') {
                if (enComillas && i + 1 < linea.length() && linea.charAt(i + 1) == '"') {
                    actual.append('"');
                    i++;
                } else {
                    enComillas = !enComillas;
                }
            } else if (c == ',' && !enComillas) {
                campos.add(actual.toString());
                actual.setLength(0);
            } else {
                actual.append(c);
            }
        }
        campos.add(actual.toString());
        return campos;
    }

    private void validarIdentificador(String tabla) {
        if (tabla == null || !tabla.matches("^[a-zA-Z_][a-zA-Z0-9_]*$")) {
            throw new ApiException(400, "Identificador de tabla inválido: " + tabla);
        }
    }

    /**
     * Resultado de una carga CSV exitosa.
     */
    public record CargarCsvResult(String tabla, int filasProcesadas, String mensaje) {}
}
