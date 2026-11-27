import type { Page, Route } from '@playwright/test'

/**
 * API falsa para validar a UI sem o backend de :8080.
 * O backend real ainda não expõe /api/bancas e /api/materiais nesta rodada,
 * então o E2E roda contra o Vite (:5173) com interceptação de rede.
 */

const USUARIO = {
  id: 1,
  nome: 'Aluno E2E',
  email: 'e2e@qb.local',
  admin: false,
  emailVerificado: true,
  temSenha: true,
}

const PLANOS = [
  {
    id: 1,
    codigo: 'FREE',
    nome: 'Gratuito',
    valorCentavos: 0,
    ciclo: null,
    limiteDiarioQuestoes: 20,
    ilimitado: false,
    pago: false,
  },
  {
    id: 2,
    codigo: 'PRO_MENSAL',
    nome: 'PRO Mensal',
    valorCentavos: 2990,
    ciclo: 'MENSAL',
    limiteDiarioQuestoes: 0,
    ilimitado: true,
    pago: true,
  },
  {
    id: 3,
    codigo: 'PRO_ANUAL',
    nome: 'PRO Anual',
    valorCentavos: 23990,
    ciclo: 'ANUAL',
    limiteDiarioQuestoes: 0,
    ilimitado: true,
    pago: true,
  },
]

const ADMIN_USUARIOS = [
  {
    id: 1,
    nome: 'Aluno E2E',
    email: 'e2e@qb.local',
    admin: true,
    criadaEm: '2026-01-10T12:00:00Z',
    plano: 'PRO_MENSAL',
    statusAssinatura: 'ATIVA',
    periodoFim: '2026-12-31T00:00:00Z',
    liberaPro: true,
  },
  {
    id: 2,
    nome: 'Maria Fernanda de Souza Albuquerque',
    email: 'maria.fernanda.albuquerque@exemplo.com.br',
    admin: false,
    criadaEm: '2026-02-11T12:00:00Z',
    plano: 'FREE',
    statusAssinatura: 'SEM_ASSINATURA',
    periodoFim: null,
    liberaPro: false,
  },
  {
    id: 3,
    nome: 'João Batista',
    email: 'joao.batista@exemplo.com',
    admin: false,
    criadaEm: '2026-03-01T12:00:00Z',
    plano: 'PRO_ANUAL',
    statusAssinatura: 'ATIVA',
    periodoFim: '2027-03-01T00:00:00Z',
    liberaPro: true,
  },
  {
    id: 4,
    nome: 'Rafael Lima',
    email: 'rafael.lima@exemplo.com',
    admin: false,
    criadaEm: '2026-03-15T12:00:00Z',
    plano: 'FREE',
    statusAssinatura: 'CANCELADA',
    periodoFim: null,
    liberaPro: false,
  },
]

const BANCAS = [
  { banca: 'FGV', questoes: 1004 },
  { banca: 'CEBRASPE', questoes: 220 },
  { banca: 'CREA-AM', questoes: 40 },
]

const CONCURSOS = [
  { id: 'PM-AM', total: 602 },
  { id: 'PC-AM', total: 739 },
  { id: 'CREA-AM', total: 40 },
]

type TopicoFake = {
  materia: string
  assunto: string
  total: number
  banca: string
  concurso: string
}

const TOPICOS: TopicoFake[] = [
  { materia: 'Direito Penal', assunto: 'Crimes contra a pessoa', total: 340, banca: 'FGV', concurso: 'PM-AM' },
  { materia: 'Direito Constitucional', assunto: 'Direitos fundamentais', total: 260, banca: 'FGV', concurso: 'PC-AM' },
  { materia: 'Legislação Profissional', assunto: 'CREA-AM', total: 40, banca: 'CREA-AM', concurso: 'CREA-AM' },
]

