package com.concurso.web;

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

    public record ChatMensagem(String role, String content) {
    }

    public record ChatRequest(List<ChatMensagem> mensagens, ContextoQuestao contexto) {
    }

    public record ChatResposta(String resposta) {
    }

    /** Estado da configuracao da chave (nunca devolve a chave). */
    public record ConfigStatus(boolean configurado, String modelo) {
    }

    public record ChaveRequest(String apiKey) {
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
}
