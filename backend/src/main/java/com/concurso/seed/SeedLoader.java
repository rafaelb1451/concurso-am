package com.concurso.seed;

import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Carrega o banco inicial de questoes a partir de {@code questoes.json}.
 *
 * <p>Roda apenas com a tabela vazia: reiniciar nao duplica nada. O arquivo e' o formato de
 * importacao — lotes novos entram por {@code POST /api/importar}.</p>
 */
@Component
public class SeedLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedLoader.class);

    private final QuestionRepository questions;
    private final ObjectMapper mapper;

    public SeedLoader(QuestionRepository questions, ObjectMapper mapper) {
        this.questions = questions;
        this.mapper = mapper;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        long existentes = questions.count();
        if (existentes > 0) {
            log.info("Banco de questoes ja tem {} registros; seed ignorado.", existentes);
            return;
        }

        try (InputStream in = new ClassPathResource("questoes.json").getInputStream()) {
            QuestionPayload[] seeds = mapper.readValue(in, QuestionPayload[].class);
            List<Question> paraSalvar = new ArrayList<>();
            for (QuestionPayload seed : seeds) {
                paraSalvar.add(seed.toEntity());
            }
            questions.saveAll(paraSalvar);
            log.info("Seed: {} questoes carregadas.", paraSalvar.size());
        }
    }
}
