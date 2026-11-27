# Evolução do produto: banca-cêntrico + material de estudo

Objetivo: deixar de ser “app de PM-AM/PC-AM” e virar plataforma de preparação para
**qualquer concurso**, organizada por **banca** e **assunto**, com **material de estudo**
(diferencial) e banco de questões ampliável.

## 1. Organização do estudo

- **Banca** passa a ser o eixo principal: `FGV`, `CEBRASPE`, `FCC`, `VUNESP`, `IBFC`…
  (filtro “Todas” + lista dinâmica vinda do banco).
- **Certame** continua existindo como etiqueta do concurso alvo: `PM-AM`, `PC-AM`,
  `CREA-AM`… (filtro opcional “Todos”).
- **Matéria → assunto** continuam como estão.
- A tela de estudo começa em: `Banca: Todas` · `Certame: Todos` · matéria/assunto livres.
- Nada de “ESTUDANDO PARA PM-AM/PC-AM” fixo no topo.

## 2. Backend

### 2.1 Banca
- `GET /api/bancas` → `[{ "banca": "FGV", "questoes": 1004 }, …]` (bancas distintas, desc por total).
- Filtro `banca` em: `GET /api/topicos`, `GET /api/questoes`, `GET /api/desempenho`,
  `GET /api/simulado`, `GET /api/evolucao` (quando fizer sentido).
- Aceitar banca em branco = todas.

### 2.2 Certames dinâmicos
- `GET /api/concursos` deixa de ser lista fixa: agrupar `question_concursos` por concurso + count.
- `Concursos` passa a aceitar novos códigos (ex.: `CREA-AM`); validar com regex
  `^[A-Z0-9]{2,10}(-[A-Z0-9]{2,10})?$` e tamanho ≤ 20. Nada de string livre em query nativa sem
  normalização (evita abuso).

### 2.3 Material de estudo
- Nova entidade `MaterialEstudo`: `id`, `concurso` (ex.: CREA-AM), `slug` (único),
  `titulo`, `resumo`, `categoria` (LEI | REGIMENTO | RESOLUCAO | EDITAL | OUTRO),
  `fonte` (ex.: “Lei 5.194/1966”), `conteudo` (texto puro, parágrafos separados por linha em
  branco), `ordem`, `atualizadoEm`.
- Seed idempotente de `classpath:materiais.json` (carrega se a tabela estiver vazia ou por slug).
- Endpoints públicos (somente leitura):
  - `GET /api/materiais?concurso=CREA-AM` → lista resumida (sem conteúdo).
  - `GET /api/materiais/{slug}` → material completo.
- **Segurança**: conteúdo é texto puro (sem HTML); o frontend renderiza como parágrafos
  (sem `dangerouslySetInnerHTML`). Sem escrita pública.

### 2.4 Banco de questões ampliável
- Seed extra: `classpath:seed-extra.json` importado de forma **idempotente por hash**
  (não duplica; roda mesmo com o banco já populado).
- `POST /api/importar` continua **admin-only** e é o caminho para novos lotes.

## 3. Frontend

- Nova aba **Certames** (antes de Planos): cards por concurso (nome, total de questões,
  materiais disponíveis). Ao abrir: lista de materiais + botão “Estudar este certame”
  (aplica filtro `concurso`).
- Leitor de material: título, fonte, resumo, conteúdo em parágrafos legíveis, botão
  “Ir para as questões deste material” (filtra por concurso/matéria/assunto quando houver).
- Filtros da tela de estudo: **Banca** (select), **Certame** (select), **Matéria**, **Assunto**,
  quantidade e modo (pomodoro/tempo).
- Simulado e Evolução ganham o filtro de banca/certame.
- Copy revisada: “Escolha a banca e o que estudar”, sem menção fixa a PM-AM/PC-AM.
- Visual consistente com a nova tela de login (cards, azul-marinho + dourado).

## 4. Conteúdo inicial (CREA-AM) — legislação do edital

Materiais em `materiais.json`, exatamente na ordem abaixo (todos como texto de estudo,
com fonte oficial e resumo fiel):

1. **Lei nº 4.950-A/1966** — salário mínimo profissional.
2. **Lei nº 5.194/1966** — regula o exercício das profissões de engenheiro, arquiteto e agrônomo;
   CONFEA/CREA, registro, fiscalização e penalidades.
3. **Lei nº 6.496/1977** — Anotação de Responsabilidade Técnica (ART).
4. **Lei nº 6.839/1980** — registro de empresas nos conselhos.
5. **Decreto nº 23.569/1933** — regulamento do exercício da engenharia (histórico/normas gerais).
6. **Resolução CONFEA nº 218/1973** — atividades das diferentes modalidades profissionais.
7. **Resolução CONFEA nº 1.121/2019** — registro de pessoas físicas e jurídicas.
8. **Resolução CONFEA nº 1.137/2023** — normas atualizadas do Sistema CONFEA/CREA.
9. **Resolução CONFEA nº 1.047/2013** — empresas e responsabilidade técnica.
10. **Resolução CONFEA nº 1.050/2013** — (conforme edital).
11. **Resolução CONFEA nº 1.073/2016** — (conforme edital).
12. **Resolução CONFEA nº 1.007/2003** — (conforme edital).
13. **Resolução CONFEA nº 1.002/2002** — Código de Ética Profissional.
14. **Resolução CONFEA nº 1.090/2017** — (conforme edital).
15. **Regimento Interno do CREA-AM** — estrutura, competências, processo disciplinar.

> Regra editorial: cada material cita a fonte oficial; resumos são fiéis ao texto legal e não
> inventam artigo. Quando o texto integral não estiver disponível, o material traz o resumo e o
> link oficial, marcado como “consulte a íntegra”.

Questões autorais CREA-AM em `seed-extra.json`, ancoradas nos materiais, com `fundamento`
(artigo/resolução) e `origem: AUTORAL`, `banca: "CREA-AM"`.

## 5. Segurança (obrigatória)

- Material: apenas leitura pública; conteúdo texto puro.
- Parâmetros de filtro: truncar/normalizar (banca ≤ 40, concurso ≤ 20, materia/assunto ≤ 120)
  e rejeitar caracteres de controle.
- Imports e administração continuam `admin` + rate limit.
- Nenhuma rota nova de escrita pública.
- Manter HMAC do webhook, limites de checkout e auditoria do admin.

## 6. Critérios de aceite

1. `/api/bancas` e `/api/concursos` retornam dados reais (FGV 1004 e CREA-AM após o seed extra).
2. Filtro por banca funciona em questões, tópicos, desempenho e simulado.
3. Aba Certames lista CREA-AM com materiais; leitor abre e mostra o conteúdo; botão filtra questões.
4. `seed-extra.json` idempotente (rodar 2x não duplica).
5. Testes de backend e frontend passando; build sem erros.
