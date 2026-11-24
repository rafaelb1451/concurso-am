package com.concurso.service;

import com.concurso.domain.Origem;
import com.concurso.domain.Question;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.QuestionRepository;
import com.concurso.web.Dtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SimuladoServiceTest {

    @Mock
    private QuestionRepository questions;

    @Mock
    private AttemptRepository attempts;

    private SimuladoService service;

    @BeforeEach
    void setUp() {
        service = new SimuladoService(questions, attempts);
    }

    @Test
    void montarRejeitaConcursoDesconhecido() {
        assertThrows(IllegalArgumentException.class, () -> service.montar("XX"));
    }

    @Test
    void montarAvisaQuandoFaltamQuestoesDeAlgumaMateria() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 10; id++) {
            banco.add(question(id, "Língua Portuguesa"));
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView simulado = service.montar("PM-AM");

        assertEquals(60, simulado.totalPrevisto());
        assertEquals(10, simulado.totalGerado());
        assertTrue(simulado.avisos().size() >= 5, "cinco materias devem ficar sem questões");
    }

    @Test
    void corrigirRegistraTentativasEComputaPlacar() {
        Question q1 = question(1L, "Direito Penal");
        Question q2 = question(2L, "Direito Penal");
        // a correcao busca so' os ids respondidos, nao a tabela inteira
        when(questions.findAllById(any())).thenReturn(List.of(q1, q2));

        Dtos.CorrecaoView correcao = service.corrigir(new Dtos.CorrecaoRequest("PM-AM", List.of(
                new Dtos.RespostaSimulado(1L, 0),   // correta
                new Dtos.RespostaSimulado(2L, 1),   // errada
                new Dtos.RespostaSimulado(999L, 0)  // desconhecida: ignorada
        )));

        assertEquals(1, correcao.acertos());
        assertEquals(2, correcao.total());
        assertEquals(1, correcao.porMateria().size());
        assertEquals(1, correcao.porMateria().get(0).acertos());
        assertEquals(2, correcao.porMateria().get(0).total());
        verify(attempts, times(2)).save(any());
    }

    private static Question question(Long id, String materia) {
        Question question = new Question();
        question.setId(id);
        question.setMateria(materia);
        question.setAssunto("Aplicação da lei penal");
        question.setOrigem(Origem.AUTORAL);
        question.setEnunciado("Enunciado de teste com tamanho suficiente.");
        question.setAlternativas(new ArrayList<>(List.of("A", "B")));
        question.setCorreta(0);
        question.setConcursos(new java.util.LinkedHashSet<>(Set.of("PM-AM")));
        return question;
    }
}
