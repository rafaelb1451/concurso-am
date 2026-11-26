# QB Concurso — Quebrando a Banca

Plataforma de questões para os concursos de **Soldado PM-AM** e **Investigador PC-AM**, no estilo da
banca **FGV**. O nome é **QB de "Quebrando a Banca"** — não de "question bank".

Banco atual: **1.004 questões** (PM-AM 602, PC-AM 739), **524 assuntos**, todas com comentário.

## Identidade visual

- **Logo:** monograma QB em selo azul-marinho com filete dourado (`frontend/src/Logo.tsx`, SVG).
- **Paleta:** base neutra quente (`ink-*`, pedra), primária azul-marinho (`brand-*`) e detalhe
  areia/dourado (`accent-*`). **Verde/vermelho são reservados ao feedback** (`ok-*`/`err-*`).
- **Tipografia:** Inter (fallback para a fonte do sistema).
- Classes de componente em `index.css`: `qb-card`, `qb-btn`, `qb-btn-ghost`, `qb-chip`, `qb-label`.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot **4.0.9** (REST, JPA, Validation) |
| Banco (dev) | H2 em arquivo (`backend/data/concurso`) |
| Banco (prod) | **PostgreSQL 16** (serviço `db` no compose) |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind v4 |
| Sessão | token opaco de 30 dias, `Authorization: Bearer`, guardado em `localStorage` |
| Deploy | Docker Compose + Caddy (HTTPS + basic auth) na Oracle Cloud |

## Como rodar (local)

```bash
# backend  -> :8080
cd backend
GOOGLE_CLIENT_ID=<client-id> mvn spring-boot:run

# frontend -> :5173 (proxy /api -> 8080)
cd frontend
npm install --ignore-scripts
npm run dev
```

Nesta máquina Windows o Maven não está no PATH:

```powershell
$env:JAVA_HOME = "C:\Program Files\Amazon Corretto\jdk21.0.8_9"
treino\tools\apache-maven-3.9.16\bin\mvn.cmd -s treino\tools\settings.xml -f concurso-am\backend\pom.xml package
```

**Não há `mvnw`** — o Maven vem da pasta `treino/tools`.

## Variáveis de ambiente

| Variável | Onde | Para que serve |
|---|---|---|
| `DEEPSEEK_API_KEY` | backend | chave do tutor (alternativa: `backend/segredos/deepseek.key`) |
| `GOOGLE_CLIENT_ID` | backend | audience do login Google; sem ela `/api/google` responde 503 |
| `VITE_GOOGLE_CLIENT_ID` | frontend (`.env.local`) | renderiza o botão do Google; sem ela o botão não aparece |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | backend | e-mail transacional (verificação, reset, troca de e-mail) |
| `CONCURSO_APP_URL` | backend | URL pública (links de e-mail e callbacks do checkout; precisa ser https) |
| `ASAAS_API_KEY` / `ASAAS_CHAVE_ARQUIVO` | backend | chave do Asaas (dev: `backend/segredos/asaas.key`) |
| `ASAAS_BASE_URL` | backend | sandbox `https://api-sandbox.asaas.com/v3` ou produção `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | backend | token do webhook; sem ele o webhook recusa toda requisição |
| `POSTGRES_*`, `DB_POOL_SIZE`, `DDL_AUTO`, `FLYWAY_ENABLED` | compose | banco de produção |

`frontend/.env.example` é versionado; `frontend/.env.local` **não**.
Arquivos `.env.local` gravados com BOM (PowerShell 5.1 `Set-Content`) quebram o Vite — gravar sem BOM.

## Estrutura

```
backend/src/main/java/com/concurso
  domain/    Question, Attempt, Origem, Concursos, Usuario, Sessao, TokenConta,
             SessaoEstudo, IdentidadeExterna
  repo/      QuestionRepository, AttemptRepository, UsuarioRepository, SessaoRepository,
             TokenContaRepository, SessaoEstudoRepository, IdentidadeExternaRepository
  service/   QuestaoService, SimuladoService, ImportService, DeepSeekService, RateLimiter,
             AuthService, AuthException, SenhaHash, GoogleTokenVerifier, EmailService,
             DadosPessoaisService, EvolucaoService
  web/       ApiController, AuthController, TutorController, AuthInterceptor, WebConfig,
             ApiErrors, AcessoNegadoException, Dtos
  seed/      SeedLoader, QuestionPayload
