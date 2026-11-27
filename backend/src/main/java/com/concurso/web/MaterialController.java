package com.concurso.web;

import com.concurso.service.MaterialService;
import com.concurso.service.RateLimiter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Material de estudo: <b>somente leitura e publico</b>.
 *
 * <p>A lista nao devolve o {@code conteudo}; o texto completo so' sai no detalhe por slug. Nao ha
 * rota de escrita — o conteudo entra pelo seed {@code materiais.json}.</p>
 */
@RestController
@RequestMapping("/api/materiais")
public class MaterialController {

    private final MaterialService materiais;
    private final RateLimiter limiter;

    public MaterialController(MaterialService materiais, RateLimiter limiter) {
        this.materiais = materiais;
        this.limiter = limiter;
    }

    @GetMapping
    public List<Dtos.MaterialResumoView> listar(@RequestParam(required = false) String concurso,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("materiais:" + ClienteIp.de(requisicao), 120);
        return materiais.listar(Parametros.concurso(concurso));
    }

    @GetMapping("/{slug}")
    public Dtos.MaterialView buscar(@PathVariable String slug,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("materiais:" + ClienteIp.de(requisicao), 120);
        return materiais.buscar(Parametros.slug(slug));
    }
}
