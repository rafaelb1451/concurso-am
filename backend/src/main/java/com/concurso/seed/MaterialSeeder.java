package com.concurso.seed;

import com.concurso.domain.Concursos;
import com.concurso.domain.MaterialCategoria;
import com.concurso.domain.MaterialEstudo;
import com.concurso.repo.MaterialEstudoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

/**
 * Carrega o material de estudo publico a partir de {@code classpath:materiais.json}.
 *
 * <p>Idempotente <b>por slug</b>: se o material ja existe, os campos sao atualizados em vez de
 * criar uma linha nova; reiniciar o app nao duplica. O arquivo e' opcional — sem ele o boot segue
 * normalmente (os endpoints respondem lista vazia).</p>
 */
@Component
@Order(4)
public class MaterialSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MaterialSeeder.class);

    private final MaterialEstudoRepository materiais;
    private final ObjectMapper mapper;
    private final ResourceLoader resourceLoader;

    @Value("${concurso.materiais.arquivo:classpath:materiais.json}")
    private String arquivoMateriais;

    public MaterialSeeder(MaterialEstudoRepository materiais, ObjectMapper mapper,
                          ResourceLoader resourceLoader) {
        this.materiais = materiais;
        this.mapper = mapper;
        this.resourceLoader = resourceLoader;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (arquivoMateriais == null || arquivoMateriais.isBlank()) {
            log.info("Seed de materiais desativado (concurso.materiais.arquivo vazio).");
            return;
        }

        Resource recurso = resourceLoader.getResource(arquivoMateriais);
        if (!recurso.exists()) {
            log.info("Seed de materiais ausente ({}); nada a carregar.", arquivoMateriais);
            return;
        }

        MaterialPayload[] itens;
        try (InputStream in = recurso.getInputStream()) {
            itens = mapper.readValue(in, MaterialPayload[].class);
        }
        if (itens == null) {
            return;
        }

        int criados = 0;
        int atualizados = 0;
        int ignorados = 0;
        for (int i = 0; i < itens.length; i++) {
            MaterialEstudo material = converter(itens[i], i + 1);
            if (material == null) {
                ignorados++;
                continue;
            }
            MaterialEstudo existente = materiais.findBySlug(material.getSlug()).orElse(null);
            if (existente == null) {
                materiais.save(material);
                criados++;
            } else if (atualizar(existente, material)) {
                existente.setAtualizadoEm(Instant.now());
                materiais.save(existente);
                atualizados++;
            }
        }
        log.info("Materiais: {} criados, {} atualizados, {} ignorados de {}.",
                criados, atualizados, ignorados, recurso.getFilename());
    }

    /**
     * Valida e normaliza um item. Item invalido e' ignorado (com aviso), sem derrubar o restante
     * do arquivo — mesma filosofia do ImportService para lotes de questoes.
     */
    private MaterialEstudo converter(MaterialPayload p, int posicao) {
        if (p == null) {
            log.warn("Material #{} ignorado: item nulo.", posicao);
            return null;
        }
        String concurso = Concursos.normalizar(p.concurso());
        if (!Concursos.valido(concurso)) {
            log.warn("Material #{} ignorado: concurso invalido '{}'.", posicao, p.concurso());
            return null;
        }
        String slug = limpar(p.slug());
        if (slug == null || slug.length() > 160 || slug.indexOf('/') >= 0 || slug.indexOf('\\') >= 0) {
            log.warn("Material #{} ignorado: slug invalido '{}'.", posicao, p.slug());
            return null;
        }
        String titulo = limpar(p.titulo());
        if (titulo == null) {
            log.warn("Material #{} ignorado: titulo obrigatorio.", posicao);
            return null;
        }
        MaterialCategoria categoria = categoria(p.categoria());
        if (categoria == null) {
            log.warn("Material #{} ignorado: categoria invalida '{}'.", posicao, p.categoria());
            return null;
        }

        MaterialEstudo material = new MaterialEstudo();
        material.setConcurso(concurso);
        material.setSlug(slug);
        material.setTitulo(truncar(titulo, 200));
        material.setResumo(limpar(p.resumo()));
        material.setCategoria(categoria);
        material.setFonte(truncar(limpar(p.fonte()), 200));
        // Texto puro: guarda como veio (so' apara as pontas), sem gerar nem interpretar HTML.
        material.setConteudo(p.conteudo() == null ? null : p.conteudo().strip());
        material.setOrdem(p.ordem() == null ? posicao : Math.max(0, p.ordem()));
        material.setAtualizadoEm(Instant.now());
        return material;
    }

    /** Copia os campos do payload para a entidade existente; devolve se algo mudou. */
    private static boolean atualizar(MaterialEstudo destino, MaterialEstudo origem) {
        boolean mudou = false;
        if (!Objects.equals(destino.getConcurso(), origem.getConcurso())) {
            destino.setConcurso(origem.getConcurso());
            mudou = true;
        }
        if (!Objects.equals(destino.getTitulo(), origem.getTitulo())) {
            destino.setTitulo(origem.getTitulo());
            mudou = true;
        }
        if (!Objects.equals(destino.getResumo(), origem.getResumo())) {
            destino.setResumo(origem.getResumo());
            mudou = true;
        }
        if (destino.getCategoria() != origem.getCategoria()) {
            destino.setCategoria(origem.getCategoria());
            mudou = true;
        }
        if (!Objects.equals(destino.getFonte(), origem.getFonte())) {
            destino.setFonte(origem.getFonte());
            mudou = true;
        }
        if (!Objects.equals(destino.getConteudo(), origem.getConteudo())) {
            destino.setConteudo(origem.getConteudo());
            mudou = true;
        }
        if (!Objects.equals(destino.getOrdem(), origem.getOrdem())) {
            destino.setOrdem(origem.getOrdem());
            mudou = true;
        }
        return mudou;
    }

    private static MaterialCategoria categoria(String valor) {
        String texto = limpar(valor);
        if (texto == null) {
            return null;
        }
        try {
            return MaterialCategoria.valueOf(texto.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static String limpar(String valor) {
        if (valor == null) {
            return null;
        }
        String texto = valor.strip();
        return texto.isEmpty() ? null : texto;
    }

    private static String truncar(String valor, int maximo) {
        if (valor == null || valor.length() <= maximo) {
            return valor;
        }
        return valor.substring(0, maximo).strip();
    }
}
