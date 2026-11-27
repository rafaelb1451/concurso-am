package com.concurso.seed;

import com.concurso.domain.Concursos;
import com.concurso.domain.Origem;
import com.concurso.domain.Question;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Formato de importacao de questoes (o mesmo do {@code questoes.json}) e a conversao para
 * entidade, com o hash de deduplicacao calculado a partir do enunciado normalizado.
 */
public record QuestionPayload(
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
        List<String> alternativas,
        Integer correta,
        String explicacao,
        List<String> concursos,
        String precedente,
        String verificadoEm
) {

    public Question toEntity() {
        Question q = new Question();
        q.setMateria(materia);
        q.setAssunto(assunto);
        q.setOrigem(origem == null ? Origem.AUTORAL
                : Origem.valueOf(origem.trim().toUpperCase(Locale.ROOT)));
        q.setBanca(banca);
        q.setAno(ano);
        q.setOrgao(orgao);
        q.setCargo(cargo);
        q.setFundamento(fundamento);
        q.setDificuldade(dificuldade == null ? 2 : dificuldade);
        q.setEnunciado(enunciado);
        q.setAlternativas(alternativas == null ? List.of() : new ArrayList<>(alternativas));
        q.setCorreta(correta == null ? 0 : correta);
        q.setExplicacao(explicacao);
        // Sem marcacao no arquivo, a questao vale para os dois concursos historicos (conteudo
        // comum). Codigos explicitos sao normalizados; a validacao de formato fica no ImportService.
        java.util.Set<String> marcados = new LinkedHashSet<>();
        if (concursos != null) {
            for (String concurso : concursos) {
                String codigo = Concursos.normalizar(concurso);
                if (codigo != null) {
                    marcados.add(codigo);
                }
            }
        }
        q.setConcursos(marcados.isEmpty() ? new LinkedHashSet<>(Concursos.TODOS) : marcados);
        q.setHash(hashDe(enunciado));
        q.setPrecedente(precedente);
        if (verificadoEm != null && !verificadoEm.isBlank()) {
            q.setVerificadoEm(java.time.LocalDate.parse(verificadoEm.trim()));
        }
        return q;
    }

    /**
     * Hash do enunciado normalizado: minusculas, sem acento, sem pontuacao e sem espacos
     * repetidos. A mesma questao reescrita com outra pontuacao cai no mesmo hash.
     */
    public static String hashDe(String enunciado) {
        if (enunciado == null) {
            return null;
        }
        String normalizado = Normalizer.normalize(enunciado, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(normalizado.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 16; i++) {
                hex.append(String.format("%02x", digest[i]));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 indisponivel", ex);
        }
    }
}
