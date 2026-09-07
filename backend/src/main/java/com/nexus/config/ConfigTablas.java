package com.nexus.config;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.nexus.exception.ApiException;

/**
 * Configuración declarativa de las tablas accesibles desde el buscador.
 * Debe mantenerse sincronizada con src/app.js del frontend.
 */
@Component
public class ConfigTablas {

    /** Relación: clave foránea → tabla relacionada proyectada como objeto JSON. */
    public record Relacion(String fk, String tabla, String pk, List<String> campos) {}

    public record Orden(String columna, boolean ascendente) {}

    public record ConfigTabla(
            String titulo,
            List<String> campos,
            Orden orden,
            List<String> buscarEn,
            List<Relacion> relaciones,
            String pk) {}

    public static final Set<String> TABLAS_PERMITIDAS_BUSCADOR = Set.of(
            "alumnos", "responsables", "personal", "cursos", "materias", "roles", "domicilios");

    public static final Set<String> TABLAS_PERMITIDAS_GATEWAY = Set.of(
            "alumnos", "responsables", "personal", "cursos", "materias",
            "personal_materia", "personal_rol", "roles", "domicilios");

    private static final List<String> CAMPOS_DOMICILIO = List.of("calle", "numero", "departamento", "localidad");

    private final Map<String, ConfigTabla> tablas = Map.of(
            "alumnos", new ConfigTabla(
                    "Alumnos",
                    List.of("id", "dni", "nombre", "apellido", "email", "email_padre", "telefono",
                            "fecha_nacimiento", "genero", "nacionalidad", "id_domicilio", "id_curso"),
                    new Orden("apellido", true),
                    List.of("nombre", "apellido", "email"),
                    List.of(
                            new Relacion("id_curso", "cursos", "id_curso",
                                    List.of("anio", "division", "turno", "especialidad")),
                            new Relacion("id_domicilio", "domicilios", "id_domicilio", CAMPOS_DOMICILIO)),
                    "id"),
            "responsables", new ConfigTabla(
                    "Responsables",
                    List.of("id", "id_alumno", "nombre", "apellido", "telefono", "email",
                            "fecha_nacimiento", "genero", "nacionalidad", "vinculo", "id_domicilio"),
                    new Orden("apellido", true),
                    List.of("nombre", "apellido", "email", "telefono"),
                    List.of(
                            new Relacion("id_alumno", "alumnos", "id", List.of("nombre", "apellido", "dni")),
                            new Relacion("id_domicilio", "domicilios", "id_domicilio", CAMPOS_DOMICILIO)),
                    "id"),
            "personal", new ConfigTabla(
                    "Personal",
                    List.of("id", "dni", "nombre", "apellido", "email", "telefono",
                            "fecha_nacimiento", "genero", "nacionalidad", "id_domicilio"),
                    new Orden("apellido", true),
                    List.of("nombre", "apellido", "email"),
                    List.of(new Relacion("id_domicilio", "domicilios", "id_domicilio", CAMPOS_DOMICILIO)),
                    "id"),
            "cursos", new ConfigTabla(
                    "Cursos",
                    List.of("id_curso", "anio", "division", "turno", "especialidad"),
                    new Orden("anio", true),
                    List.of("division", "turno", "especialidad"),
                    List.of(),
                    "id_curso"),
            "materias", new ConfigTabla(
                    "Materias",
                    List.of("id_materia", "nombre", "descripcion"),
                    new Orden("nombre", true),
                    List.of("nombre", "descripcion"),
                    List.of(),
                    "id_materia"),
            "roles", new ConfigTabla(
                    "Roles",
                    List.of("id_rol", "nombre", "descripcion"),
                    new Orden("nombre", true),
                    List.of("nombre", "descripcion"),
                    List.of(),
                    "id_rol"),
            "domicilios", new ConfigTabla(
                    "Domicilios",
                    List.of("id_domicilio", "calle", "numero", "departamento", "localidad"),
                    new Orden("calle", true),
                    List.of("calle", "localidad", "departamento"),
                    List.of(),
                    "id_domicilio"));

    public boolean esTablaPermitidaBuscar(String tabla) {
        return TABLAS_PERMITIDAS_BUSCADOR.contains(tabla);
    }

    public boolean esTablaPermitidaGateway(String tabla) {
        return TABLAS_PERMITIDAS_GATEWAY.contains(tabla);
    }

    /** Devuelve la config de la tabla o lanza 400 "Tabla no permitida". */
    public ConfigTabla obtenerConfig(String tabla) {
        return Optional.ofNullable(tablas.get(tabla))
                .filter(c -> TABLAS_PERMITIDAS_BUSCADOR.contains(tabla))
                .orElseThrow(() -> new ApiException(400, "Tabla no permitida"));
    }
}
