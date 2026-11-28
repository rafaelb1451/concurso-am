package com.concurso.service;

import com.concurso.domain.MaterialEstudo;
import com.concurso.repo.MaterialEstudoRepository;
import com.concurso.web.Dtos;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Leitura publica do material de estudo (nunca escrita). */
@Service
public class MaterialService {

    private final MaterialEstudoRepository materiais;

    public MaterialService(MaterialEstudoRepository materiais) {
        this.materiais = materiais;
    }

    @Transactional(readOnly = true)
    public List<Dtos.MaterialResumoView> listar(String concurso) {
        List<MaterialEstudo> lista = concurso == null || concurso.isBlank()
                ? materiais.findAllByOrderByConcursoAscOrdemAsc()
                : materiais.findByConcursoOrderByOrdemAsc(concurso);
        return lista.stream()
                .map(m -> new Dtos.MaterialResumoView(
                        m.getId(), m.getSlug(), m.getTitulo(), m.getResumo(),
                        m.getCategoria().name(), m.getFonte(), m.getOrdem()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Dtos.MaterialView buscar(String slug) {
        MaterialEstudo m = entidade(slug);
        return new Dtos.MaterialView(
                m.getId(), m.getConcurso(), m.getSlug(), m.getTitulo(), m.getResumo(),
                m.getCategoria().name(), m.getFonte(), m.getConteudo(), m.getOrdem(),
                m.getAtualizadoEm());
    }

    /**
     * Entidade completa por slug (404 se nao existir), usada pelo mapa mental e pelo PDF.
     * O texto integral fica disponivel porque essas rotas sao autenticadas.
     */
    @Transactional(readOnly = true)
    public MaterialEstudo entidade(String slug) {
        return materiais.findBySlug(slug)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "Material não encontrado."));
    }
}
