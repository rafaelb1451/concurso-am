package com.concurso.repo;

import com.concurso.domain.MaterialEstudo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MaterialEstudoRepository extends JpaRepository<MaterialEstudo, Long> {

    List<MaterialEstudo> findByConcursoOrderByOrdemAsc(String concurso);

    List<MaterialEstudo> findAllByOrderByConcursoAscOrdemAsc();

    Optional<MaterialEstudo> findBySlug(String slug);
}
