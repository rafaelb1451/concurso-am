import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  answer,
  concursos,
  desempenho,
  jsonResponse,
  mockFetch,
  question,
  topicos,
} from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

function rotearApi(responder = () => answer()) {
  return mockFetch((url, init) => {
    if (url === '/api/concursos') return jsonResponse(concursos)
    if (url === '/api/topicos') return jsonResponse(topicos)
    if (url === '/api/desempenho') return jsonResponse(desempenho)
    if (url === '/api/questoes?quantidade=10') {
      return jsonResponse([
        question({ id: 1 }),
        question({ id: 2, enunciado: 'Enunciado da questão dois, também suficiente.', alternativas: ['Certa', 'Errada'] }),
      ])
    }
    if (url.startsWith('/api/questoes/') && init?.method === 'POST') {
      return jsonResponse(responder())
    }
    throw new Error(`rota não mockada: ${url}`)
  })
}

describe('App', () => {
  it('percorre uma sessão completa: montar, responder e ver o resultado', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    expect(await screen.findByText(/2 questões no banco/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Começar sessão' }))

    expect(await screen.findByText('Questão 1 de 2')).toBeInTheDocument()
    expect(screen.getByText(/Enunciado da questão um/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Alternativa A/ }))
    expect(await screen.findByText('Você acertou')).toBeInTheDocument()
    expect(screen.getByText('Comentário da questão.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próxima questão' }))
    expect(await screen.findByText('Questão 2 de 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Certa/ }))
    await user.click(await screen.findByRole('button', { name: 'Ver resultado' }))

    expect(await screen.findByText('Sessão concluída')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('permite responder pelo teclado', async () => {
    const user = userEvent.setup()
    rotearApi(() => answer({ acertou: false, correta: 0, gabarito: 'A' }))
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Começar sessão' }))
    expect(await screen.findByText('Questão 1 de 2')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'b' })

    expect(await screen.findByText('Você errou — gabarito A')).toBeInTheDocument()
  })

  it('mostra mensagem amigável quando o servidor está fora', async () => {
    mockFetch(() => {
      throw new Error('conexão recusada')
    })
    render(<App />)

    expect(
      await screen.findByText('Não foi possível falar com o servidor. Ele está rodando?'),
    ).toBeInTheDocument()
  })
})
