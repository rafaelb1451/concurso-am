const BASE = '/api'

/** Erro de API com o status HTTP, para o frontend tratar 404 com um estado próprio. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function get<T>(url: string): Promise<T> {
  const token = localStorage.getItem('qb_token')
  const response = token
    ? await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    : await fetch(`${BASE}${url}`)
  if (!response.ok) {
    const corpo = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(response.status, corpo?.message ?? `Falha ao buscar ${url}`)
  }
  return response.json() as Promise<T>
}

/**
 * Baixa um recurso binário autenticado (hoje: PDF do material).
 * Quando o servidor responde JSON em vez do PDF, a mensagem do corpo é
 * propagada para a UI exibir um erro amigável.
 */
async function getBlob(url: string, fallback: string): Promise<Blob> {
  const token = localStorage.getItem('qb_token')
  const response = token
    ? await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    : await fetch(`${BASE}${url}`)
  const tipo = response.headers?.get?.('content-type') ?? ''

  if (!response.ok) {
    const corpo = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(response.status, corpo?.message ?? fallback)
  }

  if (
    tipo &&
    !/application\/pdf/i.test(tipo) &&
    !/application\/octet-stream/i.test(tipo)
  ) {
    const corpo = /json/i.test(tipo)
      ? ((await response.json().catch(() => null)) as { message?: string } | null)
      : null
    throw new ApiError(response.status, corpo?.message ?? 'O servidor não devolveu um PDF válido.')
  }

  return response.blob()
}

async function enviar<T>(url: string, metodo: 'POST' | 'PUT', body: unknown): Promise<T> {
  const token = localStorage.getItem('qb_token')
  const response = await fetch(`${BASE}${url}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const erro = (await response.json().catch(() => null)) as { message?: string } | null
    // Mantém o status para a UI distinguir, por exemplo, 403 do tutor (upgrade) de falha de rede.
    throw new ApiError(response.status, erro?.message ?? 'Erro ao enviar a resposta')
  }
  return response.json() as Promise<T>
}

async function remover<T>(url: string): Promise<T> {
  const token = localStorage.getItem('qb_token')
  const response = await fetch(`${BASE}${url}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const erro = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(response.status, erro?.message ?? 'Erro ao excluir')
  }
  return response.json() as Promise<T>
}

function post<T>(url: string, body: unknown): Promise<T> {
  return enviar<T>(url, 'POST', body)
}

function put<T>(url: string, body: unknown): Promise<T> {
  return enviar<T>(url, 'PUT', body)
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== '' && valor !== 'TODOS' && valor !== 'TODAS') {
      search.set(chave, String(valor))
    }
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

export interface Banca {
  banca: string
  questoes: number
}

export interface Concurso {
  id: string
  total: number
}

/** Categorias editoriais do material de estudo (a API pode evoluir sem quebrar a UI). */
export type CategoriaMaterial = 'LEI' | 'REGIMENTO' | 'RESOLUCAO' | 'EDITAL' | 'OUTRO'

export interface MaterialResumo {
  slug: string
  titulo: string
  resumo: string
  categoria: CategoriaMaterial | string
  fonte: string
  ordem: number
  /** Opcionais: quando o material estiver ancorado em um tópico, o CTA já filtra. */
  materia?: string | null
  assunto?: string | null
}

export interface Material extends MaterialResumo {
  /** Texto puro, com parágrafos separados por linha em branco. Nunca HTML. */
  conteudo: string
}

export interface MapaMentalRamo {
  titulo: string
  itens: string[]
}

