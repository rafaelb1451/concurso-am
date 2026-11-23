package com.concurso.repo;

import com.concurso.domain.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptRepository extends JpaRepository<Attempt, Long> {

    long countByAcertouTrue();
}
