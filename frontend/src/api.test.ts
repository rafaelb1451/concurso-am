import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'
import {
  answer,
  bancas,
  concursos,
  jsonResponse,
  material,
  materiais,
  mockFetch,
  question,
} from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('api', () => {
  it('monta a query ignorando banca TODAS, concurso TODOS e parâmetros vazios', async () => {
    const fetchMock = mockFetch(() => jsonResponse([]))

    await api.questoes('TODAS', 'TODOS', '', '', 10)

    expect(fetchMock).toHaveBeenCalledWith('/api/questoes?quantidade=10')
  })

  it('envia banca e certame escolhidos na query', async () => {
    const fetchMock = mockFetch(() => jsonResponse([]))

    await api.questoes('FGV', 'PM-AM', 'Direito Penal', 'Crimes', 5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/questoes?banca=FGV&concurso=PM-AM&materia=Direito+Penal&assunto=Crimes&quantidade=5',
    )
  })

  it('devolve o corpo tipado da resposta', async () => {
    mockFetch(() => jsonResponse([question()]))

    const questoes = await api.questoes('FGV', 'PM-AM', undefined, undefined, 1)

    expect(questoes).toHaveLength(1)
    expect(questoes[0].enunciado).toContain('Enunciado da questão um')
  })

  it('busca bancas e certames dinâmicos', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/bancas') return jsonResponse(bancas)
      if (url === '/api/concursos') return jsonResponse(concursos)
      throw new Error(`rota não mockada: ${url}`)
    })

    expect(await api.bancas()).toEqual(bancas)
    expect(await api.concursos()).toEqual(concursos)
    expect(fetchMock).toHaveBeenCalledWith('/api/bancas')
    expect(fetchMock).toHaveBeenCalledWith('/api/concursos')
  })

  it('busca a lista e o conteúdo integral de materiais', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/materiais?concurso=CREA-AM') return jsonResponse(materiais)
      if (url === '/api/materiais/lei-5194-1966') return jsonResponse(material)
      throw new Error(`rota não mockada: ${url}`)
    })

    expect(await api.materiais('CREA-AM')).toHaveLength(2)
    expect((await api.material('lei-5194-1966')).conteudo).toContain('Art. 1º')
    expect(fetchMock).toHaveBeenCalledWith('/api/materiais?concurso=CREA-AM')
    expect(fetchMock).toHaveBeenCalledWith('/api/materiais/lei-5194-1966')
  })

  it('envia banca, certame e quantidade no simulado e na evolução', async () => {
    const fetchMock = mockFetch(() => jsonResponse({}))

    await api.simulado('FGV', 'CREA-AM', 20)
    await api.evolucao('FGV', 'CREA-AM', undefined, 30)
    await api.desempenho('FGV', 'CREA-AM')
    await api.topicos('FGV', 'CREA-AM')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/simulado?banca=FGV&concurso=CREA-AM&quantidade=20',
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/evolucao?banca=FGV&concurso=CREA-AM&dias=30',
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/desempenho?banca=FGV&concurso=CREA-AM')
    expect(fetchMock).toHaveBeenCalledWith('/api/topicos?banca=FGV&concurso=CREA-AM')
  })

  it('expõe o status 404 para a UI tratar materiais ausentes', async () => {
    mockFetch(() => jsonResponse({ message: 'material não encontrado' }, false, 404))

    await expect(api.material('inexistente')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
    await expect(api.material('inexistente')).rejects.toBeInstanceOf(ApiError)
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

  it('envia cadastro com consentimentos LGPD', async () => {
    const fetchMock = mockFetch(() => jsonResponse({
      token: null,
      usuario: { id: 1, nome: 'Aluno', email: 'aluno@qb.local', admin: false, emailVerificado: false },
    }))

    await api.cadastro('Aluno', 'aluno@qb.local', 'Test123456', true, true)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cadastro',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nome: 'Aluno',
          email: 'aluno@qb.local',
          senha: 'Test123456',
          aceitouTermos: true,
          aceitouPrivacidade: true,
        }),
      }),
    )
  })

  it('usa bearer token nas chamadas autenticadas', async () => {
    localStorage.setItem('qb_token', 'token-seguro')
    const fetchMock = mockFetch(() => jsonResponse({}))

    await api.usuario()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/usuario',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-seguro' },
      }),
    )
  })
})
