package com.nexus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.util.List;

import org.junit.jupiter.api.Test;

class ExportarServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void tablasExportarIncluyenNegocioYRelaciones() throws Exception {
        Field field = ExportarService.class.getDeclaredField("TABLAS_EXPORTAR");
        field.setAccessible(true);
        List<String> tablas = (List<String>) field.get(null);

        assertEquals(9, tablas.size());
        assertTrue(tablas.contains("alumnos"));
        assertTrue(tablas.contains("personal"));
        assertTrue(tablas.contains("responsables"));
        assertTrue(tablas.contains("cursos"));
        assertTrue(tablas.contains("materias"));
        assertTrue(tablas.contains("roles"));
        assertTrue(tablas.contains("domicilios"));
        assertTrue(tablas.contains("personal_rol"));
        assertTrue(tablas.contains("personal_materia"));
    }
}
