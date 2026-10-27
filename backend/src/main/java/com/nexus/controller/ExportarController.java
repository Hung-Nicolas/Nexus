package com.nexus.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nexus.service.ExportarService;

/**
 * Endpoint de exportación masiva de datos.
 * Genera un ZIP con un CSV por cada tabla de negocio.
 */
@RestController
public class ExportarController {

    private final ExportarService exportarService;

    public ExportarController(ExportarService exportarService) {
        this.exportarService = exportarService;
    }

    @GetMapping("/api/v1/exportar")
    @PreAuthorize("hasRole('regente')")
    public ResponseEntity<byte[]> exportarTodo() {
        byte[] zip = exportarService.exportarTodo();
        String nombreArchivo = exportarService.generarNombreArchivo();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                .body(zip);
    }
}
