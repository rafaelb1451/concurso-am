import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { instalarApiFake } from './fixtures'

/**
 * Auditoria responsiva real: 360, 390, 768 e 1440.
 *
 * Para cada tela mede `document.documentElement.scrollWidth <= window.innerWidth + 1`,
 * aponta os elementos que estouram a viewport (ignorando o que está recortado por um
 * ancestral com overflow), confere alvos de toque da navegação e salva screenshots.
 */

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
].filter((viewport) => !process.env.AUDIT_WIDTH || String(viewport.width) === process.env.AUDIT_WIDTH)

const RAIZ = path.resolve('auditoria')

interface Resultado {
  viewport: string
  tela: string
  overflow: boolean
  scrollWidth: number
  innerWidth: number
  bodyScrollWidth: number
  offenders: Array<{ tag: string; cls: string; right: number; width: number; texto: string }>
  alvosPequenos: Array<{ texto: string; width: number; height: number }>
  ariaCurrentVisivel: number
  screenshot: string
}

interface Medicao {
  overflow: boolean
  scrollWidth: number
  innerWidth: number
  bodyScrollWidth: number
  offenders: Resultado['offenders']
  alvosPequenos: Resultado['alvosPequenos']
  ariaCurrentVisivel: number
}

async function medir(page: Page): Promise<Medicao> {
  return page.evaluate(() => {
    const viewport = window.innerWidth
    const scrollWidth = document.documentElement.scrollWidth
    const bodyScrollWidth = document.body.scrollWidth

    function recortadoPorAncestral(elemento: HTMLElement): boolean {
      let pai = elemento.parentElement
      while (pai) {
        const estilo = getComputedStyle(pai)
        if (/(hidden|clip|auto|scroll)/.test(estilo.overflowX)) {
          const caixaPai = pai.getBoundingClientRect()
          const caixaFilho = elemento.getBoundingClientRect()
          if (caixaFilho.left >= caixaPai.left - 1 && caixaFilho.right <= caixaPai.right + 1) {
            return true
          }
        }
        pai = pai.parentElement
      }
      return false
    }

    const offenders: Resultado['offenders'] = []
    if (scrollWidth > viewport + 1) {
      for (const elemento of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const caixa = elemento.getBoundingClientRect()
        if (caixa.width < 1 || caixa.height < 1) continue
        if (caixa.right <= viewport + 1) continue
        if (recortadoPorAncestral(elemento)) continue
        offenders.push({
          tag: elemento.tagName.toLowerCase(),
          cls: String(elemento.className ?? '').slice(0, 120),
          right: Math.round(caixa.right),
          width: Math.round(caixa.width),
          texto: (elemento.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
        })
        if (offenders.length >= 15) break
      }
    }

    const alvosPequenos: Resultado['alvosPequenos'] = []
    for (const botao of Array.from(document.querySelectorAll<HTMLElement>('nav button'))) {
      const caixa = botao.getBoundingClientRect()
      if (caixa.width < 1 || caixa.height < 1) continue
      if (caixa.height < 43.5 || caixa.width < 43.5) {
        alvosPequenos.push({
          texto: (botao.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
          width: Math.round(caixa.width),
          height: Math.round(caixa.height),
        })
      }
    }

    const ariaCurrentVisivel = Array.from(
      document.querySelectorAll<HTMLElement>('[aria-current="page"]'),
    ).filter((elemento) => {
      const caixa = elemento.getBoundingClientRect()
      return caixa.width > 0 && caixa.height > 0
    }).length

    return {
      overflow: scrollWidth > viewport + 1,
      scrollWidth,
      innerWidth: viewport,
      bodyScrollWidth,
      offenders,
      alvosPequenos,
      ariaCurrentVisivel,
    }
  })
}

async function instalarApiPublica(page: Page) {
  const planos = [
    { id: 1, codigo: 'FREE', nome: 'Gratuito', valorCentavos: 0, ciclo: null, limiteDiarioQuestoes: 20, ilimitado: false, pago: false },
    { id: 2, codigo: 'PRO_MENSAL', nome: 'PRO Mensal', valorCentavos: 2990, ciclo: 'MENSAL', limiteDiarioQuestoes: 0, ilimitado: true, pago: true },
    { id: 3, codigo: 'PRO_ANUAL', nome: 'PRO Anual', valorCentavos: 23990, ciclo: 'ANUAL', limiteDiarioQuestoes: 0, ilimitado: true, pago: true },
  ]

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const responder = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (url.pathname === '/api/publico/materias') {
      return responder([
        { materia: 'Direito Penal', questoes: 340 },
        { materia: 'Direito Constitucional', questoes: 260 },
        { materia: 'Legislação Institucional da Polícia Militar do Amazonas', questoes: 120 },
        { materia: 'Língua Portuguesa', questoes: 180 },
        { materia: 'Raciocínio Lógico Matemático', questoes: 150 },
        { materia: 'Informática', questoes: 90 },
      ])
    }
    if (url.pathname === '/api/publico/questoes') {
      return responder(
        Array.from({ length: 10 }, (_, i) => ({
          id: 100 + i,
          materia: 'Direito Penal',
          assunto: 'Crimes contra a pessoa',
          enunciado:
            'Enunciado da prática gratuita com um texto suficientemente longo para testar a quebra de linha em telas pequenas, incluindo referências legais como o artigo 121 do Código Penal.',
          alternativas: [
            'Alternativa A com um texto razoavelmente longo para ocupar mais de uma linha no celular.',
            'Alternativa B',
            'Alternativa C',
            'Alternativa D',
            'Alternativa E',
          ],
          origem: 'AUTORAL',
          banca: 'FGV',
          ano: 2024,
        })),
      )
    }
    if (url.pathname === '/api/publico/responder') {
      return responder({
        acertou: true,
        gabarito: 0,
        explicacao:
          'Comentário da prática gratuita, com fundamento legal e explicação em texto puro para validar a leitura no celular.',
        fundamento: 'Art. 121 do Código Penal',
      })
    }
    if (url.pathname === '/api/planos') return responder(planos)
    if (url.pathname === '/api/usuario') return responder({ message: 'não autenticado' }, 401)
    return responder({ message: `rota pública não mockada: ${url.pathname}` }, 404)
  })
}

