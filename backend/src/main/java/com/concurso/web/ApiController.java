package com.concurso.web;

import com.concurso.service.EvolucaoService;
import com.concurso.service.QuestaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    /** Teto de itens por requisicao de importacao (evita payload gigante). */
    private static final int LIMITE_LOTE = 500;
    /** Teto de respostas por correcao (o maior simulado tem 80 questoes). */
    private static final int LIMITE_CORRECAO = 100;

    private final QuestaoService questoes;
    private final com.concurso.service.ImportService importService;
    private final com.concurso.service.SimuladoService simuladoService;
    private final EvolucaoService evolucao;
    private final com.concurso.service.AcessoService acesso;

    public ApiController(QuestaoService questoes,
                         com.concurso.service.ImportService importService,
                         com.concurso.service.SimuladoService simuladoService,
                         EvolucaoService evolucao,
                           com.concurso.service.AcessoService acesso) {
        this.questoes = questoes;
        this.importService = importService;
        this.simuladoService = simuladoService;
        this.evolucao = evolucao;
        this.acesso = acesso;
    }

    /**
     * Certames para os filtros do app (escopo do plano) ou o catálogo completo
     * ({@code ?catalogo=true}) usado na seleção de certames do checkout/troca.
     */
    @GetMapping("/concursos")
    public List<Dtos.ConcursoView> concursos(
            @RequestParam(defaultValue = "false") boolean catalogo,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return questoes.concursos(usuarioId, catalogo);
    }

    /** Bancas distintas do banco, com a contagem de questoes (eixo principal do estudo). */
    @GetMapping("/bancas")
    public List<Dtos.BancaView> bancas(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return questoes.bancas(usuarioId);
    }

    @GetMapping("/topicos")
    public List<Dtos.TopicoView> topicos(@RequestParam(required = false) String concurso,
                                         @RequestParam(required = false) String banca,
                                         @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return questoes.topicos(usuarioId, Parametros.concurso(concurso), Parametros.banca(banca));
    }

    @GetMapping("/questoes")
    public List<Dtos.QuestionView> questoes(@RequestParam(required = false) String concurso,
                                            @RequestParam(required = false) String materia,
                                            @RequestParam(required = false) String assunto,
                                            @RequestParam(required = false) String banca,
                                            @RequestParam(defaultValue = "10") int quantidade,
                                            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return questoes.listar(usuarioId, Parametros.concurso(concurso), Parametros.materia(materia),
                Parametros.assunto(assunto), Parametros.banca(banca), quantidade);
    }

    @PostMapping("/questoes/{id}/responder")
    public Dtos.AnswerView responder(@PathVariable Long id,
                                     @RequestBody Dtos.AnswerRequest request,
                                     @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        // limite diario do plano FREE (429 com mensagem de upsell)
        acesso.exigirDireitoDeResponder(usuarioId);
        return questoes.responder(usuarioId, id, request.alternativa());
    }

    @GetMapping("/desempenho")
    public Dtos.DesempenhoView desempenho(@RequestParam(required = false) String concurso,
                                          @RequestParam(required = false) String banca,
                                          @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return questoes.desempenho(usuarioId, Parametros.concurso(concurso), Parametros.banca(banca));
    }

    @GetMapping("/evolucao")
    public Dtos.EvolucaoView evolucao(@RequestParam(required = false) String concurso,
                                      @RequestParam(required = false) String materia,
                                      @RequestParam(required = false) String banca,
                                      @RequestParam(defaultValue = "30") int dias,
                                      @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return evolucao.evolucao(usuarioId, Parametros.concurso(concurso),
                Parametros.materia(materia), Parametros.banca(banca), dias);
    }

    /** Registra um bloco de tempo de estudo (pomodoro ou modo por tempo). */
    @PostMapping("/estudo")
    public Map<String, Object> registrarEstudo(@RequestBody Dtos.EstudoRequest request,
                                               @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        evolucao.registrarEstudo(usuarioId, request.materia(), request.duracaoSegundos());
        return Map.of("ok", true);
    }

    /** Importa um lote no mesmo formato do questoes.json. */
    @PostMapping("/importar")
    public Dtos.ImportReport importar(@RequestBody java.util.List<com.concurso.seed.QuestionPayload> lote,
                                      @RequestAttribute(AuthInterceptor.ATTR_ADMIN) Boolean admin) {
        exigirAdmin(admin);
        if (lote != null && lote.size() > LIMITE_LOTE) {
            throw new IllegalArgumentException("Lote acima de " + LIMITE_LOTE + " questões; divida em partes.");
        }
        return importService.importar(lote);
    }

    /** Anexa comentarios a questoes existentes (identificadas pelo hash do enunciado). */
    @PostMapping("/explicacoes")
    public Dtos.ExplicacaoReport explicacoes(@RequestBody java.util.List<Dtos.ExplicacaoPayload> itens,
                                             @RequestAttribute(AuthInterceptor.ATTR_ADMIN) Boolean admin) {
        exigirAdmin(admin);
        if (itens != null && itens.size() > LIMITE_LOTE) {
            throw new IllegalArgumentException("Lote acima de " + LIMITE_LOTE + " comentários; divida em partes.");
        }
        return importService.atualizarExplicacoes(itens);
    }

    /** Monta um simulado com a distribuição de matérias do caderno da banca. */
    @GetMapping("/simulado")
    public Dtos.SimuladoView simulado(@RequestParam(required = false) String concurso,
                                      @RequestParam(required = false) String banca,
                                      @RequestParam(required = false) Integer quantidade,
                                      @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return simuladoService.montar(usuarioId, Parametros.concurso(concurso),
                Parametros.banca(banca), quantidade);
    }

    /** Corrige o simulado no fim: registra as tentativas e devolve gabaritos e desempenho. */
    @PostMapping("/simulado/corrigir")
    public Dtos.CorrecaoView corrigirSimulado(@RequestBody Dtos.CorrecaoRequest request,
                                              @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        int total = request.respostas() == null ? 0 : request.respostas().size();
        if (total > LIMITE_CORRECAO) {
            throw new IllegalArgumentException(
                    "Correcao acima de " + LIMITE_CORRECAO + " respostas; divida em partes.");
        }
        // Mesmo direito exigido no responder: a correcao grava Attempts e revela o gabarito.
        acesso.exigirDireitoDeResponder(usuarioId, total);
        return simuladoService.corrigir(usuarioId, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erro(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    private static void exigirAdmin(Boolean admin) {
        if (!Boolean.TRUE.equals(admin)) {
            throw new AcessoNegadoException("Ação restrita ao administrador.");
        }
    }
}
