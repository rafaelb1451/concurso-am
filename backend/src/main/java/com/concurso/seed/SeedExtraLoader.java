package com.concurso.seed;

import com.concurso.repo.QuestionRepository;
import com.concurso.service.ImportService;
import com.concurso.web.Dtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.Arrays;

/**
 * Seed extra de questoes ({@code classpath:seed-extra.json}), no mesmo formato do
 * {@code seed-completo.json}.
 *
 * <p>Diferente do {@link SeedLoader}, roda <b>sempre</b> — inclusive com o banco ja populado — e a
 * idempotencia e' por hash do enunciado normalizado: o {@link ImportService} compara com o que ja
 * esta no banco e dentro do proprio lote. Reiniciar o app nao duplica questoes. O arquivo e'
 * opcional; sem ele o boot segue normalmente.</p>
 */
@Component
@Order(3)
public class SeedExtraLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedExtraLoader.class);

    private final QuestionRepository questions;
    private final ImportService importService;
    private final ObjectMapper mapper;
    private final ResourceLoader resourceLoader;

    @Value("${concurso.seed.extra-arquivo:classpath:seed-extra.json}")
    private String arquivoExtra;

    public SeedExtraLoader(QuestionRepository questions, ImportService importService,
                           ObjectMapper mapper, ResourceLoader resourceLoader) {
        this.questions = questions;
        this.importService = importService;
        this.mapper = mapper;
        this.resourceLoader = resourceLoader;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (arquivoExtra == null || arquivoExtra.isBlank()) {
            log.info("Seed extra desativado (concurso.seed.extra-arquivo vazio).");
            return;
        }

        Resource recurso = resourceLoader.getResource(arquivoExtra);
        if (!recurso.exists()) {
            log.info("Seed extra ausente ({}); nada a importar.", arquivoExtra);
            return;
        }

        QuestionPayload[] seeds;
        try (InputStream in = recurso.getInputStream()) {
            seeds = mapper.readValue(in, QuestionPayload[].class);
        }
        if (seeds == null || seeds.length == 0) {
            log.info("Seed extra vazio ({}).", recurso.getFilename());
            return;
        }

        Dtos.ImportReport report = importService.importar(Arrays.asList(seeds));
        log.info("Seed extra: {} recebidas, {} importadas, {} ignoradas ({} no banco).",
                report.recebidas(), report.importadas(), report.ignoradas(), questions.count());
        long jaExistiam = report.erros().stream().filter(e -> e.contains("ja existe")).count();
        if (jaExistiam > 0) {
            log.info("Seed extra: {} questões já estavam no banco (idempotência por hash).", jaExistiam);
        }
        for (String erro : report.erros()) {
            // Duplicata e' o caso normal do reinicio; so' os outros erros merecem alerta.
            if (!erro.contains("ja existe")) {
                log.warn("Seed extra: {}", erro);
            }
        }
    }
}
