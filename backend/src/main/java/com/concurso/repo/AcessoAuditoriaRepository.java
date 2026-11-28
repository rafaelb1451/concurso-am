package com.concurso.repo;

import com.concurso.domain.AcessoAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface AcessoAuditoriaRepository extends JpaRepository<AcessoAuditoria, Long> {

    boolean existsByUsuarioIdAndRecursoAndPermitidoTrueAndCriadaEmGreaterThanEqual(
            Long usuarioId, String recurso, Instant desde);

    long countByUsuarioIdAndRecursoAndPermitidoTrueAndCriadaEmGreaterThanEqual(
            Long usuarioId, String recurso, Instant desde);
}
