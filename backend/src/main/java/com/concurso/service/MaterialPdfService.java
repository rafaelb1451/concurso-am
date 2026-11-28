package com.concurso.service;

import com.concurso.domain.MaterialCategoria;
import com.concurso.domain.MaterialEstudo;
import com.concurso.domain.Question;
import com.concurso.repo.QuestionRepository;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mapa mental e PDF do material de estudo.
 *
 * <p>O mapa mental e' derivado do {@code conteudo}: cada paragrafo no formato
 * {@code **Título.** texto} vira um ramo com ate' quatro frases curtas. O PDF e' gerado com
 * primitivas do OpenPDF (sem imagem externa) e traz capa, mapa mental, resumo, ate' cinco questoes
 * de fixacao e o gabarito comentado em pagina separada.</p>
 */
@Service
public class MaterialPdfService {

    private static final String MARCA = "QB Concurso — Quebrando a Banca";
    private static final String SITE = "qbconcurso.com.br";

    private static final int MAX_RAMOS = 8;
    private static final int MAX_ITENS_POR_RAMO = 4;
    private static final int MAX_CHARS_ITEM = 140;
    private static final int MAX_QUESTOES = 5;
    private static final int MAX_CHARS_COMENTARIO = 280;

    /** "**Título.** texto" — o titulo e' o trecho entre asteriscos. */
    private static final Pattern SECAO = Pattern.compile("^\\*\\*(.+?)\\*\\*\\s*(.*)$", Pattern.DOTALL);
    /** Quebra em frases sem confundir abreviacoes como "art. 1º". */
    private static final Pattern FIM_DE_FRASE =
            Pattern.compile("(?<=[.!?;])\\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])");
    private static final Pattern PARAGRAFOS = Pattern.compile("\\R\\s*\\R");

