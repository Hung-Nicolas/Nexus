package com.nexus.dto;

import java.util.LinkedHashMap;

/**
 * Body del gateway: {"tabla", "datos": {"campos", "filtros", "orden", "limite", "offset"}}.
 * Todos los campos de datos son opcionales (campos default "*", limite default 100).
 */
public record GatewayRequest(
        String tabla,
        DatosGateway datos) {

    public record DatosGateway(
            String campos,
            LinkedHashMap<String, Object> filtros,
            OrdenGateway orden,
            Integer limite,
            Integer offset) {}

    public record OrdenGateway(String columna, Boolean ascendente) {}
}
