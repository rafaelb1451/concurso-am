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
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuestaoServiceTest {

    @Mock
    private QuestionRepository questions;

    @Mock
    private AttemptRepository attempts;

    private QuestaoService service;

    @BeforeEach
    void setUp() {
        service = new QuestaoService(questions, attempts);
    }

    @Test
    void listarUsaFiltroDeAssuntoQuandoMateriaEstaAusente() {
        when(questions.findByAssuntoOrderByIdAsc("Acentuação")).thenReturn(List.of(question(1L)));

        List<Dtos.QuestionView> resultado = service.listar("PM-AM", null, "Acentuação", 10);

        assertEquals(1, resultado.size());
        verify(questions).findByAssuntoOrderByIdAsc("Acentuação");
    }

    @Test
    void listarLimitaQuantidadeEntreUmECinquenta() {
        List<Question> muitas = new ArrayList<>();
        for (long id = 1; id <= 60; id++) {
            muitas.add(question(id));
        }
        when(questions.findAll()).thenReturn(muitas);

        assertEquals(50, service.listar(null, null, null, 100).size());
        assertEquals(1, service.listar(null, null, null, 0).size());
    }

    @Test
    void responderRegistraTentativaEIndicaAcerto() {
        Question q = question(7L);
        when(questions.findById(7L)).thenReturn(Optional.of(q));

        Dtos.AnswerView resposta = service.responder(7L, 0);

        assertTrue(resposta.acertou());
        verify(attempts).save(any());
    }

    @Test
    void responderRejeitaAlternativaForaDoIntervalo() {
        Question q = question(7L);
        when(questions.findById(7L)).thenReturn(Optional.of(q));

        assertThrows(IllegalArgumentException.class, () -> service.responder(7L, 2));
    }

    @Test
    void responderRejeitaQuestaoInexistente() {
        when(questions.findById(99L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.responder(99L, 0));
    }

    @Test
    void topicosMapeiaContagemDoRepositorio() {
        QuestionRepository.TopicCount linha = topicCount("Direito Penal", "Aplicação", 3);
        when(questions.findTopicCounts(null)).thenReturn(List.of(linha));

        List<Dtos.TopicoView> topicos = service.topicos(null);

        assertEquals(1, topicos.size());
        assertEquals("Direito Penal", topicos.get(0).materia());
        assertEquals(3, topicos.get(0).total());
    }

    @Test
    void concursosUsaContagemAgregada() {
        when(questions.countByConcurso("PM-AM")).thenReturn(10L);
        when(questions.countByConcurso("PC-AM")).thenReturn(20L);
        when(questions.count()).thenReturn(30L);

        List<Dtos.ConcursoView> concursos = service.concursos();

        assertEquals(3, concursos.size());
        assertEquals(10L, concursos.get(0).total());
        assertEquals(30L, concursos.get(2).total());
    }

    @Test
    void desempenhoSomaEstatisticasDoRepositorio() {
        AttemptRepository.MateriaStats linha = materiaStats("Direito Penal", 2, 1);
        when(attempts.findMateriaStats(null)).thenReturn(List.of(linha));

        Dtos.DesempenhoView desempenho = service.desempenho(null);

        assertEquals(2, desempenho.respondidas());
        assertEquals(1, desempenho.acertos());
        assertEquals(50.0, desempenho.percentual());
        assertEquals(1, desempenho.porMateria().size());
    }

    private static Question question(Long id) {
        Question question = new Question();
        question.setId(id);
        question.setMateria("Direito Penal");
        question.setAssunto("Aplicação da lei penal");
        question.setOrigem(Origem.AUTORAL);
        question.setEnunciado("Enunciado de teste com tamanho suficiente.");
        question.setAlternativas(new ArrayList<>(List.of("A", "B")));
        question.setCorreta(0);
        question.setConcursos(new java.util.LinkedHashSet<>(Set.of("PM-AM")));
        return question;
    }

    private static QuestionRepository.TopicCount topicCount(String materia, String assunto, long total) {
        return new QuestionRepository.TopicCount() {
            @Override
            public String getMateria() {
                return materia;
            }

            @Override
            public String getAssunto() {
                return assunto;
            }

            @Override
            public long getTotal() {
                return total;
            }
        };
    }

    private static AttemptRepository.MateriaStats materiaStats(String materia, long respondidas, long acertos) {
        return new AttemptRepository.MateriaStats() {
            @Override
            public String getMateria() {
                return materia;
            }

            @Override
            public long getRespondidas() {
                return respondidas;
            }

            @Override
            public long getAcertos() {
                return acertos;
            }
        };
    }
}
