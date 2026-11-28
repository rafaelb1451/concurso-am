import { expect, test, type Page } from '@playwright/test'

/**
 * Troca de certame (1 vez por ciclo) na tela "Conta e privacidade".
 *
 * O backend audita a troca e permite apenas uma por ciclo. Dados de teste via ambiente:
 *
 *   BASE_URL          (default https://qbconcurso.com.br)
 *   E2E_EMAIL         e-mail da conta de teste (assinante pago)
 *   E2E_SENHA         senha da conta de teste
 *   E2E_CERTAME_1     certame contratado hoje (default PM-AM)
 *   E2E_CERTAME_NOVO  certame de destino da troca (default CREA-AM)
 */
const BASE_URL = process.env.BASE_URL ?? 'https://qbconcurso.com.br'
const EMAIL = process.env.E2E_EMAIL ?? ''
const SENHA = process.env.E2E_SENHA ?? ''
const CERTAME_1 = process.env.E2E_CERTAME_1 ?? 'PM-AM'
const CERTAME_NOVO = process.env.E2E_CERTAME_NOVO ?? 'CREA-AM'

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

test('troca o certame uma vez e registra a auditoria', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Conta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Conta e privacidade' })).toBeVisible()

  // Abre o seletor de troca e desmarca o atual, marcando o novo.
  await page.getByRole('button', { name: 'Trocar certames', exact: true }).click()
  const atual = page.getByRole('checkbox', { name: new RegExp(CERTAME_1) })
  await expect(atual).toBeChecked()
  await atual.uncheck()
  await page.getByRole('checkbox', { name: new RegExp(CERTAME_NOVO) }).check()

  await page.getByRole('button', { name: 'Confirmar troca', exact: true }).click()

  await expect(
    page.getByText('Certames atualizados. A troca deste ciclo foi registrada na auditoria.'),
  ).toBeVisible()

  // A troca só pode ser feita 1 vez por ciclo: o CTA some e a explicação muda.
  await expect(page.getByRole('button', { name: 'Trocar certames', exact: true })).toHaveCount(0)
  await expect(
    page.getByText(/A troca de certames deste ciclo já foi utilizada/),
  ).toBeVisible()
})