async function instalarApiAdmin(page: Page) {
  await instalarApiFake(page, { admin: true })
}

test('auditoria responsiva: overflow, navegação, alvos de toque e screenshots', async ({ browser }) => {
  test.setTimeout(900_000)
  fs.mkdirSync(RAIZ, { recursive: true })
  const resultados: Resultado[] = []
  const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'

  for (const viewport of VIEWPORTS) {
    const pasta = path.join(RAIZ, `${viewport.width}x${viewport.height}`)
    fs.mkdirSync(pasta, { recursive: true })

    const contexto = await browser.newContext({
      baseURL,
      viewport,
      reducedMotion: 'reduce',
      colorScheme: 'light',
      hasTouch: viewport.width < 768,
    })

    contexto.setDefaultTimeout(15_000)
    contexto.setDefaultNavigationTimeout(20_000)

    const publica = await contexto.newPage()
    await instalarApiPublica(publica)

    let ordem = 0
    async function registrar(page: Page, tela: string) {
      ordem += 1
      const arquivo = path.join(
        pasta,
        `${String(ordem).padStart(2, '0')}-${tela}.png`,
      )
      await page.evaluate(() => {
        window.scrollTo(0, 0)
        ;(document.activeElement as HTMLElement | null)?.blur()
      })
      await page.waitForTimeout(150)
      await page.screenshot({ path: arquivo, fullPage: true })
      if (viewport.width < 768) {
        await page.screenshot({
          path: arquivo.replace(/\.png$/, '-viewport.png'),
          fullPage: false,
        })
      }
      const medicao = await medir(page)
      const resultado: Resultado = {
        viewport: `${viewport.width}x${viewport.height}`,
        tela,
        ...medicao,
        screenshot: path.relative(process.cwd(), arquivo),
      }
      resultados.push(resultado)
      console.log(
        `[${resultado.viewport}] ${tela.padEnd(22)} scrollWidth=${medicao.scrollWidth} innerWidth=${medicao.innerWidth} overflow=${medicao.overflow ? 'SIM' : 'não'} alvosPequenos=${medicao.alvosPequenos.length} aria-current=${medicao.ariaCurrentVisivel}`,
      )
      if (medicao.offenders.length) {
        console.log('  estouram:', JSON.stringify(medicao.offenders.slice(0, 5)))
      }
    }

    async function irParaPublico(rotulo: string) {
      if (viewport.width < 768) {
        await publica.getByRole('button', { name: 'Abrir menu do site' }).click()
        const menu = publica.getByRole('dialog', { name: 'Navegar no site' })
        await menu.getByRole('button', { name: rotulo, exact: true }).click()
      } else {
        await publica
          .getByRole('navigation', { name: 'Seções do site' })
          .getByRole('button', { name: rotulo, exact: true })
          .click()
      }
      await publica.waitForTimeout(200)
    }

    // ---------------------------------------------------------------- público
    await publica.goto('/')
    await publica.getByRole('heading', { level: 1 }).waitFor()
    await registrar(publica, 'landing')

    if (viewport.width < 768) {
      await publica.getByRole('button', { name: 'Abrir menu do site' }).click()
      await publica.getByRole('dialog', { name: 'Navegar no site' }).waitFor()
      await registrar(publica, 'menu-publico')
      await publica.getByRole('dialog', { name: 'Navegar no site' }).getByRole('button', { name: 'Fechar', exact: true }).click()
      await publica.getByRole('dialog', { name: 'Navegar no site' }).waitFor({ state: 'detached' })
    }

    await publica.getByRole('button', { name: 'Entrar', exact: true }).click()
    await publica.getByRole('heading', { name: 'Entrar na sua conta', exact: true }).waitFor()
    await registrar(publica, 'login')
    await publica.getByRole('button', { name: 'Voltar ao site' }).click()
    await publica.getByRole('heading', { level: 1 }).waitFor()

    await irParaPublico('Praticar grátis')
    await publica.getByRole('heading', { name: 'Prática gratuita', exact: true }).waitFor()
    await registrar(publica, 'pratica-selecao')

    await publica.getByRole('button', { name: /Direito Penal/ }).first().click()
    await publica.getByText(/1 \/ 10/).waitFor()
    await registrar(publica, 'pratica-questao')

    await irParaPublico('Planos')
    await publica.getByRole('heading', { name: 'Planos', exact: true }).waitFor()
    await publica.getByText('PRO Mensal').first().waitFor()
    await registrar(publica, 'planos-publico')

    // ---------------------------------------------------------------- app
    const app = await contexto.newPage()
    await instalarApiFake(app)
    await app.goto('/')
    await app.getByRole('heading', { name: 'Escolha a banca e o que estudar', exact: true }).waitFor()

    async function irParaAba(rotulo: string) {
      if (viewport.width >= 768) {
        await app
          .getByRole('navigation', { name: 'Seções do app' })
          .getByRole('button', { name: rotulo, exact: true })
          .click()
      } else if (['Questões', 'Fixação', 'Simulado', 'Evolução'].includes(rotulo)) {
        await app
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('button', { name: rotulo, exact: true })
          .click()
      } else {
        await app
          .getByRole('navigation', { name: 'Navegação principal' })
          .getByRole('button', { name: 'Mais', exact: true })
          .click()
        const menu = app.getByRole('dialog', { name: 'Mais seções' })
        await menu.getByRole('button', { name: new RegExp(`^${rotulo}`) }).click()
      }
      await app.waitForTimeout(250)
    }

    await registrar(app, 'questoes')

    await app.getByRole('button', { name: 'Começar sessão' }).click()
    await app.getByText(/Questão 1 de 10/).waitFor()
    await registrar(app, 'estudo')

    await app.getByRole('button', { name: 'Rascunho', exact: true }).click()
    await app.getByRole('dialog', { name: 'Rascunho' }).waitFor()
    await registrar(app, 'rascunho')
    await app
      .getByRole('dialog', { name: 'Rascunho' })
      .getByRole('button', { name: 'Fechar', exact: true })
      .click()

    await app.locator('main ul li button').first().click()
    await app.getByText(/Você acertou/).waitFor()
    await registrar(app, 'questao-corrigida')

    await irParaAba('Fixação')
    await app.getByRole('heading', { name: 'Fixação', exact: true }).waitFor()
    await registrar(app, 'fixacao')

    await irParaAba('Simulado')
    await app.getByRole('heading', { name: 'Simulado', exact: true }).waitFor()
    await registrar(app, 'simulado-inicio')

    await app.getByRole('button', { name: 'Iniciar simulado' }).click()
    await app.getByText(/Questão 1 de 60/).waitFor()
    await registrar(app, 'simulado-prova')

    await app.locator('main ul li button').first().click()
    await app.getByRole('button', { name: 'Finalizar' }).click()
    await app.getByText(/% de acerto/).waitFor()
    await registrar(app, 'simulado-resultado')

    await irParaAba('Evolução')
    await app.getByRole('heading', { name: 'Evolução', exact: true }).waitFor()
    await app.getByText('Aproveitamento diário').waitFor()
    await registrar(app, 'evolucao')

    await irParaAba('Certames')
    await app.getByRole('heading', { name: 'Certames', exact: true }).waitFor()
    await registrar(app, 'certames')

    await app.locator('main').getByRole('button', { name: /CREA-AM/ }).first().click()
    await app.getByRole('heading', { name: 'CREA-AM', exact: true }).waitFor()
    await app.getByRole('heading', { name: 'Materiais de estudo', exact: true }).waitFor()
    await registrar(app, 'certame-detalhe')

    await irParaAba('Planos')
    await app.getByRole('heading', { name: 'Planos', exact: true }).waitFor()
    await app.getByText('PRO Mensal').first().waitFor()
    await registrar(app, 'planos')

    await irParaAba('Conta')
    await app.getByRole('heading', { name: 'Conta e privacidade', exact: true }).waitFor()
    await registrar(app, 'conta')

    if (viewport.width < 768) {
      await app
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('button', { name: 'Mais', exact: true })
        .click()
      await app.getByRole('dialog', { name: 'Mais seções' }).waitFor()
      await registrar(app, 'menu-mais')
      await app.getByRole('dialog', { name: 'Mais seções' }).getByRole('button', { name: 'Fechar', exact: true }).click()
      await app.getByRole('dialog', { name: 'Mais seções' }).waitFor({ state: 'detached' })
    }

    // ---------------------------------------------------------------- admin
    console.log(`[${viewport.width}x${viewport.height}] admin: abrindo página`)
    const admin = await contexto.newPage()
    await instalarApiAdmin(admin)
    console.log(`[${viewport.width}x${viewport.height}] admin: goto`)
    await admin.goto('/')
    await admin.getByRole('heading', { name: 'Escolha a banca e o que estudar', exact: true }).waitFor()
    console.log(`[${viewport.width}x${viewport.height}] admin: navegando`)

    if (viewport.width >= 768) {
      await admin
        .getByRole('navigation', { name: 'Seções do app' })
        .getByRole('button', { name: 'Admin', exact: true })
        .click()
    } else {
      await admin
        .getByRole('navigation', { name: 'Navegação principal' })
        .getByRole('button', { name: 'Mais', exact: true })
        .click()
      await admin
        .getByRole('dialog', { name: 'Mais seções' })
        .getByRole('button', { name: /^Admin/ })
        .click()
    }
    await admin.getByRole('heading', { name: 'Acesso dos alunos', exact: true }).waitFor()
    await admin.getByRole('main').getByText('e2e@qb.local').first().waitFor({ state: 'attached' })
    console.log(`[${viewport.width}x${viewport.height}] admin: screenshot`)
    await registrar(admin, 'admin')

    await contexto.close()
    fs.writeFileSync(
      path.join(RAIZ, 'resultados.json'),
      JSON.stringify(resultados, null, 2),
      'utf8',
    )
  }

  const comOverflow = resultados.filter((resultado) => resultado.overflow)
  const comAlvoPequeno = resultados.filter((resultado) => resultado.alvosPequenos.length > 0)
  const semAriaCurrent = resultados.filter(
    (resultado) =>
      !['login'].includes(resultado.tela) && resultado.ariaCurrentVisivel === 0,
  )

  fs.writeFileSync(
    path.join(RAIZ, 'resultados.json'),
    JSON.stringify(resultados, null, 2),
    'utf8',
  )

  expect(
    comOverflow,
    `Telas com overflow horizontal: ${JSON.stringify(
      comOverflow.map((item) => ({
        viewport: item.viewport,
        tela: item.tela,
        scrollWidth: item.scrollWidth,
        innerWidth: item.innerWidth,
        offenders: item.offenders,
      })),
      null,
      2,
    )}`,
  ).toHaveLength(0)

  expect(
    comAlvoPequeno,
    `Alvos de toque < 44px na navegação: ${JSON.stringify(
      comAlvoPequeno.map((item) => ({
        viewport: item.viewport,
        tela: item.tela,
        alvos: item.alvosPequenos,
      })),
      null,
      2,
    )}`,
  ).toHaveLength(0)

  expect(
    semAriaCurrent,
    `Telas sem aria-current visível: ${JSON.stringify(
      semAriaCurrent.map((item) => `${item.viewport}/${item.tela}`),
    )}`,
  ).toHaveLength(0)
})
