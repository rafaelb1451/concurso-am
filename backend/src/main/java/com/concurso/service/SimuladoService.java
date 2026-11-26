package com.concurso.service;

import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Simulado no formato da prova: distribui as questões por matéria conforme o caderno da banca.
 *
 * <p>PM-AM (Soldado): 60 questões. PC-AM (Investigador): 80 questões. A ordem das matérias segue
 * o caderno; dentro de cada matéria as questões são sorteadas.</p>
 */
@Service
public class SimuladoService {

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

    @Transactional(readOnly = true)
    public Dtos.SimuladoView montar(String concurso) {
        String alvo = concurso == null || concurso.isBlank() ? "PM-AM" : concurso.toUpperCase();
        Map<String, Integer> grade = GRADE.get(alvo);
        if (grade == null) {
            throw new IllegalArgumentException("Concurso inválido: use PM-AM ou PC-AM");
        }

        List<Question> todas = questions.findAll();
        List<Dtos.QuestionView> selecionadas = new ArrayList<>();
        List<String> avisos = new ArrayList<>();
        int totalPrevisto = grade.values().stream().mapToInt(Integer::intValue).sum();

        for (Map.Entry<String, Integer> linha : grade.entrySet()) {
            String materia = linha.getKey();
            int desejadas = linha.getValue();

            List<Question> daMateria = new ArrayList<>();
            for (Question q : todas) {
                if (materia.equals(q.getMateria()) && q.getConcursos().contains(alvo)) {
                    daMateria.add(q);
                }
            }
            // conteúdo comum pode estar marcado só para o outro concurso: aceita como reserva
            if (daMateria.isEmpty()) {
                for (Question q : todas) {
                    if (materia.equals(q.getMateria())) {
                        daMateria.add(q);
                    }
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

        String nome = "PM-AM".equals(alvo) ? "Soldado PM-AM" : "Investigador PC-AM";
        return new Dtos.SimuladoView(alvo, nome, totalPrevisto, selecionadas.size(), selecionadas, avisos);
    }
}
