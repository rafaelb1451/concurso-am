package com.concurso.web;

import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.service.AuthException;
import com.concurso.service.RateLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Prática gratuita <b>sem conta</b>.
 *
 * <p>Regra de produto: o visitante escolhe <b>uma matéria</b> e responde <b>até 10 questões</b>.
 * O limite é imposto aqui, no servidor — não no frontend. A listagem não devolve gabarito nem
 * comentário; isso só sai na resposta, uma questão por vez.</p>
 */
@RestController
@RequestMapping("/api/publico")
public class PublicoController {

    /** Teto de questões da prática gratuita. */
    static final int LIMITE_QUESTOES = 10;

    private final QuestionRepository questoes;
    private final RateLimiter limiter;

    public PublicoController(QuestionRepository questoes, RateLimiter limiter) {
        this.questoes = questoes;
        this.limiter = limiter;
    }

    /** Matérias disponíveis para a prática gratuita, com a quantidade de questões. */
    @GetMapping("/materias")
    public List<Map<String, Object>> materias() {
        Map<String, Long> total = new LinkedHashMap<>();
        for (QuestionRepository.TopicCount t : questoes.findTopicCounts(null, null)) {
            total.merge(t.getMateria(), t.getTotal(), Long::sum);
        }
        List<Map<String, Object>> lista = new ArrayList<>();
        total.forEach((materia, qtd) -> lista.add(Map.of("materia", materia, "questoes", qtd)));
        lista.sort((a, b) -> Long.compare((Long) b.get("questoes"), (Long) a.get("questoes")));
        return lista;
    }

    /**
     * Questões da prática gratuita de UMA matéria. Sem gabarito e sem comentário.
     */
    @GetMapping("/questoes")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> questoes(
            @RequestParam String materia,
            @RequestParam(defaultValue = "10") int quantidade,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("publico-questoes:" + ClienteIp.de(requisicao), 40);
        if (materia == null || materia.isBlank()) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Escolha uma materia para praticar.");
        }
        if (quantidade < 1) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Informe ao menos uma questao.");
        }
        if (quantidade > LIMITE_QUESTOES) {
            throw new AuthException(HttpStatus.BAD_REQUEST,
                    "A pratica gratuita libera ate " + LIMITE_QUESTOES + " questoes.");
        }
        List<Question> encontradas = questoes.findByMateriaOrderByIdAsc(materia);
        List<Map<String, Object>> saida = new ArrayList<>();
        for (Question q : encontradas.subList(0, Math.min(quantidade, encontradas.size()))) {
            // copia dentro da transacao: a serializacao acontece depois, sem sessao
            List<String> alternativas = new ArrayList<>(q.getAlternativas());
            saida.add(Map.of(
                    "id", q.getId(),
                    "materia", q.getMateria(),
                    "assunto", q.getAssunto(),
                    "enunciado", q.getEnunciado(),
                    "alternativas", alternativas,
                    "origem", q.getOrigem().name(),
                    "banca", q.getBanca() == null ? "" : q.getBanca(),
                    "ano", q.getAno() == null ? 0 : q.getAno()));
        }
        return saida;
    }

    /** Corrige uma questão da prática gratuita e mostra o comentário. */
    @PostMapping("/responder")
    @Transactional(readOnly = true)
    public Map<String, Object> responder(@RequestBody RespostaPublica request,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("publico-responder:" + ClienteIp.de(requisicao), 20);
        if (request == null || request.questaoId() == null || request.alternativa() == null) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Informe a questao e a alternativa.");
        }
        Question q = questoes.findById(request.questaoId())
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "Questao inexistente."));
        boolean acertou = q.getCorreta() == request.alternativa();
        Map<String, Object> saida = new LinkedHashMap<>();
        saida.put("acertou", acertou);
        saida.put("gabarito", q.getCorreta());
        saida.put("explicacao", q.getExplicacao());
        saida.put("fundamento", q.getFundamento());
        return saida;
    }

    public record RespostaPublica(Long questaoId, Integer alternativa) {
    }
}
