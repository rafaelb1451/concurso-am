const BASE = '/api'

async function get<T>(url: string): Promise<T> {
  const response = await fetch(`${BASE}${url}`)
  if (!response.ok) throw new Error(`Falha ao buscar ${url}`)
  return response.json() as Promise<T>
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const erro = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(erro?.message ?? 'Erro ao enviar a resposta')
  }
  return response.json() as Promise<T>
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== '' && valor !== 'TODOS') search.set(chave, String(valor))
  })
  const texto = search.toString()
  return texto ? `?${texto}` : ''
}

export interface Question {
  id: number
  materia: string
  assunto: string
  origem: 'PROVA' | 'AUTORAL'
  banca: string | null
  ano: number | null
  orgao: string | null
  cargo: string | null
  dificuldade: number
  enunciado: string
  alternativas: string[]
  concursos: string[]
}

export interface Answer {
  acertou: boolean
  correta: number
  gabarito: string
  explicacao: string
  fundamento: string | null
  assunto: string
}

export interface Topico {
  materia: string
  assunto: string
  total: number
}

export interface Concurso {
  id: string
  total: number
}

export interface MateriaStats {
  materia: string
  respondidas: number
  acertos: number
}

export interface Desempenho {
  respondidas: number
  acertos: number
  percentual: number
  porMateria: MateriaStats[]
}

export const api = {
  concursos: () => get<Concurso[]>('/concursos'),
  topicos: (concurso?: string) => get<Topico[]>(`/topicos${qs({ concurso })}`),
  questoes: (concurso?: string, materia?: string, assunto?: string, quantidade = 10) =>
    get<Question[]>(`/questoes${qs({ concurso, materia, assunto, quantidade })}`),
  responder: (id: number, alternativa: number) =>
    post<Answer>(`/questoes/${id}/responder`, { alternativa }),
  desempenho: (concurso?: string) => get<Desempenho>(`/desempenho${qs({ concurso })}`),
}
