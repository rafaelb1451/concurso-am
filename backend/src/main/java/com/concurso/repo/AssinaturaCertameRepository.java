package com.concurso.repo;

import com.concurso.domain.AssinaturaCertame;
import com.concurso.domain.AssinaturaCertameId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AssinaturaCertameRepository extends JpaRepository<AssinaturaCertame, AssinaturaCertameId> {

    List<AssinaturaCertame> findByAssinaturaIdOrderByConcursoAsc(Long assinaturaId);

    List<AssinaturaCertame> findByAssinaturaId(Long assinaturaId);

    long countByAssinaturaId(Long assinaturaId);

    void deleteByAssinaturaId(Long assinaturaId);

    /** DELETE em lote executado na hora, antes de reinserir o novo conjunto. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM AssinaturaCertame a WHERE a.assinaturaId = :assinaturaId")
    int apagarPorAssinatura(@Param("assinaturaId") Long assinaturaId);
}
