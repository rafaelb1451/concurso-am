# Guia de produção de lote autoral

Instruções para gerar questões **autorais** no estilo FGV para PM-AM (Soldado) e PC-AM
(Investigador). Vale para todo lote produzido por agente.

## Formato de saída

Um arquivo JSON com um **array** de objetos exatamente neste formato:

```json
{
  "materia": "Língua Portuguesa",
  "assunto": "Concordância verbal",
  "origem": "AUTORAL",
  "banca": "FGV",
  "ano": null,
  "orgao": null,
  "cargo": null,
  "fundamento": "Concordância com sujeito posposto",
  "dificuldade": 2,
  "enunciado": "Texto da questão...",
  "alternativas": ["A", "B", "C", "D", "E"],
  "correta": 1,
  "explicacao": "Por que a correta está certa e por que os distratores principais erram.",
  "concursos": ["PM-AM", "PC-AM"],
  "precedente": null,
  "verificadoEm": "2026-11-24"
}
```

- `correta` é o **índice** da alternativa certa (0 = A, 1 = B, 2 = C, 3 = D, 4 = E).
- Sempre **5 alternativas**.
- `materia` deve ser uma das existentes: Língua Portuguesa · Raciocínio Lógico-Matemático ·
  Noções de Informática · História do Amazonas · Geografia do Amazonas ·
  História e Geografia do Amazonas · Legislação Institucional · Noções de Administração ·
  Noções de Contabilidade · Direito Constitucional · Direito Penal e Processual Penal ·
  Direito Administrativo · Noções de Direito.
- `concursos`: `["PM-AM"]`, `["PC-AM"]` ou os dois quando o conteúdo é comum.
- `explicacao` é **obrigatória** e precisa dizer por que a correta está certa e por que 1 ou 2
  distratores erram.

## Vocabulário controlado de `assunto`

Use **um destes rótulos** (o filtro da tela agrupa por eles). Não crie rótulo novo sem necessidade.

| Matéria | Assuntos |
|---|---|
| Língua Portuguesa | Interpretação de texto · Coesão e referenciação · Concordância verbal · Concordância nominal · Regência · Crase · Pontuação · Classes de palavras · Figuras de linguagem · Reescrita de frases · Colocação pronominal · Tempos e modos verbais · Ortografia e acentuação · Semântica |
| Raciocínio Lógico-Matemático | Porcentagem · Regra de três · Razão e proporção · Conjuntos · Lógica proposicional · Sequências · Probabilidade · Análise combinatória · MMC e MDC · Problemas aritméticos · Geometria · Leitura de gráficos e tabelas |
| Noções de Informática | Windows · Word · Excel · PowerPoint · Navegadores · Internet e protocolos · Correio eletrônico · Segurança da informação · Backup e nuvem · Arquivos e extensões · LGPD |
| Legislação Institucional | Hierarquia e disciplina · Escala hierárquica · Promoção · Licença e situações funcionais · Estrutura organizacional · Comandante-Geral · Estado Maior · Conselho Consultivo · Deveres e ética |
| História do Amazonas | Povos indígenas · Colonização e drogas do sertão · Diretório dos Índios · Tratados de limites · Cabanagem · Ciclo da borracha · Zona Franca de Manaus · Primeira República · Clube da Madrugada · Formação territorial |
| Geografia do Amazonas | Relevo e geologia · Hidrografia · Clima · Vegetação · Recursos minerais · População e urbanização · Economia · Fronteiras · Impactos ambientais · Unidades de conservação |
| Direito Constitucional | Direitos e garantias · Remédios constitucionais · Direitos sociais · Nacionalidade · Direitos políticos · Organização do Estado · Administração pública · Segurança pública · Militares · Poder Judiciário e MP · Controle de constitucionalidade · Processo legislativo · Orçamento e finanças |
| Direito Penal e Processual Penal | Aplicação da lei penal · Teoria do crime · Imputabilidade · Concurso de pessoas · Penas e dosimetria · Extinção da punibilidade · Prescrição penal · Crimes contra a pessoa · Crimes contra o patrimônio · Crimes contra a dignidade sexual · Crimes contra a Administração Pública · Crimes contra a saúde pública · Lei de Drogas · Estatuto do Desarmamento · Inquérito policial · Ação penal · Prisões e medidas cautelares · Provas · Competência · Fiança |
| Noções de Administração | Evolução da administração · Funções administrativas · Estrutura organizacional · Motivação e liderança · Comunicação · Tomada de decisão · Gestão de processos · Gestão da qualidade · Planejamento estratégico · Gestão de pessoas · Governança |
| Noções de Contabilidade | Patrimônio · Equação fundamental · Regime de competência · Escrituração · Balanço patrimonial · DRE · Lançamentos contábeis · Contas redutoras · Depreciação · Provisões · Fluxo de caixa · Estrutura conceitual |
| Direito Administrativo | Princípios · Atos administrativos · Poderes administrativos · Organização administrativa · Agentes públicos · Licitações e contratos · Improbidade administrativa · Controle da administração · Responsabilidade civil do Estado · Processo administrativo · Serviços públicos · Bens públicos |

## Estilo FGV (o que a banca cobra nesses cargos)

- **Lei seca e edital**: o alvo são carreiras policiais, não carreiras jurídicas. Cobre o que está
  escrito na norma — prazos, competências, definições, requisitos.
- **Situação-problema** é o formato preferido: um caso curto, alguém em uma situação concreta, e
  a pergunta sobre a consequência jurídica/prática.
- **Distratores plausíveis**: trocar um número, atribuir competência ao órgão vizinho, inverter a
  ordem de um requisito, generalizar um "pode" para "deve".
- **Pegadinha de absolutismo**: "sempre", "nunca", "somente", "em qualquer hipótese", "independentemente".
- Evitar: "todas as anteriores", "nenhuma das anteriores", questão de opinião, questão sem base
  normativa objetiva.

## Regras de conteúdo (obrigatórias)

- **Não inventar artigo, inciso, parágrafo ou número de súmula.** Sem certeza, descreva o
  instituto sem o número.
- Em Direito, prefira dispositivos **estáveis** (não use tema com alteração legislativa recente
  ou jurisprudência oscilante).
- `fundamento` = base objetiva literal: dispositivo, conceito técnico ou item do edital.
- Não repetir questões que já existem no banco (enunciados diferentes).
- Português do Brasil; enunciado sem "pegadinha" de grafia.

## Dificuldade

1 = direto (memorização) · 2 = aplicação (padrão da banca) · 3 = caso com duas etapas de raciocínio.

## Conferência antes de entregar

1. O JSON é válido e é uma lista?
2. Todos têm 5 alternativas, `correta` entre 0 e 4, `explicacao` preenchida?
3. A resposta marcada é **realmente** a correta? (confira cada uma)
4. Nenhum artigo/súmula citado sem certeza?
5. `materia` está na lista permitida?
