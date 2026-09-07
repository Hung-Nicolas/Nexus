package com.nexus.exception;

/**
 * Excepción de dominio con código HTTP y mensaje en español.
 * El GlobalExceptionHandler la convierte en {"error": mensaje}.
 */
public class ApiException extends RuntimeException {

    private final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
