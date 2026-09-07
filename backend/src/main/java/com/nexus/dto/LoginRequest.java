package com.nexus.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Email inválido")
        @Email(message = "Email inválido")
        String email,

        @NotBlank(message = "La contraseña debe tener al menos 6 caracteres")
        @Size(min = 6, message = "La contraseña debe tener al menos 6 caracteres")
        String password) {}
