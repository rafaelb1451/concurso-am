package com.concurso.repo;

import com.concurso.domain.Sessao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessaoRepository extends JpaRepository<Sessao, String> {
    void deleteByUsuarioId(Long usuarioId);
}
