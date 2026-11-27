package com.concurso.seed;

import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Carrega o banco inicial de questoes a partir de um JSON no classpath.
 *
 * <p>Por padrao usa {@code seed-completo.json} — o banco inteiro consolidado por
 * {@code tools/consolidar-seed.py} — e cai para {@code questoes.json} (as questoes de base) quando
 * o consolidado nao existe. O arquivo e' configuravel por {@code concurso.seed.arquivo}.</p>
 *
 * <p>Roda apenas com a tabela vazia: reiniciar nao duplica nada.</p>
 */
@Component
@Order(2)
public class SeedLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedLoader.class);

    private final QuestionRepository questions;
    private final ObjectMapper mapper;

    @org.springframework.beans.factory.annotation.Value("${concurso.seed.arquivo:seed-completo.json}")
    private String arquivoSeed;

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

        ClassPathResource recurso = new ClassPathResource(arquivoSeed);
        if (!recurso.exists()) {
            recurso = new ClassPathResource("questoes.json");
            log.info("Seed consolidado ausente; usando questoes.json (questoes de base).");
        }

        try (InputStream in = recurso.getInputStream()) {
            QuestionPayload[] seeds = mapper.readValue(in, QuestionPayload[].class);
            List<Question> paraSalvar = new ArrayList<>();
            for (QuestionPayload seed : seeds) {
                paraSalvar.add(seed.toEntity());
            }
            questions.saveAll(paraSalvar);
            log.info("Seed: {} questoes carregadas de {}.", paraSalvar.size(), recurso.getFilename());
        }
    }
}
