package com.nexus.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Time;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.nexus.exception.ApiException;

/**
 * Genera una exportación en ZIP con un CSV por cada tabla de negocio.
 * Solo está disponible para usuarios con rol regente.
 */
@Service
public class ExportarService {

    private static final List<String> TABLAS_EXPORTAR = List.of(
            // Tablas catálogo sin dependencias primero
            "domicilios", "cursos", "roles", "materias",
            // Entidades principales
            "alumnos", "personal", "responsables",
            // Tablas de relación al final
            "personal_rol", "personal_materia");

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    public ExportarService(JdbcTemplate jdbcTemplate, TransactionTemplate transactionTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
    }

    /**
     * Exporta todas las tablas de negocio a un archivo ZIP en memoria.
     *
     * @return bytes del ZIP con un CSV por tabla.
     */
    public byte[] exportarTodo() {
        return transactionTemplate.execute(tx -> {
            aplicarContextoUsuario();

            try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                 ZipOutputStream zos = new ZipOutputStream(baos)) {

                for (String tabla : TABLAS_EXPORTAR) {
                    List<String> columnas = obtenerColumnas(tabla);
                    byte[] csv = generarCsv(tabla, columnas);

                    ZipEntry entry = new ZipEntry(tabla + ".csv");
                    zos.putNextEntry(entry);
                    zos.write(csv);
                    zos.closeEntry();
                }

                zos.finish();
                return baos.toByteArray();
            } catch (IOException e) {
                throw new ApiException(500, "Error al generar la exportación: " + e.getMessage());
            }
        });
    }

    public String generarNombreArchivo() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        return "nexus-export-" + timestamp + ".zip";
    }

    private List<String> obtenerColumnas(String tabla) {
        validarIdentificador(tabla);
        return jdbcTemplate.query("SELECT * FROM public." + tabla + " LIMIT 0", (ResultSet rs) -> {
            ResultSetMetaData metaData = rs.getMetaData();
            List<String> columnas = new ArrayList<>();
            for (int i = 1; i <= metaData.getColumnCount(); i++) {
                columnas.add(metaData.getColumnLabel(i));
            }
            return columnas;
        });
    }

    private byte[] generarCsv(String tabla, List<String> columnas) {
        validarIdentificador(tabla);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8)) {

            // Encabezado
            writer.write(lineaCsv(columnas));
            writer.write('\n');

            // Filas
            jdbcTemplate.query("SELECT * FROM public." + tabla, new RowCallbackHandler() {
                @Override
                public void processRow(ResultSet rs) throws SQLException {
                    List<String> valores = new ArrayList<>(columnas.size());
                    for (int i = 1; i <= columnas.size(); i++) {
                        Object valor = rs.getObject(i);
                        valores.add(valor == null ? "" : formatearValor(valor));
                    }
                    try {
                        writer.write(lineaCsv(valores));
                        writer.write('\n');
                    } catch (IOException e) {
                        throw new RuntimeException("Error escribiendo fila de CSV", e);
                    }
                }
            });

            writer.flush();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new ApiException(500, "Error generando CSV para " + tabla + ": " + e.getMessage());
        }
    }

    private String lineaCsv(List<String> valores) {
        return String.join(",", valores);
    }

    private String formatearValor(Object valor) {
        String texto;
        if (valor instanceof java.sql.Date fechaSql) {
            texto = fechaSql.toLocalDate().toString();
        } else if (valor instanceof java.sql.Timestamp ts) {
            texto = ts.toLocalDateTime().toString();
        } else if (valor instanceof java.sql.Time time) {
            texto = time.toLocalTime().toString();
        } else {
            texto = valor.toString();
        }
        return escaparCsv(texto);
    }

    private String escaparCsv(String valor) {
        boolean requiereEscape = valor.contains(",") || valor.contains("\"") || valor.contains("\n") || valor.contains("\r");
        if (!requiereEscape) {
            return valor;
        }
        String conComillasEscapadas = valor.replace("\"", "\"\"");
        return "\"" + conComillasEscapadas + "\"";
    }

    private void validarIdentificador(String tabla) {
        if (tabla == null || !tabla.matches("^[a-zA-Z_][a-zA-Z0-9_]*$")) {
            throw new ApiException(400, "Identificador de tabla inválido: " + tabla);
        }
    }

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
