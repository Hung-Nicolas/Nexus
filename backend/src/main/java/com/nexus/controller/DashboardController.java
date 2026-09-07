package com.nexus.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nexus.service.DashboardService;

@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/api/v1/stats")
    public Map<String, Object> stats() {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("stats", dashboardService.obtenerStats());
        return respuesta;
    }
}
