package com.nexus.dto;

public record TokenResponse(String accessToken, String refreshToken, UsuarioResponse usuario) {}
