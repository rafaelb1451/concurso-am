package com.concurso.seed;

import com.concurso.domain.Origem;
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

/**
 * Carrega o banco inicial de questoes a partir de {@code questoes.json}.
 *
 * <p>Roda apenas com a tabela vazia: reiniciar nao duplica nada. O arquivo e' o formato de
 * importacao — a esteira de producao (questoes de prova extraidas e autorais) gera o mesmo
 * JSON.</p>
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
            QuestionSeed[] seeds = mapper.readValue(in, QuestionSeed[].class);
            var paraSalvar = new ArrayList<Question>();
            for (QuestionSeed seed : seeds) {
                paraSalvar.add(seed.toEntity());
            }
            questions.saveAll(paraSalvar);
            log.info("Seed: {} questoes carregadas.", paraSalvar.size());
        }
    }

    /** Formato do arquivo de importacao. */
    public record QuestionSeed(
            String materia,
            String assunto,
            String origem,
            String banca,
            Integer ano,
            String orgao,
            String cargo,
            String fundamento,
            Integer dificuldade,
            String enunciado,
            java.util.List<String> alternativas,
            Integer correta,
            String explicacao,
            java.util.List<String> concursos
    ) {
        Question toEntity() {
            Question q = new Question();
            q.setMateria(materia);
            q.setAssunto(assunto);
            q.setOrigem(origem == null ? Origem.AUTORAL : Origem.valueOf(origem.toUpperCase()));
            q.setBanca(banca);
            q.setAno(ano);
            q.setOrgao(orgao);
            q.setCargo(cargo);
            q.setFundamento(fundamento);
            q.setDificuldade(dificuldade == null ? 2 : dificuldade);
            q.setEnunciado(enunciado);
            q.setAlternativas(alternativas == null ? java.util.List.of() : new ArrayList<>(alternativas));
            q.setCorreta(correta == null ? 0 : correta);
            q.setExplicacao(explicacao);
            // Sem marcacao no arquivo, a questao vale para os dois concursos (conteudo comum).
            q.setConcursos(new java.util.LinkedHashSet<>(
                    concursos == null || concursos.isEmpty() ? com.concurso.domain.Concursos.TODOS : concursos));
            return q;
        }
    }
}
