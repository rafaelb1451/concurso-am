# -*- coding: utf-8 -*-
"""Gera e confere o lote-21-contabilidade-4.json (Noções de Contabilidade)."""
import json, os, unicodedata

SAIDA = os.path.join(
    r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso',
    'backend', 'lotes', 'lote-21-contabilidade-4.json')

DATA = []


def q(assunto, fund, dif, enun, alts, correta, expl):
    DATA.append({
        "materia": "Noções de Contabilidade",
        "assunto": assunto,
        "origem": "AUTORAL",
        "banca": "FGV",
        "ano": None,
        "orgao": None,
        "cargo": None,
        "fundamento": fund,
        "dificuldade": dif,
        "enunciado": enun,
        "alternativas": alts,
        "correta": correta,
        "explicacao": expl,
        "concursos": ["PC-AM"],
        "precedente": None,
        "verificadoEm": "2026-11-24",
    })


def fmt(v):
    s = f"{v:,.2f}"
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")


# ---------------------------------------------------------------- PATRIMÔNIO
q("Patrimônio",
  "Equação fundamental: patrimônio líquido = ativo - passivo exigível",
  2,
  "Ao encerrar o exercício social, a empresa Alfa apresentava ativo total de R$ 1.200.000,00, passivo circulante de R$ 250.000,00 e passivo não circulante de R$ 400.000,00. Assinale o valor do patrimônio líquido e a situação líquida da empresa.",
  ["R$ 950.000,00 e situação líquida positiva.",
   "R$ 550.000,00 e situação líquida positiva.",
   "R$ 650.000,00 e situação líquida positiva.",
   "R$ 1.200.000,00 e situação líquida nula.",
   "R$ 150.000,00 e situação líquida positiva."],
  1,
  "PL = ativo - passivo exigível = 1.200.000 - (250.000 + 400.000) = R$ 550.000,00. Como o resultado é positivo, a situação líquida é positiva (superavitária). Os R$ 950.000,00 resultam de deduzir apenas o passivo circulante, e os R$ 650.000,00 são o total do passivo exigível, e não o PL.")

q("Patrimônio",
  "Passivo a descoberto: patrimônio líquido negativo (ativo menor que o passivo exigível)",
  2,
  "Os registros contábeis da empresa Beta mostram ativo total de R$ 480.000,00 e passivo exigível de R$ 540.000,00. Nessa situação, a empresa apresenta:",
  ["R$ 60.000,00 de patrimônio líquido positivo.",
   "R$ 1.020.000,00 de patrimônio líquido positivo.",
   "situação líquida nula, pois não há capital próprio.",
   "R$ 60.000,00 de situação líquida negativa, ou seja, passivo a descoberto.",
   "R$ 540.000,00 de situação líquida negativa."],
  3,
  "PL = ativo - passivo exigível = 480.000 - 540.000 = -R$ 60.000,00. Como o passivo exigível supera o ativo, a situação líquida é negativa: passivo a descoberto. Quem inverte a ordem da subtração chega a R$ 60.000,00, mas com sinal positivo, o que está errado; R$ 1.020.000,00 é a soma dos dois valores.")

q("Patrimônio",
  "Situação líquida nula: ativo = passivo exigível (patrimônio líquido igual a zero)",
  1,
  "Uma entidade cujo ativo total é exatamente igual ao passivo exigível apresenta:",
  ["situação líquida positiva, pois o ativo é maior que zero.",
   "situação líquida nula apenas se o passivo exigível também for zero.",
   "situação líquida nula: o patrimônio líquido é zero e todo o ativo é financiado por capital de terceiros.",
   "passivo a descoberto, pois não há capital próprio registrado.",
   "situação líquida negativa, pois o patrimônio líquido nunca pode ser zero."],
  2,
  "Pela equação A = P + PL, se A = P então PL = 0: situação líquida nula, com os credores financiando 100% dos ativos. Passivo a descoberto exige P maior que A (PL negativo), o que não ocorre; e não existe regra que proíba PL igual a zero.")

q("Patrimônio",
  "Balanço patrimonial como demonstração de origens e aplicações: origens = passivo exigível + patrimônio líquido",
  2,
  "O balanço patrimonial também pode ser lido como demonstração de origens e aplicações de recursos. Assinale a opção que apresenta APENAS origens de recursos.",
  ["Integralização de capital em dinheiro, obtenção de empréstimo e lucro apurado no exercício.",
   "Compra de imobilizado à vista, aumento de estoques e integralização de capital.",
   "Pagamento de fornecedores, aumento de duplicatas a receber e obtenção de empréstimo.",
   "Aumento do caixa, redução de empréstimos a pagar e lucro do exercício.",
   "Compra de mercadorias, venda de imobilizado e aumento de capital."],
  0,
  "Origens são os recursos captados com terceiros (passivo exigível) ou com os sócios e a operação (PL): integralização de capital, empréstimos e lucro do exercício. Aplicações são os destinos no ativo (compra de imobilizado, estoques, aumento de duplicatas a receber). Nas demais opções há aplicações (compra de imobilizado, pagamento de fornecedores, aumento de caixa) misturadas com origens.")

# ------------------------------------------------------- EQUAÇÃO FUNDAMENTAL
q("Equação fundamental",
  "Equação fundamental do patrimônio: ativo = passivo exigível + patrimônio líquido",
  2,
  "Em 31/12/2025, a empresa Gama possuía ativo total de R$ 780.000,00 e patrimônio líquido de R$ 310.000,00. O total do passivo exigível era de:",
  ["R$ 1.090.000,00.", "R$ 470.000,00.", "R$ 310.000,00.", "R$ 780.000,00.", "R$ 390.000,00."],
  1,
  "A equação fundamental é A = P + PL, logo P = 780.000 - 310.000 = R$ 470.000,00. R$ 1.090.000,00 é a soma dos dois valores (erro de sinal na conta) e R$ 310.000,00 é o próprio patrimônio líquido.")

