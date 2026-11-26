package com.concurso.repo;

import com.concurso.domain.IdentidadeExterna;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IdentidadeExternaRepository extends JpaRepository<IdentidadeExterna, Long> {

    Optional<IdentidadeExterna> findByProviderAndProviderSubject(String provider, String providerSubject);

    List<IdentidadeExterna> findByUsuarioId(Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);
}
