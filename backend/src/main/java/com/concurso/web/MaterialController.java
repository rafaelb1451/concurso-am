package com.concurso.web;

import com.concurso.domain.MaterialEstudo;
import com.concurso.service.MaterialPdfService;
import com.concurso.service.MaterialService;
import com.concurso.service.RateLimiter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
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

    /** Exportacoes (mapa mental e PDF) sao autenticadas e limitadas por usuario. */
    private static final int EXPORTACOES_POR_MINUTO = 10;

    private final MaterialService materiais;
    private final MaterialPdfService pdf;
    private final RateLimiter limiter;

    public MaterialController(MaterialService materiais, MaterialPdfService pdf, RateLimiter limiter) {
        this.materiais = materiais;
        this.pdf = pdf;
        this.limiter = limiter;
    }

    @GetMapping
    public List<Dtos.MaterialResumoView> listar(@RequestParam(required = false) String concurso,
            @RequestAttribute(value = AuthInterceptor.ATTR_USUARIO_ID, required = false) Long usuarioId,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("materiais:" + ClienteIp.de(requisicao), 120);
        return materiais.listar(usuarioId, Parametros.concurso(concurso));
    }

    @GetMapping("/{slug}")
    public Dtos.MaterialView buscar(@PathVariable String slug,
            @RequestAttribute(value = AuthInterceptor.ATTR_USUARIO_ID, required = false) Long usuarioId,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("materiais:" + ClienteIp.de(requisicao), 120);
        return materiais.buscar(usuarioId, Parametros.slug(slug));
    }

    /**
     * Mapa mental em JSON. Autenticado (nao e' material publico): o aluno logado usa para
     * estudar e o frontend tambem pode oferecer o download do PDF.
     */
    @GetMapping("/{slug}/mapa-mental")
    public Dtos.MapaMentalView mapaMental(@PathVariable String slug,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        limiter.exigir("material-mapa:" + usuarioId, EXPORTACOES_POR_MINUTO);
        MaterialEstudo material = materiais.entidade(Parametros.slug(slug), usuarioId);
        MaterialPdfService.MapaMental mapa = pdf.mapa(material);
        return new Dtos.MapaMentalView(
                material.getTitulo(),
                mapa.tema(),
                mapa.ramos().stream()
                        .map(ramo -> new Dtos.RamoMapa(ramo.titulo(), ramo.itens()))
                        .toList());
    }

    /** PDF do material (capa, mapa mental, resumo, questoes e gabarito). */
    @GetMapping("/{slug}/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable String slug,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        limiter.exigir("material-pdf:" + usuarioId, EXPORTACOES_POR_MINUTO);
        String slugLimpo = Parametros.slug(slug);
        MaterialEstudo material = materiais.entidade(slugLimpo, usuarioId);
        byte[] conteudo = pdf.pdf(material, pdf.amostras(material));
        String arquivo = slugLimpo.replace("\"", "") + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + arquivo + "\"")
                .contentLength(conteudo.length)
                .body(conteudo);
    }
}
