package com.concurso.service;

import com.concurso.domain.Concursos;
import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Simulado no formato da prova: distribui as questões por matéria conforme o caderno da banca.
 *
 * <p>PM-AM (Soldado): 60 questões. PC-AM (Investigador): 80 questões. A ordem das matérias segue
 * o caderno; dentro de cada matéria as questões são sorteadas.</p>
 *
 * <p>Com {@code quantidade}, o simulado passa a ter o tamanho pedido (1 a 50), mantendo a
 * proporção do caderno quando o certame tem grade conhecida. Certames dinâmicos (CREA-AM) e
 * {@code TODOS} não têm grade fixa: entram as questões que casam com concurso + banca, sorteadas.</p>
 */
@Service
public class SimuladoService {

    /** Teto por simulado; o frontend pede no máximo isso por prova avulsa. */
    static final int LIMITE_QUESTOES = 50;

    private final QuestionRepository questions;
    private final com.concurso.repo.AttemptRepository attempts;
    private final Random random = new Random();

    /** Distribuição por matéria, na ordem do caderno. */
    private static final Map<String, Map<String, Integer>> GRADE = new LinkedHashMap<>();

    static {
        Map<String, Integer> pm = new LinkedHashMap<>();
        pm.put("Língua Portuguesa", 10);
        pm.put("Geografia do Amazonas", 10);
        pm.put("História do Amazonas", 10);
        pm.put("Raciocínio Lógico-Matemático", 10);
        pm.put("Noções de Informática", 10);
        pm.put("Legislação Institucional", 10);
        GRADE.put("PM-AM", pm);

        Map<String, Integer> pc = new LinkedHashMap<>();
        pc.put("Língua Portuguesa", 10);
        pc.put("Raciocínio Lógico-Matemático", 5);
        pc.put("História e Geografia do Amazonas", 5);
        pc.put("Noções de Informática", 5);
        pc.put("Noções de Administração", 10);
        pc.put("Noções de Contabilidade", 10);
        pc.put("Direito Constitucional", 10);
        pc.put("Direito Penal e Processual Penal", 15);
        pc.put("Direito Administrativo", 10);
        GRADE.put("PC-AM", pc);
    }

    public SimuladoService(QuestionRepository questions, com.concurso.repo.AttemptRepository attempts) {
        this.questions = questions;
        this.attempts = attempts;
    }

