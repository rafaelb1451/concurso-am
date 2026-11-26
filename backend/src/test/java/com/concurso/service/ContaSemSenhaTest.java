package com.concurso.service;

import com.concurso.domain.IdentidadeExterna;
import com.concurso.domain.Usuario;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.IdentidadeExternaRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.repo.SessaoRepository;
import com.concurso.repo.TokenContaRepository;
import com.concurso.repo.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Contas criadas apenas com Google nao tem senha local. Acoes sensiveis (excluir conta, trocar
 * e-mail) precisam de outra prova de identidade: um ID token novo, cujo {@code sub} pertenca a
 * esta conta. Estes testes cobrem esse caminho e garantem que a conta com senha nao mudou.
 */
@ExtendWith(MockitoExtension.class)
class ContaSemSenhaTest {

    @Mock private UsuarioRepository usuarios;
    @Mock private SessaoRepository sessoes;
    @Mock private AttemptRepository attempts;
    @Mock private SessaoEstudoRepository estudos;
    @Mock private TokenContaRepository tokens;
    @Mock private EmailService email;
    @Mock private IdentidadeExternaRepository identidades;
    @Mock private GoogleTokenVerifier google;

    private AuthService service;
    private Usuario contaGoogle;
    private Usuario contaComSenha;

    @BeforeEach
    void setUp() {
        service = new AuthService(usuarios, sessoes, attempts, estudos, tokens, email,
                identidades, google);

        contaGoogle = new Usuario();
        contaGoogle.setId(7L);
        contaGoogle.setNome("Aluno Google");
        contaGoogle.setEmail("aluno@gmail.com");
        contaGoogle.setSenhaHash(null); // criada pelo Google
        contaGoogle.setEmailVerificado(true);

        contaComSenha = new Usuario();
        contaComSenha.setId(8L);
        contaComSenha.setNome("Aluno Senha");
        contaComSenha.setEmail("aluno@local.com");
        contaComSenha.setSenhaHash(SenhaHash.gerar("SenhaForte123"));
        contaComSenha.setEmailVerificado(true);

        lenient().when(usuarios.findById(7L)).thenReturn(Optional.of(contaGoogle));
        lenient().when(usuarios.findById(8L)).thenReturn(Optional.of(contaComSenha));
    }

    private IdentidadeExterna identidade(Long usuarioId, String subject) {
        IdentidadeExterna i = new IdentidadeExterna();
        i.setProvider(IdentidadeExterna.PROVIDER_GOOGLE);
        i.setProviderSubject(subject);
        i.setUsuarioId(usuarioId);
        return i;
    }

    @Test
    @DisplayName("conta Google sem credencial nao consegue excluir a conta")
    void excluirExigeCredencialQuandoNaoTemSenha() {
        assertThatThrownBy(() -> service.excluirConta(7L, null, null))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Google")
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        verify(usuarios, never()).delete(any());
    }

    @Test
    @DisplayName("credencial de OUTRA conta Google nao autoriza a exclusao")
    void excluirRejeitaCredencialDeOutraConta() {
        when(google.verificar("token-invasor"))
                .thenReturn(new GoogleTokenVerifier.ContaGoogle("outro-sub", "outro@gmail.com", "Outro", true));
        when(identidades.findByUsuarioId(7L))
                .thenReturn(List.of(identidade(7L, "sub-dono-da-conta")));

        assertThatThrownBy(() -> service.excluirConta(7L, null, "token-invasor"))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("nao e' a desta conta")
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(usuarios, never()).delete(any());
    }

    @Test
    @DisplayName("credencial da PROPRIA conta Google autoriza a exclusao")
    void excluirAceitaCredencialDaMesmaConta() {
        when(google.verificar("token-dono"))
                .thenReturn(new GoogleTokenVerifier.ContaGoogle("sub-dono-da-conta", "aluno@gmail.com", "Aluno", true));
        when(identidades.findByUsuarioId(7L))
                .thenReturn(List.of(identidade(7L, "sub-dono-da-conta")));

        service.excluirConta(7L, null, "token-dono");

        verify(usuarios).delete(contaGoogle);
        verify(sessoes).deleteByUsuarioId(7L);
        verify(tokens).deleteByUsuarioId(7L);
        verify(attempts).deleteByUsuarioId(7L);
        verify(estudos).deleteByUsuarioId(7L);
    }

    @Test
    @DisplayName("conta Google consegue trocar o e-mail com credencial valida")
    void alterarEmailComCredencialGoogle() {
        when(google.verificar("token-dono"))
                .thenReturn(new GoogleTokenVerifier.ContaGoogle("sub-dono-da-conta", "aluno@gmail.com", "Aluno", true));
        when(identidades.findByUsuarioId(7L))
                .thenReturn(List.of(identidade(7L, "sub-dono-da-conta")));
        when(usuarios.existsByEmail("novo@gmail.com")).thenReturn(false);

        service.solicitarAlteracaoEmail(7L, null, "token-dono", "novo@gmail.com");

        verify(tokens).save(any());
    }

    @Test
    @DisplayName("conta com senha continua exigindo a senha correta")
    void contaComSenhaNaoAceitaCaminhoDoGoogle() {
        // sem senha (e mesmo com credencial) deve recusar: a conta tem senha local
        assertThatThrownBy(() -> service.excluirConta(8L, null, "token-dono"))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Senha atual invalida")
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        verify(usuarios, never()).delete(any());
        verify(google, never()).verificar(any());
    }

    @Test
    @DisplayName("conta com senha correta exclui normalmente")
    void contaComSenhaCorretaExclui() {
        service.excluirConta(8L, "SenhaForte123", null);

        verify(usuarios).delete(contaComSenha);
        verify(identidades).deleteByUsuarioId(8L == 0L ? 0L : 8L);
    }
}
