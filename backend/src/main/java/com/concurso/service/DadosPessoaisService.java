package com.concurso.service;

import com.concurso.domain.Attempt;
import com.concurso.domain.SessaoEstudo;
import com.concurso.domain.Usuario;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.repo.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Exportação LGPD dos dados pessoais do próprio usuário. */
@Service
public class DadosPessoaisService {

    private final UsuarioRepository usuarios;
    private final AttemptRepository attempts;
    private final SessaoEstudoRepository estudos;

    public DadosPessoaisService(UsuarioRepository usuarios,
                                AttemptRepository attempts,
                                SessaoEstudoRepository estudos) {
        this.usuarios = usuarios;
        this.attempts = attempts;
        this.estudos = estudos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportar(Long usuarioId) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado."));

        Map<String, Object> perfil = new LinkedHashMap<>();
        perfil.put("nome", usuario.getNome());
        perfil.put("email", usuario.getEmail());
        perfil.put("emailVerificado", usuario.isEmailVerificado());
        perfil.put("criadaEm", usuario.getCriadaEm());

        List<Map<String, Object>> respostas = attempts.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)
                .stream()
                .map(this::resposta)
                .toList();

        List<Map<String, Object>> sessoes = estudos.findByUsuarioIdOrderByCriadaEmDesc(usuarioId)
                .stream()
                .map(this::estudo)
                .toList();

        Map<String, Object> exportacao = new LinkedHashMap<>();
        exportacao.put("perfil", perfil);
        exportacao.put("respostas", respostas);
        exportacao.put("sessoesEstudo", sessoes);
        return exportacao;
    }

    private Map<String, Object> resposta(Attempt attempt) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("questaoId", attempt.getQuestionId());
        item.put("alternativa", attempt.getEscolhida());
        item.put("acertou", attempt.isAcertou());
        item.put("criadaEm", attempt.getCriadaEm());
        return item;
    }

    private Map<String, Object> estudo(SessaoEstudo sessao) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("materia", sessao.getMateria());
        item.put("duracaoSegundos", sessao.getDuracaoSegundos());
        item.put("criadaEm", sessao.getCriadaEm());
        return item;
    }
}
