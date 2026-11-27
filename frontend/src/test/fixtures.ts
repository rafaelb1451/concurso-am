import { vi } from 'vitest'
import type {
  Answer,
  Banca,
  Concurso,
  Desempenho,
  Material,
  MaterialResumo,
  Question,
  Topico,
} from '../api'

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

export const bancas: Banca[] = [
  { banca: 'FGV', questoes: 2 },
  { banca: 'CEBRASPE', questoes: 1 },
]

export const concursos: Concurso[] = [
  { id: 'PM-AM', total: 2 },
  { id: 'PC-AM', total: 1 },
  { id: 'CREA-AM', total: 2 },
]

export const topicos: Topico[] = [{ materia: 'Direito Penal', assunto: 'Crimes contra a pessoa', total: 2 }]

export const desempenho: Desempenho = { respondidas: 0, acertos: 0, percentual: 0, porMateria: [] }

export const materiais: MaterialResumo[] = [
  {
    slug: 'lei-5194-1966',
    titulo: 'Lei nº 5.194/1966',
    resumo: 'Regula o exercício das profissões de engenheiro, arquiteto e agrônomo.',
    categoria: 'LEI',
    fonte: 'Lei 5.194/1966',
    ordem: 1,
  },
  {
    slug: 'resolucao-218-1973',
    titulo: 'Resolução CONFEA nº 218/1973',
    resumo: 'Atividades das diferentes modalidades profissionais.',
    categoria: 'RESOLUCAO',
    fonte: 'Resolução CONFEA 218/1973',
    ordem: 2,
  },
]

export const material: Material = {
  ...materiais[0],
  conteudo:
    'Art. 1º A fiscalização do exercício das profissões de engenheiro, arquiteto e agrônomo cabe ao CONFEA e aos CREA.\n\nArt. 2º O exercício das profissões depende de registro no conselho regional.',
}

export function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return {
    ok,
    status,
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
