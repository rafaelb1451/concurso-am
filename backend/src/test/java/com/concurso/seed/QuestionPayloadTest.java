package com.concurso.seed;

import com.concurso.domain.Origem;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class QuestionPayloadTest {

    @Test
    void hashIgnoraAcentoCaixaEPontuacao() {
        String a = QuestionPayload.hashDe("Ação, é!?");
        String b = QuestionPayload.hashDe("acao e");

        assertEquals(a, b);
        assertEquals(32, a.length());
    }

    @Test
    void hashDistingueEnunciadosDiferentes() {
        assertEquals(false, QuestionPayload.hashDe("Enunciado um")
                .equals(QuestionPayload.hashDe("Enunciado dois")));
    }

    @Test
    void hashDeNuloEhNulo() {
        assertNull(QuestionPayload.hashDe(null));
    }

    @Test
    void toEntityAplicaPadroesDeOrigemDificuldadeMaisConcursos() {
        QuestionPayload payload = new QuestionPayload(
                "Direito Penal", "Aplicação da lei penal", null, "FGV", null, null, null,
                "Art. 1º do CP", null, "Enunciado válido com mais de quinze caracteres.",
                List.of("A", "B"), null, "Comentário.", List.of(), null, " 2026-01-10 ");

        var questao = payload.toEntity();

        assertEquals(Origem.AUTORAL, questao.getOrigem());
        assertEquals(2, questao.getDificuldade());
        assertEquals(0, questao.getCorreta());
        assertEquals(java.util.Set.of("PM-AM", "PC-AM"), questao.getConcursos());
        assertEquals(java.time.LocalDate.of(2026, 1, 10), questao.getVerificadoEm());
    }

    @Test
    void toEntityRespeitaMarcacaoExplicitaDeConcurso() {
        QuestionPayload payload = new QuestionPayload(
                "Direito Penal", "Aplicação da lei penal", "PROVA", "FGV", 2022, "PC-AM", "Investigador",
                "Art. 1º do CP", 3, "Enunciado válido com mais de quinze caracteres.",
                List.of("A", "B"), 1, null, List.of("PC-AM"), null, null);

        var questao = payload.toEntity();

        assertEquals(Origem.PROVA, questao.getOrigem());
        assertEquals(List.of("PC-AM"), List.copyOf(questao.getConcursos()));
        assertEquals(3, questao.getDificuldade());
    }
}
