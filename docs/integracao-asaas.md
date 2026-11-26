# Integração Asaas — o que foi descoberto na prática

Descoberto em 2026-11-26 testando o **sandbox** com a chave real (`$aact_hmlg_...`), porque a
documentação oficial é renderizada por JS e não expõe o JSON dos exemplos.

## Ambiente

| Item | Valor |
|---|---|
| Base sandbox | `https://api-sandbox.asaas.com/v3` |
| Base produção | `https://api.asaas.com/v3` |
| Autenticação | header `access_token: <chave>` |
| Chave local | `backend/segredos/asaas.key` (gitignored) |
| Checkout hospedado | `POST /v3/checkouts` |

Verificação rápida de credencial: `GET /v3/finance/balance` → `200 {"balance":0}`.

## Checkout hospedado (o que a API aceita)

`POST /v3/checkouts` com corpo:

```json
{
  "billingTypes": ["CREDIT_CARD"],
  "chargeTypes": ["RECURRENT"],
  "minutesToExpire": 1440,
  "externalReference": "usuario:7:plano:PRO_MENSAL",
  "callback": {
    "successUrl": "https://SEU-DOMINIO/assinatura/sucesso",
    "cancelUrl": "https://SEU-DOMINIO/assinatura/cancelado"
  },
  "items": [{ "name": "QB Concurso PRO — mensal", "quantity": 1, "value": 29.90 }],
  "subscription": { "cycle": "MONTHLY", "nextDueDate": "2026-12-01" },
  "customerData": {
    "name": "Fulano", "email": "fulano@exemplo.com", "cpfCnpj": "24971563792",
    "phoneNumber": "11987654321",
    "address": "Rua Teste", "addressNumber": "100",
    "province": "Centro", "postalCode": "01001000"
  }
}
```

Resposta `200`:

```json
{ "id": "<uuid>", "link": "https://sandbox.asaas.com/000/checkoutSession/show/<uuid>",
  "status": "ACTIVE", "minutesToExpire": 1440 }
```

**A URL de pagamento está em `link`** (não em `url`).

## Regras que a API impõe (testadas)

| Regra | Erro quando violada |
|---|---|
| `RECURRENT` só aceita `CREDIT_CARD` | "O método de pagamento CREDIT_CARD é o único método de pagamento permitido para operações RECURRENT" |
| `RECURRENT` exige o objeto `subscription` | "O campo subscription deve ser informado." |
| Pix exige **chave Pix cadastrada** na conta Asaas | "Para gerar cobranças com Pix é necessário criar uma chave Pix no Asaas." |
| Boleto precisa estar habilitado na conta | "O campo billingTypes é inválido." |
| `successUrl`/`cancelUrl` precisam ser **HTTPS público** | "O campo successUrl é inválido." (localhost também é recusado) |
| `customerData` inline exige telefone + endereço completos | "O campo phoneNumber deve ser informado." etc. |
| Campo de telefone no inline chama-se **`phoneNumber`** | — |
| Cliente criado só com nome/e-mail/CPF não serve para o checkout | "O campo phone deve existir para o customer informado." |

## Consequência de produto (decisão pendente)

**Assinatura recorrente no Asaas é exclusivamente cartão de crédito.** Para aceitar Pix e boleto,
o caminho é cobrança **avulsa** (`chargeTypes: ["DETACHED"]`) — ou seja, o aluno paga um período
(por exemplo o plano anual) e o acesso é liberado pelo webhook de pagamento, sem renovação
automática. Alternativas a avaliar depois: Pix Automático (existe na conta Asaas, mas tem fluxo
próprio) e Pix Recorrente.

## Webhooks

- Configurados no painel do Asaas (ou por API) com uma **URL pública** e um **token de
  autenticação** enviado no header `asaas-access-token`.
- A validação é comparar esse token em tempo constante; requisição sem token válido → **401**.
- Idempotência: cada evento traz um `id`; guardar em `eventos_pagamento(gateway_event_id)` com
  restrição única e ignorar repetição.
- Eventos esperados: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`,
  `PAYMENT_REFUNDED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`,
  `SUBSCRIPTION_DELETED`, `CHECKOUT_PAID`.

## Como testar localmente

- O checkout **não** funciona com callback `localhost` — usar ngrok/Cloudflare Tunnel ou apontar
  para o domínio de produção.
- Webhook: o painel do Asaas precisa de URL pública; dá para simular com `curl` usando o token.
- Cartão de teste do sandbox: ver doc do Asaas ("Testando pagamento com cartão de crédito").