q("Equação fundamental",
  "Fato permutativo: aumento simultâneo de ativo e passivo sem alterar o patrimônio líquido",
  1,
  "A empresa comprou, a prazo, mercadorias para revenda no valor de R$ 40.000,00, sem incidência de tributos. Sobre a equação patrimonial, é correto afirmar que:",
  ["o ativo e o passivo exigível aumentam em R$ 40.000,00, sem alteração do patrimônio líquido.",
   "o ativo aumenta e o passivo exigível diminui em R$ 40.000,00.",
   "o ativo e o patrimônio líquido aumentam em R$ 40.000,00.",
   "o ativo e o passivo exigível diminuem em R$ 40.000,00.",
   "o passivo exigível aumenta e o patrimônio líquido diminui em R$ 40.000,00."],
  0,
  "O lançamento é débito de Estoques (ativo) e crédito de Fornecedores (passivo), ambos em R$ 40.000,00. É fato permutativo: ativo e passivo crescem na mesma quantia e o PL não se altera, mantendo A = P + PL. Não há efeito no resultado do exercício.")

q("Equação fundamental",
  "Integralização de capital: aumento do ativo (caixa) e do patrimônio líquido (capital social)",
  1,
  "Na constituição da empresa, os sócios integralizam R$ 200.000,00 em dinheiro. Esse lançamento provoca:",
  ["aumento do ativo e do passivo exigível, sem alterar o patrimônio líquido.",
   "aumento do ativo e do patrimônio líquido em R$ 200.000,00.",
   "aumento do passivo exigível e do patrimônio líquido em R$ 200.000,00.",
   "redução do ativo e aumento do patrimônio líquido.",
   "nenhum lançamento contábil, pois a empresa está sendo constituída."],
  1,
  "Debita-se Caixa (ativo) e credita-se Capital Social (patrimônio líquido), em R$ 200.000,00. O ativo e o PL aumentam na mesma quantia, preservando a igualdade A = P + PL; não há passivo exigível, pois a relação é com os sócios, dentro do PL.")

q("Equação fundamental",
  "Fato permutativo entre ativo e passivo: o patrimônio líquido permanece inalterado",
  2,
  "A empresa Delta tinha ativo de R$ 620.000,00 e passivo exigível de R$ 260.000,00. Pagou, em dinheiro, uma dívida de R$ 60.000,00. Após o pagamento, o patrimônio líquido será de:",
  ["R$ 300.000,00.", "R$ 420.000,00.", "R$ 260.000,00.", "R$ 360.000,00.", "R$ 240.000,00."],
  3,
  "PL antes = 620.000 - 260.000 = R$ 360.000,00. No pagamento, o ativo cai para R$ 560.000,00 e o passivo para R$ 200.000,00: PL = 560.000 - 200.000 = R$ 360.000,00, inalterado, pois a operação é permutativa. R$ 300.000,00 desconta o pagamento duas vezes do PL e R$ 260.000,00 é o passivo exigível original.")

# ---------------------------------------------------- REGIME DE COMPETÊNCIA
q("Regime de competência",
  "Lei 6.404/76, art. 186, § 1º: receitas e despesas ganhas/incorridas no período, independentemente de realização em moeda",
  2,
  "Em 1º de outubro de 2025, a empresa pagou antecipadamente R$ 36.000,00 por 12 meses de aluguel (outubro de 2025 a setembro de 2026). Pelo regime de competência, ao final de 2025 a DRE e o balanço devem apresentar, respectivamente:",
  ["despesa de aluguel de R$ 36.000,00 e nenhuma conta de aluguéis antecipados.",
   "despesa de R$ 27.000,00 e aluguéis antecipados de R$ 9.000,00.",
   "despesa de R$ 9.000,00 e aluguéis antecipados de R$ 27.000,00.",
   "despesa de R$ 12.000,00 e aluguéis antecipados de R$ 24.000,00.",
   "nenhuma despesa e aluguéis antecipados de R$ 36.000,00."],
  2,
  "R$ 36.000,00 ÷ 12 = R$ 3.000,00 por mês. Outubro, novembro e dezembro de 2025 são 3 meses: despesa de R$ 9.000,00. Os 9 meses restantes (R$ 27.000,00) permanecem em Aluguéis Antecipados (ativo). Apropriar R$ 27.000,00 inverte a contagem dos meses, e lançar tudo como despesa é aplicar o regime de caixa.")

q("Regime de competência",
  "Lei 6.404/76, art. 186, § 1º: receita reconhecida quando ganha, e não quando recebida",
  2,
  "Em 1º de novembro de 2025, a empresa prestadora recebeu R$ 24.000,00 adiantados por serviços a serem prestados em 12 meses (novembro de 2025 a outubro de 2026). Pelo regime de competência, em 31/12/2025 a DRE e o balanço devem apresentar, respectivamente:",
  ["receita de R$ 24.000,00 e nenhuma obrigação.",
   "receita de R$ 2.000,00 e receita diferida de R$ 22.000,00.",
   "receita de R$ 20.000,00 e receita diferida de R$ 4.000,00.",
   "receita de R$ 4.000,00 e receita diferida de R$ 20.000,00.",
   "nenhuma receita e adiantamentos de R$ 24.000,00."],
  3,
  "R$ 24.000,00 ÷ 12 = R$ 2.000,00 por mês. Novembro e dezembro de 2025 são 2 meses: receita reconhecida de R$ 4.000,00. Os 10 meses restantes (R$ 20.000,00) ficam como Receita Diferida no passivo. As opções com R$ 2.000,00/R$ 22.000,00 e R$ 20.000,00/R$ 4.000,00 erram a contagem de meses.")

q("Regime de competência",
  "Regime de competência: despesa apropriada ao período de consumo do benefício, independentemente do pagamento",
  2,
  "O contador registrou todo o prêmio de um seguro anual como despesa no mês em que a apólice foi paga. Esse procedimento contraria o regime de competência porque:",
  ["o pagamento em dinheiro nunca pode ser reconhecido como despesa.",
   "as despesas devem ser reconhecidas pelo pagamento e as receitas pelo recebimento.",
   "a despesa deve ser apropriada aos períodos em que a cobertura do seguro é consumida, ainda que o desembolso tenha ocorrido antes.",
   "o prêmio de seguro deve ser sempre classificado no ativo não circulante.",
   "a despesa só pode ser apropriada no encerramento do exercício social."],
  2,
  "Pelo regime de competência, o prêmio pago antecipadamente é ativado (seguros a apropriar) e vira despesa mês a mês, conforme a cobertura é consumida. Lançar tudo no mês do pagamento é regime de caixa e distorce o resultado dos dois períodos. A opção que reconhece despesa pelo pagamento e receita pelo recebimento descreve exatamente o regime de caixa.")