/** Resumo visual do material: tema central e ramos, sempre texto puro. */
export interface MapaMental {
  titulo: string
  tema: string
  ramos: MapaMentalRamo[]
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


export interface Plano {
  /** Ausente no contrato novo de `/planos`; mantido opcional para compatibilidade. */
  id?: number
  codigo: string
  nome: string
  valorCentavos: number
  ciclo: string | null
  /** FREE: limite diário; -1 = ilimitado nos planos pagos. */
  limiteDiarioQuestoes: number
  /** Campos do contrato de escopo por certame (backend pode ainda não expor). */
  certamesMaximos?: number
  tutorIa?: boolean
  /** -1 = ilimitado. */
  cotaTutorDiaria?: number
  ilimitado?: boolean
  pago?: boolean
}

export interface TutorUso {
  usado: number
  /** -1 = ilimitado. */
  cota: number
}

export interface AssinaturaAtual {
  status: string
  plano: Plano
  periodoFim: string | null
  /** Campos legados — o contrato novo não os exige. */
  cancelaNoFim?: boolean
  carenciaFim?: string | null
  liberaPro?: boolean
  pagamentoConfigurado?: boolean
  /** Certames contratados; vazio/ausente = sem escopo (FREE). */
  certames?: string[]
  /** Quando ausente, a UI deriva do plano para não bloquear um Plus legado. */
  tutorIa?: boolean
  tutorUso?: TutorUso
  podeTrocarCertame?: boolean
}

export interface UsoPlano {
  plano: Plano
  limiteDiarioQuestoes: number
  ilimitado: boolean
  respondidasHoje: number
}

export interface AdminUsuario {
  id: number
  nome: string
  email: string
  admin: boolean
  criadaEm: string
  plano: string
  statusAssinatura: string
  periodoFim: string | null
  liberaPro: boolean
}

export interface AdminAssinatura {
  plano: string
  status: string
  periodoFim: string | null
  liberaPro: boolean
}

export interface MateriaResumo {
  materia: string
  questoes: number
}

export interface QuestaoPublica {
  id: number
  materia: string
  assunto: string
  enunciado: string
  alternativas: string[]
  origem: 'PROVA' | 'AUTORAL'
  banca: string
  ano: number
}

export interface RespostaPublica {
  acertou: boolean
  gabarito: number
  explicacao: string | null
  fundamento: string | null
}

export const api = {
  // ---------------------------------------------------------------- pratica gratis
  publicoMaterias: () => get<MateriaResumo[]>('/publico/materias'),
  publicoQuestoes: (materia: string, quantidade = 10) =>
    get<QuestaoPublica[]>('/publico/questoes' + qs({ materia, quantidade })),
  publicoResponder: (questaoId: number, alternativa: number) =>
    post<RespostaPublica>('/publico/responder', { questaoId, alternativa }),

  // ---------------------------------------------------------------- planos
  planos: () => get<Plano[]>('/planos'),
  assinatura: () => get<AssinaturaAtual>('/assinatura'),
  usoPlano: () => get<UsoPlano>('/assinatura/uso'),
  /** Checkout do plano com os certames escolhidos (Básico 1, Plus até 3). */
  iniciarCheckout: (plano: string, certames: string[]) =>
    post<{ url: string }>('/assinatura/checkout', { plano, certames }),
  /** Troca os certames da assinatura; o backend limita a 1 troca por ciclo. */
  trocarCertames: (certames: string[]) =>
    put<{ ok: boolean }>('/assinatura/certames', { certames }),

  adminUsuarios: (busca?: string) =>
    get<AdminUsuario[]>(`/admin/usuarios${busca ? `?q=${encodeURIComponent(busca)}` : ''}`),
  adminConceder: (email: string, plano: string, dias: number) =>
    post<AdminAssinatura>('/admin/assinaturas/conceder', { email, plano, dias }),
  adminRevogar: (email: string) =>
    post<AdminAssinatura>('/admin/assinaturas/revogar', { email }),
  cancelarAssinatura: () => post<{ ok: boolean }>('/assinatura/cancelar', {}),

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
  /** Direito ao esquecimento (LGPD): apaga a conta e todos os dados (simples, sem senha). */
  excluirConta: () => remover<{ ok: boolean }>('/conta'),
  logout: () => post<{ ok: boolean }>('/logout', {}),
  usuario: () => get<Usuario>('/usuario'),

  bancas: () => get<Banca[]>('/bancas'),
  /** Sem argumento = escopado ao plano (filtros). `catalogo` = lista completa para o checkout. */
  concursos: (catalogo = false) =>
    get<Concurso[]>(`/concursos${catalogo ? '?catalogo=true' : ''}`),
  topicos: (banca?: string, concurso?: string) =>
    get<Topico[]>(`/topicos${qs({ banca, concurso })}`),
  questoes: (banca?: string, concurso?: string, materia?: string, assunto?: string, quantidade = 10) =>
    get<Question[]>(`/questoes${qs({ banca, concurso, materia, assunto, quantidade })}`),
  responder: (id: number, alternativa: number) =>
    post<Answer>(`/questoes/${id}/responder`, { alternativa }),
  desempenho: (banca?: string, concurso?: string) =>
    get<Desempenho>(`/desempenho${qs({ banca, concurso })}`),
  evolucao: (banca?: string, concurso?: string, materia?: string, dias = 30) =>
    get<Evolucao>(`/evolucao${qs({ banca, concurso, materia, dias })}`),
  registrarEstudo: (materia: string | null, duracaoSegundos: number) =>
    post<{ ok: boolean }>('/estudo', { materia, duracaoSegundos }),

  // material de estudo (somente leitura, texto puro)
  materiais: (concurso: string) =>
    get<MaterialResumo[]>(`/materiais${qs({ concurso })}`),
  material: (slug: string) =>
    get<Material>(`/materiais/${encodeURIComponent(slug)}`),
  mapaMental: (slug: string) =>
    get<MapaMental>(`/materiais/${encodeURIComponent(slug)}/mapa-mental`),
  materialPdf: (slug: string) =>
    getBlob(
      `/materiais/${encodeURIComponent(slug)}/pdf`,
      'Não foi possível gerar o PDF deste material.',
    ),

  // tutor (chat)
  configDeepseek: () => get<ConfigStatus>('/config/deepseek'),
  salvarChave: (apiKey: string) => post<ConfigStatus>('/config/deepseek', { apiKey }),
  chat: (mensagens: ChatMensagem[], contexto: ContextoQuestao | null) =>
    post<{ resposta: string }>('/chat', { mensagens, contexto }),

  // simulado
  simulado: (banca?: string, concurso?: string, quantidade = 60) =>
    get<Simulado>(`/simulado${qs({ banca, concurso, quantidade })}`),
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
