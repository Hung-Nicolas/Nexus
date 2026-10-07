package com.nexus.exception;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> manejarApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> manejarValidacion(MethodArgumentNotValidException ex) {
        String mensaje = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("Datos inválidos");
        return ResponseEntity.badRequest().body(error(mensaje));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> manejarBodyInvalido(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(error("Body inválido"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> manejarRutaNoEncontrada(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("Ruta no encontrada"));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, Object>> manejarErrorSql(DataAccessException ex) {
        // Mapeo de códigos de error de PostgreSQL (igual que el backend Express)
        Throwable causa = ex.getRootCause();
        if (causa instanceof SQLException sql) {
            String sqlState = sql.getSQLState();
            if ("23505".equals(sqlState)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(error("El recurso ya existe"));
            }
            if ("23503".equals(sqlState)) {
                return ResponseEntity.badRequest().body(error("Violación de restricción referencial"));
            }
            if ("23514".equals(sqlState)) {
                return ResponseEntity.badRequest().body(error("Violación de restricción check"));
            }
            if ("22P02".equals(sqlState)) {
                return ResponseEntity.badRequest().body(error("Tipo de dato inválido"));
            }
        }
        log.error("[Nexus] Error de base de datos: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Error interno del servidor"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> manejarErrorGenerico(Exception ex) {
        log.error("[Nexus] Error interno: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Error interno del servidor"));
    }

    private Map<String, Object> error(String mensaje) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", mensaje);
        return body;
    }
}