q("Regime de competência",
  "Lei 6.404/76, art. 186, § 1º: despesa do período do fato gerador, ainda que paga no período seguinte",
  1,
  "A conta de energia elétrica de dezembro de 2025, no valor de R$ 8.000,00, foi paga em 15 de janeiro de 2026. Pelo regime de competência, em 31/12/2025 a empresa deve:",
  ["reconhecer despesa de R$ 8.000,00 e contas a pagar de R$ 8.000,00.",
   "reconhecer despesa de R$ 8.000,00, com redução do caixa ainda em 2025.",
   "reconhecer a despesa apenas em 2026, quando ocorreu o pagamento.",
   "registrar despesa antecipada de R$ 8.000,00 no ativo.",
   "não registrar nada em 2025, pois a obrigação só surge com o pagamento."],
  0,
  "A despesa pertence a dezembro de 2025 (fato gerador), independentemente do pagamento em janeiro: débito de Despesa de Energia e crédito de Contas a Pagar, ambos em R$ 8.000,00. Em 2026, o pagamento apenas liquida a obrigação (débito de Contas a Pagar e crédito de Caixa), sem nova despesa.")

# ------------------------------------------------------------- ESCRITURAÇÃO
q("Escrituração",
  "Livro Diário: formalidades intrínsecas — ordem cronológica, partidas dobradas, histórico e ausência de rasuras",
  1,
  "O livro Diário é o principal livro da escrituração contábil. Entre as formalidades que devem ser observadas no seu preenchimento, está:",
  ["o registro dos lançamentos em ordem cronológica, com data, histórico, conta debitada e conta creditada, sem rasuras.",
   "o registro apenas das operações que movimentam o caixa.",
   "a apuração, ao final de cada mês, do saldo individual de cada conta.",
   "a dispensa de qualquer formalidade quando a escrituração é feita por sistema eletrônico.",
   "a centralização de todas as operações em uma única conta de resultados."],
  0,
  "O Diário registra todos os fatos em ordem cronológica, com data, histórico e as contas debitadas e creditadas por valores iguais (partidas dobradas), sem rasuras. Apurar o saldo individual de cada conta é função do Razão; a escrituração não se limita às operações de caixa; e o sistema eletrônico não dispensa as formalidades.")

q("Escrituração",
  "Diário (ordem cronológica) x Razão (por conta) — livros da escrituração contábil",
  2,
  "Assinale a opção correta sobre os livros Diário e Razão.",
  ["O livro Razão é de escrituração obrigatória e o Diário é facultativo.",
   "Ambos são obrigatórios apenas para as sociedades anônimas de capital aberto.",
   "O Razão substitui o Diário quando a escrituração é feita por sistema eletrônico.",
   "O Diário é organizado por conta e o Razão em ordem cronológica.",
   "O Diário registra as operações em ordem cronológica; o Razão as organiza por conta, permitindo apurar o saldo de cada uma."],
  4,
  "O Diário é cronológico e o Razão é sistemático: agrupa os lançamentos por conta e permite apurar o saldo de cada uma. A alternativa que inverte as funções está errada; o Razão não dispensa o Diário; e a obrigatoriedade não se restringe às companhias abertas.")

q("Escrituração",
  "Balancete de verificação: soma dos saldos devedores igual à soma dos saldos credores",
  2,
  "Em 31/12/2025, o balancete de verificação da empresa apresentava: Caixa R$ 25.000,00 (devedor); Duplicatas a Receber R$ 45.000,00 (devedor); Estoques R$ ? (devedor); Veículos R$ 170.000,00 (devedor); Fornecedores R$ 70.000,00 (credor); Empréstimos a Pagar R$ 80.000,00 (credor); Capital Social R$ 120.000,00 (credor); Reservas de Lucros R$ 30.000,00 (credor). Sabendo que o balancete fecha, o saldo da conta Estoques é:",
  ["R$ 60.000,00.", "R$ 45.000,00.", "R$ 120.000,00.", "R$ 30.000,00.", "R$ 90.000,00."],
  0,
  "Total de créditos = 70.000 + 80.000 + 120.000 + 30.000 = R$ 300.000,00. Como débitos = créditos e os débitos conhecidos somam 25.000 + 45.000 + 170.000 = R$ 240.000,00, tem-se Estoques = 300.000 - 240.000 = R$ 60.000,00. R$ 45.000,00 é o saldo de Duplicatas a Receber e R$ 120.000,00 e R$ 30.000,00 são saldos credores já informados, que não fecham o balancete.")

q("Escrituração",
  "Ato contábil (não altera o patrimônio, sem lançamento) x fato contábil (altera o patrimônio e exige lançamento)",
  2,
  "Assinale a opção que apresenta apenas atos contábeis, isto é, eventos que não alteram o patrimônio e, por isso, não ensejam lançamento.",
  ["Compra de mercadorias a prazo, admissão de empregado e assinatura de contrato de aluguel.",
   "Admissão de empregado, assinatura de contrato de prestação de serviços futura e emissão de pedido de compra.",
   "Pagamento de salários, venda de mercadorias e admissão de empregado.",
   "Integralização de capital, assinatura de contrato de seguro e compra de imobilizado à vista.",
   "Recebimento de duplicatas, contratação de empréstimo e emissão de pedido de compra."],
  1,
  "Ato contábil é o evento administrativo que não modifica o patrimônio (admissão de empregado, assinatura de contrato futuro, emissão de pedido de compra): não há débito nem crédito. Os fatos contábeis alteram o patrimônio e exigem lançamento — compra a prazo, pagamento de salários, venda, integralização de capital, recebimento de duplicatas e contratação de empréstimo.")

# --------------------------------------------------------- BALANÇO PATRIMONIAL
q("Balanço patrimonial",
  "Ativo circulante: disponibilidades e direitos realizáveis no exercício social subsequente",
  2,
  "Em 31/12/2025, a empresa apresentava: Caixa R$ 20.000,00; Estoques R$ 55.000,00; Duplicatas a Receber com vencimento em 90 dias R$ 35.000,00; Aplicação financeira com resgate imediato R$ 15.000,00; Duplicatas a Receber com vencimento em 18 meses R$ 40.000,00; Máquinas R$ 180.000,00. O ativo circulante totaliza:",
  ["R$ 165.000,00.", "R$ 90.000,00.", "R$ 125.000,00.", "R$ 345.000,00.", "R$ 75.000,00."],
  2,
  "Ativo circulante = 20.000 (caixa) + 55.000 (estoques) + 35.000 (duplicatas de 90 dias) + 15.000 (aplicação de resgate imediato) = R$ 125.000,00. As duplicatas de 18 meses compõem o realizável a longo prazo e as máquinas, o imobilizado; a soma de todas as contas daria R$ 345.000,00 (ativo total), e R$ 165.000,00 inclui indevidamente o direito de longo prazo.")

