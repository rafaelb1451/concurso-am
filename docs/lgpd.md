# LGPD — Tratamento de dados pessoais (QB Concurso)

Resumo do tratamento de dados pessoais da plataforma, em conformidade com a Lei Geral de Proteção
de Dados (Lei nº 13.709/2018). Este documento descreve **o que** coletamos, **por quê**, por quanto
tempo guardamos e como o titular exerce seus direitos.

## 1. Conscientização e consentimento

- No cadastro (`POST /api/cadastro`), o usuário precisa aceitar **explicitamente** os termos de uso
  e a política de privacidade (`aceitouTermos` e `aceitouPrivacidade` obrigatórios). Sem ambos, o
  cadastro é recusado.
- As datas de aceite ficam gravadas no perfil (`termos_aceitos_em`, `privacidade_aceita_em`) para
  fins de prova de consentimento.
- O login via Google também registra o aceite dos termos/privacidade no momento da criação da conta.

## 2. Finalidade e base legal

| Dado | Finalidade | Base legal |
|------|-----------|------------|
| Nome, e-mail, senha (hash) | Identificação e autenticação | Execução de contrato |
| Termos/privacidade aceitos | Prova de consentimento | Obrigação legal (LGPD) |
| Respostas (`attempts`) | Evolução do estudo e estatísticas | Execução de contrato |
| Sessões de estudo (`sessoes_estudo`) | Tempo de estudo por matéria | Execução de contrato |
| Assinaturas e certames | Liberar acesso conforme o plano pago | Execução de contrato |
| Eventos de pagamento | Conciliação com o gateway e auditoria | Execução de contrato / obrigação legal |
| Trilha de auditoria (`acessos_auditoria`) | Segurança e prevenção de fraude | Legítimo interesse |
| Uso do Tutor (`tutor_uso`) | Aplicar a cota diária do plano | Execução de contrato |

A senha é armazenada apenas como **hash PBKDF2** (nunca em claro). Sessões guardam somente o
**hash SHA-256** do token; o token em claro só existe no dispositivo do usuário.

## 3. Limitação de coleta (minimização)

- Coletamos apenas o mínimo necessário para a operação: nome, e-mail, senha e os dados de estudo.
- Não coletamos dados sensíveis (art. 5º, II) nem dados de cartão — o pagamento acontece na página
  hospedada do gateway (Mercado Pago/PagBank/Asaas) e o app não recebe número de cartão.
- A trilha de auditoria guarda apenas `usuario_id`, `ip`, `recurso`, `concurso`, `permitido` e
  `motivo` — **sem conteúdo sensível** de estudo.
- O cache do Tutor (`tutor_cache`) é **global e anônimo**: indexado pelo hash do conteúdo
  (`{contexto, mensagens}`), sem `usuario_id` e sem dado pessoal.

## 4. Retenção

- Os dados ficam retidos enquanto a conta existir (ou enquanto durar a obrigação de guarda, p. ex.
  eventos de pagamento para conciliação fiscal).
- Não há retenção por prazo fixo automático; a retenção cessa com o exercício do direito ao
  esquecimento (seção 5).

## 5. Direito ao esquecimento — `DELETE /api/conta`

O titular pode apagar a própria conta a qualquer momento, de forma autônoma:

- Endpoint autenticado: **`DELETE /api/conta`** → retorna `{ "ok": true }`.
- Na interface: **Conta e privacidade → "Excluir minha conta"** (com confirmação textual).

A exclusão remove **tudo**:

- perfil (`usuarios`), assinaturas (`assinaturas`) e certames vinculados (`assinatura_certames`);
- tentativas (`attempts`), sessões (`sessoes`), sessões de estudo (`sessoes_estudo`);
- identidades externas (`identidades_externas`) — libera o vínculo Google para reuso futuro;
- contador de uso do Tutor (`tutor_uso`), trilha de auditoria (`acessos_auditoria`);
- eventos de pagamento (`eventos_pagamento`);
- tokens de conta (`tokens_conta`: verificação, reset e alteração de e-mail).

A exclusão também invalida a sessão (logout). Após a exclusão, as rotas autenticadas respondem
**401** e o login com o e-mail removido responde **401**.

> O cache global do Tutor (`tutor_cache`) **não** é apagado: ele não contém dado pessoal e é
> compartilhado entre todos os usuários (apagá-lo prejudicaria outros alunos sem remover PII).

### Observações

- O endpoint é **simples** (sem senha): o usuário já está autenticado. Um admin pode excluir a
  própria conta normalmente.
- O endpoint legado `POST /api/usuario/excluir` (que exige senha ou credencial Google) continua
  existindo por compatibilidade; o `DELETE /api/conta` é o caminho canônico de exclusão completa.

## 6. Direito de acesso (portabilidade)

O titular pode baixar uma cópia dos próprios dados:

- Endpoint autenticado: **`GET /api/usuario/dados`**.
- Na interface: **Conta e privacidade → "Exportar meus dados"** (JSON com perfil, respostas e
  sessões de estudo).

## 7. Transparência sobre o uso de IA

- O Tutor de IA é um recurso opcional, disponível **apenas no plano Plus** (bloqueado no Básico/Free
  com 403 no backend).
- As perguntas ao Tutor são enviadas ao provedor de IA (DeepSeek) para gerar a resposta; o cache de
  respostas é **anônimo** (sem vínculo com o usuário).
- O uso é contabilizado por usuário/dia (`tutor_uso`) apenas para aplicar a cota do plano.
- O titular pode pedir a exclusão dos dados (inclusive do uso do Tutor) via `DELETE /api/conta`.

## 8. Segurança

- Senha: PBKDF2 com salt; tokens: SHA-256; sessões com validade de 30 dias.
- Rate limiting em cadastro/login/reset e em exportações (mapa mental/PDF).
- Validação de identidade em ações sensíveis legadas (alteração de e-mail, exclusão por senha).
- Auditoria de acessos (`acessos_auditoria`) e de concessões manuais (`eventos_pagamento` gateway
  `manual`).
