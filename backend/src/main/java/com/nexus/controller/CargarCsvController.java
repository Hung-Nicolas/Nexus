package com.nexus.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.nexus.service.CargarCsvService;
import com.nexus.service.CargarCsvService.CargarCsvResult;

/**
 * Endpoint de carga masiva de datos desde CSV.
 * Solo disponible para usuarios con rol regente.
 */
@RestController
public class CargarCsvController {

    private final CargarCsvService cargarCsvService;

    public CargarCsvController(CargarCsvService cargarCsvService) {
        this.cargarCsvService = cargarCsvService;
    }

    @PostMapping("/api/v1/cargar-csv")
    @PreAuthorize("hasRole('regente')")
    public ResponseEntity<CargarCsvResult> cargarCsv(
            @RequestParam("tabla") String tabla,
            @RequestParam("archivo") MultipartFile archivo) {
        CargarCsvResult resultado = cargarCsvService.cargarCsv(tabla, archivo);
        return ResponseEntity.ok(resultado);
    }
}