q("Balanço patrimonial",
  "Classificação no balanço: prazo de realização (ativo) e de vencimento (passivo); PL não é passivo exigível",
  1,
  "A empresa possui as contas e operações a seguir. Assinale a classificação correta no balanço patrimonial.",
  ["Empréstimo a pagar com vencimento em 24 meses: passivo não circulante.",
   "Duplicatas a receber com vencimento em 60 dias: passivo circulante.",
   "Adiantamento a fornecedores: passivo circulante.",
   "Máquinas e equipamentos: ativo circulante.",
   "Capital social: passivo circulante."],
  0,
  "Obrigações vencíveis após o término do exercício social seguinte vão para o passivo não circulante (empréstimo de 24 meses). Duplicatas a receber e adiantamentos a fornecedores são direitos (ativo), máquinas integram o imobilizado (ativo não circulante) e o capital social compõe o patrimônio líquido, não o passivo exigível.")

q("Balanço patrimonial",
  "Lei 6.404/76, art. 178, § 1º, II — composição do ativo não circulante",
  1,
  "De acordo com a Lei 6.404/76, o ativo não circulante é composto por:",
  ["realizável a longo prazo, investimentos, imobilizado e diferido.",
   "disponibilidades, investimentos, imobilizado e intangível.",
   "realizável a longo prazo, imobilizado, intangível e reservas de lucros.",
   "investimentos, imobilizado, intangível e capital social.",
   "realizável a longo prazo, investimentos, imobilizado e intangível."],
  4,
  "Após a Lei 11.638/2007, o ativo não circulante reúne realizável a longo prazo, investimentos, imobilizado e intangível. O grupo diferido foi extinto; disponibilidades são ativo circulante; reservas de lucros e capital social pertencem ao patrimônio líquido.")

q("Balanço patrimonial",
  "Lei 6.404/76, art. 182 — componentes do patrimônio líquido e contas redutoras (prejuízos e ações em tesouraria)",
  2,
  "Em 31/12/2025, o patrimônio líquido da companhia apresentava: capital social R$ 250.000,00; reservas de capital R$ 20.000,00; reservas de lucros R$ 60.000,00; prejuízos acumulados R$ 30.000,00; ações em tesouraria R$ 10.000,00. O total do patrimônio líquido é:",
  ["R$ 330.000,00.", "R$ 290.000,00.", "R$ 300.000,00.", "R$ 340.000,00.", "R$ 310.000,00."],
  1,
  "PL = 250.000 + 20.000 + 60.000 - 30.000 (prejuízos acumulados) - 10.000 (ações em tesouraria) = R$ 290.000,00. Prejuízos e ações em tesouraria são redutores do PL; R$ 330.000,00 ignora as duas deduções e R$ 300.000,00 deduz apenas os prejuízos.")

# --------------------------------------------------------------------- DRE
q("DRE",
  "Lei 6.404/76, art. 186, I e II — receita líquida (deduções) e lucro bruto (CMV)",
  2,
  "A DRE de 2025 da empresa apresentou: receita bruta de vendas R$ 500.000,00; devoluções de vendas R$ 30.000,00; impostos sobre vendas R$ 70.000,00; custo das mercadorias vendidas R$ 280.000,00. A receita líquida e o lucro bruto são, respectivamente:",
  ["R$ 400.000,00 e R$ 120.000,00.",
   "R$ 470.000,00 e R$ 190.000,00.",
   "R$ 430.000,00 e R$ 150.000,00.",
   "R$ 500.000,00 e R$ 220.000,00.",
   "R$ 400.000,00 e R$ 100.000,00."],
  0,
  "Receita líquida = 500.000 - 30.000 - 70.000 = R$ 400.000,00; lucro bruto = 400.000 - 280.000 (CMV) = R$ 120.000,00. Os R$ 470.000,00 e R$ 190.000,00 deduzem apenas as devoluções, e R$ 430.000,00 e R$ 150.000,00 deduzem apenas os impostos sobre vendas.")

q("DRE",
  "Lei 6.404/76, art. 186, III a V — despesas, receitas e resultado antes dos tributos sobre o lucro",
  2,
  "Com base nos saldos da DRE: lucro bruto R$ 120.000,00; despesas com vendas R$ 25.000,00; despesas administrativas R$ 30.000,00; despesas financeiras R$ 20.000,00; receitas financeiras R$ 10.000,00; outras receitas R$ 5.000,00. O resultado antes do imposto de renda e da contribuição social é:",
  ["R$ 80.000,00.", "R$ 55.000,00.", "R$ 45.000,00.", "R$ 60.000,00.", "R$ 70.000,00."],
  3,
  "Resultado = 120.000 - 25.000 - 30.000 - 20.000 + 10.000 + 5.000 = R$ 60.000,00. Os R$ 45.000,00 esquecem as receitas financeiras e outras receitas; os R$ 80.000,00 consideram as receitas e ignoram as despesas financeiras (120.000 - 55.000 + 15.000).")

q("DRE",
  "CMV = estoque inicial + compras líquidas - estoque final",
  2,
  "A empresa informou: estoque inicial R$ 80.000,00; compras líquidas R$ 420.000,00; estoque final R$ 110.000,00. O custo das mercadorias vendidas (CMV) é:",
  ["R$ 500.000,00.", "R$ 310.000,00.", "R$ 610.000,00.", "R$ 420.000,00.", "R$ 390.000,00."],
  4,
  "CMV = 80.000 + 420.000 - 110.000 = R$ 390.000,00. R$ 500.000,00 soma estoque inicial e compras sem deduzir o estoque final; R$ 310.000,00 deduz o estoque final das compras esquecendo o estoque inicial; R$ 420.000,00 é o valor das compras líquidas.")

