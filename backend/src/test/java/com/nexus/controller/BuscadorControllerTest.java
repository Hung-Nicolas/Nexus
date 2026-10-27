package com.nexus.controller;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.nexus.exception.GlobalExceptionHandler;
import com.nexus.service.BuscadorService;

@ExtendWith(MockitoExtension.class)
class BuscadorControllerTest {

    @Mock
    private BuscadorService buscadorService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        BuscadorController controller = new BuscadorController(buscadorService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void buscarRetornaListaDeRegistros() throws Exception {
        when(buscadorService.buscar(eq("alumnos"), eq("Perez"), any(), eq(15)))
                .thenReturn(List.of(Map.of("id", "uuid-1", "nombre", "Santiago", "apellido", "Perez")));

        mockMvc.perform(get("/api/v1/buscar/alumnos?term=Perez&limite=15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].nombre").value("Santiago"))
                .andExpect(jsonPath("$.data[0].apellido").value("Perez"));
    }

    @Test
    void detalleRetornaRegistroIndividual() throws Exception {
        when(buscadorService.detalle("alumnos", "id", "uuid-1"))
                .thenReturn(Map.of("id", "uuid-1", "nombre", "Santiago"));

        mockMvc.perform(get("/api/v1/registros/alumnos/id/uuid-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nombre").value("Santiago"));
    }

    @Test
    void opcionesFiltrosRetornaMapaDeOpciones() throws Exception {
        when(buscadorService.opcionesFiltros("cursos"))
                .thenReturn(Map.of("cursos.especialidad", List.of("Computación")));

        mockMvc.perform(get("/api/v1/tablas/cursos/opciones-filtros"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opciones['cursos.especialidad'][0]").value("Computación"));
    }
}
