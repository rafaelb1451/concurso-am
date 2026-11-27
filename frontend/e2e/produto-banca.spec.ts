import { expect, test } from '@playwright/test'
import { instalarApiFake } from './fixtures'

test.beforeEach(async ({ page }) => {
  await instalarApiFake(page)
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Escolha a banca e o que estudar' }),
  ).toBeVisible()
})

test('filtros enviam banca e certame para a API e abrem sem filtro fixo', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: 'Banca' })).toHaveValue('TODAS')
  await expect(page.getByRole('combobox', { name: 'Certame' })).toHaveValue('TODOS')
  await expect(page.getByText(/Estudando para/i)).toHaveCount(0)

  const pedidoBanca = page.waitForRequest((request) =>
    request.url().includes('/api/topicos?banca=FGV'),
  )
  await page.getByRole('combobox', { name: 'Banca' }).selectOption('FGV')
  await pedidoBanca

  const pedidoCertame = page.waitForRequest((request) =>
    request.url().includes('/api/topicos?banca=FGV&concurso=CREA-AM'),
  )
  await page.getByRole('combobox', { name: 'Certame' }).selectOption('CREA-AM')
  await pedidoCertame

  await expect(page.getByText(/Filtros ativos: FGV · CREA-AM/)).toBeVisible()
})

test('Certames: lista CREA-AM, abre o material em texto puro e estuda o certame', async ({ page }) => {
  await page.getByRole('button', { name: 'Certames', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Certames' })).toBeVisible()

  const card = page.getByRole('button', { name: /CREA-AM/ })
  await expect(card).toContainText('40')
  await card.click()

  await expect(page.getByRole('heading', { name: 'CREA-AM' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Estudar este certame' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Materiais de estudo' })).toBeVisible()
  await expect(page.getByText('Lei 5.194/1966')).toBeVisible()

  const pedidoMaterial = page.waitForRequest((request) =>
    request.url().endsWith('/api/materiais/lei-5194-1966'),
  )
  await page.getByRole('button', { name: /Lei nº 5\.194\/1966/ }).click()
  await pedidoMaterial

  await expect(page.getByRole('heading', { name: 'Lei nº 5.194/1966' })).toBeVisible()
  await expect(page.getByText(/Art\. 1º A fiscalização/)).toBeVisible()
  await expect(page.getByText(/O texto <b>não<\/b> deve ser interpretado como HTML/)).toBeVisible()
  await expect(page.getByText('Fonte oficial:')).toBeVisible()
  // texto puro: o <b> do conteúdo não vira elemento HTML
  await expect(page.locator('article b')).toHaveCount(0)

  const pedidoTopicos = page.waitForRequest((request) =>
    request.url().includes('/api/topicos?concurso=CREA-AM'),
  )
  await page
    .getByRole('button', { name: 'Ir para as questões deste material' })
    .first()
    .click()
  await pedidoTopicos

  await expect(
    page.getByRole('heading', { name: 'Escolha a banca e o que estudar' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Certame' })).toHaveValue('CREA-AM')
  await expect(page.getByRole('combobox', { name: 'Banca' })).toHaveValue('TODAS')
})

test('botão "Estudar este certame" aplica o filtro de concurso na aba Questões', async ({ page }) => {
  await page.getByRole('button', { name: 'Certames', exact: true }).click()
  await page.getByRole('button', { name: /CREA-AM/ }).click()
  await expect(page.getByRole('heading', { name: 'CREA-AM' })).toBeVisible()

  await page.getByRole('button', { name: 'Estudar este certame' }).click()

  await expect(
    page.getByRole('heading', { name: 'Escolha a banca e o que estudar' }),
  ).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Certame' })).toHaveValue('CREA-AM')
  await expect(page.getByRole('combobox', { name: 'Banca' })).toHaveValue('TODAS')
})

test('simulado envia banca, certame e quantidade escolhidos', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()

  await page.getByRole('combobox', { name: 'Banca' }).selectOption('FGV')
  await page.getByRole('combobox', { name: 'Certame' }).selectOption('CREA-AM')
  await page.getByRole('combobox', { name: 'Quantidade' }).selectOption('20')
  await expect(page.getByText(/Duração estimada: 70 minutos/)).toBeVisible()

  const pedido = page.waitForRequest((request) =>
    request.url().includes('/api/simulado?banca=FGV&concurso=CREA-AM&quantidade=20'),
  )
  await page.getByRole('button', { name: 'Iniciar simulado' }).click()
  await pedido

  await expect(page.getByText(/Questão 1 de 20/)).toBeVisible()
  await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible()

  await page.locator('ul li button').first().click()
  await page.getByRole('button', { name: 'Finalizar' }).click()
  await expect(page.getByText(/% de acerto/)).toBeVisible()
})

test('evolução envia banca e certame e atualiza os selects', async ({ page }) => {
  await page.getByRole('button', { name: 'Evolução', exact: true }).click()

  const pedido = page.waitForRequest((request) =>
    request.url().includes('/api/evolucao?banca=CEBRASPE&concurso=PC-AM&dias=30'),
  )
  await page.getByRole('combobox', { name: 'Banca' }).selectOption('CEBRASPE')
  await page.getByRole('combobox', { name: 'Certame' }).selectOption('PC-AM')
  await pedido

  await expect(page.getByRole('combobox', { name: 'Banca' })).toHaveValue('CEBRASPE')
  await expect(page.getByRole('combobox', { name: 'Certame' })).toHaveValue('PC-AM')
  await expect(page.getByText('Aproveitamento diário')).toBeVisible()
  await expect(page.getByText(/CEBRASPE · PC-AM/)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Gráfico de aproveitamento por dia' })).toBeVisible()
})
