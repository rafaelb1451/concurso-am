package com.concurso.service;

import com.concurso.domain.Sessao;
import com.concurso.domain.TokenConta;
import com.concurso.domain.IdentidadeExterna;
import com.concurso.domain.Usuario;
import com.concurso.repo.IdentidadeExternaRepository;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.SessaoRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.repo.TokenContaRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

/** Cadastro seguro, login, verificação e recuperação de contas. */
@Service
public class AuthService {

    private static final Duration VALIDADE_SESSAO = Duration.ofDays(30);
    private static final Duration VALIDADE_TOKENS = Duration.ofHours(2);
    private static final Duration BLOQUEIO_LOGIN = Duration.ofMinutes(15);
    private static final int LIMITE_TENTATIVAS = 5;

    private final UsuarioRepository usuarios;
    private final SessaoRepository sessoes;
    private final AttemptRepository attempts;
    private final SessaoEstudoRepository estudos;
    private final TokenContaRepository tokens;
    private final EmailService emailService;
    private final IdentidadeExternaRepository identidades;
    private final GoogleTokenVerifier google;
    private final SecureRandom aleatorio = new SecureRandom();

    public AuthService(UsuarioRepository usuarios, SessaoRepository sessoes,
                       AttemptRepository attempts, SessaoEstudoRepository estudos,
                       TokenContaRepository tokens, EmailService email,
            IdentidadeExternaRepository identidades, GoogleTokenVerifier google) {
        this.usuarios = usuarios;
        this.sessoes = sessoes;
        this.attempts = attempts;
        this.estudos = estudos;
        this.tokens = tokens;
        this.emailService = email;
        this.identidades = identidades;
        this.google = google;
    }

    @Transactional
    public Dtos.AuthView cadastrar(String nome, String email, String senha,
                                   Boolean aceitouTermos, Boolean aceitouPrivacidade) {
        if (!Boolean.TRUE.equals(aceitouTermos) || !Boolean.TRUE.equals(aceitouPrivacidade)) {
            throw new IllegalArgumentException("É necessário aceitar os termos e a privacidade.");
        }
        if (!politicaSenhaValida(senha)) {
            throw new IllegalArgumentException(
                    "Use pelo menos 10 caracteres, incluindo uma letra maiúscula, uma minúscula e um número.");
        }

        String emailNormalizado = normalizarEmail(email);
        if (usuarios.existsByEmail(emailNormalizado)) {
            throw new IllegalArgumentException("Já existe uma conta com esse e-mail.");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome.trim());
        usuario.setEmail(emailNormalizado);
        usuario.setSenhaHash(SenhaHash.gerar(senha));
        usuario.setTermosAceitosEm(Instant.now());
        usuario.setPrivacidadeAceitaEm(Instant.now());

        boolean primeiroUsuario = usuarios.count() == 0;
        usuario.setAdmin(primeiroUsuario);

        boolean emailAtivo = emailService.configurado();
        if (emailAtivo) {
            usuario.setEmailVerificado(false);
        } else {
            // E-mail pausado (sem domínio/remetente): a conta já nasce verificada e ativa.
            usuario.setEmailVerificado(true);
            usuario.setEmailVerificadoEm(Instant.now());
        }
        usuarios.save(usuario);
        if (primeiroUsuario) {
            attempts.assignLegacyTo(usuario.getId());
        }

        if (emailAtivo) {
            criarToken(usuario.getId(), usuario.getEmail(), TokenConta.Tipo.VERIFICAR_EMAIL);
            return new Dtos.AuthView(null, Dtos.UsuarioView.de(usuario));
        }
        return new Dtos.AuthView(novaSessao(usuario.getId()), Dtos.UsuarioView.de(usuario));
    }

