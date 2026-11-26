package com.concurso.repo;

import com.concurso.domain.Plano;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanoRepository extends JpaRepository<Plano, Long> {

    Optional<Plano> findByCodigo(String codigo);

    List<Plano> findByAtivoTrueOrderByValorCentavosAsc();
}