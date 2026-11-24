package com.concurso.service;

import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.seed.QuestionPayload;
import com.concurso.web.Dtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ImportServiceTest {

    @Mock
    private QuestionRepository questions;

    @Captor
    private ArgumentCaptor<List<Question>> savedQuestions;

    private ImportService service;

    @BeforeEach
    void setUp() {
        service = new ImportService(questions);
        when(questions.findAll()).thenReturn(List.of());
    }

    @Test
    void rejectsAuthoredQuestionWithoutFoundationAndInvalidOriginWithoutAbortingBatch() {
        Dtos.ImportReport report = service.importar(List.of(
                payload("AUTORAL", null),
                payload("OUTRA", "Art. 1º"),
                payload("PROVA", null)));

        assertEquals(3, report.recebidas());
        assertEquals(1, report.importadas());
        assertEquals(2, report.ignoradas());
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("fundamento obrigatorio")));
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("origem invalida")));

        verify(questions).saveAll(savedQuestions.capture());
        assertEquals(1, savedQuestions.getValue().size());
        assertEquals("PROVA", savedQuestions.getValue().get(0).getOrigem().name());
    }

    @Test
    void rejeitaDataDificuldadeEAteItemNuloSemAbortarOLote() {
        Dtos.ImportReport report = service.importar(java.util.Arrays.asList(
                null,
                payload("PROVA", null, "31/12/2026", 2, "Questao de prova com data invalida."),
                payload("PROVA", null, null, 5, "Questao de prova com dificuldade invalida."),
                payload("PROVA", null, null, 2, "Questao de prova valida neste lote.")));

        assertEquals(4, report.recebidas());
        assertEquals(1, report.importadas());
        assertEquals(3, report.ignoradas());
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("questao ausente")));
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("verificadoEm invalido")));
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("dificuldade fora")));
    }

    @Test
    void deduplicaEnunciadoRepetidoDentroDoProprioLote() {
        Dtos.ImportReport report = service.importar(List.of(
                payload("PROVA", null, null, 2, "Enunciado repetido dentro do lote de teste."),
                payload("PROVA", null, null, 2, "Enunciado repetido dentro do lote de teste.")));

        assertEquals(1, report.importadas());
        assertEquals(1, report.ignoradas());
        assertTrue(report.erros().stream().anyMatch(erro -> erro.contains("ja existe")));
    }

    @Test
    void atualizaExplicacoesPorHashEListaAsNaoEncontradas() {
        Question existente = new Question();
        existente.setHash("hash-1");
        existente.setEnunciado("Enunciado existente com tamanho suficiente.");
        when(questions.findAll()).thenReturn(List.of(existente));

        Dtos.ExplicacaoReport report = service.atualizarExplicacoes(List.of(
                new Dtos.ExplicacaoPayload("hash-1", "Comentario novo", "Art. 5º", "Súmula 1"),
                new Dtos.ExplicacaoPayload("nao-existe", "Comentario orfao", null, null)));

        assertEquals(2, report.recebidas());
        assertEquals(1, report.atualizadas());
        assertEquals(List.of("nao-existe"), report.naoEncontradas());
        assertEquals("Comentario novo", existente.getExplicacao());
        assertEquals("Art. 5º", existente.getFundamento());
        assertEquals("Súmula 1", existente.getPrecedente());
        assertEquals(java.time.LocalDate.now(), existente.getVerificadoEm());
        verify(questions).saveAll(any());
    }

    private static QuestionPayload payload(String origem, String fundamento) {
        return payload(origem, fundamento, null, 2, "Enunciado de teste com tamanho suficiente.");
    }

    private static QuestionPayload payload(String origem, String fundamento, String verificadoEm,
                                           Integer dificuldade, String enunciado) {
        return new QuestionPayload(
                "Língua Portuguesa",
                "Interpretação",
                origem,
                "FGV",
                2022,
                "PM-AM",
                "Soldado",
                fundamento,
                dificuldade,
                enunciado,
                List.of("Alternativa A", "Alternativa B"),
                0,
                "Comentário de teste.",
                List.of("PM-AM"),
                null,
                verificadoEm);
    }
}
