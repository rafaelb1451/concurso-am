package com.concurso.repo;

import com.concurso.domain.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByMateriaOrderByIdAsc(String materia);

    List<Question> findByMateriaAndAssuntoOrderByIdAsc(String materia, String assunto);
}
