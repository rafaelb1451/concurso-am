package com.concurso.seo;

import com.concurso.domain.MaterialEstudo;
import com.concurso.domain.Plano;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static com.concurso.seo.HtmlPaginas.data;
import static com.concurso.seo.HtmlPaginas.h;
import static com.concurso.seo.HtmlPaginas.texto;
import static com.concurso.seo.HtmlPaginas.truncar;

/**
 * Paginas publicas indexaveis (HTML server-side) + robots.txt e sitemap.xml.
 *
 * <p>Aditivo ao SPA: a aplicacao continua em {@code /}; estas rotas existem para o Google
 * rastrear conteudo real sem depender de renderizacao JavaScript.</p>
 */
@Controller
public class SeoController {

    private static final MediaType HTML = new MediaType("text", "html", StandardCharsets.UTF_8);
    private static final MediaType TEXTO = new MediaType("text", "plain", StandardCharsets.UTF_8);
    private static final MediaType XML = new MediaType("application", "xml", StandardCharsets.UTF_8);
    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            .withZone(ZoneId.of("America/Sao_Paulo"));

    private final SeoService seo;
    private final ObjectMapper mapper;
    private final String baseUrl;

    public SeoController(SeoService seo, ObjectMapper mapper,
                         @Value("${concurso.seo.url:https://qbconcurso.com.br}") String baseUrl) {
        this.seo = seo;
        this.mapper = mapper;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    // ------------------------------------------------------------------ materiais

    @GetMapping(value = "/materiais", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> materiais() {
        List<MaterialEstudo> lista = seo.materiais();
        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(new String[]{"Início", "/"}, new String[]{"Materiais", "/materiais"})));
        corpo.append("<h1>Materiais de estudo</h1>");
        corpo.append("<p class=\"sub\">Leis e normas comentadas para os concursos de ")
                .append("Soldado PM-AM e Investigador PC-AM. ")
                .append(lista.size()).append(" materiais publicados.</p>");

        String concurso = null;
        boolean aberto = false;
        for (MaterialEstudo m : lista) {
            if (!Objects.equals(concurso, m.getConcurso())) {
                if (aberto) {
                    corpo.append("</ul>");
                }
                concurso = m.getConcurso();
                corpo.append("<h2>").append(h(concurso)).append("</h2><ul class=\"lista\">");
                aberto = true;
            }
            corpo.append("<li><a href=\"/materiais/").append(h(m.getSlug())).append("\">")
                    .append(h(m.getTitulo())).append("</a>");
            if (m.getResumo() != null && !m.getResumo().isBlank()) {
                corpo.append("<span>").append(h(truncar(m.getResumo(), 140))).append("</span>");
            }
            corpo.append("</li>");
        }
        if (aberto) {
            corpo.append("</ul>");
        }
        corpo.append(caixaCta("Quer praticar com questões comentadas?",
                "Crie uma conta gratuita e responda 20 questões por dia."));

        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "CollectionPage",
                "name", "Materiais de estudo — QB Concurso",
                "url", baseUrl + "/materiais",
                "isPartOf", mapa("@type", "WebSite", "name", "QB Concurso", "url", baseUrl + "/")));

        return html("Materiais de estudo — leis comentadas | QB Concurso",
                "Leis e normas comentadas para Soldado PM-AM e Investigador PC-AM: "
                        + lista.size() + " materiais de estudo gratuitos.",
                "/materiais", jsonLd, corpo.toString());
    }

    @GetMapping(value = "/materiais/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> material(@PathVariable String slug) {
        Optional<MaterialEstudo> encontrado = seo.material(slug);
        if (encontrado.isEmpty()) {
            return naoEncontrada();
        }
        MaterialEstudo m = encontrado.get();
        String caminho = "/materiais/" + m.getSlug();
        String titulo = m.getTitulo() + " comentada — QB Concurso";
        String descricao = m.getResumo() != null && !m.getResumo().isBlank()
                ? truncar(m.getResumo(), 155)
                : truncar(m.getConteudo(), 155);

        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(
                new String[]{"Início", "/"},
                new String[]{"Materiais", "/materiais"},
                new String[]{m.getTitulo(), caminho})));
        corpo.append("<h1>").append(h(m.getTitulo())).append("</h1>");
        corpo.append("<p class=\"meta\">");
        if (m.getCategoria() != null) {
            corpo.append(h(m.getCategoria().name())).append(" · ");
        }
        if (m.getFonte() != null && !m.getFonte().isBlank()) {
            corpo.append(h(m.getFonte())).append(" · ");
        }
        if (m.getConcurso() != null) {
            corpo.append(h(m.getConcurso())).append(" · ");
        }
        corpo.append("atualizado em ").append(data(m.getAtualizadoEm())).append("</p>");
        corpo.append("<div class=\"conteudo\">").append(texto(m.getConteudo())).append("</div>");
        corpo.append(caixaCta("Estude com questões comentadas",
                "Este material faz parte do banco de questões do QB Concurso. "
                        + "Crie sua conta gratuita para praticar."));
        corpo.append("<p><a href=\"/materiais\">← Todos os materiais</a></p>");

        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "Article",
                "headline", m.getTitulo(),
                "description", descricao,
                "datePublished", m.getAtualizadoEm().toString(),
                "dateModified", m.getAtualizadoEm().toString(),
                "inLanguage", "pt-BR",
                "mainEntityOfPage", baseUrl + caminho,
                "author", mapa("@type", "Organization", "name", "QB Concurso"),
                "publisher", mapa("@type", "Organization", "name", "QB Concurso",
                        "url", baseUrl + "/")));

        return html(titulo, descricao, caminho, jsonLd, corpo.toString());
    }

    // ------------------------------------------------------------------ materias

    @GetMapping(value = "/materias", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> materias() {
        List<SeoService.Materia> lista = seo.materias();
        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(new String[]{"Início", "/"}, new String[]{"Matérias", "/materias"})));
        corpo.append("<h1>Matérias dos concursos</h1>");
        corpo.append("<p class=\"sub\">Conteúdo cobrado pela banca FGV nos concursos de ")
                .append("Soldado PM-AM e Investigador PC-AM.</p><ul class=\"lista\">");
        for (SeoService.Materia m : lista) {
            corpo.append("<li><a href=\"/materias/").append(h(m.slug())).append("\">")
                    .append(h(m.nome())).append("</a><span>")
                    .append(m.questoes()).append(" questões no banco</span></li>");
        }
        corpo.append("</ul>");
        corpo.append(caixaCta("Pratique por matéria",
                "O plano gratuito libera 20 questões por dia, com comentário e fundamento."));

        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "CollectionPage",
                "name", "Matérias dos concursos — QB Concurso",
                "url", baseUrl + "/materias"));

        return html("Matérias dos concursos PM-AM e PC-AM | QB Concurso",
                "Lista de matérias cobradas pela FGV nos concursos de Soldado PM-AM e "
                        + "Investigador PC-AM, com contagem de questões.",
                "/materias", jsonLd, corpo.toString());
    }

    @GetMapping(value = "/materias/{slug}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> materia(@PathVariable String slug) {
        Optional<SeoService.Materia> encontrada = seo.materia(slug);
        if (encontrada.isEmpty()) {
            return naoEncontrada();
        }
        SeoService.Materia m = encontrada.get();
        String caminho = "/materias/" + m.slug();
        String titulo = m.nome() + " — questões comentadas | QB Concurso";
        String descricao = truncar("Questões de " + m.nome() + " para os concursos de Soldado "
                + "PM-AM e Investigador PC-AM (FGV). " + m.questoes()
                + " questões no banco, com comentário e fundamento.", 155);

        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(
                new String[]{"Início", "/"},
                new String[]{"Matérias", "/materias"},
                new String[]{m.nome(), caminho})));
        corpo.append("<h1>").append(h(m.nome())).append("</h1>");
        corpo.append("<p class=\"sub\">").append(m.questoes())
                .append(" questões no banco, cobradas pela banca FGV.</p>");

        List<SeoService.Amostra> amostras = seo.amostras(m.nome(), 2);
        if (!amostras.isEmpty()) {
            corpo.append("<h2>Amostra de questões</h2>");
            for (SeoService.Amostra a : amostras) {
                corpo.append("<article class=\"questao\"><p>").append(h(a.enunciado())).append("</p>");
                if (!a.alternativas().isEmpty()) {
                    corpo.append("<ol class=\"alternativas\">");
                    for (int i = 0; i < a.alternativas().size(); i++) {
                        corpo.append("<li><strong>")
                                .append((char) ('A' + i)).append(")</strong> ")
                                .append(h(a.alternativas().get(i))).append("</li>");
                    }
                    corpo.append("</ol>");
                }
                corpo.append("</article>");
            }
        }
        corpo.append(caixaCta("Veja o gabarito comentado",
                "Crie uma conta gratuita para responder, ver o comentário e o fundamento legal "
                        + "de cada questão."));
        corpo.append("<p><a href=\"/materias\">← Todas as matérias</a></p>");

        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "CollectionPage",
                "name", m.nome() + " — questões comentadas",
                "url", baseUrl + caminho,
                "about", mapa("@type", "Thing", "name", m.nome())));

        return html(titulo, descricao, caminho, jsonLd, corpo.toString());
    }

    // ------------------------------------------------------------------ planos e FAQ

    @GetMapping(value = "/planos", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> planos() {
        List<Plano> lista = seo.planos();
        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(new String[]{"Início", "/"}, new String[]{"Planos", "/planos"})));
        corpo.append("<h1>Planos e preços</h1>");
        corpo.append("<p class=\"sub\">Comece grátis e assine quando quiser responder sem limite.</p>");
        for (Plano p : lista) {
            corpo.append("<div class=\"caixa\"><h2>").append(h(p.getNome())).append("</h2>");
            corpo.append("<p><strong>").append(preco(p)).append("</strong>");
            if (p.getCiclo() != null && !p.getCiclo().isBlank()) {
                corpo.append(" / ").append(h(p.getCiclo().toLowerCase(Locale.ROOT)));
            }
            corpo.append("</p><p>");
            corpo.append(p.ilimitado()
                    ? "Questões ilimitadas, com comentário e fundamento."
                    : "Até " + p.getLimiteDiarioQuestoes() + " questões por dia, com comentário.");
            corpo.append("</p></div>");
        }
        corpo.append(caixaCta("Criar conta grátis", "Leva menos de um minuto e não pede cartão."));
        corpo.append("<p><a href=\"/faq\">Dúvidas frequentes</a></p>");

        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "WebPage",
                "name", "Planos e preços — QB Concurso",
                "url", baseUrl + "/planos"));

        return html("Planos e preços — QB Concurso",
                "Plano gratuito com 20 questões por dia e planos PRO mensal e anual com "
                        + "questões ilimitadas. Pagamento pelo Mercado Pago.",
                "/planos", jsonLd, corpo.toString());
    }

    @GetMapping(value = "/faq", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> faq() {
        List<String[]> perguntas = List.of(
                new String[]{"O que é o QB Concurso?",
                        "É uma plataforma de questões comentadas para os concursos do Amazonas "
                                + "(PM-AM, PC-AM e CREA-AM), organizada por banca e assunto, com "
                                + "comentário e fundamento legal em cada questão."},
                new String[]{"Quais concursos são atendidos?",
                        "Soldado da PM-AM, Investigador da PC-AM e o concurso do CREA-AM "
                                + "(legislação e regimentos do Sistema CONFEA/CREA), cada um no "
                                + "estilo da sua banca."},
                new String[]{"O que o plano gratuito inclui?",
                        "A conta gratuita permite responder até 20 questões por dia, com comentário "
                                + "e fundamento, além da prática aberta sem cadastro."},
                new String[]{"O QB Concurso tem tutor de IA?",
                        "Sim. O tutor responde dúvidas sobre a questão em estudo, com foco na letra "
                                + "da lei, e fica disponível na área de fixação."},
                new String[]{"Como funciona o pagamento?",
                        "O pagamento é processado pelo Mercado Pago (Pix ou cartão). O acesso PRO é "
                                + "liberado automaticamente após a confirmação do pagamento."});

        StringBuilder corpo = new StringBuilder();
        corpo.append(migalha(List.of(new String[]{"Início", "/"}, new String[]{"Perguntas frequentes", "/faq"})));
        corpo.append("<h1>Perguntas frequentes</h1>");
        for (String[] par : perguntas) {
            corpo.append("<div class=\"caixa\"><h2>").append(h(par[0])).append("</h2><p>")
                    .append(h(par[1])).append("</p></div>");
        }

        List<Map<String, Object>> itens = new ArrayList<>();
        for (String[] par : perguntas) {
            itens.add(mapa("@type", "Question", "name", par[0],
                    "acceptedAnswer", mapa("@type", "Answer", "text", par[1])));
        }
        String jsonLd = json(mapa(
                "@context", "https://schema.org",
                "@type", "FAQPage",
                "mainEntity", itens));

        return html("Perguntas frequentes — QB Concurso",
                "Dúvidas sobre o QB Concurso: concursos atendidos, plano gratuito, tutor de IA "
                        + "e pagamento pelo Mercado Pago.",
                "/faq", jsonLd, corpo.toString());
    }

    // ------------------------------------------------------------------ robots / sitemap

    @GetMapping("/robots.txt")
    public ResponseEntity<String> robots() {
        String corpo = """
                User-agent: *
                Allow: /
                Disallow: /api/
                Disallow: /admin

                # /assets/ fica liberado de proposito: o Googlebot precisa de CSS/JS
                # para renderizar a landing (SPA). Bloquear os assets piora a indexacao.
                Sitemap: %s/sitemap.xml
                """.formatted(baseUrl);
        return ResponseEntity.ok()
                .contentType(TEXTO)
                .header("Cache-Control", "public, max-age=3600")
                .body(corpo);
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> sitemap() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        url(xml, baseUrl + "/", null);
        url(xml, baseUrl + "/materiais", null);
        url(xml, baseUrl + "/materias", null);
        url(xml, baseUrl + "/planos", null);
        url(xml, baseUrl + "/faq", null);
        for (MaterialEstudo m : seo.materiais()) {
            url(xml, baseUrl + "/materiais/" + m.getSlug(),
                    m.getAtualizadoEm() == null ? null : DIA.format(m.getAtualizadoEm()));
        }
        for (SeoService.Materia m : seo.materias()) {
            url(xml, baseUrl + "/materias/" + m.slug(), null);
        }
        xml.append("</urlset>\n");
        return ResponseEntity.ok()
                .contentType(XML)
                .header("Cache-Control", "public, max-age=3600")
                .body(xml.toString());
    }

    // ------------------------------------------------------------------ helpers

    private ResponseEntity<String> html(String titulo, String descricao, String caminho,
                                        String jsonLd, String corpo) {
        String pagina = HtmlPaginas.pagina(baseUrl, titulo, descricao, caminho, jsonLd, corpo);
        return ResponseEntity.ok()
                .contentType(HTML)
                .header("Cache-Control", "public, max-age=600")
                .body(pagina);
    }

    private ResponseEntity<String> naoEncontrada() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(HTML)
                .header("Cache-Control", "no-store")
                .body(HtmlPaginas.naoEncontrada(baseUrl));
    }

    private String json(Object valor) {
        try {
            return mapper.writeValueAsString(valor);
        } catch (Exception e) {
            return "";
        }
    }

    private static Map<String, Object> mapa(Object... chaveValor) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < chaveValor.length; i += 2) {
            m.put(String.valueOf(chaveValor[i]), chaveValor[i + 1]);
        }
        return m;
    }

    private String migalha(List<String[]> itens) {
        StringBuilder sb = new StringBuilder("<nav class=\"migalha\">");
        for (int i = 0; i < itens.size(); i++) {
            if (i > 0) {
                sb.append(" › ");
            }
            if (i == itens.size() - 1) {
                sb.append(h(itens.get(i)[0]));
            } else {
                sb.append("<a href=\"").append(h(itens.get(i)[1])).append("\">")
                        .append(h(itens.get(i)[0])).append("</a>");
            }
        }
        return sb.append("</nav>").toString();
    }

    private static String caixaCta(String titulo, String texto) {
        return "<div class=\"caixa\"><strong>" + h(titulo) + "</strong><p>" + h(texto)
                + "</p><a class=\"cta\" href=\"/\">Criar conta grátis</a></div>";
    }

    private static String preco(Plano plano) {
        if (plano.getValorCentavos() <= 0) {
            return "Grátis";
        }
        return String.format(Locale.forLanguageTag("pt-BR"), "R$ %.2f",
                plano.getValorCentavos() / 100.0);
    }

    private static void url(StringBuilder xml, String loc, String lastmod) {
        xml.append("  <url><loc>").append(h(loc)).append("</loc>");
        if (lastmod != null && !lastmod.isBlank()) {
            xml.append("<lastmod>").append(lastmod).append("</lastmod>");
        }
        xml.append("</url>\n");
    }
}
