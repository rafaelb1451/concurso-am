# Extração das provas oficiais

Pipeline que transforma os cadernos em PDF (FGV) em lote de importação.

```
1-extrair-texto.py   PDF -> texto (PyMuPDF)
2-parsear.py         texto -> JSON estruturado + revisao.html
3-montar-lote.py     JSON -> backend/lotes/lote-02-provas.json (formato da API)
```

## Dependência

`PyMuPDF` (import `fitz`). O wheel pode ser extraído em qualquer pasta e usada com
`sys.path.insert`, sem instalar no Python global — foi assim que rodamos aqui.

## Regras aprendidas (não remover sem entender)

- **O gabarito é por TIPO de caderno.** O caderno traz "TIPO 4 – AZUL"; o gabarito tem uma
  seção por tipo. Extrair a seção errada desalinha todas as respostas.
- **Numeração da prova e do gabarito são independentes**: o pareamento é feito pelos números
  das questões, na ordem em que aparecem (a extração do PDF já sai crescente).
- **Questão anulada** aparece como `*` no gabarito (ex.: PC-AM Q24) e não tem resposta oficial:
  fica fora do banco.
- **Cabeçalho/rodapé de página e títulos de matéria vazam** para o texto da última alternativa
  de cada página. São descartados por lista explícita (`HEADERS`, `MATERIAS`) antes do parsing.
- **Tabelas e figuras em imagem não são extraíveis**: a questão dependente delas fica fora
  (ex.: PC-AM Q15, tabela de gols). Questões com imagem no enunciado só entram se o texto
  sozinho permitir responder.
- **Caracteres invisíveis** (bullets do Symbol, `\uf0b7`, área de uso privado) são removidos
  no final — sem isso sobra lixo no texto salvo.

## Chaves de conferência

```
PM-AM Aluno Soldado Tipo 4  -> 60 questões, 0 anuladas
PC-AM Investigador Tipo 1   -> 80 questões, 1 anulada (Q24), 1 sem dados (Q15)
lote gerado                 -> 138 questões
```

Depois de gerar, **confira o `revisao-provas.html`** antes de importar: ele lista cada questão
com a alternativa correta em verde.