    private static final DateTimeFormatter DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Font FONTE_MARCA = new Font(Font.HELVETICA, 20, Font.BOLD, new Color(20, 55, 95));
    private static final Font FONTE_CAPA_TITULO = new Font(Font.HELVETICA, 24, Font.BOLD, new Color(25, 30, 35));
    private static final Font FONTE_CAPA_SUB = new Font(Font.HELVETICA, 12, Font.NORMAL, new Color(80, 88, 96));
    private static final Font FONTE_CAPA_INFO = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(95, 100, 105));
    private static final Font FONTE_SECAO = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(20, 55, 95));
    private static final Font FONTE_SUBSECAO = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(80, 88, 96));
    private static final Font FONTE_TEXTO = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(30, 32, 34));
    private static final Font FONTE_QUESTAO = new Font(Font.HELVETICA, 10, Font.NORMAL, new Color(25, 27, 30));
    private static final Font FONTE_ALTERNATIVA = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, new Color(45, 48, 52));
    private static final Font FONTE_PEQUENA = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(105, 110, 115));
    private static final Font FONTE_GABARITO = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(20, 55, 95));
    private static final Font FONTE_RAMO_TITULO = new Font(Font.HELVETICA, 8.2f, Font.BOLD, new Color(20, 55, 95));
    private static final Font FONTE_RAMO_ITEM = new Font(Font.HELVETICA, 6.6f, Font.NORMAL, new Color(50, 54, 58));
    private static final Font FONTE_CENTRAL = new Font(Font.HELVETICA, 9.5f, Font.BOLD, new Color(255, 255, 255));

    private static final Color AZUL = new Color(20, 55, 95);
    private static final Color AZUL_CLARO = new Color(232, 239, 247);
    private static final Color CINZA_LINHA = new Color(150, 160, 170);
    private static final Color CINZA_CAIXA = new Color(244, 246, 249);

    private static final float MARGEM_MAPA = 24f;
    private static final float LARGURA_RAMO = 240f;
    private static final float ALTURA_RAMO = 118f;
    private static final float TOPO_RAMOS = 630f;
    private static final float PASSO_RAMOS = 125f;

    private static final BaseFont BASE_RODAPE = criarBaseRodape();

    private final QuestionRepository questoes;

    public MaterialPdfService(QuestionRepository questoes) {
        this.questoes = questoes;
    }

    /** Mapa mental: tema = titulo do material; ramos = secoes do conteudo. */
    public MapaMental mapa(MaterialEstudo material) {
        String tema = material.getTitulo() == null ? "" : material.getTitulo().strip();
        List<MapaMental.Ramo> ramos = new ArrayList<>();
        for (String paragrafo : paragrafos(material.getConteudo())) {
            if (ramos.size() >= MAX_RAMOS) {
                break;
            }
            MapaMental.Ramo ramo = ramo(paragrafo, ramos.size() + 1);
            if (ramo != null) {
                ramos.add(ramo);
            }
        }
        return new MapaMental(tema, List.copyOf(ramos));
    }

    /**
     * Ate' cinco questoes da mesma materia do material. A entidade nao guarda a materia, entao
     * ela e' inferida pelo titulo/resumo contra as materias ja cadastradas; nas normas de conselho
     * (LEI/RESOLUCAO/REGIMENTO) a materia guarda-chuva e' "Legislação Profissional".
     */
    @Transactional(readOnly = true)
    public List<Question> amostras(MaterialEstudo material) {
        String materia = materiaDoMaterial(material);
        if (materia == null) {
            return List.of();
        }
        List<Question> encontradas = questoes.findByMateriaOrderByIdAsc(materia).stream()
                .limit(MAX_QUESTOES)
                .toList();
        // Inicializa as alternativas (LAZY) ainda dentro da transacao: o controller monta o PDF
        // depois que a transacao terminou e open-in-view esta' desligado.
        for (Question questao : encontradas) {
            questao.getAlternativas().size();
        }
        return encontradas;
    }

    /** Gera o PDF completo do material. */
    public byte[] pdf(MaterialEstudo material, List<Question> amostras) {
        List<Question> lista = amostras == null ? List.of() : amostras;
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4, 36, 36, 36, 42);
        try {
            PdfWriter writer = PdfWriter.getInstance(documento, saida);
            writer.setPageEvent(new Rodape(material.getFonte()));
            documento.addTitle(limpar(material.getTitulo()));
            documento.addAuthor(MARCA);
            documento.addCreator(SITE);
            documento.open();

            capa(documento, material);
            documento.newPage();
            paginaMapa(documento, writer, material);
            documento.newPage();
            resumo(documento, material);
            documento.newPage();
            questoes(documento, lista);
            if (!lista.isEmpty()) {
                documento.newPage();
                gabarito(documento, lista);
            }
        } catch (DocumentException e) {
            throw new IllegalStateException("Nao foi possivel gerar o PDF do material", e);
        } finally {
            if (documento.isOpen()) {
                try {
                    documento.close();
                } catch (Exception ignorada) {
                    // O erro original (se houver) e' o que importa.
                }
            }
        }
        return saida.toByteArray();
    }

    // ------------------------------------------------------------------ conteudo

    /** Secao do mapa mental. */
    public record MapaMental(String tema, List<Ramo> ramos) {
        public record Ramo(String titulo, List<String> itens) {
        }
    }

    static List<String> paragrafos(String conteudo) {
        if (conteudo == null || conteudo.isBlank()) {
            return List.of();
        }
        List<String> lista = new ArrayList<>();
        for (String p : PARAGRAFOS.split(conteudo)) {
            String limpo = p.strip();
            if (!limpo.isEmpty()) {
                lista.add(limpo);
            }
        }
        return lista;
    }

    private static MapaMental.Ramo ramo(String paragrafo, int posicao) {
        Matcher matcher = SECAO.matcher(paragrafo);
        String titulo;
        String corpo;
        if (matcher.matches()) {
            titulo = limparTitulo(matcher.group(1));
            corpo = matcher.group(2);
        } else {
            // Conteudo antigo (sem "**Título.**"): usa a primeira frase como titulo.
            String limpo = semMarcadores(paragrafo);
            String[] partes = FIM_DE_FRASE.split(limpo, 2);
            titulo = cortar(partes[0], 60);
            corpo = partes.length > 1 ? partes[1] : limpo;
            if (titulo.isBlank()) {
                titulo = "Tópico " + posicao;
            }
        }
        if (titulo.isBlank()) {
            return null;
        }
        return new MapaMental.Ramo(titulo, itens(corpo));
    }

    static List<String> itens(String texto) {
        String limpo = semMarcadores(texto);
        if (limpo.isBlank()) {
            return List.of();
        }
        List<String> itens = new ArrayList<>();
        for (String frase : FIM_DE_FRASE.split(limpo)) {
            String item = cortar(frase, MAX_CHARS_ITEM);
            if (!item.isBlank()) {
                itens.add(item);
            }
            if (itens.size() >= MAX_ITENS_POR_RAMO) {
                break;
            }
        }
        return List.copyOf(itens);
    }

    private static String limparTitulo(String titulo) {
        return semMarcadores(titulo)
                .replaceAll("[.:;,\\s]+$", "")
                .strip();
    }

    private static String semMarcadores(String texto) {
        if (texto == null) {
            return "";
        }
        return texto.replace("**", "")
                .replaceAll("\\s+", " ")
                .strip();
    }

    private static String cortar(String texto, int maximo) {
        String limpo = texto == null ? "" : texto.strip();
        if (limpo.length() <= maximo) {
            return limpo;
        }
        int corte = limpo.lastIndexOf(' ', maximo - 4);
        if (corte < maximo / 2) {
            corte = maximo - 4;
        }
        return limpo.substring(0, corte).strip() + "...";
    }

    private String materiaDoMaterial(MaterialEstudo material) {
        String procurado = normalizar(material.getTitulo()) + " " + normalizar(material.getResumo());
        String melhor = null;
        int melhorTamanho = 0;
        for (QuestionRepository.TopicCount topico : questoes.findTopicCounts(null, null)) {
            String materia = normalizar(topico.getMateria());
            if (!materia.isBlank() && procurado.contains(materia) && materia.length() > melhorTamanho) {
                melhor = topico.getMateria();
                melhorTamanho = materia.length();
            }
        }
        if (melhor != null) {
            return melhor;
        }
        // Normas de conselho nao citam a materia no titulo; as questoes desses certames ficam
        // sob "Legislação Profissional". Sem esse fallback o PDF de uma lei sairia sem questoes.
        MaterialCategoria categoria = material.getCategoria();
        if (categoria != null && categoria != MaterialCategoria.OUTRO) {
            return "Legislação Profissional";
        }
        return null;
    }

    private static String normalizar(String valor) {
        if (valor == null) {
            return "";
        }
        return Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .strip();
    }

    // ------------------------------------------------------------------ capa

    private void capa(Document documento, MaterialEstudo material) throws DocumentException {
        Paragraph marca = new Paragraph(MARCA, FONTE_MARCA);
        marca.setAlignment(Element.ALIGN_CENTER);
        marca.setSpacingBefore(80);
        documento.add(marca);

        Paragraph subtitulo = new Paragraph("Material de estudo", FONTE_CAPA_SUB);
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(10);
        documento.add(subtitulo);

        Paragraph titulo = new Paragraph(limpar(material.getTitulo()), FONTE_CAPA_TITULO);
        titulo.setAlignment(Element.ALIGN_CENTER);
        titulo.setLeading(30);
        titulo.setSpacingBefore(90);
        documento.add(titulo);

        if (material.getResumo() != null && !material.getResumo().isBlank()) {
            Paragraph resumo = new Paragraph(material.getResumo().strip(), FONTE_CAPA_SUB);
            resumo.setAlignment(Element.ALIGN_CENTER);
            resumo.setLeading(16);
            resumo.setSpacingBefore(18);
            documento.add(resumo);
        }

        Paragraph concurso = new Paragraph("Concurso: " + limpar(material.getConcurso()), FONTE_CAPA_INFO);
        concurso.setAlignment(Element.ALIGN_CENTER);
        concurso.setSpacingBefore(90);
        documento.add(concurso);

        Paragraph categoria = new Paragraph(
                "Categoria: " + (material.getCategoria() == null ? "—" : material.getCategoria().name())
                        + "  ·  Fonte: " + (material.getFonte() == null ? "—" : material.getFonte()),
                FONTE_CAPA_INFO);
        categoria.setAlignment(Element.ALIGN_CENTER);
        categoria.setSpacingBefore(6);
        documento.add(categoria);

        Paragraph data = new Paragraph("Gerado em " + LocalDate.now().format(DATA), FONTE_CAPA_INFO);
        data.setAlignment(Element.ALIGN_CENTER);
        data.setSpacingBefore(60);
        documento.add(data);

        Paragraph site = new Paragraph(SITE, FONTE_CAPA_SUB);
        site.setAlignment(Element.ALIGN_CENTER);
        site.setSpacingBefore(6);
        documento.add(site);
    }

    // ------------------------------------------------------------------ mapa

    private void paginaMapa(Document documento, PdfWriter writer, MaterialEstudo material)
            throws DocumentException {
        Paragraph titulo = new Paragraph("Mapa mental", FONTE_SECAO);
        titulo.setSpacingAfter(4);
        documento.add(titulo);

        Paragraph tema = new Paragraph(limpar(material.getTitulo()), FONTE_SUBSECAO);
        tema.setSpacingAfter(10);
        documento.add(tema);

        MapaMental mapa = mapa(material);
        if (mapa.ramos().isEmpty()) {
            documento.add(new Paragraph(
                    "Não há seções formatadas no conteúdo para montar o mapa mental.", FONTE_TEXTO));
            return;
        }
        desenharMapa(writer.getDirectContent(), mapa);
    }

    private void desenharMapa(PdfContentByte canvas, MapaMental mapa) {
        float larguraPagina = PageSize.A4.getWidth();
        float centroX = larguraPagina / 2f;

        float caixaLargura = 250f;
        float caixaAltura = 58f;
        float caixaX = centroX - caixaLargura / 2f;
        float caixaTopo = 744f;
        float caixaBase = caixaTopo - caixaAltura;

        // Linhas primeiro: as caixas cobrem as pontas.
        // Espinha vertical a partir da caixa central; os ramos saem dela na altura do centro.
        float baseEspinha = TOPO_RAMOS - ALTURA_RAMO / 2f;
        float ultimaLinha = baseEspinha - (Math.min(4, mapa.ramos().size()) - 1) * PASSO_RAMOS;
        canvas.saveState();
        canvas.setColorStroke(CINZA_LINHA);
        canvas.setLineWidth(1.1f);
        canvas.moveTo(centroX, caixaBase);
        canvas.lineTo(centroX, Math.min(baseEspinha, ultimaLinha));
        canvas.stroke();
        canvas.restoreState();

        for (int i = 0; i < mapa.ramos().size(); i++) {
            MapaMental.Ramo ramo = mapa.ramos().get(i);
            boolean esquerda = i < 4;
            int linha = i % 4;
            float x = esquerda ? MARGEM_MAPA : larguraPagina - MARGEM_MAPA - LARGURA_RAMO;
            float yTopo = TOPO_RAMOS - linha * PASSO_RAMOS;
            float yCentro = yTopo - ALTURA_RAMO / 2f;
            float bordaInterna = esquerda ? x + LARGURA_RAMO : x;

            canvas.setColorStroke(CINZA_LINHA);
            canvas.setLineWidth(0.9f);
            canvas.moveTo(centroX, yCentro);
            canvas.lineTo(bordaInterna, yCentro);
            canvas.stroke();

            desenharRamo(canvas, ramo, x, yTopo - ALTURA_RAMO, LARGURA_RAMO, ALTURA_RAMO);
        }

        // Caixa central por cima das linhas.
        canvas.saveState();
        canvas.setColorFill(AZUL);
        canvas.setColorStroke(AZUL);
        canvas.roundRectangle(caixaX, caixaBase, caixaLargura, caixaAltura, 10);
        canvas.fillStroke();
        canvas.restoreState();

        ColumnText central = new ColumnText(canvas);
        central.setSimpleColumn(caixaX + 10, caixaBase + 8, caixaX + caixaLargura - 10,
                caixaTopo - 8, 12f, Element.ALIGN_CENTER);
        central.addElement(new Paragraph(mapa.tema(), FONTE_CENTRAL));
        try {
            central.go();
        } catch (DocumentException e) {
            throw new IllegalStateException("Nao foi possivel desenhar o tema do mapa mental", e);
        }
    }

    private void desenharRamo(PdfContentByte canvas, MapaMental.Ramo ramo,
            float x, float y, float largura, float altura) {
        canvas.saveState();
        canvas.setColorFill(CINZA_CAIXA);
        canvas.setColorStroke(AZUL_CLARO);
        canvas.setLineWidth(0.8f);
        canvas.roundRectangle(x, y, largura, altura, 7);
        canvas.fillStroke();
        canvas.restoreState();

        ColumnText coluna = new ColumnText(canvas);
        coluna.setSimpleColumn(x + 8, y + 7, x + largura - 8, y + altura - 7, 7.6f, Element.ALIGN_LEFT);

        Paragraph titulo = new Paragraph(ramo.titulo(), FONTE_RAMO_TITULO);
        titulo.setLeading(9.6f);
        titulo.setSpacingAfter(2.5f);
        coluna.addElement(titulo);

        for (String item : ramo.itens()) {
            Paragraph paragrafo = new Paragraph("• " + item, FONTE_RAMO_ITEM);
            paragrafo.setLeading(7.6f);
            paragrafo.setSpacingAfter(1.5f);
            coluna.addElement(paragrafo);
        }
        try {
            coluna.go();
        } catch (DocumentException e) {
            throw new IllegalStateException("Nao foi possivel desenhar um ramo do mapa mental", e);
        }
    }

    // ------------------------------------------------------------------ resumo

    private void resumo(Document documento, MaterialEstudo material) throws DocumentException {
        Paragraph titulo = new Paragraph("Resumo", FONTE_SECAO);
        titulo.setSpacingAfter(10);
        documento.add(titulo);

        List<String> paragrafos = paragrafos(material.getConteudo());
        if (paragrafos.isEmpty()) {
            documento.add(new Paragraph("Material sem conteúdo cadastrado.", FONTE_TEXTO));
            return;
        }
        for (String paragrafo : paragrafos) {
            String limpo = semMarcadores(paragrafo);
            if (limpo.isBlank()) {
                continue;
            }
            Paragraph p = new Paragraph(limpo, FONTE_TEXTO);
            p.setLeading(14f);
            p.setSpacingAfter(9f);
            p.setAlignment(Element.ALIGN_JUSTIFIED);
            documento.add(p);
        }
    }

    // ------------------------------------------------------------------ questoes e gabarito

    private void questoes(Document documento, List<Question> lista) throws DocumentException {
        Paragraph titulo = new Paragraph("Questões de fixação", FONTE_SECAO);
        titulo.setSpacingAfter(4);
        documento.add(titulo);

        Paragraph sub = new Paragraph(
                "Até 5 questões da mesma matéria deste material, no formato da banca.", FONTE_SUBSECAO);
        sub.setSpacingAfter(8);
        documento.add(sub);

        if (lista.isEmpty()) {
            documento.add(new Paragraph(
                    "Não há questões cadastradas para a matéria deste material.", FONTE_TEXTO));
            return;
        }

        for (int i = 0; i < lista.size(); i++) {
            Question questao = lista.get(i);
            Paragraph enunciado = new Paragraph((i + 1) + ". " + limpar(questao.getEnunciado()), FONTE_QUESTAO);
            enunciado.setLeading(14f);
            enunciado.setSpacingBefore(10);
            enunciado.setSpacingAfter(5);
            documento.add(enunciado);

            List<String> alternativas = questao.getAlternativas();
            int total = alternativas == null ? 0 : Math.min(5, alternativas.size());
            for (int j = 0; j < total; j++) {
                Paragraph alternativa = new Paragraph(
                        (char) ('A' + j) + ") " + limpar(alternativas.get(j)), FONTE_ALTERNATIVA);
                alternativa.setIndentationLeft(16);
                alternativa.setLeading(12.5f);
                alternativa.setSpacingAfter(2);
                documento.add(alternativa);
            }

            Paragraph fonte = new Paragraph(rotuloFonte(questao), FONTE_PEQUENA);
            fonte.setIndentationLeft(16);
            fonte.setSpacingBefore(2);
            fonte.setSpacingAfter(4);
            documento.add(fonte);
        }
    }

    private void gabarito(Document documento, List<Question> lista) throws DocumentException {
        Paragraph titulo = new Paragraph("Gabarito comentado", FONTE_SECAO);
        titulo.setSpacingAfter(10);
        documento.add(titulo);

        for (int i = 0; i < lista.size(); i++) {
            Question questao = lista.get(i);
            int correta = questao.getCorreta() == null ? 0 : questao.getCorreta();
            List<String> alternativas = questao.getAlternativas();
            String letra = alternativas != null && correta >= 0 && correta < alternativas.size()
                    ? String.valueOf((char) ('A' + correta))
                    : "?";
            String textoCorreta = alternativas != null && correta >= 0 && correta < alternativas.size()
                    ? cortar(alternativas.get(correta), 120)
                    : "";

            Paragraph linha = new Paragraph();
            linha.setSpacingBefore(8);
            linha.setLeading(13.5f);
            linha.add(new Chunk((i + 1) + ". Alternativa " + letra
                    + (textoCorreta.isBlank() ? "" : " — " + textoCorreta), FONTE_GABARITO));
            linha.add(new Chunk("\n" + comentario(questao), FONTE_TEXTO));
            documento.add(linha);
        }
    }

    private static String comentario(Question questao) {
        String texto = questao.getExplicacao();
        if (texto == null || texto.isBlank()) {
            texto = questao.getFundamento();
        }
        if (texto == null || texto.isBlank()) {
            return "Sem comentário cadastrado para esta questão.";
        }
        return cortar(semMarcadores(texto), MAX_CHARS_COMENTARIO);
    }

    private static String rotuloFonte(Question questao) {
        StringBuilder sb = new StringBuilder("Fonte: ");
        if (questao.getBanca() != null && !questao.getBanca().isBlank()) {
            sb.append(questao.getBanca().strip());
        } else {
            sb.append(questao.getOrigem() == null ? "QB Concurso" : questao.getOrigem().name());
        }
        if (questao.getAno() != null) {
            sb.append(" · ").append(questao.getAno());
        }
        if (questao.getOrgao() != null && !questao.getOrgao().isBlank()) {
            sb.append(" · ").append(questao.getOrgao().strip());
        }
        return sb.toString();
    }

    private static String limpar(String valor) {
        return valor == null ? "" : valor.strip();
    }

    // ------------------------------------------------------------------ rodape

    private static BaseFont criarBaseRodape() {
        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("Fonte do rodape indisponivel", e);
        }
    }

    private static final class Rodape extends PdfPageEventHelper {

        private final String fonte;

        private Rodape(String fonte) {
            this.fonte = fonte == null || fonte.isBlank() ? null : cortar(fonte, 90);
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            Rectangle pagina = document.getPageSize();
            canvas.saveState();
            canvas.setColorFill(new Color(120, 125, 130));
            canvas.setFontAndSize(BASE_RODAPE, 7);
            StringBuilder texto = new StringBuilder(SITE);
            if (fonte != null) {
                texto.append("  ·  Fonte: ").append(fonte);
            }
            texto.append("  ·  Página ").append(writer.getPageNumber());
            canvas.showTextAligned(Element.ALIGN_CENTER, texto.toString(),
                    pagina.getWidth() / 2f, 18, 0);
            canvas.restoreState();
        }
    }
}
