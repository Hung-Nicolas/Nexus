package com.nexus.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.nexus.service.InsertarService;

/**
 * Endpoints para alta manual de registros en tablas de negocio.
 * Requiere autenticación JWT (cualquier usuario autenticado puede insertar).
 */
@RestController
public class InsertarController {

    private final InsertarService insertarService;

    public InsertarController(InsertarService insertarService) {
        this.insertarService = insertarService;
    }

    @PostMapping("/api/v1/tablas/{tabla}")
    public ResponseEntity<Map<String, Object>> insertar(
            @PathVariable String tabla,
            @RequestBody Map<String, Object> datos) {
        Map<String, Object> data = insertarService.insertar(tabla, datos);
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("data", data);
        return ResponseEntity.ok(respuesta);
    }

    @GetMapping("/api/v1/tablas/{tabla}/opciones")
    public ResponseEntity<Map<String, Object>> opciones(@PathVariable String tabla) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("opciones", insertarService.opcionesFk(tabla));
        return ResponseEntity.ok(respuesta);
    }
}
