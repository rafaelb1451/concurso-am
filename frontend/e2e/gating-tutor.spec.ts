import { expect, test, type Page } from '@playwright/test'

/**
 * Gating do Tutor de IA: bloqueado no Básico, liberado no Plus.
 *
 * O backend é a fonte da verdade (403 no POST /api/chat para Básico/Free). Aqui validamos o
 * reflexo na interface: o painel do Tutor exibe o bloqueio com CTA no Básico e libera a caixa
 * de pergunta no Plus. Dados de teste via ambiente — nunca senha real:
 *
 *   BASE_URL       (default https://qbconcurso.com.br)
 *   E2E_EMAIL      e-mail da conta de teste
 *   E2E_SENHA      senha da conta de teste
 *   E2E_EMAIL_PLUS e-mail de uma conta Plus para o cenário de liberação
 *   E2E_SENHA_PLUS senha da conta Plus
 */
const BASE_URL = process.env.BASE_URL ?? 'https://qbconcurso.com.br'
const EMAIL = process.env.E2E_EMAIL ?? ''
const SENHA = process.env.E2E_SENHA ?? ''
const EMAIL_PLUS = process.env.E2E_EMAIL_PLUS ?? process.env.E2E_EMAIL ?? ''
const SENHA_PLUS = process.env.E2E_SENHA_PLUS ?? process.env.E2E_SENHA ?? ''

test.use({ baseURL: BASE_URL })

async function entrar(page: Page, email: string, senha: string) {
  if (!email || !senha) {
    throw new Error('Defina E2E_EMAIL/E2E_SENHA (e E2E_EMAIL_PLUS/E2E_SENHA_PLUS para o Plus).')
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar com e-mail', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Seções do app' })).toBeVisible()
}

test('Tutor bloqueado no Básico com CTA para o Plus', async ({ page }) => {
  await entrar(page, EMAIL, SENHA)
  await page.getByRole('button', { name: 'Fixação', exact: true }).click()

  // Painel do Tutor sinaliza o bloqueio e a caixa fica desabilitada.
  await expect(page.getByRole('heading', { name: 'Tutor de IA exclusivo do Plus' })).toBeVisible()
  await expect(page.getByPlaceholder('Disponível no Plus')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Conheça o Plus', exact: true })).toBeVisible()
})

test('Tutor liberado no Plus', async ({ page }) => {
  await entrar(page, EMAIL_PLUS, SENHA_PLUS)
  await page.getByRole('button', { name: 'Fixação', exact: true }).click()

  // Sem o bloqueio do Básico: o painel vira uma caixa de conversa habilitada.
  await expect(page.getByRole('heading', { name: 'Tutor de IA exclusivo do Plus' })).toHaveCount(0)
  await expect(page.getByPlaceholder('Disponível no Plus')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Tutor', exact: true })).toBeVisible()
})
