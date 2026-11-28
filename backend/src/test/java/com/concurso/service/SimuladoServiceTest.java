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

    @Mock
    private AcessoService acesso;

    private SimuladoService service;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(acesso.certamesDe(org.mockito.ArgumentMatchers.nullable(Long.class)))
                .thenReturn(Set.of());
        org.mockito.Mockito.lenient().when(acesso.questaoNoEscopo(
                        org.mockito.ArgumentMatchers.nullable(Long.class), org.mockito.ArgumentMatchers.any()))
                .thenReturn(true);
        service = new SimuladoService(questions, attempts, acesso);
    }

    @Test
    void montarRejeitaConcursoDesconhecido() {
        assertThrows(IllegalArgumentException.class, () -> service.montar("XX", null, null));
    }

    @Test
    void montarAvisaQuandoFaltamQuestoesDeAlgumaMateria() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 10; id++) {
            banco.add(question(id, "Língua Portuguesa", "PM-AM", null));
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView simulado = service.montar("PM-AM", null, null);

        assertEquals(60, simulado.totalPrevisto());
        assertEquals(10, simulado.totalGerado());
        assertTrue(simulado.avisos().size() >= 5, "cinco materias devem ficar sem questões");
    }

    @Test
    void montarRespeitaFiltroDeBanca() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 10; id++) {
            Question q = question(id, "Língua Portuguesa", "PM-AM", id <= 4 ? "FGV" : "CEBRASPE");
            banco.add(q);
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView fgv = service.montar("PM-AM", "FGV", null);

        assertEquals(4, fgv.totalGerado(), "só as questões da banca filtrada entram");
        assertTrue(fgv.questoes().stream().allMatch(q -> "FGV".equals(q.banca())));
    }

    @Test
    void montarComQuantidadeRedistribuiAGradeDoCaderno() {
        List<Question> banco = new ArrayList<>();
        String[] materias = {"Língua Portuguesa", "Geografia do Amazonas", "História do Amazonas",
                "Raciocínio Lógico-Matemático", "Noções de Informática", "Legislação Institucional"};
        long id = 1;
        for (String materia : materias) {
            for (int i = 0; i < 10; i++) {
                banco.add(question(id++, materia, "PM-AM", "FGV"));
            }
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView simulado = service.montar("PM-AM", null, 20);

        assertEquals(20, simulado.totalPrevisto());
        assertEquals(20, simulado.totalGerado());
        assertTrue(simulado.avisos().isEmpty(), "havia questões suficientes em todas as matérias");
    }

    @Test
    void montarAceitaCreaAmComBancaEQuantidade() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 10; id++) {
            banco.add(question(id, "Legislação Institucional", "CREA-AM", "CREA-AM"));
        }
        when(questions.findAll()).thenReturn(banco);
        when(questions.findConcursoCounts()).thenReturn(List.of(concursoCount("CREA-AM", 10)));

        Dtos.SimuladoView simulado = service.montar("crea-am", "CREA-AM", 5);

        assertEquals("CREA-AM", simulado.concurso());
        assertEquals(5, simulado.totalPrevisto());
        assertEquals(5, simulado.totalGerado());
        assertTrue(simulado.questoes().stream().allMatch(q -> "CREA-AM".equals(q.banca())));
    }

    @Test
    void montarAceitaTodosComBancaEQuantidade() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 10; id++) {
            banco.add(question(id, "Língua Portuguesa", "PM-AM", "FGV"));
        }
        for (long id = 11; id <= 15; id++) {
            banco.add(question(id, "Língua Portuguesa", "PC-AM", "CEBRASPE"));
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView simulado = service.montar("TODOS", "FGV", 5);

        assertEquals("TODOS", simulado.concurso());
        assertEquals("Simulado geral", simulado.nome());
        assertEquals(5, simulado.totalGerado());
        assertTrue(simulado.questoes().stream().allMatch(q -> "FGV".equals(q.banca())));
    }

    @Test
    void montarLimitaQuantidadeAoCinquenta() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 60; id++) {
            banco.add(question(id, "Língua Portuguesa", "PM-AM", "FGV"));
        }
        when(questions.findAll()).thenReturn(banco);

        Dtos.SimuladoView simulado = service.montar("TODOS", null, 999);

        assertEquals(50, simulado.totalPrevisto());
        assertEquals(50, simulado.totalGerado());
    }

    @Test
    void montarComBancaSemQuestoesNaoQuebraEAvisa() {
        List<Question> banco = new ArrayList<>();
        for (long id = 1; id <= 5; id++) {
            banco.add(question(id, "Legislação Institucional", "CREA-AM", "CREA-AM"));
        }
        when(questions.findAll()).thenReturn(banco);
        when(questions.findConcursoCounts()).thenReturn(List.of(concursoCount("CREA-AM", 5)));

        Dtos.SimuladoView simulado = service.montar("CREA-AM", "FGV", 5);

        assertEquals(5, simulado.totalPrevisto());
        assertEquals(0, simulado.totalGerado());
        assertEquals(1, simulado.avisos().size());
    }

    @Test
    void corrigirRegistraTentativasEComputaPlacar() {
        Question q1 = question(1L, "Direito Penal", "PM-AM", null);
        Question q2 = question(2L, "Direito Penal", "PM-AM", null);
        // a correcao busca so' os ids respondidos, nao a tabela inteira
        when(questions.findAllById(any())).thenReturn(List.of(q1, q2));

        Dtos.CorrecaoView correcao = service.corrigir(1L, new Dtos.CorrecaoRequest("PM-AM", List.of(
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

    @Test
    void corrigirTrataQuestaoEmBrancoComoErroRegistrado() {
        Question q = question(1L, "Direito Penal", "PM-AM", null);
        when(questions.findAllById(any())).thenReturn(List.of(q));

        Dtos.CorrecaoView correcao = service.corrigir(1L, new Dtos.CorrecaoRequest("PM-AM",
                List.of(new Dtos.RespostaSimulado(1L, null))));

        assertEquals(0, correcao.acertos());
        assertEquals(1, correcao.total());
        assertEquals(0, correcao.porMateria().get(0).acertos());
        verify(attempts).save(org.mockito.ArgumentMatchers.argThat(
                tentativa -> tentativa.getEscolhida() == -1 && !tentativa.isAcertou()));
    }

    private static Question question(Long id, String materia, String concurso, String banca) {
        Question question = new Question();
        question.setId(id);
        question.setMateria(materia);
        question.setAssunto("Aplicação da lei penal");
        question.setOrigem(Origem.AUTORAL);
        question.setBanca(banca);
        question.setEnunciado("Enunciado de teste com tamanho suficiente.");
        question.setAlternativas(new ArrayList<>(List.of("A", "B")));
        question.setCorreta(0);
        question.setConcursos(new java.util.LinkedHashSet<>(Set.of(concurso)));
        return question;
    }

    private static QuestionRepository.ConcursoCount concursoCount(String concurso, long total) {
        return new QuestionRepository.ConcursoCount() {
            @Override
            public String getConcurso() {
                return concurso;
            }

            @Override
            public long getTotal() {
                return total;
            }
        };
    }
}