    /**
     * Corrige o simulado no fim: registra as tentativas e devolve gabarito, comentário e
     * desempenho por matéria. Antes disso o aluno nao ve' o gabarito, como na prova.
     */
    @Transactional
    public Dtos.CorrecaoView corrigir(Long usuarioId, Dtos.CorrecaoRequest request) {
        List<Dtos.RespostaSimulado> respostas = request.respostas() == null ? List.of() : request.respostas();
        // Busca so' as questoes respondidas: a correcao nao precisa carregar o banco inteiro.
        List<Long> ids = respostas.stream()
                .map(Dtos.RespostaSimulado::questaoId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, Question> porId = new java.util.HashMap<>();
        if (!ids.isEmpty()) {
            questions.findAllById(ids).forEach(q -> porId.put(q.getId(), q));
        }

        List<Dtos.CorrecaoItem> itens = new ArrayList<>();
        Map<String, int[]> placar = new LinkedHashMap<>();
        int acertos = 0;

        for (Dtos.RespostaSimulado r : respostas) {
            Question q = porId.get(r.questaoId());
            if (q == null) {
                continue;
            }
            boolean acertou = r.alternativa() != null && r.alternativa().equals(q.getCorreta());
            if (acertou) {
                acertos++;
            }
            int[] linha = placar.computeIfAbsent(q.getMateria(), k -> new int[2]);
            linha[1]++;
            if (acertou) {
                linha[0]++;
            }

            com.concurso.domain.Attempt tentativa = new com.concurso.domain.Attempt();
            tentativa.setQuestionId(q.getId());
            tentativa.setUsuarioId(usuarioId);
            tentativa.setEscolhida(r.alternativa() == null ? -1 : r.alternativa());
            tentativa.setAcertou(acertou);
            attempts.save(tentativa);

            itens.add(new Dtos.CorrecaoItem(q.getId(), q.getMateria(), q.getAssunto(),
                    q.getOrigem().name(), q.getCorreta(), String.valueOf((char) ('A' + q.getCorreta())),
                    r.alternativa(), acertou, q.getExplicacao(), q.getFundamento()));
        }

        List<Dtos.MateriaResultado> porMateria = new ArrayList<>();
        placar.forEach((m, v) -> porMateria.add(new Dtos.MateriaResultado(m, v[0], v[1])));
        porMateria.sort((a, b) -> a.materia().compareTo(b.materia()));

        int total = itens.size();
        double percentual = total == 0 ? 0 : Math.round(acertos * 1000.0 / total) / 10.0;
        return new Dtos.CorrecaoView(acertos, total, percentual, porMateria, itens);
    }

    /**
     * Monta o simulado. {@code quantidade == null} preserva o caderno inteiro do certame
     * (60/80); com quantidade, o tamanho e' limitado a 1..50 e a grade e' redistribuida.
     */
    @Transactional(readOnly = true)
    public Dtos.SimuladoView montar(String concurso, String banca, Integer quantidade) {
        String alvo = concurso == null || concurso.isBlank()
                ? "PM-AM" : concurso.trim().toUpperCase(java.util.Locale.ROOT);
        String filtroBanca = normalizarBanca(banca);
        Map<String, Integer> grade = GRADE.get(alvo);

        if (grade == null && !"TODOS".equals(alvo) && !concursoExiste(alvo)) {
            throw new IllegalArgumentException("Concurso inválido: nenhuma questão cadastrada para " + alvo + ".");
        }

        List<Question> elegiveis = new ArrayList<>();
        for (Question q : questions.findAll()) {
            boolean doConcurso = "TODOS".equals(alvo) || q.getConcursos().contains(alvo);
            if (doConcurso && atendeBanca(q, filtroBanca)) {
                elegiveis.add(q);
            }
        }

        int pedido = quantidade == null ? 0 : Math.max(1, Math.min(LIMITE_QUESTOES, quantidade));
        List<Dtos.QuestionView> selecionadas = new ArrayList<>();
        List<String> avisos = new ArrayList<>();
        int totalPrevisto;

        if (grade != null) {
            Map<String, Integer> cotas = pedido == 0 ? grade : distribuir(grade, pedido);
            totalPrevisto = pedido == 0 ? grade.values().stream().mapToInt(Integer::intValue).sum() : pedido;
            for (Map.Entry<String, Integer> linha : cotas.entrySet()) {
                selecionarDaMateria(elegiveis, linha.getKey(), linha.getValue(), selecionadas, avisos);
            }
        } else {
            totalPrevisto = pedido == 0 ? Math.min(LIMITE_QUESTOES, elegiveis.size()) : pedido;
            Collections.shuffle(elegiveis, random);
            int pegar = Math.min(totalPrevisto, elegiveis.size());
            for (int i = 0; i < pegar; i++) {
                selecionadas.add(QuestaoService.toView(elegiveis.get(i)));
            }
            if (pegar < totalPrevisto) {
                avisos.add("Só " + pegar + " de " + totalPrevisto
                        + " questões disponíveis para o filtro escolhido");
            }
        }

        return new Dtos.SimuladoView(alvo, nomeDoSimulado(alvo), totalPrevisto,
                selecionadas.size(), selecionadas, avisos);
    }

    // ------------------------------------------------------------------

    /** Sorteia até {@code desejadas} questões da matéria e avisa quando faltar. */
    private void selecionarDaMateria(List<Question> elegiveis, String materia, int desejadas,
                                     List<Dtos.QuestionView> selecionadas, List<String> avisos) {
        List<Question> daMateria = new ArrayList<>();
        for (Question q : elegiveis) {
            if (materia.equals(q.getMateria())) {
                daMateria.add(q);
            }
        }
        Collections.shuffle(daMateria, random);
        int pegar = Math.min(desejadas, daMateria.size());
        if (pegar < desejadas) {
            avisos.add(materia + ": só " + pegar + " de " + desejadas + " questões disponíveis");
        }
        for (int i = 0; i < pegar; i++) {
            selecionadas.add(QuestaoService.toView(daMateria.get(i)));
        }
    }

    /**
     * Redistribui a grade para o tamanho pedido pelo método dos maiores restos: a soma das cotas
     * e' exatamente {@code total} e a proporção do caderno e' preservada.
     */
    private static Map<String, Integer> distribuir(Map<String, Integer> grade, int total) {
        int pesoTotal = grade.values().stream().mapToInt(Integer::intValue).sum();
        Map<String, Integer> cotas = new LinkedHashMap<>();
        List<Map.Entry<String, Double>> restos = new ArrayList<>();
        int distribuido = 0;
        for (Map.Entry<String, Integer> linha : grade.entrySet()) {
            double exata = (double) total * linha.getValue() / pesoTotal;
            int base = (int) Math.floor(exata);
            cotas.put(linha.getKey(), base);
            distribuido += base;
            restos.add(Map.entry(linha.getKey(), exata - base));
        }
        int faltam = total - distribuido;
        // desempate estavel pela ordem do caderno
        List<String> ordem = new ArrayList<>(grade.keySet());
        restos.sort(Comparator.<Map.Entry<String, Double>>comparingDouble(Map.Entry::getValue)
                .reversed()
                .thenComparingInt(e -> ordem.indexOf(e.getKey())));
        for (int i = 0; i < faltam; i++) {
            String materia = restos.get(i % restos.size()).getKey();
            cotas.merge(materia, 1, Integer::sum);
        }
        return cotas;
    }

    private boolean concursoExiste(String alvo) {
        for (QuestionRepository.ConcursoCount linha : questions.findConcursoCounts()) {
            if (alvo.equals(Concursos.normalizar(linha.getConcurso()))) {
                return true;
            }
        }
        return false;
    }

    private static String normalizarBanca(String banca) {
        if (banca == null || banca.isBlank() || "TODAS".equalsIgnoreCase(banca.trim())) {
            return null;
        }
        return banca.trim();
    }

    private static boolean atendeBanca(Question q, String banca) {
        if (banca == null) {
            return true;
        }
        return q.getBanca() != null && q.getBanca().trim().equalsIgnoreCase(banca);
    }

    private static String nomeDoSimulado(String alvo) {
        return switch (alvo) {
            case "PM-AM" -> "Soldado PM-AM";
            case "PC-AM" -> "Investigador PC-AM";
            case "TODOS" -> "Simulado geral";
            default -> "Simulado " + alvo;
        };
    }
}
