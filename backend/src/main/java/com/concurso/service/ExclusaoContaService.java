package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.Usuario;
import com.concurso.repo.AcessoAuditoriaRepository;
import com.concurso.repo.AssinaturaCertameRepository;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.EventoPagamentoRepository;
import com.concurso.repo.IdentidadeExternaRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.repo.SessaoRepository;
import com.concurso.repo.TokenContaRepository;
import com.concurso.repo.TutorUsoRepository;
import com.concurso.repo.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Direito ao esquecimento (LGPD): apaga a conta e todos os dados pessoais do usuário.
 *
 * <p>O endpoint {@code DELETE /api/conta} usa este serviço para remover, de forma completa e
 * idempotente, perfil, assinaturas (e seus certames), tentativas, sessões, sessões de estudo,
 * identidades externas, contador de uso do Tutor, trilha de auditoria, eventos de pagamento e
 * tokens de conta (verificação/reset/alteração de e-mail).</p>
 *
 * <p>A ordem importa no PostgreSQL: {@code assinatura_certames} referencia {@code assinaturas(id)}
 * com {@code ON DELETE CASCADE}, mas a remoção é explícita aqui para também valer no H2 (usado nos
 * testes, sem a constraint de FK) e para não depender do banco.</p>
 *
 * <p>O cache do Tutor ({@code tutor_cache}) <b>não</b> é removido: ele é global e chaveado pelo
 * conteúdo (SHA-256 de {@code {contexto, mensagens}}), sem {@code usuario_id} nem dado pessoal —
 * apagá-lo destruiria o cache compartilhado de outros alunos sem apagar PII nenhuma.</p>
 */
@Service
public class ExclusaoContaService {

    private final UsuarioRepository usuarios;
    private final AssinaturaRepository assinaturas;
    private final AssinaturaCertameRepository certames;
    private final EventoPagamentoRepository eventos;
    private final AcessoAuditoriaRepository auditorias;
    private final TutorUsoRepository tutorUso;
    private final SessaoRepository sessoes;
    private final TokenContaRepository tokens;
    private final AttemptRepository attempts;
    private final SessaoEstudoRepository estudos;
    private final IdentidadeExternaRepository identidades;

    public ExclusaoContaService(UsuarioRepository usuarios, AssinaturaRepository assinaturas,
                                AssinaturaCertameRepository certames, EventoPagamentoRepository eventos,
                                AcessoAuditoriaRepository auditorias, TutorUsoRepository tutorUso,
                                SessaoRepository sessoes, TokenContaRepository tokens,
                                AttemptRepository attempts, SessaoEstudoRepository estudos,
                                IdentidadeExternaRepository identidades) {
        this.usuarios = usuarios;
        this.assinaturas = assinaturas;
        this.certames = certames;
        this.eventos = eventos;
        this.auditorias = auditorias;
        this.tutorUso = tutorUso;
        this.sessoes = sessoes;
        this.tokens = tokens;
        this.attempts = attempts;
        this.estudos = estudos;
        this.identidades = identidades;
    }

    /** Apaga a conta do usuário logado e todos os seus dados. Simples e sem senha: já autenticado. */
    @Transactional
    public void excluir(Long usuarioId) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado."));

        // Assinaturas e seus certames (cascata explícita, antes de apagar a assinatura).
        List<Assinatura> doUsuario = assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId);
        for (Assinatura assinatura : doUsuario) {
            certames.deleteByAssinaturaId(assinatura.getId());
        }
        assinaturas.deleteByUsuarioId(usuarioId);

        // Demais registros pessoais, em qualquer ordem (sem FK entre si e o usuário).
        eventos.deleteByUsuarioId(usuarioId);
        auditorias.deleteByUsuarioId(usuarioId);
        tutorUso.deleteByUsuarioId(usuarioId);
        sessoes.deleteByUsuarioId(usuarioId);
        tokens.deleteByUsuarioId(usuarioId);
        attempts.deleteByUsuarioId(usuarioId);
        estudos.deleteByUsuarioId(usuarioId);
        identidades.deleteByUsuarioId(usuarioId);

        usuarios.delete(usuario);
    }
}
