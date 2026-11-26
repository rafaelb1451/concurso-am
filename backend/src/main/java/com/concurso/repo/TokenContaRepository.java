package com.concurso.repo;

import com.concurso.domain.TokenConta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TokenContaRepository extends JpaRepository<TokenConta, Long> {

    Optional<TokenConta> findByTokenHashAndTipo(String tokenHash, String tipo);

    void deleteByUsuarioId(Long usuarioId);
}
