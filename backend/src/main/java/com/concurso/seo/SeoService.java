package com.concurso.seo;

import com.concurso.domain.MaterialEstudo;
import com.concurso.domain.Plano;
import com.concurso.domain.Question;
import com.concurso.repo.MaterialEstudoRepository;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.QuestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Dados das paginas publicas indexaveis.
 *
 * <p>Somente leitura e sem PII: material de estudo (ja publico), contagem de questoes por
 * materia, amostras de questoes <b>sem gabarito</b> e catalogo de planos.</p>
 */
@Service
public class SeoService {

    private final MaterialEstudoRepository materiais;
    private final QuestionRepository questoes;
    private final PlanoRepository planos;

    public SeoService(MaterialEstudoRepository materiais, QuestionRepository questoes,
                      PlanoRepository planos) {
        this.materiais = materiais;
        this.questoes = questoes;
        this.planos = planos;
    }

    @Transactional(readOnly = true)
    public List<MaterialEstudo> materiais() {
        return materiais.findAllByOrderByConcursoAscOrdemAsc();
    }

    @Transactional(readOnly = true)
    public Optional<MaterialEstudo> material(String slug) {
        return materiais.findBySlug(slug);
    }

    @Transactional(readOnly = true)
    public List<Materia> materias() {
        Map<String, Long> porMateria = new LinkedHashMap<>();
        for (QuestionRepository.TopicCount linha : questoes.findTopicCounts(null, null)) {
            porMateria.merge(linha.getMateria(), linha.getTotal(), Long::sum);
        }
        return porMateria.entrySet().stream()
                .map(e -> new Materia(e.getKey(), Slug.de(e.getKey()), e.getValue()))
                .sorted(Comparator.comparingLong(Materia::questoes).reversed()
                        .thenComparing(Materia::nome))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Materia> materia(String slug) {
        String alvo = slug == null ? "" : slug.toLowerCase(Locale.ROOT);
        return materias().stream().filter(m -> m.slug().equals(alvo)).findFirst();
    }

    /** Amostra sem gabarito: enunciado e alternativas apenas. */
    @Transactional(readOnly = true)
    public List<Amostra> amostras(String materia, int limite) {
        return questoes.findByMateriaOrderByIdAsc(materia).stream()
                .limit(Math.max(0, limite))
                .map(SeoService::amostra)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Plano> planos() {
        return planos.findByAtivoTrueOrderByValorCentavosAsc();
    }

    private static Amostra amostra(Question q) {
        List<String> alternativas = q.getAlternativas() == null ? List.of() : List.copyOf(q.getAlternativas());
        return new Amostra(q.getEnunciado(), alternativas, q.getBanca(), q.getAno(), q.getAssunto());
    }

    public record Materia(String nome, String slug, long questoes) {
    }

    public record Amostra(String enunciado, List<String> alternativas, String banca,
                          Integer ano, String assunto) {
    }
}
