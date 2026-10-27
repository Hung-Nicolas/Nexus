package com.nexus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

class CargarCsvServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void tablasCargaIncluyenNegocioYRelaciones() throws Exception {
        Field field = CargarCsvService.class.getDeclaredField("TABLAS_PERMITIDAS_CARGA");
        field.setAccessible(true);
        Set<String> tablas = (Set<String>) field.get(null);

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

    @Test
    @SuppressWarnings("unchecked")
    void pksPorTablaCoincidenConEsquema() throws Exception {
        Field field = CargarCsvService.class.getDeclaredField("PKS_POR_TABLA");
        field.setAccessible(true);
        java.util.Map<String, List<String>> pks = (java.util.Map<String, List<String>>) field.get(null);

        assertEquals(List.of("id"), pks.get("alumnos"));
        assertEquals(List.of("id_curso"), pks.get("cursos"));
        assertEquals(List.of("id_personal", "id_rol"), pks.get("personal_rol"));
        assertEquals(List.of("id_personal", "id_materia"), pks.get("personal_materia"));
    }
}
