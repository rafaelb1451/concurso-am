const BASE = '/api'

async function get<T>(url: string): Promise<T> {
  const token = localStorage.getItem('qb_token')
  const response = token
    ? await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    : await fetch(`${BASE}${url}`)
  if (!response.ok) throw new Error(`Falha ao buscar ${url}`)
  return response.json() as Promise<T>
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const token = localStorage.getItem('qb_token')
  const response = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  precedente: string | null
  verificadoEm: string | null
}

export interface Answer {
  acertou: boolean
  correta: number
  gabarito: string
  explicacao: string | null
  fundamento: string | null
  assunto: string
  origem: 'PROVA' | 'AUTORAL'
  precedente: string | null
  verificadoEm: string | null
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

export interface Usuario {
  id: number
  nome: string
  email: string
  admin: boolean
  emailVerificado: boolean
  temSenha: boolean
}

export interface Auth {
  token: string | null
  usuario: Usuario
}

export interface EvolucaoPonto {
  dia: string
  respondidas: number
  acertos: number
  percentual: number
}

export interface Evolucao {
  respondidas: number
  acertos: number
  percentual: number
  tempoEstudoSegundos: number
  serie: EvolucaoPonto[]
}

export const api = {
  cadastro: (nome: string, email: string, senha: string,
             aceitouTermos: boolean, aceitouPrivacidade: boolean) =>
    post<Auth>('/cadastro', { nome, email, senha, aceitouTermos, aceitouPrivacidade }),
  entrarComGoogle: (credential: string) => post<Auth>('/google', { credential }),
  login: (email: string, senha: string) =>
    post<Auth>('/login', { email, senha }),
  verificarEmail: (token: string) =>
    post<{ ok: boolean }>('/verificar-email', { token }),
  reenviarVerificacao: (email: string) =>
    post<{ ok: boolean }>('/reenviar-verificacao', { email }),
  solicitarReset: (email: string) =>
    post<{ ok: boolean }>('/solicitar-reset', { email }),
  resetarSenha: (token: string, novaSenha: string) =>
    post<{ ok: boolean }>('/resetar-senha', { token, novaSenha }),
  // conta com senha: manda senha; conta so'-Google: manda credential (ID token)
  alterarEmail: (senha: string | null, novoEmail: string, credential?: string) =>
    post<{ ok: boolean }>('/usuario/alterar-email', { senha, novoEmail, credential }),
  confirmarAlteracaoEmail: (token: string) =>
    post<{ ok: boolean }>('/usuario/confirmar-email', { token }),
  dadosPessoais: () => get<Record<string, unknown>>('/usuario/dados'),
  excluirConta: (senha: string | null, credential?: string) =>
    post<{ ok: boolean }>('/usuario/excluir', { senha, credential }),
  logout: () => post<{ ok: boolean }>('/logout', {}),
  usuario: () => get<Usuario>('/usuario'),

  concursos: () => get<Concurso[]>('/concursos'),
  topicos: (concurso?: string) => get<Topico[]>(`/topicos${qs({ concurso })}`),
  questoes: (concurso?: string, materia?: string, assunto?: string, quantidade = 10) =>
    get<Question[]>(`/questoes${qs({ concurso, materia, assunto, quantidade })}`),
  responder: (id: number, alternativa: number) =>
    post<Answer>(`/questoes/${id}/responder`, { alternativa }),
  desempenho: (concurso?: string) => get<Desempenho>(`/desempenho${qs({ concurso })}`),
  evolucao: (concurso?: string, materia?: string, dias = 30) =>
    get<Evolucao>(`/evolucao${qs({ concurso, materia, dias })}`),
  registrarEstudo: (materia: string | null, duracaoSegundos: number) =>
    post<{ ok: boolean }>('/estudo', { materia, duracaoSegundos }),

  // tutor (chat)
  configDeepseek: () => get<ConfigStatus>('/config/deepseek'),
  salvarChave: (apiKey: string) => post<ConfigStatus>('/config/deepseek', { apiKey }),
  chat: (mensagens: ChatMensagem[], contexto: ContextoQuestao | null) =>
    post<{ resposta: string }>('/chat', { mensagens, contexto }),

  // simulado
  simulado: (concurso: string) => get<Simulado>(`/simulado${qs({ concurso })}`),
  corrigirSimulado: (concurso: string, respostas: RespostaSimulado[]) =>
    post<Correcao>('/simulado/corrigir', { concurso, respostas }),
}

export interface Simulado {
  concurso: string
  nome: string
  totalPrevisto: number
  totalGerado: number
  questoes: Question[]
  avisos: string[]
}

export interface RespostaSimulado {
  questaoId: number
  alternativa: number
}

export interface CorrecaoItem {
  questaoId: number
  materia: string
  assunto: string
  origem: string
  correta: number
  gabarito: string
  alternativaAluno: number | null
  acertou: boolean
  explicacao: string | null
  fundamento: string | null
}

export interface MateriaResultado {
  materia: string
  acertos: number
  total: number
}

export interface Correcao {
  acertos: number
  total: number
  percentual: number
  porMateria: MateriaResultado[]
  itens: CorrecaoItem[]
}

export interface ChatMensagem {
  role: 'user' | 'assistant'
  content: string
}

export interface ContextoQuestao {
  materia: string
  assunto: string
  enunciado: string
  alternativas: string[]
  gabarito: string | null
  alternativaAluno: string | null
  acertou: boolean | null
  fundamento: string | null
  explicacao: string | null
}

export interface ConfigStatus {
  configurado: boolean
  modelo: string
}
