package com.nexus.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.nexus.exception.ApiException;

class ConfigTablasTest {

    private final ConfigTablas configTablas = new ConfigTablas();

    @Test
    void whitelistBuscadorTieneLasSieteTablas() {
        assertEquals(7, ConfigTablas.TABLAS_PERMITIDAS_BUSCADOR.size());
        assertTrue(configTablas.esTablaPermitidaBuscar("alumnos"));
        assertFalse(configTablas.esTablaPermitidaBuscar("usuarios"));
    }

    @Test
    void whitelistGatewayTieneNueveTablas() {
        assertEquals(9, ConfigTablas.TABLAS_PERMITIDAS_GATEWAY.size());
        assertTrue(configTablas.esTablaPermitidaGateway("personal_materia"));
        assertFalse(configTablas.esTablaPermitidaGateway("api_logs"));
    }

    @Test
    void configExisteParaTodasLasTablasDelBuscador() {
        for (String tabla : ConfigTablas.TABLAS_PERMITIDAS_BUSCADOR) {
            assertFalse(configTablas.obtenerConfig(tabla).campos().isEmpty());
        }
    }

    @Test
    void tablaNoPermitidaLanza400() {
        ApiException ex = assertThrows(ApiException.class, () -> configTablas.obtenerConfig("usuarios"));
        assertEquals(400, ex.getStatus());
        assertEquals("Tabla no permitida", ex.getMessage());
    }

    @Test
    void alumnosTieneDosRelaciones() {
        assertEquals(2, configTablas.obtenerConfig("alumnos").relaciones().size());
    }
}
