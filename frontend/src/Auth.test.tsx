import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Auth from './Auth'
import { jsonResponse, mockFetch } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('Auth', () => {
  it('exige termos e privacidade no cadastro', async () => {
    const user = userEvent.setup()
    mockFetch(() => jsonResponse({
      token: null,
      usuario: { id: 1, nome: 'Aluno', email: 'aluno@qb.local', admin: false, emailVerificado: false },
    }))
    render(<Auth onAutenticado={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
    await user.type(screen.getByPlaceholderText('Seu nome'), 'Aluno')
    await user.type(screen.getByPlaceholderText('voce@email.com'), 'aluno@qb.local')
    await user.type(screen.getByPlaceholderText(/Mínimo 10 caracteres/), 'Test123456')

    const criar = screen.getByRole('button', { name: 'Criar minha conta' })
    expect(criar).toBeDisabled()

    await user.click(screen.getByText(/aceito os termos/))
    await user.click(screen.getByText(/tratamento dos meus dados/))
    expect(criar).toBeEnabled()

    await user.click(criar)
    expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument()
  })

  it('envia solicitação de recuperação sem revelar se o e-mail existe', async () => {
    const user = userEvent.setup()
    mockFetch(() => jsonResponse({ ok: true }))
    render(<Auth onAutenticado={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
    await user.type(screen.getByPlaceholderText('voce@email.com'), 'desconhecido@qb.local')
    await user.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))

    expect(await screen.findByText(/Se o e-mail estiver cadastrado/)).toBeInTheDocument()
  })
})