q("DRE",
  "Ajustes de exercícios anteriores: correção de erro de exercício anterior ajustada no PL, sem transitar pelo resultado do período",
  3,
  "Ao elaborar as demonstrações de 2025, a empresa identificou que deixou de registrar, em 2024, uma despesa relevante de R$ 40.000,00. Segundo a legislação societária e as normas contábeis aplicáveis, esse valor deve ser:",
  ["lançado como despesa no resultado de 2025.",
   "lançado como receita no resultado de 2025, para compensar o erro.",
   "ajustado diretamente no patrimônio líquido (ajustes de exercícios anteriores), sem transitar pelo resultado de 2025, com divulgação em notas explicativas.",
   "mantido sem registro, pois o exercício de 2024 já foi encerrado.",
   "reclassificado como despesa antecipada no ativo de 2025."],
  2,
  "Erro de exercício anterior é corrigido por ajuste retrospectivo: retifica-se o saldo do patrimônio líquido na conta Ajustes de Exercícios Anteriores, sem carga no resultado de 2025, com evidenciação em notas explicativas. Lançar a despesa em 2025 distorce os dois exercícios, e lançar receita para compensar viola a não compensação de contas.")

# ------------------------------------------------------- LANÇAMENTOS CONTÁBEIS
q("Lançamentos contábeis",
  "Compra para revenda com ICMS recuperável: o imposto não integra o custo dos estoques",
  3,
  "A empresa Comercial adquiriu, à vista, mercadorias para revenda por R$ 200.000,00, com ICMS de 18% embutido no preço e recuperável. O lançamento no livro Diário é:",
  ["D Estoques R$ 200.000,00; C Caixa R$ 200.000,00.",
   "D Estoques R$ 164.000,00; D ICMS a Recuperar R$ 36.000,00; C Caixa R$ 200.000,00.",
   "D Estoques R$ 200.000,00; D ICMS a Recuperar R$ 36.000,00; C Caixa R$ 236.000,00.",
   "D Compras R$ 200.000,00; C Fornecedores R$ 200.000,00, sem destaque do ICMS.",
   "D Estoques R$ 36.000,00; D ICMS a Recuperar R$ 164.000,00; C Caixa R$ 200.000,00."],
  1,
  "ICMS = 18% de 200.000 = R$ 36.000,00. Sendo recuperável, o imposto não compõe o custo: Estoques = 200.000 - 36.000 = R$ 164.000,00 (débito), ICMS a Recuperar R$ 36.000,00 (débito) e Caixa R$ 200.000,00 (crédito). Lançar R$ 236.000,00 a crédito desequilibra o lançamento, e inverter estoque e ICMS troca as contas.")

q("Lançamentos contábeis",
  "ICMS sobre vendas: dedução da receita bruta, com crédito em ICMS a Recolher (obrigação)",
  2,
  "A empresa vendeu, a prazo, mercadorias por R$ 150.000,00, com ICMS de 18%. Além do lançamento que debita Duplicatas a Receber e credita Receita de Vendas em R$ 150.000,00, o ICMS deve ser registrado assim:",
  ["D ICMS sobre Vendas R$ 27.000,00; C ICMS a Recolher R$ 27.000,00.",
   "D ICMS a Recuperar R$ 27.000,00; C ICMS a Recolher R$ 27.000,00.",
   "D Duplicatas a Receber R$ 27.000,00; C Receita de Vendas R$ 27.000,00.",
   "D ICMS a Recolher R$ 27.000,00; C ICMS sobre Vendas R$ 27.000,00.",
   "D Despesas com ICMS R$ 27.000,00; C Caixa R$ 27.000,00."],
  0,
  "ICMS = 18% de 150.000 = R$ 27.000,00. Na venda, debita-se ICMS sobre Vendas (dedução da receita bruta) e credita-se ICMS a Recolher (obrigação): R$ 27.000,00. Inverter débito e crédito (D ICMS a Recolher) erra a natureza da conta, e debitar Caixa não se aplica, pois a venda foi a prazo.")

q("Lançamentos contábeis",
  "Partidas dobradas: total de débitos igual ao total de créditos; juros de mora são despesa (juros passivos)",
  2,
  "A empresa pagou uma duplicata de R$ 12.000,00 com juros de mora de R$ 500,00, totalizando R$ 12.500,00. O lançamento correto é:",
  ["D Duplicatas a Pagar R$ 12.500,00; C Caixa R$ 12.500,00.",
   "D Duplicatas a Pagar R$ 12.000,00; C Caixa R$ 12.000,00.",
   "D Juros Passivos R$ 500,00; C Caixa R$ 500,00.",
   "D Duplicatas a Pagar R$ 12.000,00; D Juros Passivos R$ 500,00; C Caixa R$ 12.500,00.",
   "D Duplicatas a Pagar R$ 12.000,00; C Caixa R$ 11.500,00; C Juros Ativos R$ 500,00."],
  3,
  "Débitos de R$ 12.000,00 (baixa da obrigação) + R$ 500,00 (juros passivos, despesa) = R$ 12.500,00, igual ao crédito de Caixa: as partidas dobradas fecham. Baixar R$ 12.500,00 em Duplicatas a Pagar deixa resíduo na obrigação, e a opção que credita Juros Ativos inverte a natureza da despesa.")

# ------------------------------------------------------------ CONTAS REDUTORAS
q("Contas redutoras",
  "Contas redutoras: depreciação acumulada (ativo), capital social a integralizar e ações em tesouraria (PL)",
  2,
  "Assinale a opção que indica uma conta redutora (retificadora) do ativo.",
  ["Capital social a integralizar.",
   "Ações em tesouraria.",
   "Depreciação acumulada de veículos.",
   "Reservas de lucros.",
   "Provisão para riscos trabalhistas."],
  2,
  "A depreciação acumulada é conta credora que reduz o imobilizado no ativo. Capital social a integralizar e ações em tesouraria são redutoras do patrimônio líquido; reservas de lucros integram o PL; a provisão para riscos trabalhistas é obrigação do passivo, não conta retificadora.")