    /**
     * Sem {@link Transactional}: a falha de senha registra o contador via consulta atomica
     * propria (commita mesmo quando este metodo lança excecao). O incremento anterior, feito em
     * entidade gerenciada dentro de uma transacao unica, era desfeito pelo rollback — o bloqueio
     * de conta nao chegava a persistir.
     */
    public Dtos.AuthView login(String email, String senha) {
        Usuario usuario = usuarios.findByEmail(normalizarEmail(email)).orElse(null);
        if (usuario == null) {
            throw AuthException.credenciaisInvalidas();
        }

        Instant agora = Instant.now();
        if (usuario.getBloqueadoAte() != null && usuario.getBloqueadoAte().isAfter(agora)) {
            throw AuthException.contaBloqueada();
        }
        if (!SenhaHash.confere(senha, usuario.getSenhaHash())) {
            if (usuario.getBloqueadoAte() != null) {
                // Bloqueio expirado: reinicia a contagem antes de contar esta falha.
                usuarios.limparFalhas(usuario.getId());
            }
            usuarios.registrarFalhaLogin(usuario.getId(), LIMITE_TENTATIVAS, agora.plus(BLOQUEIO_LOGIN));
            throw AuthException.credenciaisInvalidas();
        }

        if (!usuario.isEmailVerificado()) {
            throw AuthException.emailNaoVerificado();
        }

        usuarios.limparFalhas(usuario.getId());
        return new Dtos.AuthView(novaSessao(usuario.getId()), Dtos.UsuarioView.de(usuario));
    }

