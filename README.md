# Concurso AM — banco de questões

Aplicação pessoal de resolução de questões para os concursos da **PM-AM (Soldado)** e
**PC-AM (Investigador)**, no estilo da banca **FGV** — a organizadora das últimas provas dos
dois certames.

## O que faz

- Sessão de estudo com filtro por **concurso → matéria → assunto**
- Correção imediata com **gabarito comentado** e **fundamento** (artigo de lei, súmula ou tópico do edital)
- Estatísticas de acertos por matéria
- Cada questão declara a **procedência**: `PROVA` (extraída de certame) ou `AUTORAL` (criada no estilo da banca)

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Spring Boot 4 (REST, JPA) |
| Banco | H2 em arquivo (dev e produção; driver PostgreSQL já no `pom.xml`) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS v4 |

## Como rodar

Pré-requisitos: JDK 21, Node 22+, Maven 3.9+.

```bash
# backend (porta 8080)
cd backend && mvn spring-boot:run

# frontend (porta 5173, com proxy /api -> 8080)
cd frontend && npm install && npm run dev
```

Abra <http://localhost:5173>.

O banco é populado automaticamente na primeira execução a partir de
`backend/src/main/resources/questoes.json` — o mesmo formato usado para importar lotes novos.

## Modelo de dados

```
Question   materia, assunto, enunciado, alternativas, correta, explicacao
           origem (PROVA | AUTORAL), banca, ano, orgao, cargo
           fundamento (base da resposta)
           concursos (PM-AM, PC-AM ou ambos)
Attempt    questionId, escolhida, acertou, criadaEm
```

Conteúdo comum aos dois concursos leva as duas marcas; matéria específica leva apenas a sua.

## API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/concursos` | total de questões por concurso |
| GET | `/api/topicos?concurso=` | matérias e assuntos disponíveis |
| GET | `/api/questoes?concurso=&materia=&assunto=&quantidade=` | sessão embaralhada |
| POST | `/api/questoes/{id}/responder` | corrige e devolve comentário |
| GET | `/api/desempenho?concurso=` | acertos por matéria |

## Status

- [x] Estrutura de dados, API e tela de treino
- [x] Separação por concurso (PM-AM / PC-AM)
- [x] Banco com 1.000+ questões (seed consolidado)
- [x] Tutor de IA na aba Fixação (DeepSeek)
- [x] Simulado no formato do caderno da banca
- [x] Deploy em container único com Caddy (HTTPS + senha) — ver `DEPLOY.md`
- [ ] Extração das provas reais da FGV (PM-AM 2022, PC-AM 2021)
- [ ] Migração para PostgreSQL se o uso deixar de ser pessoal

## Notas

- As questões autorais são ancoradas em fonte (lei, súmula ou tópico do edital) e revisadas.
- Questões de prova oficial devem ser extraídas de cadernos publicados pela banca, com
  atribuição de banca, ano e órgão.
