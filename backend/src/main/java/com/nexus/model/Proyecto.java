package com.nexus.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "proyectos", schema = "public")
public class Proyecto {

    @Id
    private Integer id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "api_key", nullable = false, unique = true)
    private String apiKey;

    /** JSONB: array de nombres de tabla con permiso de lectura. Se parsea en el servicio. */
    @Column(name = "permisos", nullable = false, columnDefinition = "jsonb")
    private String permisos;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "ip_permitida")
    private String ipPermitida;

    public Proyecto() {}

    public Integer getId() { return id; }
    public String getNombre() { return nombre; }
    public String getSlug() { return slug; }
    public String getApiKey() { return apiKey; }
    public String getPermisos() { return permisos; }
    public Boolean getActivo() { return activo; }
    public String getIpPermitida() { return ipPermitida; }
}
