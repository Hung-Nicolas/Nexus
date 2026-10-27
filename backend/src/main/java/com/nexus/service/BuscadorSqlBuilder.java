package com.nexus.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.nexus.config.ConfigTablas.ConfigTabla;
import com.nexus.config.ConfigTablas.Relacion;
import com.nexus.exception.ApiException;

/**
 * Componente responsable exclusivamente de la generación segura de sentencias SQL
 * dinámicas para el buscador de Nexus (principio de responsabilidad única - SRP).
 */
@Component
public class BuscadorSqlBuilder {

    public static final Pattern CAMPO_VALIDO = Pattern.compile("^[a-zA-Z0-9_]+$");

    public String selectConRelaciones(String tabla, ConfigTabla config) {
        StringBuilder select = new StringBuilder();
        for (String campo : config.campos()) {
            if (select.length() > 0) {
                select.append(", ");
            }
            select.append(tabla).append(".").append(campo);
        }
        for (Relacion rel : config.relaciones()) {
            StringBuilder obj = new StringBuilder("jsonb_build_object(");
            for (String c : rel.campos()) {
                if (obj.length() > "jsonb_build_object(".length()) {
                    obj.append(", ");
                }
                obj.append("'").append(c).append("', ").append(rel.tabla()).append(".").append(c);
            }
            obj.append(") AS ").append(rel.tabla());
            select.append(", ").append(obj);
        }
        return select.toString();
    }

    public String joins(String tabla, ConfigTabla config) {
        StringBuilder joins = new StringBuilder();
        for (Relacion rel : config.relaciones()) {
            joins.append(" LEFT JOIN public.").append(rel.tabla()).append(" ").append(rel.tabla())
                    .append(" ON ").append(rel.tabla()).append(".").append(rel.pk())
                    .append(" = ").append(tabla).append(".").append(rel.fk());
        }
        return joins.toString();
    }

    public void construirWhere(String tabla, ConfigTabla config, String termino,
                               Map<String, String> filtros, StringBuilder where, List<Object> params) {
        List<String> conditions = new ArrayList<>();

        if (termino != null && !termino.isBlank()) {
            List<String> or = new ArrayList<>();
            if (termino.matches("\\d+")) {
                long num = Long.parseLong(termino);
                if ("alumnos".equals(tabla) || "personal".equals(tabla)) {
                    or.add(tabla + ".dni = ?");
                    params.add(num);
                } else if ("cursos".equals(tabla)) {
                    or.add(tabla + ".anio = ?");
                    params.add(num);
                } else if ("domicilios".equals(tabla)) {
                    or.add(tabla + ".numero = ?");
                    params.add(num);
                }
            }

            String pattern = "%" + escaparIlike(termino) + "%";
            for (String campo : config.buscarEn()) {
                or.add(tabla + "." + campo + " ILIKE ?");
                params.add(pattern);
            }

            if (!or.isEmpty()) {
                conditions.add("(" + String.join(" OR ", or) + ")");
            }
        }

        if (filtros != null) {
            for (Map.Entry<String, String> entry : filtros.entrySet()) {
                String value = entry.getValue();
                if (value == null || value.isEmpty()) {
                    continue;
                }
                if (!CAMPO_VALIDO.matcher(entry.getKey()).matches()) {
                    throw new ApiException(400, "Filtro inválido: " + entry.getKey());
                }
                // ::text para comparar contra columnas int/uuid/text con el mismo parámetro
                conditions.add(tabla + "." + entry.getKey() + "::text = ?");
                params.add(value);
            }
        }

        where.append(String.join(" AND ", conditions));
    }

    public String escaparIlike(String termino) {
        return termino.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
