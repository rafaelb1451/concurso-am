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
      if (url === '/api/concursos?catalogo=true') return jsonResponse(concursos)
      throw new Error(`rota não mockada: ${url}`)
    })

    expect(await api.bancas()).toEqual(bancas)
    expect(await api.concursos()).toEqual(concursos)
    expect(await api.concursos(true)).toEqual(concursos)
    expect(fetchMock).toHaveBeenCalledWith('/api/bancas')
    expect(fetchMock).toHaveBeenCalledWith('/api/concursos')
    expect(fetchMock).toHaveBeenCalledWith('/api/concursos?catalogo=true')
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

  it('busca o mapa mental autenticado', async () => {
    localStorage.setItem('qb_token', 'token-mapa')
    const mapa = {
      titulo: 'Lei nº 5.194/1966',
      tema: 'Exercício profissional',
      ramos: [{ titulo: 'Registro', itens: ['Registro no CREA'] }],
    }
    const fetchMock = mockFetch(() => jsonResponse(mapa))

    expect(await api.mapaMental('lei-5194-1966')).toEqual(mapa)
    expect(fetchMock).toHaveBeenCalledWith('/api/materiais/lei-5194-1966/mapa-mental', {
      headers: { Authorization: 'Bearer token-mapa' },
    })
  })

  it('baixa o PDF como Blob autenticado', async () => {
    localStorage.setItem('qb_token', 'token-pdf')
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    const fetchMock = mockFetch(
      () =>
        ({
          ok: true,
          status: 200,
          headers: { get: () => 'application/pdf' },
          blob: async () => blob,
        }) as unknown as Response,
    )

    expect(await api.materialPdf('lei-5194-1966')).toBe(blob)
    expect(fetchMock).toHaveBeenCalledWith('/api/materiais/lei-5194-1966/pdf', {
      headers: { Authorization: 'Bearer token-pdf' },
    })
  })

  it('converte erro JSON do PDF em ApiError com a mensagem do servidor', async () => {
    mockFetch(
      () =>
        ({
          ok: false,
          status: 503,
          headers: { get: () => 'application/json' },
          json: async () => ({ message: 'PDF em manutenção' }),
        }) as unknown as Response,
    )

    await expect(api.materialPdf('lei-5194-1966')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'PDF em manutenção',
    })
  })

  it('rejeita resposta que não é PDF', async () => {
    mockFetch(
      () =>
        ({
          ok: true,
          status: 200,
          headers: { get: () => 'text/html' },
        }) as unknown as Response,
    )

    await expect(api.materialPdf('lei-5194-1966')).rejects.toThrow(
      'O servidor não devolveu um PDF válido.',
    )
  })

  it('lê a mensagem JSON quando o PDF vem com status 200 e corpo de erro', async () => {
    mockFetch(
      () =>
        ({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json;charset=UTF-8' },
          json: async () => ({ message: 'Geração de PDF desligada' }),
        }) as unknown as Response,
    )

    await expect(api.materialPdf('lei-5194-1966')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Geração de PDF desligada',
    })
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

  it('envia plano e certames no checkout', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ url: 'https://mp.exemplo/checkout' }))

    const resposta = await api.iniciarCheckout('PLUS', ['PM-AM', 'PC-AM'])

    expect(resposta.url).toBe('https://mp.exemplo/checkout')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assinatura/checkout',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: 'PLUS', certames: ['PM-AM', 'PC-AM'] }),
      }),
    )
  })

  it('troca certames com PUT', async () => {
    const fetchMock = mockFetch(() => jsonResponse({ ok: true }))

    await api.trocarCertames(['CREA-AM'])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assinatura/certames',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ certames: ['CREA-AM'] }),
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
