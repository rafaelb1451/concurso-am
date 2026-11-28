import { expect, test, type Page } from '@playwright/test'

/**
 * Onboarding do plano Básico: o aluno escolhe exatamente 1 certame no checkout.
 *
 * Roda contra o app real em produção (ou o domínio definido em BASE_URL). Os dados de
 * teste vêm do ambiente — nunca hardcode uma senha real no repositório:
 *
 *   BASE_URL        (default https://qbconcurso.com.br)
 *   E2E_EMAIL       e-mail da conta de teste
 *   E2E_SENHA       senha da conta de teste
 *   E2E_CERTAME_1   sigla do certame escolhido (default PM-AM)
 *   E2E_CERTAME_2   sigla de um certame fora do plano (default PC-AM)
 */
const BASE_URL = process.env.BASE_URL ?? 'https://qbconcurso.com.br'
const EMAIL = process.env.E2E_EMAIL ?? ''
const SENHA = process.env.E2E_SENHA ?? ''
const CERTAME_1 = process.env.E2E_CERTAME_1 ?? 'PM-AM'
const CERTAME_2 = process.env.E2E_CERTAME_2 ?? 'PC-AM'

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

test('onboarding do Básico exige exatamente 1 certame', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Planos', exact: true }).click()

  // Abre o checkout do Básico.
  await page.getByRole('button', { name: 'Escolher Básico', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Escolha os certames do Básico' })).toBeVisible()

  // Sem seleção o contrato do Básico não libera o checkout.
  await expect(page.getByText('0 de 1 selecionado')).toBeVisible()

  // Seleciona 1 certame.
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_1) }).check()
  await expect(page.getByText('1 de 1 selecionado')).toBeVisible()

  // O limite de 1 certame trava os demais (não dá para marcar um segundo).
  await expect(page.getByRole('checkbox', { name: new RegExp(CERTAME_2) })).toBeDisabled()

  // Com exatamente 1 certame, o botão de assinar fica habilitado.
  await expect(page.getByRole('button', { name: 'Assinar', exact: true })).toBeEnabled()
})
