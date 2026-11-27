import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  answer,
  bancas,
  concursos,
  desempenho,
  jsonResponse,
  material,
  materiais,
  mockFetch,
  question,
  topicos,
} from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

beforeEach(() => {
  localStorage.setItem('qb_token', 'token-teste')
})

function rotearApi(responder = () => answer()) {
  return mockFetch((url, init) => {
    if (url === '/api/usuario') {
      return jsonResponse({ id: 1, nome: 'Aluno Teste', email: 'teste@qb.local', admin: false, emailVerificado: true })
    }
    if (url === '/api/bancas') return jsonResponse(bancas)
    if (url === '/api/concursos') return jsonResponse(concursos)
    if (url.startsWith('/api/topicos')) return jsonResponse(topicos)
    if (url.startsWith('/api/desempenho')) return jsonResponse(desempenho)
    if (url.startsWith('/api/materiais?')) {
      return jsonResponse(url.includes('concurso=CREA-AM') ? materiais : [])
    }
    if (url === `/api/materiais/${material.slug}`) return jsonResponse(material)
    if (url.startsWith('/api/questoes/') && init?.method === 'POST') {
      return jsonResponse(responder())
    }
    if (url.startsWith('/api/questoes?')) {
      return jsonResponse([
        question({ id: 1 }),
        question({ id: 2, enunciado: 'Enunciado da questão dois, também suficiente.', alternativas: ['Certa', 'Errada'] }),
      ])
    }
    throw new Error(`rota não mockada: ${url}`)
  })
}