backend/src/main/resources/
  seed-completo.json          ← 1.004 questões (gerado por tools/consolidar-seed.py)
  questoes.json               ← 24 questões de base (fallback do seed)
frontend/src/  App.tsx, Auth.tsx, GoogleBotao.tsx, ContaSeguranca.tsx, Evolucao.tsx,
               Fixacao.tsx, Simulado.tsx, PomodoroEstudo.tsx, Rascunho.tsx,
               MarcadorTexto.tsx, Logo.tsx, api.ts, index.css
```

## Modelo e regras

- `Question`: materia, assunto, enunciado, alternativas (coleção), `correta` (índice 0-based),
  explicacao, fundamento, dificuldade (1-3), origem (`PROVA` | `AUTORAL`), banca/ano/orgao/cargo,
  e `concursos` (PM-AM, PC-AM ou ambos).
- **Conteúdo comum leva as duas marcas**; matéria específica leva só a sua. Sem marcação no
  JSON, o `SeedLoader` assume os dois.
- `Attempt` = cada resposta dada; alimenta `/api/desempenho` e a evolução diária.
- O seed só roda com a tabela vazia — reiniciar não duplica.
- `tools/consolidar-seed.py` regenera o `seed-completo.json` a partir de `backend/lotes/*.json`.
  **Rodar de novo a cada lote novo.**

## Autenticação e contas

- Login por **e-mail/senha** (hash PBKDF2/bcrypt em `SenhaHash`) e por **Google**.
- Sessão: token aleatório de 32 bytes; o banco guarda **apenas o hash**. Validade 30 dias.
- Login com Google usa **ID token** (Google Identity Services) — **não há client secret**.
  `GoogleTokenVerifier` confere assinatura (JWKS com cache + rotação), `iss`, `aud`, `exp`,
  `iat` e `email_verified`; recusa `alg` diferente de RS256 e `alg=none`.
- Vínculo Google ↔ conta local: pela tabela `identidades_externas`, chave `(provider, sub)`.
  **Nunca pelo e-mail** — o vínculo com conta local existente só é feito se ela já confirmou o
  e-mail, senão qualquer um criaria uma conta com o e-mail alheio e assumiria o histórico.
- Conta criada pelo Google nasce verificada e **sem senha local** (`senha_hash` aceita nulo).
- Rotas públicas (POST): `/api/google`, `/api/cadastro`, `/api/login`, `/api/verificar-email`,
  `/api/reenviar-verificacao`, `/api/solicitar-reset`, `/api/resetar-senha`,
  `/api/usuario/confirmar-email`. **Todo o resto de `/api/**` exige sessão.**
- Primeiro usuário cadastrado vira **ADMIN**.
- Erros com status correto (`AuthException`): 401 credencial inválida, 403 e-mail não verificado,
  409 conflito de vínculo, 429 conta bloqueada (5 tentativas / 15 min), 503 Google sem configurar.

**Confirmação de identidade em ações sensíveis** (`excluir conta`, `alterar e-mail`):
- conta com senha local → exige a senha (`senha` no corpo);
- conta só-Google → exige um **ID token novo** (`credential` no corpo), validado pelo
  `GoogleTokenVerifier`, e o `sub` precisa pertencer a esta conta (403 se for de outra). Estar
  logado não basta: a sessão pode estar em um dispositivo esquecido.
- `GET /api/usuario` devolve `temSenha` para o frontend decidir qual confirmação pedir.
- Ao excluir a conta, `identidades_externas` também é apagado (senão o `sub` do Google ficaria
  órfão e nunca mais poderia ser usado).

## API

Conteúdo (exige sessão):
`GET /api/concursos` · `GET /api/topicos?concurso=` · `GET /api/questoes?concurso=&materia=&assunto=&quantidade=`
· `POST /api/questoes/{id}/responder` · `GET /api/desempenho?concurso=` · `GET /api/simulado`
· `POST /api/simulado/corrigir` · `POST /api/importar` · `POST /api/explicacoes`
· `GET|POST /api/config/deepseek` · `POST /api/chat`

Contas:
`POST /api/cadastro` · `POST /api/login` · `POST /api/google` · `POST /api/logout`
· `GET /api/usuario` · `POST /api/verificar-email` · `POST /api/reenviar-verificacao`
· `POST /api/solicitar-reset` · `POST /api/resetar-senha` · `POST /api/usuario/alterar-email`
· `POST /api/usuario/confirmar-email` · `GET /api/usuario/dados` (LGPD) · `POST /api/usuario/excluir`

## Tutor (aba Fixação)

`POST /api/chat` recebe `{mensagens, contexto}` e chama `https://api.deepseek.com/chat/completions`
(modelo `deepseek-chat`) com o contexto da questão atual — o tutor responde sobre ELA, não em
genérico. A chave é lida de `DEEPSEEK_API_KEY` ou do arquivo `backend/segredos/deepseek.key`
(ignorado pelo git). O prompt de sistema proíbe inventar artigo/súmula e mantém o foco em lei seca.
Limites: 20 mensagens de histórico, 4.000 caracteres por mensagem, 20 chamadas/minuto por processo.
Erro do provedor externo **nunca** volta para o cliente (vai para o log).

## Decisões de produto (não mudar sem combinar)

- **Banca alvo é FGV.** Não implementar multi-banca agora.
- **Questão autoral precisa de `fundamento`** (artigo de lei, súmula ou item do edital) e estilo
  FGV: texto-base curto, 5 alternativas, distratores plausíveis, pegadinha de absolutismo.
- **Procedência sempre visível** (`PROVA` vs `AUTORAL`).
- Questões de prova real devem vir de caderno oficial, com banca/ano/órgão atribuídos.
- **Gateway de pagamento escolhido: Asaas** (checkout hospedado, webhook com token). **Principal
  limitação descoberta: assinatura recorrente no Asaas só aceita cartão de crédito** — Pix/boleto
  ficam para cobrança avulsa (plano anual pago de uma vez).
- Planos previstos: **FREE** (limite diário) e **PRO** (ilimitado), mensal/anual.
- Contas de usuário: Cookie/JWT — decisão tomada foi **token Bearer em localStorage** (simples para
  SPA mesma origem). Se houver app mobile, reavaliar.

## Pagamento e assinatura (Fase 2)

Gateway: **Asaas**, checkout hospedado (não guardamos cartão). Descobertas da API em
`docs/integracao-asaas.md` — resumo do que morde:

- **Assinatura recorrente no Asaas só aceita cartão de crédito** (`RECURRENT` + `CREDIT_CARD`).
  Pix/boleto exigem chave Pix/habilitação e são cobrança avulsa.
- O `callback` do checkout precisa ser **HTTPS público** (localhost é recusado).
- `customerData` inline exige nome, e-mail, CPF, **`phone`**, endereço, número, bairro e CEP.
- A URL de pagamento volta no campo **`link`**.
- Webhook: o Asaas manda o token no header **`asaas-access-token`**.

Fluxo: `POST /api/assinatura/checkout` cria a sessão hospedada e a assinatura nasce **PENDENTE**
(não libera). Só o **webhook** muda o estado: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → `ATIVA` com
período de 1 mês/1 ano; `PAYMENT_OVERDUE` → `EM_ATRASO` com carência de 5 dias;
`SUBSCRIPTION_DELETED`/`PAYMENT_REFUNDED` → `CANCELADA` (acesso até o fim do período pago).
Idempotência por `(gateway, gateway_event_id)` único + consulta prévia.

Endpoints: `GET /api/planos` (público) · `GET /api/assinatura` · `GET /api/assinatura/uso`
· `POST /api/assinatura/checkout` · `POST /api/assinatura/cancelar` · `POST /api/webhooks/asaas`.

Config: `ASAAS_API_KEY` (ou `backend/segredos/asaas.key`), `ASAAS_BASE_URL`,
`ASAAS_WEBHOOK_TOKEN`, `CONCURSO_APP_URL` (https, para os callbacks).

Smoke test: `python tools/teste-pagamento.py` (precisa do backend no ar com o token do webhook).

## Limite do plano e tela de Planos

- `POST /api/questoes/{id}/responder` chama `AcessoService.exigirDireitoDeResponder`: conta FREE
  acima do limite diário recebe **429** com mensagem de upsell; PRO passa direto.
- O limite do FREE é contado a partir de `attempts` do dia (`America/Sao_Paulo`) — não existe
  contador paralelo para dessincronizar.
- Tela `frontend/src/Planos.tsx` (aba **Planos**): plano atual, medidor de uso do FREE, cards de
  PRO mensal/anual com economia, formulário de dados exigidos pelo checkout e redirecionamento
  para a página hospedada do Asaas. Se `pagamentoConfigurado` for false, o botão fica desabilitado.
- Smoke test do limite: `python tools/teste-limite-plano.py` (responde 20, espera 429 na 21ª e
  faz o checkout + webhook para confirmar a liberação do PRO).

## Área pública (sem conta)

O site abre para qualquer visitante: **landing**, **prática gratuita** e **planos**. Só o app
completo (questões, fixação, simulado, evolução, conta) exige login.

- **Prática gratuita**: o visitante escolhe **uma matéria** e responde **até 10 questões**.
  O teto é imposto no servidor (`PublicoController.LIMITE_QUESTOES`), não no frontend.
- `GET /api/publico/materias` — matérias com contagem de questões (público).
- `GET /api/publico/questoes?materia=X&quantidade=10` — sem gabarito e sem comentário;
  `quantidade > 10` responde **400**.
- `POST /api/publico/responder` — devolve `acertou`, `gabarito`, `explicacao` e `fundamento`.
- O interceptor libera `/api/publico/**`; **o resto de `/api/**` continua exigindo sessão**.
- Frontend: `SiteHeader.tsx` (nav + Entrar/Criar conta), `Inicio.tsx` (landing com hero,
  matérias, como funciona, diferenciais e planos) e `PraticaGratis.tsx` (fluxo das 10 questões).
  `Planos.tsx` aceita `anonimo` para a versão pública.
- Smoke test: `python tools/teste-pratica-gratis.py`.

## Fontes primárias de legislação (`docs/legislacao/`)

Textos oficiais baixados do portal **Legisla.Am** (Imprensa Oficial do AM) por
`tools/baixar-legislacao.py`. **É contra eles que questões de Legislação Institucional devem ser
conferidas** — antes de afirmar qualquer artigo, leia o dispositivo no arquivo.

| Arquivo | Norma |
|---|---|
| `lei-3514-2010.txt` | Lei 3.514/2010 — organização básica da PMAM (55 artigos) |
| `constituicao-estado-amazonas.txt` | Constituição do Estado do Amazonas (456 artigos) |
| `lei-4-044-2014.txt` | Lei 4.044/2014 — carreira e promoção de praças (32 artigos) |
| `lei-1-154-1975.txt` | Lei 1.154/75 — Estatuto dos Policiais Militares do AM (200 artigos) |

O Estatuto veio do **SAPL da ALE-AM** (`sapl.al.am.leg.br/norma/5603`, PDF), porque não está no
Legisla.Am. Pontos úteis já verificados: art. 13 (círculos hierárquicos), art. 27 (ética e deveres,
IX discrição / X sigilo), art. 58 § 2º (promoção é ato administrativo), art. 59 (antiguidade e
merecimento — **oficiais**; praças seguem a Lei 4.044/2014, art. 5º), art. 65 (licença especial,
red. Lei 2.199/1993: 3 meses por quinquênio).

## Critérios jurídicos (obrigatório — ver `docs/criterios-juridicos.md`)

**O alvo são cargos não privativos do Direito** (Soldado PM-AM, Investigador PC-AM): a FGV cobra
**a letra da lei e do edital**. O eixo do comentário é sempre o `fundamento` literal (artigo,
inciso, parágrafo, item do edital).

- `precedente` é **complemento opcional**, usado só quando: a questão invoca jurisprudência; o
  texto legal é omisso/ambíguo; ou houve alteração/divergência que muda a resposta hoje.
- Não transformar questão de lei seca em questão de jurisprudência — desalinha da banca.
- Hierarquia (CF → STF → STJ → TJ → lei → decreto → doutrina) serve para **conferir** se o
  dispositivo foi alterado ou superado, não para substituir a lei como fonte do comentário.
- `verificadoEm` = data da conferência contra a legislação vigente.
- **Proibido**: citar artigo/súmula/tema sem certeza; citar súmula cancelada ou superada; usar
  doutrina como lei.
- Questão cujo gabarito ficou obsoleto por mudança de lei não entra sem aviso explícito no
  comentário. Exemplo real já tratado: progressão de regime (art. 112 da LEP) — alterado pela
  Lei 14.843/2024 e reescrito pela **Lei 15.402/2026** (1/6 como regra, exceções de 20/25/30%,
  incisos IV a X vetados).

## Testes

```powershell
# backend (76 testes)
treino\tools\apache-maven-3.9.16\bin\mvn.cmd -s treino\tools\settings.xml -f concurso-am\backend\pom.xml test

# frontend (19 testes) — no sandbox do agente precisa de pool de threads
cd concurso-am\frontend
node node_modules\vitest\vitest.mjs run --pool=threads

# smoke test das contas (backend no ar em :8080)
python concurso-am\tools\teste-contas.py

# smoke test do pagamento (backend no ar com ASAAS_WEBHOOK_TOKEN e CONCURSO_APP_URL https)
python concurso-am\tools\teste-pagamento.py
```

- **Mockito** precisa de `-Djdk.attach.allowAttachSelf=true` (já no `maven-surefire-plugin`).
  Sem isso: `MockitoInitializationException`.
- **Vitest** com `npm test` falha no sandbox do agente (`Failed to start forks worker`) — usar
  `--pool=threads`. Fora do sandbox, `npm test` funciona.

## Armadilhas do ambiente

- **Matar o java à força deixa o H2 read-only** na próxima subida → apagar `backend/data/*` e
  reiniciar (o seed recria as 1.004). Confirmar que a pasta ficou vazia antes de subir.
- `mvn package` falha com "Unable to rename ...jar" se a aplicação estiver rodando → matar antes.
- `npm install` deve usar `--ignore-scripts` (sandbox bloqueia postinstall do esbuild).
- `tsc` só roda dentro de `frontend/` (o tsconfig está lá).
- PowerShell 5.1: `@(Invoke-RestMethod ...)` embrulha arrays; `curl --data-binary $var` corrompe
  JSON com aspas — para testar API use **Python** (`tools/teste-contas.py`) ou arquivo.
- Heredoc do PowerShell come backticks — não usar para escrever arquivos com Markdown/código.
- Acentuação embaralhada no console é só exibição; o arquivo e o banco são UTF-8.

## Estado em 2026-11-26 — onde parar e como retomar

| Fase | Situação |
|---|---|
| Banco de questões (1.004) | ✅ concluído |
| Contas: e-mail/senha, verificação, reset, LGPD, sessão | ✅ concluído |
| Login com Google (ID token + identidade externa) | ✅ concluído, incluindo reautenticação para excluir conta e trocar e-mail (falta testar com token real no navegador) |
| Postgres + compose + Flyway (preparado) | ⏳ commitado, **não deployado** |
| Deploy Oracle | ⛔ **bloqueado**: SSH na porta 22 não conecta (VM recriada sem IP público / chave perdida); falta recriar a instância com IP público + chave própria + cloud-init |
| Fase 2: planos, assinatura, webhook Asaas | ✅ backend + **tela de Planos**; falta registrar o webhook no painel do Asaas (exige domínio/HTTPS) |
| Área pública (landing + prática grátis sem conta) | ✅ 1 matéria / 10 questões, teto imposto no servidor |
| Fase 3: limite FREE e cota de IA | 🔶 **limite FREE aplicado no responder (429)**; falta cota de IA por plano e rate limit por usuário |

**Para retomar:** `git log --oneline -8` mostra o ponto; rodar backend + frontend conforme acima;
`python tools/teste-contas.py` valida o básico em segundos.

**Pendências pequenas conhecidas:**
1. `RateLimiter` é global por processo — precisa ser por usuário antes de virar multiusuário.
2. Frontend: `localStorage` guarda o token (considerar cookie HttpOnly quando houver domínio próprio).
3. Testar o botão do Google no navegador com `http://localhost:5173` nas *Authorized JavaScript origins*.
4. Conta só-Google não pode **definir uma senha** ainda (só existe troca por e-mail/senha).
   Caminho natural: `POST /api/usuario/definir-senha` confirmando com credencial do Google.

## Git

Repositório `rafaelb1451/concurso-am`, branch `main`. Não versionar `target/`, `node_modules/`,
`data/`, `dist/`, `*.log`, `.env`, `.env.local`. O push é feito manualmente pelo usuário — a rede do
git é bloqueada no sandbox do agente.

Commits recentes relevantes:

```
d4927f5 feat: login com Google via validacao de ID token
f638494 fix: semantica HTTP do login e teste de fumaca das contas
1ca5ffa feat: postgres em producao e preparacao do flyway
bed4787 feat: contas de usuario, sessoes, LGPD e evolucao do estudo
```
