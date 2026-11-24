package com.concurso.web;

import com.concurso.service.QuestaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final QuestaoService questoes;
    private final com.concurso.service.ImportService importService;
    private final com.concurso.service.SimuladoService simuladoService;

    public ApiController(QuestaoService questoes,
                         com.concurso.service.ImportService importService,
                         com.concurso.service.SimuladoService simuladoService) {
        this.questoes = questoes;
        this.importService = importService;
        this.simuladoService = simuladoService;
    }

    @GetMapping("/concursos")
    public List<Dtos.ConcursoView> concursos() {
        return questoes.concursos();
    }

    @GetMapping("/topicos")
    public List<Dtos.TopicoView> topicos(@RequestParam(required = false) String concurso) {
        return questoes.topicos(concurso);
    }

    @GetMapping("/questoes")
    public List<Dtos.QuestionView> questoes(@RequestParam(required = false) String concurso,
                                            @RequestParam(required = false) String materia,
                                            @RequestParam(required = false) String assunto,
                                            @RequestParam(defaultValue = "10") int quantidade) {
        return questoes.listar(concurso, materia, assunto, quantidade);
    }

    @PostMapping("/questoes/{id}/responder")
    public Dtos.AnswerView responder(@PathVariable Long id,
                                     @RequestBody Dtos.AnswerRequest request) {
        return questoes.responder(id, request.alternativa());
    }

    @GetMapping("/desempenho")
    public Dtos.DesempenhoView desempenho(@RequestParam(required = false) String concurso) {
        return questoes.desempenho(concurso);
    }

    /** Importa um lote no mesmo formato do questoes.json. */
    @PostMapping("/importar")
    public Dtos.ImportReport importar(@RequestBody java.util.List<com.concurso.seed.QuestionPayload> lote) {
        return importService.importar(lote);
    }

    /** Anexa comentarios a questoes existentes (identificadas pelo hash do enunciado). */
    @PostMapping("/explicacoes")
    public Dtos.ExplicacaoReport explicacoes(@RequestBody java.util.List<Dtos.ExplicacaoPayload> itens) {
        return importService.atualizarExplicacoes(itens);
    }

    /** Monta um simulado com a distribuição de matérias do caderno da banca. */
    @GetMapping("/simulado")
    public Dtos.SimuladoView simulado(@RequestParam(defaultValue = "PM-AM") String concurso) {
        return simuladoService.montar(concurso);
    }

    /** Corrige o simulado no fim: registra as tentativas e devolve gabaritos e desempenho. */
    @PostMapping("/simulado/corrigir")
    public Dtos.CorrecaoView corrigirSimulado(@RequestBody Dtos.CorrecaoRequest request) {
        return simuladoService.corrigir(request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erro(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }
}