q("Contas redutoras",
  "PCLD: conta redutora do ativo, de natureza credora, apresentada junto às duplicatas a receber",
  2,
  "A empresa possuía duplicatas a receber de R$ 400.000,00 e constituiu provisão para créditos de liquidação duvidosa (PCLD) de 5% sobre esse saldo. O ativo líquido e a natureza da conta PCLD são, respectivamente:",
  ["R$ 400.000,00 e conta do passivo exigível.",
   "R$ 380.000,00 e conta redutora do ativo, de natureza credora.",
   "R$ 420.000,00 e conta do ativo circulante.",
   "R$ 380.000,00 e conta do patrimônio líquido.",
   "R$ 400.000,00 e conta redutora do ativo."],
  1,
  "PCLD = 5% de 400.000 = R$ 20.000,00, lançada na conta redutora do ativo (credora), junto às duplicatas a receber; o ativo líquido é 400.000 - 20.000 = R$ 380.000,00. Somar a provisão (R$ 420.000,00) ou classificá-la no PL/passivo desnatura a conta retificadora.")

q("Contas redutoras",
  "Contas redutoras: natureza credora e apresentação do ativo pelo valor líquido (custo - depreciação acumulada)",
  1,
  "Sobre as contas redutoras, assinale a afirmativa correta.",
  ["A depreciação acumulada é lançada a débito da conta do imobilizado.",
   "A PCLD aumenta o saldo de duplicatas a receber no balanço.",
   "As contas redutoras possuem natureza devedora.",
   "A depreciação acumulada é classificada no passivo exigível.",
   "A depreciação acumulada, de natureza credora, reduz o valor do imobilizado no ativo."],
  4,
  "A depreciação acumulada é conta credora que reduz o imobilizado, apresentado pelo valor contábil (custo menos depreciação); a contrapartida é despesa com depreciação, não débito no próprio bem. A PCLD reduz duplicatas a receber, e nenhuma conta redutora do ativo se classifica no passivo exigível.")

# ---------------------------------------------------------------- DEPRECIAÇÃO
q("Depreciação",
  "CPC 27 — depreciação linear: (custo - valor residual) ÷ vida útil; valor contábil = custo - depreciação acumulada",
  3,
  "Uma máquina foi adquirida por R$ 240.000,00, com valor residual estimado de R$ 24.000,00 e vida útil de 6 anos. Pelo método linear (cotas constantes), o valor contábil ao final do segundo ano será de:",
  ["R$ 204.000,00.", "R$ 160.000,00.", "R$ 192.000,00.", "R$ 144.000,00.", "R$ 168.000,00."],
  4,
  "Depreciação anual = (240.000 - 24.000) ÷ 6 = R$ 36.000,00; em 2 anos, depreciação acumulada = R$ 72.000,00. Valor contábil = 240.000 - 72.000 = R$ 168.000,00. R$ 160.000,00 ignora o valor residual (240.000 ÷ 6 = 40.000 × 2) e R$ 204.000,00 equivale a um único ano.")

q("Depreciação",
  "Depreciação acelerada por turnos: coeficientes 1,0 (um turno), 1,5 (dois turnos) e 2,0 (três turnos)",
  2,
  "Um bem tem taxa de depreciação normal de 10% ao ano. Sendo utilizado em três turnos de 8 horas, a taxa de depreciação acelerada, conforme as normas fiscais, é de:",
  ["10% ao ano.", "20% ao ano.", "15% ao ano.", "30% ao ano.", "12,5% ao ano."],
  1,
  "A depreciação acelerada aplica coeficiente conforme os turnos: 1 turno = 1,0; 2 turnos = 1,5; 3 turnos = 2,0. Logo 10% × 2,0 = 20% ao ano. Os 15% corresponderiam a dois turnos, e os 30% a um coeficiente 3,0, que não existe na norma.")

q("Depreciação",
  "Lei 6.404/76, art. 183 — amortização (direitos de vida útil definida) e exaustão (recursos naturais, proporcional à extração)",
  3,
  "A empresa possui uma marca adquirida por R$ 60.000,00, com vida útil definida de 5 anos, e uma mina adquirida por R$ 800.000,00, com capacidade estimada de 200.000 toneladas. No ano, foram extraídas 25.000 toneladas. As despesas de amortização e de exaustão do ano são, respectivamente:",
  ["R$ 12.000,00 e R$ 32.000,00.",
   "R$ 60.000,00 e R$ 800.000,00.",
   "R$ 12.000,00 e R$ 100.000,00.",
   "R$ 12.000,00 e R$ 25.000,00.",
   "R$ 15.000,00 e R$ 100.000,00."],
  2,
  "Amortização = 60.000 ÷ 5 = R$ 12.000,00 por ano. Exaustão = 800.000 × (25.000 ÷ 200.000) = 800.000 × 12,5% = R$ 100.000,00. R$ 32.000,00 e R$ 25.000,00 confundem a proporção de extração com valores fixos, e R$ 15.000,00 usaria vida útil de 4 anos.")

# ------------------------------------------------------------------ PROVISÕES
q("Provisões",
  "Lei 6.404/76, art. 186, § 1º, 'b' — riscos conhecidos ou calculáveis são computados no resultado",
  2,
  "A empresa é ré de ação trabalhista cuja perda é provável e pode ser estimada com confiabilidade em R$ 50.000,00. Segundo as normas contábeis, a empresa deve:",
  ["divulgar em nota explicativa, sem lançamento contábil.",
   "registrar um ativo contingente de R$ 50.000,00.",
   "apenas divulgar, pois o processo ainda não terminou.",
   "reconhecer provisão de R$ 50.000,00 no passivo, com despesa correspondente no resultado, e divulgar em nota explicativa.",
   "registrar a provisão somente quando houver sentença definitiva."],
  3,
  "Perda provável e mensurável gera provisão: débito de despesa (resultado) e crédito de provisão no passivo, em R$ 50.000,00, com divulgação em nota explicativa. Apenas divulgar sem provisão é o tratamento da contingência possível; e a provisão independe de sentença definitiva.")

q("Provisões",
  "Passivo contingente: reconhecimento como provisão só quando a saída de recursos é provável e o valor é mensurável",
  2,
  "Sobre passivos contingentes, é correto afirmar que:",
  ["são sempre reconhecidos no passivo.",
   "devem ser reconhecidos quando a possibilidade de perda for remota.",
   "não são divulgados em nenhuma hipótese.",
   "são reconhecidos apenas se a empresa tiver prejuízo no exercício.",
   "quando a saída de recursos é possível (não provável), a empresa apenas divulga em nota explicativa, sem reconhecer provisão."],
  4,
  "O passivo contingente só vira provisão quando a saída de recursos é provável e o valor pode ser estimado com confiabilidade. Se a chance é possível, divulga-se em nota explicativa; se é remota, normalmente não se reconhece nem se divulga. Por isso 'sempre reconhecidos' e 'reconhecidos quando remota' estão errados.")

