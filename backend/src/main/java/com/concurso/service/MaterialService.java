package com.concurso.service;

import com.concurso.domain.Concursos;
import com.concurso.domain.MaterialEstudo;
import com.concurso.repo.MaterialEstudoRepository;
import com.concurso.web.Dtos;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/** Leitura publica do material de estudo (nunca escrita). */
@Service
public class MaterialService {

    private final MaterialEstudoRepository materiais;
    private final AcessoService acesso;

    public MaterialService(MaterialEstudoRepository materiais, AcessoService acesso) {
        this.materiais = materiais;
        this.acesso = acesso;
    }

    @Transactional(readOnly = true)
    public List<Dtos.MaterialResumoView> listar(String concurso) {
        return listar(null, concurso);
    }

    /**
     * Lista materiais do escopo do aluno. FREE (escopo vazio) continua vendo a amostra completa;
     * plano escopado só vê os certames contratados.
     */
    @Transactional(readOnly = true)
    public List<Dtos.MaterialResumoView> listar(Long usuarioId, String concurso) {
        Set<String> escopo = acesso.certamesDe(usuarioId);
        List<MaterialEstudo> lista;
        if (concurso != null && !concurso.isBlank()) {
            if (!escopo.isEmpty()) {
                acesso.exigirEscopo(usuarioId, Set.of(concurso));
            }
            lista = materiais.findByConcursoOrderByOrdemAsc(concurso);
        } else if (!escopo.isEmpty()) {
            lista = materiais.findAllByOrderByConcursoAscOrdemAsc().stream()
                    .filter(m -> escopo.contains(Concursos.normalizar(m.getConcurso())))
                    .toList();
        } else {
            lista = materiais.findAllByOrderByConcursoAscOrdemAsc();
        }
        return lista.stream()
                .map(m -> new Dtos.MaterialResumoView(
                        m.getId(), m.getSlug(), m.getTitulo(), m.getResumo(),
                        m.getCategoria().name(), m.getFonte(), m.getOrdem()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Dtos.MaterialView buscar(String slug) {
        return buscar(null, slug);
    }

    @Transactional(readOnly = true)
    public Dtos.MaterialView buscar(Long usuarioId, String slug) {
        MaterialEstudo m = entidade(slug, usuarioId);
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
        return entidade(slug, null);
    }

    /** Entidade com filtro de escopo; material de outro certame responde 403. */
    @Transactional(readOnly = true)
    public MaterialEstudo entidade(String slug, Long usuarioId) {
        MaterialEstudo material = materiais.findBySlug(slug)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "Material não encontrado."));
        Set<String> escopo = acesso.certamesDe(usuarioId);
        if (!escopo.isEmpty()
                && !escopo.contains(Concursos.normalizar(material.getConcurso()))) {
            acesso.auditar(usuarioId, null, AcessoService.RECURSO_CERTAME,
                    material.getConcurso(), false, "material fora do plano");
            throw new AuthException(HttpStatus.FORBIDDEN,
                    "Este material pertence a um certame fora do seu plano.");
        }
        return material;
    }
}
