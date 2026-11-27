import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Simulado from './Simulado'
import { bancas, concursos, jsonResponse, mockFetch, question } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

const prova = {
  concurso: 'PM-AM',
  nome: 'Soldado PM-AM',
  totalPrevisto: 60,
  totalGerado: 2,
  questoes: [question({ id: 1 }), question({ id: 2, enunciado: 'Segunda questão do simulado.' })],
  avisos: [],
}

const correcao = {
  acertos: 1,
  total: 1,
  percentual: 100,
  porMateria: [{ materia: 'Direito Penal', acertos: 1, total: 1 }],
  itens: [
    {
      questaoId: 1,
      materia: 'Direito Penal',
      assunto: 'Crimes contra a pessoa',
      origem: 'AUTORAL',
      correta: 0,
      gabarito: 'A',
      alternativaAluno: 0,
      acertou: true,
      explicacao: 'Comentário do simulado.',
      fundamento: 'Art. 1º do CP',
    },
  ],
}

function mockSimulado(urlEsperada: string) {
  return mockFetch((url, init) => {
    if (url === urlEsperada) return jsonResponse(prova)
    if (url === '/api/simulado/corrigir' && init?.method === 'POST') return jsonResponse(correcao)
    throw new Error(`rota não mockada: ${url}`)
  })
}

describe('Simulado', () => {
  it('monta a prova, mostra o tempo e corrige ao finalizar', async () => {
    const user = userEvent.setup()
    const fetchMock = mockSimulado('/api/simulado?banca=FGV&concurso=PM-AM&quantidade=50')
    render(
      <Simulado
        bancaInicial="FGV"
        concursoInicial="PM-AM"
        bancas={bancas}
        concursos={concursos}
      />,
    )

    expect(screen.getByLabelText('Banca')).toHaveValue('FGV')
    expect(screen.getByLabelText('Certame')).toHaveValue('PM-AM')
    await user.click(screen.getByRole('button', { name: 'Iniciar simulado' }))

    expect(await screen.findByText(/Questão 1 de 2/)).toBeInTheDocument()
    expect(screen.getByText('03:30:00')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Alternativa A/ }))
    await user.click(screen.getByRole('button', { name: 'Finalizar' }))

    expect(await screen.findByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByText(/100% de acerto/)).toBeInTheDocument()
    expect(screen.getByText('Comentário do simulado.')).toBeInTheDocument()
    expect(screen.getByText(/você marcou A/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/simulado/corrigir',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('envia banca, certame e quantidade escolhidos', async () => {
    const user = userEvent.setup()
    const fetchMock = mockSimulado('/api/simulado?banca=FGV&concurso=CREA-AM&quantidade=20')
    render(<Simulado bancas={bancas} concursos={concursos} />)

    await user.selectOptions(screen.getByLabelText('Banca'), 'FGV')
    await user.selectOptions(screen.getByLabelText('Certame'), 'CREA-AM')
    await user.selectOptions(screen.getByLabelText('Quantidade'), '20')
    await user.click(screen.getByRole('button', { name: 'Iniciar simulado' }))

    expect(await screen.findByText(/Questão 1 de 2/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/simulado?banca=FGV&concurso=CREA-AM&quantidade=20',
    )
  })
})
