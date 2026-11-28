import { expect, test, type Page } from '@playwright/test'

/**
 * Onboarding do Plus (até 3 certames) e o upgrade Básico → Plus.
 *
 * O Plus aceita de 1 a 3 certames; no upgrade a partir do Básico a escolha atual é carregada
 * e o aluno pode completar até o limite de 3. Dados de teste via ambiente — nunca senha real:
 *
 *   BASE_URL        (default https://qbconcurso.com.br)
 *   E2E_EMAIL       e-mail da conta de teste
 *   E2E_SENHA       senha da conta de teste
 *   E2E_CERTAME_1..3 siglas dos certames (defaults PM-AM, PC-AM, CREA-AM)
 */
const BASE_URL = process.env.BASE_URL ?? 'https://qbconcurso.com.br'
const EMAIL = process.env.E2E_EMAIL ?? ''
const SENHA = process.env.E2E_SENHA ?? ''
const CERTAME_1 = process.env.E2E_CERTAME_1 ?? 'PM-AM'
const CERTAME_2 = process.env.E2E_CERTAME_2 ?? 'PC-AM'
const CERTAME_3 = process.env.E2E_CERTAME_3 ?? 'CREA-AM'

test.use({ baseURL: BASE_URL })

async function entrar(page: Page) {
  if (!EMAIL || !SENHA) {
    throw new Error('Defina E2E_EMAIL e E2E_SENHA (dados de teste) para rodar este spec.')
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar com e-mail', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Seções do app' })).toBeVisible()
}

test('onboarding do Plus aceita até 3 certames', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Planos', exact: true }).click()

  await page.getByRole('button', { name: 'Escolher Plus', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Escolha os certames do Plus' })).toBeVisible()

  // O Plus parte vazio e aceita de 1 a 3.
  await expect(page.getByText('0 de 3 selecionados')).toBeVisible()
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_1) }).check()
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_2) }).check()
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_3) }).check()

  await expect(page.getByText('3 de 3 selecionados')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Assinar', exact: true })).toBeEnabled()
})

test('upgrade Básico → Plus carrega o certame atual e libera até 3', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Planos', exact: true }).click()

  // No Básico, a chamada para o Plus ("Conheça o Plus") abre o checkout com o escopo atual.
  await page.getByRole('button', { name: 'Conheça o Plus', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Escolha os certames do Plus' })).toBeVisible()

  // O certame já contratado vem pré-selecionado no upgrade.
  await expect(page.getByRole('checkbox', { name: new RegExp(CERTAME_1) })).toBeChecked()

  // Completa até o limite de 3 certames do Plus.
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_2) }).check()
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_3) }).check()
  await expect(page.getByText('3 de 3 selecionados')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Assinar', exact: true })).toBeEnabled()
})