q("Provisões",
  "Provisões, passivos contingentes e ativos contingentes: provável (provisão), possível (divulgação) e remota (sem registro)",
  3,
  "A entidade tem um processo com chance de perda avaliada como possível e outro com perda remota; possui, ainda, um ativo contingente (direito) provável. O tratamento contábil é:",
  ["reconhecer provisão para os dois processos e reconhecer o ativo contingente.",
   "não reconhecer nem divulgar nenhum dos três itens.",
   "não reconhecer provisão em nenhum dos dois processos (divulgando em nota o de perda possível) e não reconhecer o ativo contingente, divulgando-o por ser provável.",
   "reconhecer provisão para o processo possível e reconhecer o ativo contingente.",
   "reconhecer provisão para o processo remoto e não divulgar nada."],
  2,
  "Perda possível não gera provisão, apenas divulgação em nota; perda remota não gera provisão nem divulgação. Ativo contingente nunca é reconhecido: quando provável, é apenas divulgado. Reconhecer provisão para processo possível ou remoto, ou reconhecer ativo contingente, viola as regras de reconhecimento.")

# -------------------------------------------------------------- FLUXO DE CAIXA
q("Fluxo de caixa",
  "DFC método indireto: conciliação do lucro líquido com o caixa operacional (depreciação e variações de capital de giro)",
  3,
  "Pelo método indireto, a empresa apurou lucro líquido de R$ 100.000,00. No exercício, a depreciação foi de R$ 20.000,00, as duplicatas a receber aumentaram R$ 15.000,00 e os fornecedores aumentaram R$ 10.000,00. O caixa líquido gerado pelas atividades operacionais é:",
  ["R$ 100.000,00.", "R$ 125.000,00.", "R$ 105.000,00.", "R$ 85.000,00.", "R$ 115.000,00."],
  4,
  "Caixa operacional = 100.000 + 20.000 (depreciação, despesa sem desembolso) - 15.000 (aumento de contas a receber, que retém caixa) + 10.000 (aumento de fornecedores, que financia) = R$ 115.000,00. Os R$ 105.000,00 somam as variações e os R$ 85.000,00 invertem os sinais dos ajustes de capital de giro.")

q("Fluxo de caixa",
  "DFC: segregação em atividades operacionais, de investimento e de financiamento (Lei 6.404/76, art. 176)",
  2,
  "Na demonstração dos fluxos de caixa, a compra de um imobilizado à vista e a obtenção de um empréstimo bancário de longo prazo são classificadas, respectivamente, como atividades:",
  ["operacionais e operacionais.",
   "de investimento e operacionais.",
   "operacionais e de financiamento.",
   "de investimento e de financiamento.",
   "de financiamento e de investimento."],
  3,
  "A compra de imobilizado é aplicação de caixa em ativo de longo prazo: atividade de investimento. A obtenção de empréstimo altera a estrutura de capital (passivo não circulante): atividade de financiamento. Ambas alteram o caixa, mas não são operacionais; a alternativa que inverte a ordem também está errada.")

# ------------------------------------------------------------ ESTRUTURA CONCEITUAL
q("Estrutura conceitual",
  "CPC 00 — características qualitativas fundamentais: relevância e representação fiel (as demais são de melhoria)",
  1,
  "Segundo a Estrutura Conceitual (CPC 00), as características qualitativas fundamentais da informação contábil útil são:",
  ["comparabilidade e tempestividade.",
   "verificabilidade e compreensibilidade.",
   "prudência e continuidade.",
   "competência e entidade.",
   "relevância e representação fiel."],
  4,
  "São fundamentais a relevância (capacidade de influenciar decisões) e a representação fiel (completa, neutra e livre de erro). Comparabilidade, verificabilidade, tempestividade e compreensibilidade são características de melhoria; prudência e continuidade são conceitos distintos (prudência apoia a neutralidade; continuidade é pressuposto).")

q("Estrutura conceitual",
  "CPC 00 — prudência: cautela em julgamentos sob incerteza, sem viés deliberado",
  3,
  "Sobre a prudência (conservadorismo) na Estrutura Conceitual, é correto afirmar que:",
  ["autoriza a constituição de provisões ocultas para reduzir o lucro.",
   "determina que os ativos sejam sempre avaliados pelo menor valor, mesmo sem base objetiva.",
   "exige que as receitas sejam reconhecidas antes das despesas.",
   "é o exercício de cautela ao fazer julgamentos em condições de incerteza, de modo a não superavaliar ativos e receitas nem subavaliar passivos e despesas, sem permitir viés intencional.",
   "é sinônimo do regime de caixa."],
  3,
  "A prudência é cautela sob incerteza: não superavaliar ativos e receitas nem subavaliar passivos e despesas, mantendo a neutralidade. Não autoriza viés deliberado, provisões ocultas nem avaliação pelo menor valor sem base objetiva; e não se confunde com regime de caixa.")


# ================================ CONFERÊNCIA POR SCRIPT ================================
def ck(nome, calculado, esperado):
    assert calculado == esperado, f"{nome}: calculado {calculado} != esperado {esperado}"


def checa_alt(pergunta_1based, valores, correta_esperada):
    item = DATA[pergunta_1based - 1]
    assert item["correta"] == correta_esperada, (
        f"Q{pergunta_1based}: indice {item['correta']} != {correta_esperada}")
    texto = item["alternativas"][correta_esperada]
    for v in valores:
        assert fmt(v) in texto, f"Q{pergunta_1based}: {fmt(v)} nao esta em '{texto}'"


# --- Patrimônio
ck("Q1 PL", 1200000 - 250000 - 400000, 550000)
ck("Q1 soma passivo", 250000 + 400000, 650000)
ck("Q1 distrator", 1200000 - 250000, 950000)
checa_alt(1, [550000], 1)
ck("Q2 PL", 480000 - 540000, -60000)
ck("Q2 distrator soma", 480000 + 540000, 1020000)
checa_alt(2, [60000], 3)
checa_alt(3, [], 2)
checa_alt(4, [], 0)

