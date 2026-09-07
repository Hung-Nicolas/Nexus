package com.nexus.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nexus.service.BuscadorService;

@RestController
public class BuscadorController {

    private final BuscadorService buscadorService;

    public BuscadorController(BuscadorService buscadorService) {
        this.buscadorService = buscadorService;
    }

    @GetMapping("/api/v1/buscar/{tabla}")
    public Map<String, Object> buscar(@PathVariable String tabla, @RequestParam Map<String, String> params) {
        Map<String, String> filtros = new LinkedHashMap<>(params);
        String termino = filtros.remove("term");
        Integer limite = parsearEntero(filtros.remove("limite"));

        List<Map<String, Object>> data = buscadorService.buscar(tabla, termino, filtros, limite);
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("data", data);
        return respuesta;
    }

    @GetMapping("/api/v1/registros/{tabla}/{campo}/{id}")
    public Map<String, Object> detalle(@PathVariable String tabla, @PathVariable String campo,
                                       @PathVariable String id) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("data", buscadorService.detalle(tabla, campo, id));
        return respuesta;
    }

    @GetMapping("/api/v1/tablas/{tabla}/opciones-filtros")
    public Map<String, Object> opcionesFiltros(@PathVariable String tabla) {
        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("opciones", buscadorService.opcionesFiltros(tabla));
        return respuesta;
    }

    private Integer parsearEntero(String valor) {
        if (valor == null) {
            return null;
        }
        try {
            return Integer.parseInt(valor);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