const MATERIAIS = [
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

const MATERIAL_COMPLETO = {
  ...MATERIAIS[0],
  conteudo:
    'Art. 1º A fiscalização do exercício das profissões de engenheiro, arquiteto e agrônomo cabe ao CONFEA e aos CREA.\n\n' +
    'Art. 2º O exercício das profissões depende de registro no conselho regional.\n\n' +
    'Art. 5º O texto <b>não</b> deve ser interpretado como HTML pelo leitor.',
}

type QuestaoFake = {
  id: number
  materia: string
  assunto: string
  origem: 'PROVA' | 'AUTORAL'
  banca: string
  ano: number
  orgao: string
  cargo: string
  dificuldade: number
  enunciado: string
  alternativas: string[]
  concursos: string[]
  precedente: string | null
  verificadoEm: string | null
}

let proximoId = 1000

function questao(id: number, extras: Partial<QuestaoFake> = {}): QuestaoFake {
  return {
    id,
    materia: 'Direito Penal',
    assunto: 'Crimes contra a pessoa',
    origem: 'AUTORAL' as const,
    banca: 'FGV',
    ano: 2024,
    orgao: 'CREA-AM',
    cargo: 'Analista',
    dificuldade: 2,
    enunciado: `Enunciado da questão ${id}, com texto suficiente para o teste E2E.`,
    alternativas: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D', 'Alternativa E'],
    concursos: ['CREA-AM'],
    precedente: null,
    verificadoEm: null,
    ...extras,
  }
}

function questoes(quantidade: number): QuestaoFake[] {
  return Array.from({ length: quantidade }, (_, i) => questao(proximoId + i))
}

async function responderJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

/** Autentica o navegador e intercepta todas as chamadas /api/**. */
export async function instalarApiFake(page: Page, opcoes: { admin?: boolean } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('qb_token', 'token-e2e')
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const params = url.searchParams
    const metodo = request.method()

    if (path === '/api/usuario' && metodo === 'GET') {
      return responderJson(route, { ...USUARIO, admin: opcoes.admin ?? false })
    }
    if (path === '/api/bancas') {
      return responderJson(route, BANCAS)
    }
    if (path === '/api/concursos') {
      return responderJson(route, CONCURSOS)
    }
    if (path === '/api/topicos') {
      const banca = params.get('banca')
      const concurso = params.get('concurso')
      const filtrados = TOPICOS.filter(
        (topico) =>
          (!banca || topico.banca === banca) && (!concurso || topico.concurso === concurso),
      ).map(({ materia, assunto, total }) => ({ materia, assunto, total }))
      return responderJson(route, filtrados)
    }
    if (path === '/api/desempenho') {
      return responderJson(route, {
        respondidas: 120,
        acertos: 90,
        percentual: 75,
        porMateria: [{ materia: 'Direito Penal', respondidas: 120, acertos: 90 }],
      })
    }
    if (path === '/api/evolucao') {
      return responderJson(route, {
        respondidas: 120,
        acertos: 90,
        percentual: 75,
        tempoEstudoSegundos: 7200,
        serie: [
          { dia: '2026-11-18', respondidas: 10, acertos: 7, percentual: 70 },
          { dia: '2026-11-19', respondidas: 20, acertos: 15, percentual: 75 },
          { dia: '2026-11-20', respondidas: 30, acertos: 24, percentual: 80 },
        ],
      })
    }
    if (path === '/api/materiais') {
      const concurso = params.get('concurso')
      return responderJson(route, concurso === 'CREA-AM' ? MATERIAIS : [])
    }
    if (path.startsWith('/api/materiais/')) {
      const slug = decodeURIComponent(path.slice('/api/materiais/'.length))
      if (slug === MATERIAL_COMPLETO.slug) {
        return responderJson(route, MATERIAL_COMPLETO)
      }
      return responderJson(route, { message: 'material não encontrado' }, 404)
    }
    if (path === '/api/questoes' && metodo === 'GET') {
      const quantidade = Math.min(Number(params.get('quantidade') ?? 10), 10)
      return responderJson(route, questoes(Math.max(1, quantidade)))
    }
    if (path.startsWith('/api/questoes/') && path.endsWith('/responder') && metodo === 'POST') {
      return responderJson(route, {
        acertou: true,
        correta: 0,
        gabarito: 'A',
        explicacao: 'Comentário da questão no E2E.',
        fundamento: 'Art. 1º do CP',
        assunto: 'Crimes contra a pessoa',
        origem: 'AUTORAL',
        precedente: null,
        verificadoEm: null,
      })
    }
    if (path === '/api/simulado' && metodo === 'GET') {
      const quantidade = Number(params.get('quantidade') ?? 60)
      const banca = params.get('banca') ?? 'TODAS'
      const concurso = params.get('concurso') ?? 'TODOS'
      return responderJson(route, {
        concurso,
        nome: `${banca === 'TODAS' ? 'Simulado' : banca} · ${concurso === 'TODOS' ? 'todos os certames' : concurso}`,
        totalPrevisto: quantidade,
        totalGerado: quantidade,
        questoes: questoes(quantidade),
        avisos: [],
      })
    }
    if (path === '/api/simulado/corrigir' && metodo === 'POST') {
      return responderJson(route, {
        acertos: 1,
        total: 1,
        percentual: 100,
        porMateria: [{ materia: 'Direito Penal', acertos: 1, total: 1 }],
        itens: [
          {
            questaoId: proximoId,
            materia: 'Direito Penal',
            assunto: 'Crimes contra a pessoa',
            origem: 'AUTORAL',
            correta: 0,
            gabarito: 'A',
            alternativaAluno: 0,
            acertou: true,
            explicacao: 'Comentário do simulado no E2E.',
            fundamento: 'Art. 1º do CP',
          },
        ],
      })
    }
    if (path === '/api/config/deepseek') {
      return responderJson(route, { configurado: true, modelo: 'deepseek-chat' })
    }
    if (path === '/api/planos') {
      return responderJson(route, PLANOS)
    }
    if (path === '/api/assinatura') {
      return responderJson(route, {
        status: 'ATIVA',
        plano: PLANOS[0],
        periodoFim: '2026-12-31T00:00:00Z',
        cancelaNoFim: false,
        carenciaFim: null,
        liberaPro: false,
        pagamentoConfigurado: true,
      })
    }
    if (path === '/api/assinatura/checkout' && metodo === 'POST') {
      return responderJson(route, { url: 'https://www.mercadopago.com.br/checkout/v1/redirect' })
    }
    if (path === '/api/assinatura/cancelar' && metodo === 'POST') {
      return responderJson(route, { ok: true })
    }
    if (path === '/api/admin/usuarios') {
      return responderJson(route, ADMIN_USUARIOS)
    }
    if (path === '/api/admin/assinaturas/conceder' && metodo === 'POST') {
      return responderJson(route, {
        plano: 'PRO_MENSAL',
        status: 'ATIVA',
        periodoFim: '2027-01-31T00:00:00Z',
        liberaPro: true,
      })
    }
    if (path === '/api/admin/assinaturas/revogar' && metodo === 'POST') {
      return responderJson(route, {
        plano: 'FREE',
        status: 'REVOGADA',
        periodoFim: null,
        liberaPro: false,
      })
    }
    if (path === '/api/usuario/dados') {
      return responderJson(route, { respostas: 120, sessoes: 12, usuario: USUARIO })
    }
    if (path === '/api/chat' && metodo === 'POST') {
      return responderJson(route, { resposta: 'O artigo 5º da Constituição garante a resposta.' })
    }
    if (path === '/api/estudo' && metodo === 'POST') {
      return responderJson(route, { ok: true })
    }
    if (path === '/api/publico/materias') {
      return responderJson(route, [
        { materia: 'Direito Penal', questoes: 340 },
        { materia: 'Direito Constitucional', questoes: 260 },
        { materia: 'Legislação Institucional', questoes: 120 },
      ])
    }
    if (path === '/api/publico/questoes') {
      return responderJson(route, questoes(10))
    }
    if (path === '/api/publico/responder' && metodo === 'POST') {
      return responderJson(route, {
        acertou: true,
        gabarito: 0,
        explicacao: 'Comentário da prática gratuita no E2E.',
        fundamento: 'Art. 5º da CF',
      })
    }
    if (path === '/api/assinatura/uso') {
      return responderJson(route, {
        plano: PLANOS[0],
        limiteDiarioQuestoes: 20,
        ilimitado: false,
        respondidasHoje: 3,
      })
    }
    if (path === '/api/logout') {
      return responderJson(route, { ok: true })
    }

    return responderJson(route, { message: `rota E2E não mockada: ${metodo} ${path}` }, 404)
  })
}
