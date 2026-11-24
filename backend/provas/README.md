# Provas para extração

Coloque aqui os cadernos oficiais (PDF) que serão transformados em questões.

## Nomes sugeridos

```
provas/pm-am-2022-soldado-prova.pdf
provas/pm-am-2022-soldado-gabarito.pdf
provas/pc-am-2021-investigador-prova.pdf
provas/pc-am-2021-investigador-gabarito.pdf
```

## Regras

- **Caderno oficial** da banca (FGV), não compilação de terceiros.
- Se o gabarito vier em arquivo separado, nomeie com o mesmo prefixo + `-gabarito`.
- A extração gera um JSON no formato de `src/main/resources/questoes.json`, já com
  `concursos` marcado (PM-AM ou PC-AM) e `origem: "PROVA"`.
- Cada questão extraída passa por revisão antes de entrar no banco: enunciado, alternativas,
  gabarito e fundamento.

## Status

- [ ] PM-AM 2022 — Aluno Soldado (60 questões)
- [ ] PC-AM 2021 — Investigador (90 questões)
