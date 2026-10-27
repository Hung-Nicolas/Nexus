package com.nexus.exception;

import java.sql.SQLException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void manejaApiExceptionConStatusYMensaje() {
        ApiException ex = new ApiException(403, "Acceso denegado");
        ResponseEntity<Map<String, Object>> response = handler.manejarApiException(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Acceso denegado", response.getBody().get("error"));
    }

    @Test
    void manejaErrorSqlClaveDuplicada23505ComoConflict() {
        SQLException sqlEx = new SQLException("duplicate key", "23505");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("error", sqlEx);

        ResponseEntity<Map<String, Object>> response = handler.manejarErrorSql(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("El recurso ya existe", response.getBody().get("error"));
    }

    @Test
    void manejaErrorSqlRestriccionReferencial23503ComoBadRequest() {
        SQLException sqlEx = new SQLException("foreign key violation", "23503");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("error", sqlEx);

        ResponseEntity<Map<String, Object>> response = handler.manejarErrorSql(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Violación de restricción referencial", response.getBody().get("error"));
    }

    @Test
    void manejaErrorSqlTipoDatoInvalido22P02ComoBadRequest() {
        SQLException sqlEx = new SQLException("invalid input syntax for type uuid", "22P02");
        DataIntegrityViolationException ex = new DataIntegrityViolationException("error", sqlEx);

        ResponseEntity<Map<String, Object>> response = handler.manejarErrorSql(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Tipo de dato inválido", response.getBody().get("error"));
    }

    @Test
    void manejaErrorGenericoComo500() {
        RuntimeException ex = new RuntimeException("Falla inesperada");

        ResponseEntity<Map<String, Object>> response = handler.manejarErrorGenerico(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Error interno del servidor", response.getBody().get("error"));
    }
}
