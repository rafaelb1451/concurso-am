package com.concurso.repo;

import com.concurso.domain.SessaoEstudo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessaoEstudoRepository extends JpaRepository<SessaoEstudo, Long> {

    @Query("SELECT COALESCE(SUM(s.duracaoSegundos), 0) FROM SessaoEstudo s WHERE s.usuarioId = :usuarioId")
    long somarTempo(@Param("usuarioId") Long usuarioId);

    @Query("SELECT COALESCE(SUM(s.duracaoSegundos), 0) FROM SessaoEstudo s "
            + "WHERE s.usuarioId = :usuarioId AND s.materia = :materia")
    long somarTempoPorMateria(@Param("usuarioId") Long usuarioId, @Param("materia") String materia);

    void deleteByUsuarioId(Long usuarioId);

    java.util.List<SessaoEstudo> findByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);
}