describe('App', () => {
  it('percorre uma sessão completa: montar, responder e ver o resultado', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    expect(await screen.findByText(/2 questões disponíveis/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Começar sessão' }))

    expect(await screen.findByText('Questão 1 de 2')).toBeInTheDocument()
    expect(screen.getByText(/Enunciado da questão um/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Alternativa A/ }))
    expect(await screen.findByText('Você acertou')).toBeInTheDocument()
    expect(screen.getByText('Comentário da questão.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próxima questão' }))
    expect(await screen.findByText('Questão 2 de 2')).toBeInTheDocument()
    await user.click(screen.getByText('Certa'))
    await user.click(await screen.findByRole('button', { name: 'Ver resultado' }))

    expect(await screen.findByText('Sessão concluída')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('abre com Banca "Todas" e Certame "Todos" e filtra o painel', async () => {
    const user = userEvent.setup()
    const fetchMock = rotearApi()
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Banca')).toHaveValue('TODAS')
    expect(screen.getByLabelText('Certame')).toHaveValue('TODOS')
    expect(screen.queryByText(/Estudando para/i)).not.toBeInTheDocument()
    expect(screen.getByText(/estudo por banca e certame/)).toBeInTheDocument()

    await screen.findByRole('option', { name: /FGV/ })
    await screen.findByRole('option', { name: /CREA-AM/ })

    await user.selectOptions(screen.getByLabelText('Banca'), 'FGV')
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => String(url) === '/api/topicos?banca=FGV'),
      ).toBe(true),
    )

    await user.selectOptions(screen.getByLabelText('Certame'), 'CREA-AM')
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url]) => String(url) === '/api/topicos?banca=FGV&concurso=CREA-AM',
        ),
      ).toBe(true),
    )
  })

  it('abre Certames, lê o material em texto puro e vai para as questões do certame', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' })
    await user.click(screen.getByRole('button', { name: 'Certames' }))

    expect(await screen.findByRole('heading', { name: 'Certames' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /CREA-AM/ }))

    expect(await screen.findByRole('button', { name: 'Estudar este certame' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Lei nº 5.194\/1966/ }))

    expect(
      await screen.findByRole('heading', { name: 'Lei nº 5.194/1966' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Art\. 1º A fiscalização/)).toBeInTheDocument()
    expect(screen.getByText(/Fonte oficial/)).toBeInTheDocument()

    await user.click(
      screen.getAllByRole('button', { name: 'Ir para as questões deste material' })[0],
    )

    expect(
      await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Certame')).toHaveValue('CREA-AM')
    expect(screen.getByLabelText('Banca')).toHaveValue('TODAS')
  })

  it('mantém a tela utilizável quando bancas e certames respondem 404', async () => {
    mockFetch((url) => {
      if (url === '/api/usuario') {
        return jsonResponse({ id: 1, nome: 'Aluno Teste', email: 'teste@qb.local', admin: false, emailVerificado: true })
      }
      if (url === '/api/bancas' || url === '/api/concursos') {
        return jsonResponse({ message: 'não encontrado' }, false, 404)
      }
      if (url.startsWith('/api/topicos')) return jsonResponse(topicos)
      if (url.startsWith('/api/desempenho')) return jsonResponse(desempenho)
      throw new Error(`rota não mockada: ${url}`)
    })

    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Alguns filtros estão indisponíveis/)).toBeInTheDocument()
    expect(screen.getByLabelText('Banca')).toHaveValue('TODAS')
    expect(screen.getByLabelText('Certame')).toHaveValue('TODOS')
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

  it('oferece marcador, rascunho oculto e eliminação de alternativas', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Começar sessão' }))
    expect(await screen.findByText('Questão 1 de 2')).toBeInTheDocument()

    // o rascunho começa oculto
    expect(screen.queryByPlaceholderText(/Escreva seu raciocínio/)).not.toBeInTheDocument()

    // abrir o rascunho e fechar pelo botão da gaveta
    await user.click(screen.getByRole('button', { name: 'Rascunho' }))
    expect(screen.getByPlaceholderText(/Escreva seu raciocínio/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Concluir rascunho' }))
    expect(screen.queryByPlaceholderText(/Escreva seu raciocínio/)).not.toBeInTheDocument()

    // eliminar e restaurar a alternativa B
    await user.click(screen.getByRole('button', { name: 'Eliminar alternativa B' }))
    expect(screen.getByRole('button', { name: 'Restaurar alternativa B' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restaurar alternativa B' }))
    expect(screen.getByRole('button', { name: 'Eliminar alternativa B' })).toBeInTheDocument()
  })

  it('mantém a seção atual marcada com aria-current na navegação', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' })

    const nav = screen.getByRole('navigation', { name: 'Seções do app' })
    expect(within(nav).getByRole('button', { name: 'Questões' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(within(nav).getByRole('button', { name: 'Simulado' }))
    expect(await screen.findByRole('heading', { name: 'Simulado' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Simulado' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('button', { name: 'Questões' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('abre o menu Mais e navega para uma seção secundária', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' })

    const botaoMais = screen.getByRole('button', { name: 'Mais' })
    expect(botaoMais).toHaveAttribute('aria-expanded', 'false')

    await user.click(botaoMais)
    expect(botaoMais).toHaveAttribute('aria-expanded', 'true')

    const menu = await screen.findByRole('dialog', { name: 'Mais seções' })
    await user.click(within(menu).getByRole('button', { name: /Certames/ }))

    expect(await screen.findByRole('heading', { name: 'Certames' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fecha o menu Mais com a tecla Escape', async () => {
    const user = userEvent.setup()
    rotearApi()
    render(<App />)

    await screen.findByRole('heading', { name: 'Escolha a banca e o que estudar' })

    await user.click(screen.getByRole('button', { name: 'Mais' }))
    expect(await screen.findByRole('dialog', { name: 'Mais seções' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mostra mensagem amigável quando o servidor está fora', async () => {
    mockFetch((url) => {
      if (url === '/api/usuario') {
        return jsonResponse({ id: 1, nome: 'Aluno Teste', email: 'teste@qb.local', admin: false, emailVerificado: true })
      }
      throw new Error('conexão recusada')
    })
    render(<App />)

    expect(
      await screen.findByText('Não foi possível falar com o servidor. Ele está rodando?'),
    ).toBeInTheDocument()
  })
})
