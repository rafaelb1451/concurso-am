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

    public ApiController(QuestaoService questoes,
                         com.concurso.service.ImportService importService) {
        this.questoes = questoes;
        this.importService = importService;
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

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erro(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }
}
