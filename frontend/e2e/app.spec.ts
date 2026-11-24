import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Montar sessão' })).toBeVisible()
})

test('sessão de questões: responder, ver correção e avançar', async ({ page }) => {
  await page.getByRole('button', { name: 'Começar sessão' }).click()

  await expect(page.getByText(/Questão 1 de 10/)).toBeVisible()
  await page.locator('ul li button').first().click()

  await expect(page.getByText(/Você (acertou|errou)/)).toBeVisible()
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

test('troca de concurso recarrega o painel sem erro', async ({ page }) => {
  await page.getByRole('button', { name: /Soldado PM-AM/ }).click()
  await expect(page.getByText(/questões no banco/)).toBeVisible()

  await page.getByRole('button', { name: /Investigador PC-AM/ }).click()
  await expect(page.getByRole('heading', { name: 'Montar sessão' })).toBeVisible()
})
