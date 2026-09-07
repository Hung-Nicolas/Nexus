package com.nexus.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.nexus.model.RefreshToken;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /** Token válido: no usado, no vencido y con usuario activo. */
    @Query("SELECT r FROM RefreshToken r JOIN FETCH r.usuario u "
            + "WHERE r.tokenHash = :hash AND r.expiresAt > CURRENT_TIMESTAMP "
            + "AND r.usedAt IS NULL AND u.activo = true")
    Optional<RefreshToken> findValido(@Param("hash") String hash);

    void deleteByTokenHash(String tokenHash);
}
