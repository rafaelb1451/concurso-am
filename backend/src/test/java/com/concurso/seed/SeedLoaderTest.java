package com.concurso.seed;

import com.concurso.domain.Origem;
import com.concurso.repo.QuestionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * O seed roda no boot do container. Se ele duplicasse ao reiniciar, o banco cresceria a cada
 * deploy — por isso a idempotencia e' testada explicitamente.
 */
@DataJpaTest
class SeedLoaderTest {

    @Autowired
    private QuestionRepository questions;

    @Test
    void carregaOSeedUmaVezESegundaExecucaoNaoDuplica() throws Exception {
        SeedLoader loader = new SeedLoader(questions, new ObjectMapper());
        ReflectionTestUtils.setField(loader, "arquivoSeed", "questoes.json");

        loader.run(null);
        assertEquals(24, questions.count());

        loader.run(null);
        assertEquals(24, questions.count(), "reiniciar o app nao pode duplicar o seed");
    }

    @Test
    void questaoSemMarcacaoPertenceAosDoisConcursos() {
        QuestionPayload payload = new QuestionPayload(
                "Língua Portuguesa", "Interpretação", "AUTORAL", "FGV", 2022, "PM-AM", "Soldado",
                "Art. 1º", 2, "Enunciado de teste com tamanho suficiente.",
                java.util.List.of("A", "B"), 0, "Comentário.", null, null, null);

        var questao = payload.toEntity();

        assertEquals(Origem.AUTORAL, questao.getOrigem());
        assertEquals(java.util.Set.of("PM-AM", "PC-AM"), questao.getConcursos());
        assertEquals(2, questao.getDificuldade());
    }
}
