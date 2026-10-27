package com.nexus.controller;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.nexus.exception.GlobalExceptionHandler;
import com.nexus.service.DashboardService;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        DashboardController controller = new DashboardController(dashboardService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void statsRetornaConteoDeTablas() throws Exception {
        Map<String, Object> conteos = Map.of(
                "alumnos", 500L,
                "personal", 70L,
                "cursos", 20L
        );
        when(dashboardService.obtenerStats()).thenReturn(conteos);

        mockMvc.perform(get("/api/v1/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.alumnos").value(500))
                .andExpect(jsonPath("$.stats.personal").value(70))
                .andExpect(jsonPath("$.stats.cursos").value(20));
    }
}
