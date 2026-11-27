package com.concurso.seo;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Renderizacao das paginas publicas indexaveis.
 *
 * <p>HTML puro, sem JavaScript: o Googlebot le o conteudo sem depender de renderizacao do SPA.
 * Nao existe {@code <script>} de execucao; o unico script e' o JSON-LD (bloco de dados) e o CSS
 * e' embutido, permitido pela CSP vigente ({@code style-src 'unsafe-inline'}).</p>
 */
public final class HtmlPaginas {

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy")
            .withZone(ZoneId.of("America/Sao_Paulo"));

    private static final String CSS = """
            :root{--ink:#16243c;--ouro:#c8a05f;--pedra:#f7f6f3;--texto:#292524;--sub:#57534e}
            *{box-sizing:border-box}
            body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;
                 color:var(--texto);background:var(--pedra);line-height:1.65}
            a{color:#2a4067}
            .topo{display:flex;gap:16px;align-items:center;justify-content:space-between;
                  padding:14px 20px;background:var(--ink);color:#fff;flex-wrap:wrap}
            .marca{color:#fff;font-weight:800;letter-spacing:-.5px;text-decoration:none;font-size:20px}
            .marca span{color:var(--ouro)}
            nav a{color:#e7e5e4;text-decoration:none;margin-right:14px;font-weight:600;font-size:14px}
            .cta{background:var(--ouro);color:var(--ink);padding:8px 14px;border-radius:9px;
                 font-weight:700;text-decoration:none;font-size:14px}
            main{max-width:820px;margin:0 auto;padding:28px 20px 48px}
            h1{color:var(--ink);font-size:2rem;line-height:1.2;margin:.2em 0 .3em}
            h2{color:var(--ink);margin-top:1.6em}
            .migalha{font-size:13px;color:var(--sub)}
            .sub{color:var(--sub);margin-top:0}
            .meta{font-size:13px;color:var(--sub);margin:0 0 1.4em}
            .lista{list-style:none;padding:0}
            .lista li{padding:12px 0;border-bottom:1px solid #e7e5e4}
            .lista li span{display:block;font-size:14px;color:var(--sub)}
            .caixa{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:18px 20px;margin:22px 0}
            .questao{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:16px 18px;margin:14px 0}
            .alternativas{margin:10px 0 0;padding-left:20px}
            footer{max-width:820px;margin:0 auto;padding:20px;font-size:13px;color:var(--sub);
                   border-top:1px solid #e7e5e4}
            footer a{color:var(--sub)}
            """;

    private HtmlPaginas() {
    }

    /**
     * Escape minimo: apenas os caracteres que mudam a estrutura do HTML.
     * Mantem UTF-8 legivel (o documento declara charset utf-8), em vez de
     * transformar acentos em entidades como faz o HtmlUtils do Spring.
     */
    public static String h(String valor) {
        if (valor == null) {
            return "";
        }
        return valor.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    public static String truncar(String valor, int maximo) {
        if (valor == null) {
            return "";
        }
        String limpo = valor.strip().replaceAll("\\s+", " ");
        return limpo.length() <= maximo ? limpo : limpo.substring(0, maximo - 1).strip() + "…";
    }

    public static String data(Instant instante) {
        return instante == null ? "" : DATA.format(instante);
    }

    /** Texto puro -> paragrafos HTML. Escapa tudo antes de aplicar negrito. */
    public static String texto(String bruto) {
        if (bruto == null || bruto.isBlank()) {
            return "";
        }
        String seguro = h(bruto).replaceAll("\\*\\*(.+?)\\*\\*", "<strong>$1</strong>");
        StringBuilder sb = new StringBuilder();
        for (String paragrafo : seguro.split("\\n\\s*\\n")) {
            if (paragrafo.isBlank()) {
                continue;
            }
            sb.append("<p>").append(paragrafo.replace("\n", "<br>")).append("</p>\n");
        }
        return sb.toString();
    }

    public static String pagina(String baseUrl, String titulo, String descricao,
                                String caminho, String jsonLd, String corpo) {
        String url = baseUrl + caminho;
        return """
                <!doctype html>
                <html lang="pt-BR">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <meta name="description" content="%s">
                <meta name="robots" content="index,follow,max-image-preview:large">
                <link rel="canonical" href="%s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="QB Concurso">
                <meta property="og:locale" content="pt_BR">
                <meta property="og:title" content="%s">
                <meta property="og:description" content="%s">
                <meta property="og:url" content="%s">
                <meta name="twitter:card" content="summary">
                <meta name="twitter:title" content="%s">
                <meta name="twitter:description" content="%s">
                %s
                <style>%s</style>
                </head>
                <body>
                <header class="topo">
                  <a class="marca" href="/">QB<span>Concurso</span></a>
                  <nav>
                    <a href="/materiais">Materiais</a>
                    <a href="/materias">Matérias</a>
                    <a href="/planos">Planos</a>
                    <a href="/faq">FAQ</a>
                  </nav>
                  <a class="cta" href="/">Entrar / criar conta</a>
                </header>
                <main>%s</main>
                <footer>
                  <p>QB Concurso — questões comentadas para Soldado PM-AM e Investigador PC-AM (banca FGV).</p>
                  <p><a href="/materiais">Materiais</a> · <a href="/materias">Matérias</a> ·
                     <a href="/planos">Planos</a> · <a href="/faq">FAQ</a></p>
                </footer>
                </body>
                </html>
                """.formatted(h(titulo), h(descricao), h(url), h(titulo), h(descricao), h(url),
                h(titulo), h(descricao), jsonLdSeguro(jsonLd), CSS, corpo);
    }

    /** Pagina 404: sem canonical e com noindex, para nao competir com conteudo real. */
    public static String naoEncontrada(String baseUrl) {
        String corpo = """
                <h1>Página não encontrada</h1>
                <p class="sub">O conteúdo que você procura não existe ou foi movido.</p>
                <p><a href="/materiais">Ver todos os materiais de estudo</a></p>
                """;
        return """
                <!doctype html>
                <html lang="pt-BR">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Página não encontrada | QB Concurso</title>
                <meta name="robots" content="noindex,follow">
                <style>%s</style>
                </head>
                <body>
                <header class="topo"><a class="marca" href="/">QB<span>Concurso</span></a>
                <a class="cta" href="/">Ir para o início</a></header>
                <main>%s</main>
                </body>
                </html>
                """.formatted(CSS, corpo);
    }

    private static String jsonLdSeguro(String jsonLd) {
        if (jsonLd == null || jsonLd.isBlank()) {
            return "";
        }
        // \u003c impede que um titulo com "</script>" encerre o bloco de dados.
        String seguro = jsonLd.replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026");
        return "<script type=\"application/ld+json\">" + seguro + "</script>";
    }
}