    @Transactional
    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            sessoes.deleteById(hashToken(token));
        }
    }

    @Transactional
    public void solicitarReset(String email) {
        Usuario usuario = usuarios.findByEmail(normalizarEmail(email)).orElse(null);
        if (usuario != null) {
            criarToken(usuario.getId(), usuario.getEmail(), TokenConta.Tipo.RESETAR_SENHA);
        }
        // Sempre devolve sucesso: não informa se o e-mail existe.
    }

    @Transactional
    public void resetarSenha(String tokenBruto, String novaSenha) {
        if (!politicaSenhaValida(novaSenha)) {
            throw new IllegalArgumentException(
                    "Use pelo menos 10 caracteres, incluindo uma letra maiúscula, uma minúscula e um número.");
        }
        TokenConta token = consumirToken(tokenBruto, TokenConta.Tipo.RESETAR_SENHA);
        Usuario usuario = usuarios.findById(token.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Conta não encontrada."));
        usuario.setSenhaHash(SenhaHash.gerar(novaSenha));
        usuario.setSenhaAlteradaEm(Instant.now());
        usuario.setTentativasFalhas(0);
        usuario.setBloqueadoAte(null);
    }

    @Transactional
    public void verificarEmail(String tokenBruto) {
        TokenConta token = consumirToken(tokenBruto, TokenConta.Tipo.VERIFICAR_EMAIL);
        Usuario usuario = usuarios.findById(token.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Conta não encontrada."));
        usuario.setEmailVerificado(true);
        usuario.setEmailVerificadoEm(Instant.now());
    }

    @Transactional
    public void reenviarVerificacao(String email) {
        Usuario usuario = usuarios.findByEmail(normalizarEmail(email)).orElse(null);
        if (usuario == null || usuario.isEmailVerificado()) {
            return;
        }
        criarToken(usuario.getId(), usuario.getEmail(), TokenConta.Tipo.VERIFICAR_EMAIL);
    }

    /**
     * Confirma que quem esta pedindo a acao e' o dono da conta.
     *
     * <p>Conta com senha local: confere a senha. Conta criada apenas com Google nao tem senha,
     * entao exige um <b>ID token novo</b> do Google e verifica que o {@code sub} pertence a esta
     * conta — nao basta estar logado, porque a sessao pode estar em um dispositivo esquecido.</p>
     */
    private void confirmarIdentidade(Usuario usuario, String senha, String credential) {
        if (usuario.getSenhaHash() != null) {
            if (!SenhaHash.confere(senha, usuario.getSenhaHash())) {
                throw new AuthException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "Senha atual invalida.");
            }
            return;
        }

        if (credential == null || credential.isBlank()) {
            throw new AuthException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Confirme sua identidade com o Google para continuar.");
        }

        GoogleTokenVerifier.ContaGoogle conta = google.verificar(credential);
        boolean pertence = identidades.findByUsuarioId(usuario.getId()).stream()
                .anyMatch(i -> IdentidadeExterna.PROVIDER_GOOGLE.equals(i.getProvider())
                        && i.getProviderSubject().equals(conta.subject()));
        if (!pertence) {
            throw new AuthException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "A conta Google informada nao e' a desta conta.");
        }
    }

    @Transactional
    public void solicitarAlteracaoEmail(Long usuarioId, String senha, String credential, String novoEmail) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado."));
        confirmarIdentidade(usuario, senha, credential);
        String normalizado = normalizarEmail(novoEmail);
        if (usuarios.existsByEmail(normalizado)) {
            throw new IllegalArgumentException("Esse e-mail já está cadastrado.");
        }
        criarToken(usuario.getId(), normalizado, TokenConta.Tipo.ALTERAR_EMAIL);
    }

    @Transactional
    public void confirmarAlteracaoEmail(String tokenBruto) {
        TokenConta token = consumirToken(tokenBruto, TokenConta.Tipo.ALTERAR_EMAIL);
        if (usuarios.existsByEmail(token.getEmail())) {
            throw new IllegalArgumentException("Esse e-mail já está cadastrado.");
        }
        Usuario usuario = usuarios.findById(token.getUsuarioId())
                .orElseThrow(() -> new IllegalArgumentException("Conta não encontrada."));
        usuario.setEmail(token.getEmail());
        usuario.setEmailVerificado(true);
        usuario.setEmailVerificadoEm(Instant.now());
    }

    @Transactional
    public void excluirConta(Long usuarioId, String senha, String credential) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado."));
        confirmarIdentidade(usuario, senha, credential);
        sessoes.deleteByUsuarioId(usuarioId);
        tokens.deleteByUsuarioId(usuarioId);
        attempts.deleteByUsuarioId(usuarioId);
        estudos.deleteByUsuarioId(usuarioId);
        // sem isto o vinculo com o Google ficaria orfao e o sub nunca mais poderia ser usado
        identidades.deleteByUsuarioId(usuarioId);
        usuarios.delete(usuario);
    }

    /** Resolve o usuario de um token valido; vazio quando ausente/expirado. */
    @Transactional(readOnly = true)
    public Optional<Usuario> autenticar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        Optional<Sessao> sessao = sessoes.findById(hashToken(token));
        if (sessao.isEmpty() || sessao.get().getExpiraEm().isBefore(Instant.now())) {
            return Optional.empty();
        }
        return usuarios.findById(sessao.get().getUsuarioId());
    }

    @Transactional(readOnly = true)
    public Dtos.UsuarioView porId(Long usuarioId) {
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado."));
        return Dtos.UsuarioView.de(usuario);
    }

    private void criarToken(Long usuarioId, String email, TokenConta.Tipo tipo) {
        String bruto = gerarToken();
        TokenConta token = new TokenConta();
        token.setUsuarioId(usuarioId);
        token.setTipo(tipo.name());
        token.setEmail(email);
        token.setTokenHash(hashToken(bruto));
        token.setExpiraEm(Instant.now().plus(VALIDADE_TOKENS));
        tokens.save(token);

        Usuario usuario = usuarioId == null ? null : usuarios.findById(usuarioId).orElse(null);
        String nome = usuario == null ? "aluno" : usuario.getNome();
        if (tipo == TokenConta.Tipo.VERIFICAR_EMAIL) {
            emailService.verificarEmail(email, nome, bruto);
        } else if (tipo == TokenConta.Tipo.RESETAR_SENHA) {
            emailService.resetarSenha(email, nome, bruto);
        } else {
            emailService.alterarEmail(email, nome, bruto);
        }
    }

    private TokenConta consumirToken(String tokenBruto, TokenConta.Tipo tipo) {
        if (tokenBruto == null || tokenBruto.isBlank()) {
            throw new IllegalArgumentException("Token inválido.");
        }
        TokenConta token = tokens.findByTokenHashAndTipo(hashToken(tokenBruto), tipo.name())
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));
        if (token.isUsado()) {
            throw new IllegalArgumentException("Token já utilizado.");
        }
        if (token.getExpiraEm().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Token expirado.");
        }
        token.setUsado(true);
        return token;
    }

    /**
     * Login (ou cadastro) via Google. O {@code id_token} ja foi validado por
     * {@link GoogleTokenVerifier}; aqui so' decidimos qual usuario local ele representa.
     *
     * <p>Vinculo por e-mail so' acontece quando a conta local <b>ja confirmou</b> o e-mail: caso
     * contrario alguem que criasse uma conta com o e-mail de outra pessoa ganharia acesso ao
     * historico dela ao entrar com o Google. Conta nova nasce com o e-mail verificado pelo Google
     * e sem senha local.</p>
     */
    @Transactional
    public Dtos.AuthView entrarComGoogle(GoogleTokenVerifier.ContaGoogle conta) {
        Optional<IdentidadeExterna> existente = identidades.findByProviderAndProviderSubject(
                IdentidadeExterna.PROVIDER_GOOGLE, conta.subject());
        if (existente.isPresent()) {
            Usuario usuario = usuarios.findById(existente.get().getUsuarioId())
                    .orElseThrow(AuthException::credenciaisInvalidas);
            return new Dtos.AuthView(novaSessao(usuario.getId()), Dtos.UsuarioView.de(usuario));
        }

        Usuario usuario;
        Optional<Usuario> porEmail = usuarios.findByEmail(normalizarEmail(conta.email()));
        if (porEmail.isPresent()) {
            usuario = porEmail.get();
            if (!usuario.isEmailVerificado()) {
                throw new AuthException(org.springframework.http.HttpStatus.CONFLICT,
                        "Ja existe uma conta com este e-mail. Confirme o e-mail ou entre com a senha para vincular.");
            }
        } else {
            usuario = new Usuario();
            String nome = conta.nome() == null || conta.nome().isBlank() ? conta.email() : conta.nome();
            usuario.setNome(nome.trim());
            usuario.setEmail(normalizarEmail(conta.email()));
            usuario.setSenhaHash(null); // conta so' com Google: sem senha local
            usuario.setEmailVerificado(true);
            usuario.setEmailVerificadoEm(Instant.now());
            usuario.setTermosAceitosEm(Instant.now());
            usuario.setPrivacidadeAceitaEm(Instant.now());
            usuario.setAdmin(usuarios.count() == 0);
            usuarios.save(usuario);
        }

        IdentidadeExterna identidade = new IdentidadeExterna();
        identidade.setProvider(IdentidadeExterna.PROVIDER_GOOGLE);
        identidade.setProviderSubject(conta.subject());
        identidade.setUsuarioId(usuario.getId());
        identidades.save(identidade);

        return new Dtos.AuthView(novaSessao(usuario.getId()), Dtos.UsuarioView.de(usuario));
    }

    private String novaSessao(Long usuarioId) {
        String tokenBruto = gerarToken();
        Sessao sessao = new Sessao();
        // Guarda apenas o hash do token; o valor em claro so existe no cliente.
        sessao.setToken(hashToken(tokenBruto));
        sessao.setUsuarioId(usuarioId);
        sessao.setCriadaEm(Instant.now());
        sessao.setExpiraEm(Instant.now().plus(VALIDADE_SESSAO));
        sessoes.save(sessao);
        return tokenBruto;
    }

    private String gerarToken() {
        byte[] bytes = new byte[32];
        aleatorio.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao proteger token.", e);
        }
    }

    private static boolean politicaSenhaValida(String senha) {
        if (senha == null || senha.length() < 10 || senha.length() > 100) {
            return false;
        }
        return senha.chars().anyMatch(Character::isUpperCase)
                && senha.chars().anyMatch(Character::isLowerCase)
                && senha.chars().anyMatch(Character::isDigit);
    }

    private static String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
