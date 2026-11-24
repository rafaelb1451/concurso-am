# concurso — banco de questões PM-AM / PC-AM

App pessoal de resolução de questões para **Soldado PM-AM** e **Investigador PC-AM**, no estilo
da banca **FGV** (organizadora das últimas provas dos dois certames).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot 4.0.9 (REST, JPA) |
| Banco | H2 em arquivo (`backend/data/concurso`) — dev |
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind v4 |

## Como rodar

```bash
cd backend && mvn spring-boot:run          # API em :8080
cd frontend && npm install && npm run dev  # UI em :5173 (proxy /api → 8080)
```

Nesta máquina Windows o Maven não está no PATH: usar
`treino/tools/apache-maven-3.9.16/bin/mvn.cmd -s treino/tools/settings.xml` e
`JAVA_HOME="C:\Program Files\Amazon Corretto\jdk21.0.8_9"`.

## Estrutura

```
backend/src/main/java/com/concurso
  domain/Question, Attempt, Origem, Concursos
  repo/, service/QuestaoService, web/ApiController+Dtos, seed/SeedLoader
backend/src/main/resources/questoes.json   ← banco inicial (formato de importação)
frontend/src/App.tsx, api.ts, index.css
```

## Modelo e regras

- `Question`: materia, assunto, enunciado, alternativas (coleção), `correta` (índice 0-based),
  explicacao, fundamento, dificuldade (1-3), origem (`PROVA` | `AUTORAL`), banca/ano/orgao/cargo,
  e `concursos` (PM-AM, PC-AM ou ambos).
- **Conteúdo comum leva as duas marcas**; matéria específica leva só a sua. Sem marcação no
  JSON, o `SeedLoader` assume os dois.
- `Attempt` = cada resposta dada; alimenta `/api/desempenho`.
- O seed só roda com a tabela vazia — reiniciar não duplica.

## API

`GET /api/concursos` · `GET /api/topicos?concurso=` · `GET /api/questoes?concurso=&materia=&assunto=&quantidade=`
· `POST /api/questoes/{id}/responder` · `GET /api/desempenho?concurso=`

## Decisões de produto (não mudar sem combinar)

- **Banca alvo é FGV.** Não implementar multi-banca agora.
- **Questão autoral precisa de `fundamento`** (artigo de lei, súmula ou item do edital) e estilo
  FGV: texto-base curto, 5 alternativas, distratores plausíveis, pegadinha de absolutismo.
- **Procedência sempre visível** (`PROVA` vs `AUTORAL`) — o aluno precisa saber o que está treinando.
- Questões de prova real devem vir de caderno oficial, com banca/ano/órgão atribuídos.
- Próximo passo combinado: extrair as provas reais da FGV (PM-AM 2022, PC-AM 2021) para calibrar
  as autorais lado a lado.

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

## Armadilhas do ambiente

- **Matar o java à força deixa o H2 read-only** na próxima subida → apagar `backend/data/*` e reiniciar.
- `mvn package` falha com "Unable to rename ...jar" se a aplicação estiver rodando → matar antes.
- `npm install` deve usar `--ignore-scripts` (sandbox bloqueia postinstall do esbuild).
- `tsc` só roda dentro de `frontend/` (o tsconfig está lá).
- PowerShell 5.1: `@(Invoke-RestMethod ...)` embrulha arrays — indexar direto, sem `@()`.
- Acentuação embaralhada no console é só exibição; o arquivo e o banco são UTF-8.

## Git

Repositório próprio, branch `main`. Não versionar `target/`, `node_modules/`, `data/`, `*.log`
(já no `.gitignore`). O push é feito manualmente pelo usuário — a rede do git é bloqueada no
sandbox do agente.
