package com.concurso.service;

import com.concurso.domain.Usuario;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.repo.SessaoRepository;
import com.concurso.repo.TokenContaRepository;
import com.concurso.repo.IdentidadeExternaRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.web.Dtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarios;
    @Mock private SessaoRepository sessoes;
    @Mock private AttemptRepository attempts;
    @Mock private SessaoEstudoRepository estudos;
    @Mock private TokenContaRepository tokens;
    @Mock private EmailService email;
    @Mock private IdentidadeExternaRepository identidades;
    @Mock private GoogleTokenVerifier google;

    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(usuarios, sessoes, attempts, estudos, tokens, email, identidades, google);
    }

    @Test
    void cadastroExigeTermosEPrivacidade() {
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.cadastrar("Aluno", "aluno@teste.com", "Test123456",
                        false, true));
        assertTrue(erro.getMessage().contains("termos"));
    }

    @Test
    void cadastroExigeSenhaForte() {
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> service.cadastrar("Aluno", "aluno@teste.com", "123456",
                        true, true));
        assertTrue(erro.getMessage().contains("10 caracteres"));
    }

    @Test
    void cadastroComEmailPausadoJaNasceVerificado() {
        when(usuarios.existsByEmail("aluno@teste.com")).thenReturn(false);
        when(usuarios.count()).thenReturn(0L);
        when(usuarios.save(any())).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(99L);
            return usuario;
        });
        when(email.configurado()).thenReturn(false);

        Dtos.AuthView cadastro = service.cadastrar(
                "Aluno", "aluno@teste.com", "Test123456", true, true);

        assertNotNull(cadastro.token());
        assertTrue(cadastro.usuario().emailVerificado());
        verify(attempts).assignLegacyTo(99L);
    }

    @Test
    void cadastroComEmailAtivoExigeVerificacao() {
        when(usuarios.existsByEmail("aluno@teste.com")).thenReturn(false);
        when(usuarios.count()).thenReturn(0L);
        when(usuarios.save(any())).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(99L);
            return usuario;
        });
        when(email.configurado()).thenReturn(true);

        Dtos.AuthView cadastro = service.cadastrar(
                "Aluno", "aluno@teste.com", "Test123456", true, true);

        assertNull(cadastro.token());
        assertTrue(!cadastro.usuario().emailVerificado());
        verify(attempts).assignLegacyTo(99L);
    }

    @Test
    void loginRegistraFalhaDeFormaAtomica() {
        Usuario usuario = new Usuario();
        usuario.setId(3L);
        usuario.setNome("Aluno");
        usuario.setEmail("aluno@teste.com");
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        usuario.setTentativasFalhas(4);
        when(usuarios.findByEmail("aluno@teste.com")).thenReturn(Optional.of(usuario));

        assertThrows(AuthException.class,
                () -> service.login("aluno@teste.com", "Errada123"));
        // O contador deve ser persistido por consulta atomica (nao pela entidade em memoria).
        verify(usuarios).registrarFalhaLogin(eq(3L), eq(5), any(Instant.class));
    }

    @Test
    void loginComBloqueioExpiradoReiniciaAContagem() {
        Usuario usuario = new Usuario();
        usuario.setId(5L);
        usuario.setNome("Aluno");
        usuario.setEmail("aluno@teste.com");
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        usuario.setTentativasFalhas(5);
        usuario.setBloqueadoAte(Instant.now().minusSeconds(60));
        when(usuarios.findByEmail("aluno@teste.com")).thenReturn(Optional.of(usuario));

        assertThrows(AuthException.class,
                () -> service.login("aluno@teste.com", "Errada123"));
        verify(usuarios).limparFalhas(5L);
        verify(usuarios).registrarFalhaLogin(eq(5L), eq(5), any(Instant.class));
    }

    @Test
    void loginNaoAutenticaSemEmaiVerificado() {
        Usuario usuario = new Usuario();
        usuario.setId(4L);
        usuario.setNome("Aluno");
        usuario.setEmail("aluno@teste.com");
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(false);
        when(usuarios.findByEmail("aluno@teste.com")).thenReturn(Optional.of(usuario));

        AuthException erro = assertThrows(AuthException.class,
                () -> service.login("aluno@teste.com", "Test123456"));
        assertTrue(erro.getMessage().contains("Confirme seu e-mail"));
    }

    @Test
    void solicitarResetNaoInformaSeEmailExiste() {
        when(usuarios.findByEmail("desconhecido@teste.com")).thenReturn(Optional.empty());
        service.solicitarReset("desconhecido@teste.com");
        verify(usuarios).findByEmail("desconhecido@teste.com");
    }
}
