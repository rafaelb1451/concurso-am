package com.concurso.web;

import com.concurso.domain.Usuario;

import java.util.List;

public final class Dtos {

    private Dtos() {
    }

    /** Questao como o aluno ve antes de responder: sem gabarito e sem explicacao. */
    public record QuestionView(
            Long id,
            String materia,
            String assunto,
            String origem,
            String banca,
            Integer ano,
            String orgao,
            String cargo,
            Integer dificuldade,
            String enunciado,
            List<String> alternativas,
            List<String> concursos,
            String hash,
            boolean temExplicacao,
            String precedente,
            java.time.LocalDate verificadoEm
    ) {
    }

    public record AnswerRequest(Integer alternativa) {
    }

    public record AnswerView(
            boolean acertou,
            int correta,
            String gabarito,
            String explicacao,
            String fundamento,
            String assunto,
            String origem,
            String precedente,
            java.time.LocalDate verificadoEm
    ) {
    }

    public record TopicoView(String materia, String assunto, long total) {
    }

    /** Quantidade de questoes por concurso (alimenta o seletor da tela). */
    public record ConcursoView(String id, long total) {
    }

    public record MateriaStats(String materia, long respondidas, long acertos) {
    }

    public record DesempenhoView(long respondidas, long acertos, double percentual,
                                 List<MateriaStats> porMateria) {
    }

    /** Resultado de um lote de importacao. */
    public record ImportReport(int recebidas, int importadas, int ignoradas, List<String> erros) {
    }

    /** Comentario a anexar a uma questao ja existente, identificada pelo hash do enunciado. */
    public record ExplicacaoPayload(String hash, String explicacao, String fundamento, String precedente) {
    }

    public record ExplicacaoReport(int recebidas, int atualizadas, List<String> naoEncontradas) {
    }

    // ---------- tutor (chat) ----------

    /** Contexto da questao que o tutor recebe para responder com precisao. */
    public record ContextoQuestao(
            String materia,
            String assunto,
            String enunciado,
            List<String> alternativas,
            String gabarito,
            String alternativaAluno,
            Boolean acertou,
            String fundamento,
            String explicacao
    ) {
    }

    public record ChatMensagem(
            String role,
            @jakarta.validation.constraints.NotBlank(message = "mensagem vazia")
            @jakarta.validation.constraints.Size(max = 4000, message = "mensagem acima de 4000 caracteres")
            String content
    ) {
    }

    public record ChatRequest(
            @jakarta.validation.constraints.NotEmpty(message = "envie ao menos uma mensagem")
            @jakarta.validation.constraints.Size(max = 20, message = "no maximo 20 mensagens no historico")
            java.util.List<@jakarta.validation.Valid ChatMensagem> mensagens,
            @jakarta.validation.Valid ContextoQuestao contexto
    ) {
    }

    public record ChatResposta(String resposta) {
    }

    /** Estado da configuracao da chave (nunca devolve a chave). */
    public record ConfigStatus(boolean configurado, String modelo) {
    }

    public record ChaveRequest(
            @jakarta.validation.constraints.NotBlank(message = "chave vazia")
            @jakarta.validation.constraints.Size(max = 200, message = "chave longa demais")
            String apiKey
    ) {
    }

    /** Simulado no formato do caderno da banca. */
    public record SimuladoView(
            String concurso,
            String nome,
            int totalPrevisto,
            int totalGerado,
            List<QuestionView> questoes,
            List<String> avisos
    ) {
    }

    public record RespostaSimulado(Long questaoId, Integer alternativa) {
    }

    public record CorrecaoRequest(String concurso, List<RespostaSimulado> respostas) {
    }

    public record CorrecaoItem(
            Long questaoId,
            String materia,
            String assunto,
            String origem,
            int correta,
            String gabarito,
            Integer alternativaAluno,
            boolean acertou,
            String explicacao,
            String fundamento
    ) {
    }

    public record MateriaResultado(String materia, int acertos, int total) {
    }

    public record CorrecaoView(
            int acertos,
            int total,
            double percentual,
            List<MateriaResultado> porMateria,
            List<CorrecaoItem> itens
    ) {
    }

    // ---------- contas (cadastro/login) ----------

    public record CadastroRequest(
            @jakarta.validation.constraints.NotBlank(message = "nome vazio")
            @jakarta.validation.constraints.Size(max = 80, message = "nome acima de 80 caracteres")
            String nome,
            @jakarta.validation.constraints.NotBlank(message = "e-mail vazio")
            @jakarta.validation.constraints.Email(message = "e-mail inválido")
            @jakarta.validation.constraints.Size(max = 160, message = "e-mail longo demais")
            String email,
            @jakarta.validation.constraints.NotBlank(message = "senha vazia")
            @jakarta.validation.constraints.Size(min = 10, max = 100, message = "senha entre 10 e 100 caracteres")
            String senha,
            @jakarta.validation.constraints.NotNull(message = "confirme os termos")
            Boolean aceitouTermos,
            @jakarta.validation.constraints.NotNull(message = "confirme a política de privacidade")
            Boolean aceitouPrivacidade
    ) {
    }

    public record LoginRequest(
            @jakarta.validation.constraints.NotBlank(message = "e-mail vazio")
            @jakarta.validation.constraints.Email(message = "e-mail inválido")
            String email,
            @jakarta.validation.constraints.NotBlank(message = "senha vazia")
            String senha
    ) {
    }

    public record UsuarioView(Long id, String nome, String email, boolean admin, boolean emailVerificado) {
        public static UsuarioView de(Usuario u) {
            return new UsuarioView(u.getId(), u.getNome(), u.getEmail(), u.isAdmin(), u.isEmailVerificado());
        }
    }

    public record AuthView(String token, UsuarioView usuario) {
    }

    public record SolicitarResetRequest(
            @jakarta.validation.constraints.NotBlank(message = "e-mail vazio")
            @jakarta.validation.constraints.Email(message = "e-mail inválido")
            String email
    ) {
    }

    public record ResetSenhaRequest(
            @jakarta.validation.constraints.NotBlank(message = "token vazio")
            String token,
            @jakarta.validation.constraints.NotBlank(message = "senha vazia")
            @jakarta.validation.constraints.Size(min = 10, max = 100, message = "senha entre 10 e 100 caracteres")
            String novaSenha
    ) {
    }

    public record VerificarEmailRequest(
            @jakarta.validation.constraints.NotBlank(message = "token vazio")
            String token
    ) {
    }

    public record AlterarEmailRequest(
            @jakarta.validation.constraints.NotBlank(message = "senha vazia")
            String senha,
            @jakarta.validation.constraints.NotBlank(message = "novo e-mail vazio")
            @jakarta.validation.constraints.Email(message = "novo e-mail inválido")
            @jakarta.validation.constraints.Size(max = 160, message = "e-mail longo demais")
            String novoEmail
    ) {
    }

    public record ConfirmarSenhaRequest(
            @jakarta.validation.constraints.NotBlank(message = "senha vazia")
            String senha
    ) {
    }

    // ---------- evolucao e tempo de estudo ----------

    public record EvolucaoPonto(String dia, long respondidas, long acertos, double percentual) {
    }

    public record EvolucaoView(long respondidas, long acertos, double percentual,
                               long tempoEstudoSegundos, List<EvolucaoPonto> serie) {
    }

    public record EstudoRequest(String materia, int duracaoSegundos) {
    }
}
