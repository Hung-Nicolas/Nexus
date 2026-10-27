package com.nexus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.util.Set;

import org.junit.jupiter.api.Test;

class InsertarServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void columnasIgnoradasSoloContieneCreatedAt() throws Exception {
        Field field = InsertarService.class.getDeclaredField("COLUMNAS_IGNORADAS");
        field.setAccessible(true);
        Set<String> ignoradas = (Set<String>) field.get(null);

        assertEquals(1, ignoradas.size());
        assertTrue(ignoradas.contains("created_at"));
    }

    @Test
    void campoValidoAceptaIdentificadoresSql() {
        assertTrue("alumnos".matches("^[a-zA-Z0-9_]+$"));
        assertTrue("id_domicilio".matches("^[a-zA-Z0-9_]+$"));
        assertFalse("alumnos; DROP".matches("^[a-zA-Z0-9_]+$"));
        assertFalse("".matches("^[a-zA-Z0-9_]+$"));
    }
}
