import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'
import { answer, jsonResponse, mockFetch, question } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('monta a query ignorando concurso TODOS e parâmetros vazios', async () => {
    const fetchMock = mockFetch(() => jsonResponse([]))

    await api.questoes('TODOS', '', undefined, 10)

    expect(fetchMock).toHaveBeenCalledWith('/api/questoes?quantidade=10')
  })

  it('envia os filtros escolhidos na query', async () => {
    const fetchMock = mockFetch(() => jsonResponse([]))

    await api.questoes('PM-AM', 'Direito Penal', 'Crimes', 5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/questoes?concurso=PM-AM&materia=Direito+Penal&assunto=Crimes&quantidade=5',
    )
  })

  it('devolve o corpo tipado da resposta', async () => {
    mockFetch(() => jsonResponse([question()]))

    const questoes = await api.questoes('PM-AM', undefined, undefined, 1)

    expect(questoes).toHaveLength(1)
    expect(questoes[0].enunciado).toContain('Enunciado da questão um')
  })

  it('propaga a mensagem de erro devolvida pelo servidor', async () => {
    mockFetch(() => jsonResponse({ message: 'Alternativa invalida' }, false))

    await expect(api.responder(1, 99)).rejects.toThrow('Alternativa invalida')
  })

  it('usa mensagem padrão quando o erro não tem corpo JSON', async () => {
    mockFetch(
      () =>
        ({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('sem json')
          },
        }) as unknown as Response,
    )

    await expect(api.responder(1, 0)).rejects.toThrow('Erro ao enviar a resposta')
  })

  it('envia o corpo da resposta como JSON', async () => {
    const fetchMock = mockFetch(() => jsonResponse(answer({ acertou: false })))

    const resultado = await api.responder(7, 2)

    expect(resultado.acertou).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/questoes/7/responder',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternativa: 2 }),
      }),
    )
  })
})
