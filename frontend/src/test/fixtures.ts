import { vi } from 'vitest'
import type { Answer, Concurso, Desempenho, Question, Topico } from '../api'

export function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    materia: 'Direito Penal',
    assunto: 'Crimes contra a pessoa',
    origem: 'AUTORAL',
    banca: 'FGV',
    ano: 2022,
    orgao: 'PC-AM',
    cargo: 'Investigador',
    dificuldade: 2,
    enunciado: 'Enunciado da questão um, com texto suficiente para o teste.',
    alternativas: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D', 'Alternativa E'],
    concursos: ['PM-AM'],
    precedente: null,
    verificadoEm: null,
    ...overrides,
  }
}

export function answer(overrides: Partial<Answer> = {}): Answer {
  return {
    acertou: true,
    correta: 0,
    gabarito: 'A',
    explicacao: 'Comentário da questão.',
    fundamento: 'Art. 1º do CP',
    assunto: 'Crimes contra a pessoa',
    origem: 'AUTORAL',
    precedente: null,
    verificadoEm: null,
    ...overrides,
  }
}

export const concursos: Concurso[] = [
  { id: 'PM-AM', total: 2 },
  { id: 'PC-AM', total: 1 },
  { id: 'TODOS', total: 2 },
]

export const topicos: Topico[] = [{ materia: 'Direito Penal', assunto: 'Crimes contra a pessoa', total: 2 }]

export const desempenho: Desempenho = { respondidas: 0, acertos: 0, percentual: 0, porMateria: [] }

export function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
  } as unknown as Response
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

/** Substitui o fetch global por um roteador simples de URLs da API. */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

export function respostaPorRota(rotas: Record<string, unknown>): Handler {
  return (url) => {
    const rota = Object.keys(rotas).find((chave) => url === chave || url.startsWith(`${chave}?`))
    if (!rota) {
      throw new Error(`rota não mockada: ${url}`)
    }
    return jsonResponse(rotas[rota])
  }
}
