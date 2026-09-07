package com.nexus.dto;

/** Usuario tal como se expone al frontend (sin password_hash). */
public record UsuarioResponse(String id, String email, String nombre, String apellido, String rol) {}
