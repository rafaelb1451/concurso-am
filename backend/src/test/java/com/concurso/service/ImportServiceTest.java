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

    private static QuestionPayload payload(String origem, String fundamento) {
        return new QuestionPayload(
                "Língua Portuguesa",
                "Interpretação",
                origem,
                "FGV",
                2022,
                "PM-AM",
                "Soldado",
                fundamento,
                2,
                "Enunciado de teste com tamanho suficiente.",
                List.of("Alternativa A", "Alternativa B"),
                0,
                "Comentário de teste.",
                List.of("PM-AM"),
                null,
                null);
    }
}
