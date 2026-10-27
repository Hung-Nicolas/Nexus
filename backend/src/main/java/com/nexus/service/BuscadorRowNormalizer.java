package com.nexus.service;

import java.sql.Date;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.postgresql.util.PGobject;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Componente responsable de la normalización y conversión de tipos SQL/PostgreSQL
 * (PGobject json/jsonb, fechas y timestamps) a estructuras Java estándar.
 */
@Component
public class BuscadorRowNormalizer {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> normalizarFilas(List<Map<String, Object>> filas) {
        List<Map<String, Object>> resultado = new ArrayList<>(filas.size());
        for (Map<String, Object> fila : filas) {
            Map<String, Object> normalizada = new LinkedHashMap<>();
            fila.forEach((clave, valor) -> normalizada.put(clave, normalizarValor(valor)));
            resultado.add(normalizada);
        }
        return resultado;
    }

    public Object normalizarValor(Object valor) {
        try {
            if (valor instanceof PGobject pg && ("jsonb".equals(pg.getType()) || "json".equals(pg.getType()))) {
                return objectMapper.readValue(pg.getValue(), new TypeReference<Map<String, Object>>() {});
            }
        } catch (Exception e) {
            return null;
        }
        if (valor instanceof Date fechaSql) {
            return fechaSql.toLocalDate().toString();
        }
        if (valor instanceof Timestamp fechaHoraSql) {
            return fechaHoraSql.toLocalDateTime().toString();
        }
        return valor;
    }
}
