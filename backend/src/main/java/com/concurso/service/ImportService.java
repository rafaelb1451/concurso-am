package com.concurso.service;

import com.concurso.domain.Concursos;
import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.seed.QuestionPayload;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Importacao de lotes de questoes.
 *
 * <p>Valida item a item, em vez de rejeitar o lote inteiro: um erro na linha 47 nao impede as
 * outras 99 de entrarem. A deduplicacao usa o hash do enunciado normalizado, comparando tanto
 * com o que ja esta no banco quanto dentro do proprio lote.</p>
 */
@Service
public class ImportService {

    private final QuestionRepository questions;

    public ImportService(QuestionRepository questions) {
        this.questions = questions;
    }

    @Transactional
    public Dtos.ImportReport importar(List<QuestionPayload> lote) {
        if (lote == null || lote.isEmpty()) {
            return new Dtos.ImportReport(0, 0, 0, List.of("Lote vazio"));
        }

        Set<String> hashes = new HashSet<>();
        for (Question q : questions.findAll()) {
            if (q.getHash() != null) {
                hashes.add(q.getHash());
            }
        }

        List<String> erros = new ArrayList<>();
        List<Question> validas = new ArrayList<>();

        for (int i = 0; i < lote.size(); i++) {
            QuestionPayload payload = lote.get(i);
            String erro = validar(payload, i + 1);
            if (erro != null) {
                erros.add(erro);
                continue;
            }
            Question q = payload.toEntity();
            if (!hashes.add(q.getHash())) {
                erros.add("linha " + (i + 1) + ": ja existe (enunciado duplicado)");
                continue;
            }
            validas.add(q);
        }

        questions.saveAll(validas);
        int ignoradas = lote.size() - validas.size();
        return new Dtos.ImportReport(lote.size(), validas.size(), ignoradas, erros);
    }

    /**
     * Anexa comentarios a questoes ja importadas. A identificacao e' pelo hash do enunciado
     * normalizado — o mesmo usado na deduplicacao — para nao depender do id gerado.
     */
    @Transactional
    public Dtos.ExplicacaoReport atualizarExplicacoes(List<Dtos.ExplicacaoPayload> itens) {
        if (itens == null || itens.isEmpty()) {
            return new Dtos.ExplicacaoReport(0, 0, List.of());
        }
        Map<String, Question> porHash = new java.util.HashMap<>();
        for (Question q : questions.findAll()) {
            if (q.getHash() != null) {
                porHash.put(q.getHash(), q);
            }
        }
        int atualizadas = 0;
        List<String> naoEncontradas = new ArrayList<>();
        for (Dtos.ExplicacaoPayload item : itens) {
            if (item.hash() == null || item.hash().isBlank()) {
                naoEncontradas.add("(hash vazio)");
                continue;
            }
            Question q = porHash.get(item.hash());
            if (q == null) {
                naoEncontradas.add(item.hash());
                continue;
            }
            q.setExplicacao(item.explicacao());
            if (item.fundamento() != null && !item.fundamento().isBlank()) {
                q.setFundamento(item.fundamento());
            }
            atualizadas++;
        }
        questions.saveAll(porHash.values().stream()
                .filter(q -> q.getExplicacao() != null)
                .toList());
        return new Dtos.ExplicacaoReport(itens.size(), atualizadas, naoEncontradas);
    }

    private String validar(QuestionPayload p, int linha) {
        String prefixo = "linha " + linha + ": ";
        if (p.materia() == null || p.materia().isBlank()) {
            return prefixo + "materia obrigatoria";
        }
        if (p.assunto() == null || p.assunto().isBlank()) {
            return prefixo + "assunto obrigatorio";
        }
        if (p.enunciado() == null || p.enunciado().trim().length() < 15) {
            return prefixo + "enunciado ausente ou curto demais";
        }
        if (p.alternativas() == null || p.alternativas().size() < 2) {
            return prefixo + "precisa de pelo menos 2 alternativas";
        }
        if (p.alternativas().size() > 5) {
            return prefixo + "maximo de 5 alternativas";
        }
        if (p.alternativas().stream().anyMatch(a -> a == null || a.isBlank())) {
            return prefixo + "alternativa vazia";
        }
        if (p.correta() == null || p.correta() < 0 || p.correta() >= p.alternativas().size()) {
            return prefixo + "gabarito (correta) fora do intervalo das alternativas";
        }
        if (p.explicacao() == null || p.explicacao().isBlank()) {
            // Questao de prova oficial entra sem comentario; o comentario nasce depois.
            boolean ehProva = p.origem() != null && "PROVA".equalsIgnoreCase(p.origem());
            if (!ehProva) {
                return prefixo + "explicacao obrigatoria (questao autoral)";
            }
        }
        if (p.concursos() != null) {
            for (String concurso : p.concursos()) {
                if (!Concursos.valido(concurso)) {
                    return prefixo + "concurso invalido '" + concurso + "' (use PM-AM ou PC-AM)";
                }
            }
        }
        return null;
    }
}
