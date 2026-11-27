package com.concurso.seed;

import com.concurso.domain.Origem;
import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.service.ImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * O seed extra roda com o banco ja populado. A idempotencia e' por hash do enunciado: rodar duas
 * vezes nao pode duplicar, nem mesmo as questoes que ja estavam no banco por outro caminho.
 */
@DataJpaTest
class SeedExtraLoaderTest {

    @Autowired
    private QuestionRepository questions;

    @Test
    void importaComBancoPopuladoENaoDuplicaAoRodarDeNovo() throws Exception {
        questions.saveAndFlush(questaoBase());
        assertEquals(1, questions.count());

        SeedExtraLoader loader = loader("classpath:seed-extra-teste.json");

        loader.run(null);
        assertEquals(3, questions.count());

        loader.run(null);
        assertEquals(3, questions.count(), "reiniciar o app nao pode duplicar o seed extra");

        List<Question> crea = questions.findAll().stream()
                .filter(q -> q.getConcursos().contains("CREA-AM"))
                .toList();
        assertEquals(2, crea.size());
        assertTrue(crea.stream().allMatch(q -> "CREA-AM".equals(q.getBanca())));
        assertTrue(crea.stream().allMatch(q -> q.getFundamento() != null));
    }

    @Test
    void arquivoAusenteNaoQuebraOBoot() throws Exception {
        SeedExtraLoader loader = loader("classpath:seed-extra-que-nao-existe.json");

        loader.run(null);

        assertEquals(0, questions.count());
    }

    private SeedExtraLoader loader(String arquivo) {
        SeedExtraLoader loader = new SeedExtraLoader(questions, new ImportService(questions),
                new ObjectMapper(), new DefaultResourceLoader());
        ReflectionTestUtils.setField(loader, "arquivoExtra", arquivo);
        return loader;
    }

    private static Question questaoBase() {
        Question q = new Question();
        q.setMateria("Língua Portuguesa");
        q.setAssunto("Interpretação");
        q.setOrigem(Origem.AUTORAL);
        q.setBanca("FGV");
        q.setEnunciado("Questao que ja existia no banco antes do seed extra.");
        q.setAlternativas(List.of("A", "B"));
        q.setConcursos(Set.of("PM-AM"));
        q.setHash(QuestionPayload.hashDe(q.getEnunciado()));
        return q;
    }
}
