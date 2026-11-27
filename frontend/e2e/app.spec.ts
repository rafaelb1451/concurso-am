import { expect, test } from '@playwright/test'
import { instalarApiFake } from './fixtures'

test.beforeEach(async ({ page }) => {
  await instalarApiFake(page)
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Escolha a banca e o que estudar' }),
  ).toBeVisible()
})

test('sessão de questões: responder, ver correção e avançar', async ({ page }) => {
  await page.getByRole('button', { name: 'Começar sessão' }).click()

  await expect(page.getByText(/Questão 1 de 10/)).toBeVisible()
  await page.locator('ul li button').first().click()

  await expect(page.getByText(/Você (acertou|errou)/)).toBeVisible()
  await expect(page.getByText('Comentário da questão no E2E.')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima questão' }).click()
  await expect(page.getByText(/Questão 2 de 10/)).toBeVisible()
})

test('simulado: monta a prova, mostra o cronômetro e corrige', async ({ page }) => {
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar simulado' }).click()

  await expect(page.getByText(/Questão 1 de 60/)).toBeVisible()
  await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible()

  await page.locator('ul li button').first().click()
  await page.getByRole('button', { name: 'Finalizar' }).click()

  await expect(page.getByText(/% de acerto/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo simulado' })).toBeVisible()
})

test('filtros de banca e certame recarregam o painel sem erro', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Banca' }).selectOption('FGV')
  await expect(page.getByRole('combobox', { name: 'Banca' })).toHaveValue('FGV')

  await page.getByRole('combobox', { name: 'Certame' }).selectOption('CREA-AM')
  await expect(page.getByRole('combobox', { name: 'Certame' })).toHaveValue('CREA-AM')
  await expect(page.getByText(/Filtros ativos: FGV · CREA-AM/)).toBeVisible()
})
