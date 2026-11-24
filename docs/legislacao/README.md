# Fontes oficiais da legislação do Amazonas

Textos extraídos do portal oficial **Legisla.Am** (Imprensa Oficial do Estado do Amazonas):
`https://legisla.imprensaoficial.am.gov.br`

Extraídos em **24/11/2026** por script (`tools/baixar-legislacao.py`). São fontes primárias: é
contra eles que as questões de Legislação Institucional devem ser conferidas.

## Disponíveis

| Arquivo | Norma | Artigos | Uso |
|---|---|---|---|
| `lei-3514-2010.txt` | Lei Estadual **3.514/2010** — organização básica da PMAM | 55 | hierarquia, órgãos, Estado Maior, Comandante-Geral |
| `constituicao-estado-amazonas.txt` | **Constituição do Estado do Amazonas** | 456 | art. 79 (justiça militar), competências, segurança pública |
| `lei-4-044-2014.txt` | Lei Estadual **4.044/2014** — carreira de praças (promoção) | 32 | antiguidade, bravura, especial, post mortem; QEA/QNA; vagas |
| `lei-1-154-1975.txt` | Lei Estadual **1.154/75** — Estatuto dos Policiais Militares do AM | 200 | hierarquia, círculos hierárquicos, ética e deveres, licença especial (art. 65, red. Lei 2.199/1993), promoção (arts. 58-59) |

## Não disponível

Nenhuma norma essencial em falta. Se aparecer tema sem base, registre no README antes de afirmar.

> A Lei 1.154/75 não está no portal Legisla.Am (a base de 1975 salta da lei 1.147 para a 1.158).
> O texto veio do **SAPL da Assembleia Legislativa do AM** (`https://sapl.al.am.leg.br/norma/5603`)
> em PDF e foi extraído com PyMuPDF. O PDF está em `lei-1-154-1975-pdf.txt` (texto bruto por página).

## Como o portal organiza os endereços

```
/diario_am/{categoria}/{ano}/{mes}/{pagina}     ← texto integral de uma norma
/diario_am/{categoria}/{ano}/{mes}              ← listagem do mês (títulos)
/diario_am/{categoria}/{ano}                    ← listagem do ano (paginada)
```

Categorias: `10` leyes complementares · `11` leyes delegadas · `12` **leis ordinárias** ·
`41533` leis promulgadas · `41534` decretos legislativos · `41535` decretos numerados.

A listagem de mês traz cada título num `<h5>` seguido de um link "Texto integral" — é assim que o
script localiza a norma pelo número.

## Regras de uso

1. **A lei é a fonte primária** para estes cargos (a banca cobra lei seca).
2. Só cite artigo quando o texto estiver aqui e você tiver lido o dispositivo.
3. Se a norma não está na base, marque a questão como **sem fonte** em vez de afirmar.
4. Ao atualizar: rode o script e confira a data de extração no topo deste arquivo.