# --- Equação fundamental
ck("Q5 passivo", 780000 - 310000, 470000)
ck("Q5 distrator", 780000 + 310000, 1090000)
checa_alt(5, [470000], 1)
checa_alt(6, [40000], 0)
checa_alt(7, [200000], 1)
ck("Q8 PL antes", 620000 - 260000, 360000)
ck("Q8 PL depois", (620000 - 60000) - (260000 - 60000), 360000)
ck("Q8 distrator", 360000 - 60000, 300000)
checa_alt(8, [360000], 3)

# --- Regime de competência
ck("Q9 despesa", 36000 // 12 * 3, 9000)
ck("Q9 antecipado", 36000 - 9000, 27000)
checa_alt(9, [9000, 27000], 2)
ck("Q10 receita", 24000 // 12 * 2, 4000)
ck("Q10 diferida", 24000 - 4000, 20000)
checa_alt(10, [4000, 20000], 3)
checa_alt(11, [], 2)
checa_alt(12, [8000], 0)

# --- Escrituração
checa_alt(13, [], 0)
checa_alt(14, [], 4)
ck("Q15 creditos", 70000 + 80000 + 120000 + 30000, 300000)
ck("Q15 debitos conhecidos", 25000 + 45000 + 170000, 240000)
ck("Q15 estoques", 300000 - 240000, 60000)
checa_alt(15, [60000], 0)
checa_alt(16, [], 1)

# --- Balanço patrimonial
ck("Q17 AC", 20000 + 55000 + 35000 + 15000, 125000)
ck("Q17 ativo total", 20000 + 55000 + 35000 + 15000 + 40000 + 180000, 345000)
checa_alt(17, [125000], 2)
checa_alt(18, [], 0)
checa_alt(19, [], 4)
ck("Q20 PL", 250000 + 20000 + 60000 - 30000 - 10000, 290000)
checa_alt(20, [290000], 1)

# --- DRE
ck("Q21 receita liquida", 500000 - 30000 - 70000, 400000)
ck("Q21 lucro bruto", 400000 - 280000, 120000)
checa_alt(21, [400000, 120000], 0)
ck("Q22 resultado", 120000 - 25000 - 30000 - 20000 + 10000 + 5000, 60000)
checa_alt(22, [60000], 3)
ck("Q23 CMV", 80000 + 420000 - 110000, 390000)
checa_alt(23, [390000], 4)
checa_alt(24, [], 2)

# --- Lançamentos contábeis
ck("Q25 ICMS", int(200000 * 0.18), 36000)
ck("Q25 estoque", 200000 - 36000, 164000)
checa_alt(25, [164000, 36000, 200000], 1)
ck("Q26 ICMS", int(150000 * 0.18), 27000)
checa_alt(26, [27000], 0)
ck("Q27 total pago", 12000 + 500, 12500)
checa_alt(27, [12000, 500, 12500], 3)

# --- Contas redutoras
checa_alt(28, [], 2)
ck("Q29 PCLD", int(400000 * 0.05), 20000)
ck("Q29 ativo liquido", 400000 - 20000, 380000)
checa_alt(29, [380000], 1)
checa_alt(30, [], 4)

# --- Depreciação
ck("Q31 dep anual", (240000 - 24000) // 6, 36000)
ck("Q31 dep 2 anos", 36000 * 2, 72000)
ck("Q31 valor contabil", 240000 - 72000, 168000)
checa_alt(31, [168000], 4)
ck("Q32 taxa 3 turnos", 10 * 2, 20)
checa_alt(32, [], 1)
ck("Q33 amortizacao", 60000 // 5, 12000)
ck("Q33 exaustao", int(800000 * 25000 / 200000), 100000)
checa_alt(33, [12000, 100000], 2)

# --- Provisões
checa_alt(34, [50000], 3)
checa_alt(35, [], 4)
checa_alt(36, [], 2)

# --- Fluxo de caixa
ck("Q37 FCO", 100000 + 20000 - 15000 + 10000, 115000)
checa_alt(37, [115000], 4)
checa_alt(38, [], 3)

# --- Estrutura conceitual
checa_alt(39, [], 4)
checa_alt(40, [], 3)

# --- Estrutura do lote
assert len(DATA) == 40, f"total {len(DATA)}"
dist = {i: 0 for i in range(5)}
for item in DATA:
    assert len(item["alternativas"]) == 5, item["enunciado"][:40]
    assert item["correta"] in range(5)
    assert len(item["explicacao"].strip()) >= 40
    assert item["fundamento"].strip()
    assert item["materia"] == "Noções de Contabilidade"
    assert item["concursos"] == ["PC-AM"]
    assert item["origem"] == "AUTORAL" and item["banca"] == "FGV"
    assert item["ano"] is None and item["orgao"] is None and item["cargo"] is None
    assert item["precedente"] is None
    assert item["verificadoEm"] == "2026-11-24"
    assert item["dificuldade"] in (1, 2, 3)
    assert len(item["enunciado"].strip()) >= 30
    dist[item["correta"]] += 1
assert dist == {0: 8, 1: 8, 2: 8, 3: 8, 4: 8}, f"distribuicao {dist}"

assuntos = {}
for item in DATA:
    assuntos[item["assunto"]] = assuntos.get(item["assunto"], 0) + 1
permitidos = {"Patrimônio", "Equação fundamental", "Regime de competência", "Escrituração",
              "Balanço patrimonial", "DRE", "Lançamentos contábeis", "Contas redutoras",
              "Depreciação", "Provisões", "Fluxo de caixa", "Estrutura conceitual"}
assert set(assuntos) <= permitidos, f"assunto fora do vocabulario: {set(assuntos) - permitidos}"

# enunciados duplicados dentro do lote
vistos = set()
for item in DATA:
    h = item["enunciado"].strip().lower()
    assert h not in vistos, f"enunciado repetido: {item['enunciado'][:60]}"
    vistos.add(h)

os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
with open(SAIDA, "w", encoding="utf-8") as fh:
    json.dump(DATA, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

print("OK: 40 questoes gravadas em", SAIDA)
print("distribuicao das corretas:", dist)
print("assuntos:", dict(sorted(assuntos.items())))
print("dificuldades:", {d: sum(1 for x in DATA if x["dificuldade"] == d) for d in (1, 2, 3)})
print("cálculos conferidos com sucesso")
