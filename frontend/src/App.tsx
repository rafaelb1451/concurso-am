import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  ApiError,
  type Answer,
  type Auth as AuthData,
  type Banca,
  type Concurso,
  type Desempenho,
  type Question,
  type Topico,
  type Usuario,
} from './api'
import { Highlighter, Pencil, Scissors } from 'lucide-react'
import Fixacao from './Fixacao'
import Simulado from './Simulado'
import Evolucao from './Evolucao'
import Certames from './Certames'
import Planos from './Planos'
import AuthScreen from './Auth'
import Rascunho from './Rascunho'
import MarcadorTexto from './MarcadorTexto'
import PomodoroEstudo, { type ModoTempo } from './PomodoroEstudo'
import Admin from './Admin'
import ContaSeguranca from './ContaSeguranca'
import Logo from './Logo'
import SiteHeader, { type PaginaPublica } from './SiteHeader'
import Landing from './Inicio'
import PraticaGratis from './PraticaGratis'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

type Fase = 'inicio' | 'estudando' | 'fim'

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [checandoSessao, setChecandoSessao] = useState(true)
  const [paginaPublica, setPaginaPublica] = useState<PaginaPublica>('inicio')
  const [mostrarAuth, setMostrarAuth] = useState(false)
  /** Se o login foi aberto pelo botão "Assinar", volta direto para Planos. */
  const [intentAuth, setIntentAuth] = useState<'planos' | null>(null)
  const [topico, setTopico] = useState<Topico[]>([])
  const [desempenho, setDesempenho] = useState<Desempenho | null>(null)
  const [bancas, setBancas] = useState<Banca[]>([])
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [banca, setBanca] = useState('TODAS')
  const [concurso, setConcurso] = useState('TODOS')
  const [aba, setAba] = useState<
    'treino' | 'fixacao' | 'simulado' | 'evolucao' | 'certames' | 'planos' | 'conta' | 'admin'
  >('treino')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregandoFiltros, setCarregandoFiltros] = useState(true)
  const [bancasIndisponiveis, setBancasIndisponiveis] = useState(false)
  const [concursosIndisponiveis, setConcursosIndisponiveis] = useState(false)

  const [fase, setFase] = useState<Fase>('inicio')
  const [materia, setMateria] = useState('')
  const [assunto, setAssunto] = useState('')
  const [quantidade, setQuantidade] = useState(10)
  const [modoTempo, setModoTempo] = useState<ModoTempo>('pomodoro')
  const [duracaoSessao, setDuracaoSessao] = useState(25)

  const [sessao, setSessao] = useState<Question[]>([])
  const [indice, setIndice] = useState(0)
  const [resposta, setResposta] = useState<Answer | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [acertos, setAcertos] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('qb_token')
    if (!token) {
      setChecandoSessao(false)
      return
    }
    api.usuario()
      .then((dados) => setUsuario(dados))
      .catch(() => {
        localStorage.removeItem('qb_token')
        setUsuario(null)
      })
      .finally(() => setChecandoSessao(false))
  }, [])

  function onAutenticado(auth: AuthData) {
    // ponto unico: vale para login por e-mail e por Google
    if (auth.token) localStorage.setItem('qb_token', auth.token)
    setUsuario(auth.usuario)
    setMostrarAuth(false)
    if (intentAuth === 'planos') {
      setAba('planos')
      setIntentAuth(null)
    }
  }

  async function sair() {
    try {
      await api.logout()
    } finally {
      localStorage.removeItem('qb_token')
      setUsuario(null)
      setFase('inicio')
      setAba('treino')
    }
  }

  const carregarPainel = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([
        api.topicos(banca, concurso),
        api.desempenho(banca, concurso),
      ])
      setTopico(t)
      setDesempenho(d)
      setErro(null)
    } catch {
      setErro('Não foi possível falar com o servidor. Ele está rodando?')
    }
  }, [banca, concurso])

  // Listas dinâmicas de banca e certame. 404 vira estado elegante (select só com "Todas/Todos").
  useEffect(() => {
    if (!usuario) return
    let ativo = true
    setCarregandoFiltros(true)
    setBancasIndisponiveis(false)
    setConcursosIndisponiveis(false)
    void Promise.allSettled([api.bancas(), api.concursos()]).then(([bancasResult, concursosResult]) => {
      if (!ativo) return
      if (bancasResult.status === 'fulfilled') {
        setBancas(bancasResult.value)
      } else {
        setBancas([])
        setBancasIndisponiveis(
          bancasResult.reason instanceof ApiError && bancasResult.reason.status === 404,
        )
      }
      if (concursosResult.status === 'fulfilled') {
        setConcursos(concursosResult.value)
      } else {
        setConcursos([])
        setConcursosIndisponiveis(
          concursosResult.reason instanceof ApiError && concursosResult.reason.status === 404,
        )
      }
      setCarregandoFiltros(false)
    })
    return () => {
      ativo = false
    }
  }, [usuario])

  useEffect(() => {
    if (!usuario) return
    void carregarPainel()
  }, [carregarPainel, usuario])

  function resetSessao() {
    setFase('inicio')
    setSessao([])
    setResposta(null)
    setEscolhida(null)
    setErro(null)
  }

  /** Troca a banca: zera filtros e sessão, porque o universo de questões muda. */
  function trocarBanca(valor: string) {
    setBanca(valor)
    setMateria('')
    setAssunto('')
    resetSessao()
  }

  /** Troca o certame alvo: zera filtros e sessão, porque o universo de questões muda. */
  function trocarConcurso(id: string) {
    setConcurso(id)
    setMateria('')
    setAssunto('')
    resetSessao()
  }

  /** Atalho da aba Certames: foca o certame e, se houver, matéria/assunto do material. */
  /** Atalho da aba Certames: monta o simulado já com o certame escolhido. */
  function simularCertame(id: string) {
    setConcurso(id)
    setBanca('TODAS')
    setAba('simulado')
  }

  function estudarCertame(id: string, extra?: { materia?: string; assunto?: string }) {
    setConcurso(id)
    setBanca('TODAS')
    setMateria(extra?.materia ?? '')
    setAssunto(extra?.assunto ?? '')
    resetSessao()
    setAba('treino')
  }

  const materias = useMemo(() => [...new Set(topico.map((t) => t.materia))].sort(), [topico])
  const assuntos = useMemo(
    () => [...new Set(topico.filter((t) => !materia || t.materia === materia).map((t) => t.assunto))].sort(),
    [topico, materia],
  )

  async function comecar() {
    setCarregando(true)
    setErro(null)
    try {
      const limite = modoTempo === 'livre' ? 50 : quantidade
      const qs = await api.questoes(
        banca,
        concurso,
        materia || undefined,
        assunto || undefined,
        limite,
      )
      if (qs.length === 0) {
        setErro('Nenhuma questão encontrada com esses filtros.')
        return
      }
      setSessao(qs)
      setIndice(0)
      setAcertos(0)
      setResposta(null)
      setEscolhida(null)
      setFase('estudando')
    } catch {
      setErro('Não foi possível carregar as questões.')
    } finally {
      setCarregando(false)
    }
  }

  const atual = sessao[indice]

  const responder = useCallback(
    async (alternativa: number) => {
      if (!atual || resposta) return
      setEscolhida(alternativa)
      try {
        const resultado = await api.responder(atual.id, alternativa)
        setResposta(resultado)
        if (resultado.acertou) setAcertos((n) => n + 1)
      } catch {
        setErro('Erro ao registrar a resposta.')
        setEscolhida(null)
      }
    },
    [atual, resposta],
  )

  function proxima() {
    if (indice + 1 >= sessao.length) {
      setFase('fim')
      void carregarPainel()
      return
    }
    setIndice((n) => n + 1)
    setResposta(null)
    setEscolhida(null)
  }

  useEffect(() => {
    if (fase !== 'estudando' || resposta) return
    function aoTeclar(evento: KeyboardEvent) {
      const tecla = evento.key.toUpperCase()
      const posicao = LETRAS.indexOf(tecla)
      if (posicao >= 0 && atual && posicao < atual.alternativas.length) {
        void responder(posicao)
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [fase, resposta, atual, responder])

  if (checandoSessao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-500">
        Abrindo sua conta…
      </div>
    )
  }

  function abrirAuth(intent?: 'planos') {
    setIntentAuth(intent === 'planos' ? 'planos' : null)
    setMostrarAuth(true)
  }

  // visitante: site aberto (landing, pratica gratis e planos) com login sob demanda
  if (!usuario) {
    if (mostrarAuth) {
      return (
        <div className="relative">
          {/* o Auth é um layout de tela cheia (duas colunas no desktop); não pode ir dentro de max-w-md */}
          <button
            onClick={() => {
              setMostrarAuth(false)
              setIntentAuth(null)
            }}
            className="fixed left-4 top-4 z-20 rounded-lg bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-ink-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            ← voltar ao site
          </button>
          <AuthScreen onAutenticado={onAutenticado} />
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-canvas">
        <SiteHeader
          atual={paginaPublica}
          onNavegar={setPaginaPublica}
          onEntrar={abrirAuth}
          onCriarConta={abrirAuth}
        />
        {paginaPublica === 'inicio' ? (
          <Landing onNavegar={setPaginaPublica} onCriarConta={abrirAuth} />
        ) : null}
        {paginaPublica === 'pratica' ? (
          <PraticaGratis onNavegar={setPaginaPublica} onCriarConta={abrirAuth} />
        ) : null}
        {paginaPublica === 'planos' ? (
          <div className="mx-auto max-w-4xl px-5 py-10">
            <Planos anonimo onAssinar={() => abrirAuth('planos')} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10 shrink-0" />
            <div>
              <h1 className="text-[17px] font-bold leading-tight tracking-tight text-ink-900">
                QB Concurso
              </h1>
              <p className="mt-0.5 text-[11.5px] font-medium text-ink-500">
                Quebrando a Banca · estudo por banca e certame
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {desempenho ? (
              <div className="hidden items-center gap-6 sm:flex">
                <Metrica valor={String(desempenho.respondidas)} rotulo="respondidas" />
                <Metrica valor={String(desempenho.acertos)} rotulo="acertos" />
                <Metrica valor={`${desempenho.percentual}%`} rotulo="aproveitamento" destaque />
              </div>
            ) : null}
            <div className="text-right">
              <p className="text-xs font-bold text-ink-800">{usuario.nome}</p>
              <button
                onClick={() => void sair()}
                className="text-[11px] font-semibold text-ink-400 hover:text-brand-700"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <nav className="qb-scroll mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5">
          {([
            'treino', 'fixacao', 'simulado', 'evolucao', 'certames', 'planos', 'conta',
            ...(usuario?.admin ? (['admin'] as const) : []),
          ] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={
                aba === a
                  ? '-mb-px shrink-0 whitespace-nowrap border-b-2 border-brand-700 px-3 py-2.5 text-[13px] font-semibold text-brand-800'
                  : '-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-semibold text-ink-500 transition hover:text-ink-800'
              }
            >
              {a === 'treino'
                ? 'Questões'
                : a === 'fixacao'
                  ? 'Fixação + tutor'
                  : a === 'simulado'
                    ? 'Simulado'
                    : a === 'evolucao'
                      ? 'Evolução'
                      : a === 'certames'
                        ? 'Certames'
                        : a === 'planos'
                          ? 'Planos'
                          : a === 'admin'
                            ? 'Admin'
                            : 'Conta'}
            </button>
          ))}
        </nav>
      </header>

      <main
        className={`mx-auto px-5 py-7 ${aba === 'treino' ? 'max-w-4xl' : 'max-w-6xl'}`}
      >
        {erro ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erro}
          </p>
        ) : null}

        {aba === 'fixacao' ? <Fixacao banca={banca} concurso={concurso} /> : null}
        {aba === 'simulado' ? (
          <Simulado
            bancaInicial={banca}
            concursoInicial={concurso}
            bancas={bancas}
            concursos={concursos}
          />
        ) : null}
        {aba === 'evolucao' ? (
          <Evolucao
            banca={banca}
            concurso={concurso}
            bancas={bancas}
            concursos={concursos}
            topicos={topico}
            onBanca={trocarBanca}
            onConcurso={trocarConcurso}
          />
        ) : null}
        {aba === 'certames' ? (
          <Certames
            concursos={concursos}
            carregandoConcursos={carregandoFiltros}
            concursosIndisponiveis={concursosIndisponiveis}
            onEstudar={estudarCertame}
            onSimular={simularCertame}
          />
        ) : null}
        {aba === 'planos' ? <Planos /> : null}
        {aba === 'admin' ? <Admin /> : null}
        {aba === 'conta' ? (
          <ContaSeguranca
            usuario={usuario}
            onSair={() => {
              localStorage.removeItem('qb_token')
              setUsuario(null)
            }}
          />
        ) : null}

        {aba === 'treino' && fase === 'inicio' ? (
          <Inicio
            bancas={bancas}
            concursos={concursos}
            banca={banca}
            concurso={concurso}
            carregandoFiltros={carregandoFiltros}
            bancasIndisponiveis={bancasIndisponiveis}
            concursosIndisponiveis={concursosIndisponiveis}
            materias={materias}
            assuntos={assuntos}
            materia={materia}
            assunto={assunto}
            quantidade={quantidade}
            carregando={carregando}
            onBanca={trocarBanca}
            onConcurso={trocarConcurso}
            onMateria={(valor) => {
              setMateria(valor)
              setAssunto('')
            }}
            onAssunto={setAssunto}
            onQuantidade={setQuantidade}
            modoTempo={modoTempo}
            duracaoSessao={duracaoSessao}
            onModoTempo={setModoTempo}
            onDuracaoSessao={setDuracaoSessao}
            onComecar={comecar}
            totalQuestoes={topico.reduce((soma, t) => soma + t.total, 0)}
          />
        ) : null}

        {aba === 'treino' && fase === 'estudando' && atual ? (
          <Estudo
            questao={atual}
            indice={indice}
            total={sessao.length}
            resposta={resposta}
            escolhida={escolhida}
            onResponder={responder}
            onProxima={proxima}
            modoTempo={modoTempo}
            duracaoSessao={duracaoSessao}
            onConcluirTempo={() => setFase('fim')}
          />
        ) : null}

        {aba === 'treino' && fase === 'fim' ? (
          <Fim
            acertos={acertos}
            total={sessao.length}
            onNova={() => {
              setFase('inicio')
              setSessao([])
            }}
          />
        ) : null}
      </main>
    </div>
  )
}

function Metrica({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className="text-right">
      <p
        className={
          destaque
            ? 'text-[17px] font-bold leading-none text-accent-600'
            : 'text-[17px] font-bold leading-none text-ink-900'
        }
      >
        {valor}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
        {rotulo}
      </p>
    </div>
  )
}

function Inicio(props: {
  bancas: Banca[]
  concursos: Concurso[]
  banca: string
  concurso: string
  carregandoFiltros: boolean
  bancasIndisponiveis: boolean
  concursosIndisponiveis: boolean
  materias: string[]
  assuntos: string[]
  materia: string
  assunto: string
  quantidade: number
  carregando: boolean
  totalQuestoes: number
  modoTempo: ModoTempo
  duracaoSessao: number
  onBanca: (v: string) => void
  onConcurso: (v: string) => void
  onMateria: (v: string) => void
  onAssunto: (v: string) => void
  onQuantidade: (v: number) => void
  onModoTempo: (v: ModoTempo) => void
  onDuracaoSessao: (v: number) => void
  onComecar: () => void
}) {
  const certames = props.concursos.filter((concurso) => concurso.id !== 'TODOS')
  const filtrosIndisponiveis = props.bancasIndisponiveis || props.concursosIndisponiveis
  const bancaAtual = props.bancas.find((item) => item.banca === props.banca)
  const certameAtual = certames.find((item) => item.id === props.concurso)

  return (
    <div className="rounded-[14px] border border-ink-200 bg-surface p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink-900">Escolha a banca e o que estudar</h2>
      <p className="mt-1 text-sm text-ink-500">
        {props.totalQuestoes} questões disponíveis com os filtros atuais. Combine banca, certame,
        matéria e assunto — ou resolva tudo.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Banca</span>
          <select
            aria-label="Banca"
            value={props.banca}
            onChange={(e) => props.onBanca(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="TODAS">Todas as bancas</option>
            {props.bancas.map((item) => (
              <option key={item.banca} value={item.banca}>
                {item.banca} ({item.questoes})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Certame</span>
          <select
            aria-label="Certame"
            value={props.concurso}
            onChange={(e) => props.onConcurso(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="TODOS">Todos os certames</option>
            {certames.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} ({item.total})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Matéria</span>
          <select
            aria-label="Matéria"
            value={props.materia}
            onChange={(e) => props.onMateria(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="">Todas as matérias</option>
            {props.materias.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Assunto</span>
          <select
            aria-label="Assunto"
            value={props.assunto}
            onChange={(e) => props.onAssunto(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="">Todos os assuntos</option>
            {props.assuntos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {props.carregandoFiltros ? (
        <p className="mt-2 text-[11px] font-medium text-ink-400">Carregando bancas e certames…</p>
      ) : filtrosIndisponiveis ? (
        <p className="mt-2 text-[11px] font-medium text-ink-400">
          Alguns filtros estão indisponíveis no momento. Você ainda pode estudar todas as questões.
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Quantidade</span>
          <select
            aria-label="Quantidade"
            value={props.quantidade}
            onChange={(e) => props.onQuantidade(Number(e.target.value))}
            disabled={props.modoTempo === 'livre'}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm disabled:bg-ink-50 disabled:text-ink-400"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>{n} questões</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Modo de estudo</span>
          <select
            aria-label="Modo de estudo"
            value={props.modoTempo}
            onChange={(e) => props.onModoTempo(e.target.value as ModoTempo)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
          >
            <option value="pomodoro">Pomodoro (25/5 min)</option>
            <option value="livre">Estudar por tempo</option>
          </select>
        </label>

        {props.modoTempo === 'livre' ? (
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Duração</span>
            <select
              aria-label="Duração"
              value={props.duracaoSessao}
              onChange={(e) => props.onDuracaoSessao(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              {[15, 25, 45, 60, 90].map((n) => (
                <option key={n} value={n}>{n} minutos</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-ink-400">
        {props.banca === 'TODAS' && props.concurso === 'TODOS'
          ? 'Sem filtro de banca ou certame: você treina o banco completo.'
          : `Filtros ativos: ${
              bancaAtual ? bancaAtual.banca : 'todas as bancas'
            } · ${certameAtual ? certameAtual.id : 'todos os certames'}${
              props.materia ? ` · ${props.materia}` : ''
            }${props.assunto ? ` · ${props.assunto}` : ''}`}
      </p>

      <button
        onClick={props.onComecar}
        disabled={props.carregando}
        className="mt-5 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
      >
        {props.carregando ? 'Carregando…' : 'Começar sessão'}
      </button>
    </div>
  )
}

function Estudo(props: {
  questao: Question
  indice: number
  total: number
  resposta: Answer | null
  escolhida: number | null
  modoTempo: ModoTempo
  duracaoSessao: number
  onResponder: (i: number) => void
  onProxima: () => void
  onConcluirTempo: () => void
}) {
  const { questao, resposta, escolhida } = props
  const [cortadas, setCortadas] = useState<Set<number>>(() => new Set())
  const [rascunhoAberto, setRascunhoAberto] = useState(false)
  const [marcadorAtivo, setMarcadorAtivo] = useState(false)

  useEffect(() => {
    setCortadas(new Set())
    setRascunhoAberto(false)
    setMarcadorAtivo(false)
  }, [questao.id])

  function alternarCortar(indice: number) {
    setCortadas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(indice)) {
        proximo.delete(indice)
      } else {
        proximo.add(indice)
      }
      return proximo
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>
          Questão {props.indice + 1} de {props.total}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={
              questao.origem === 'PROVA'
                ? 'rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-200'
                : 'rounded-full bg-accent-50 px-2 py-0.5 font-semibold text-accent-700 ring-1 ring-inset ring-accent-200'
            }
          >
            {questao.origem === 'PROVA' ? 'Prova oficial' : 'Autoral'}
          </span>
          <span>
            {questao.materia} · {questao.assunto}
          </span>
        </span>
      </div>

      <PomodoroEstudo
        materia={questao.materia}
        modo={props.modoTempo}
        duracaoSegundos={
          props.modoTempo === 'livre'
            ? props.duracaoSessao * 60
            : 25 * 60
        }
        onConcluir={props.onConcluirTempo}
      />

      <div className="rounded-[14px] border border-ink-200 bg-surface p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-3">
          <button
            onClick={() => setMarcadorAtivo((v) => !v)}
            aria-pressed={marcadorAtivo}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              marcadorAtivo
                ? 'border-yellow-300 bg-yellow-100 text-yellow-800'
                : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" />
            Marcador
          </button>
          <button
            onClick={() => setRascunhoAberto((v) => !v)}
            aria-pressed={rascunhoAberto}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              rascunhoAberto
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rascunho
          </button>
          {marcadorAtivo ? (
            <span className="text-[11px] text-ink-400">Selecione um trecho do enunciado para marcá-lo.</span>
          ) : null}
        </div>

        {questao.banca ? (
          <p className="mb-3 text-xs text-ink-500">
            {questao.banca}
            {questao.ano ? ` · ${questao.ano}` : ''}
            {questao.orgao ? ` · ${questao.orgao}` : ''}
            {questao.cargo ? ` · ${questao.cargo}` : ''}
          </p>
        ) : null}

        <MarcadorTexto texto={questao.enunciado} questaoId={questao.id} ativo={marcadorAtivo} />

        <ul className="mt-5 space-y-2">
          {questao.alternativas.map((texto, i) => {
            const cortada = cortadas.has(i)
            const correta = resposta && i === resposta.correta
            const errada = resposta && i === escolhida && !resposta.acertou
            const classe = correta
              ? 'border-ok-500 bg-ok-50 text-ink-900'
              : errada
                ? 'border-err-400 bg-err-50 text-ink-900'
                : 'border-ink-200 bg-surface hover:border-brand-300 hover:bg-ink-50'
            return (
              <li key={i} className="flex items-stretch gap-2">
                <button
                  onClick={() => props.onResponder(i)}
                  disabled={resposta !== null}
                  className={`flex flex-1 items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${classe} disabled:cursor-default ${
                    cortada ? 'opacity-40' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                    {LETRAS[i]}
                  </span>
                  <span className={`leading-relaxed ${cortada ? 'line-through' : ''}`}>{texto}</span>
                </button>
                <button
                  type="button"
                  onClick={() => alternarCortar(i)}
                  disabled={resposta !== null}
                  aria-label={cortada ? `Restaurar alternativa ${LETRAS[i]}` : `Eliminar alternativa ${LETRAS[i]}`}
                  aria-pressed={cortada}
                  title={cortada ? 'Restaurar alternativa' : 'Eliminar alternativa'}
                  className={`flex shrink-0 items-center justify-center rounded-xl border px-2.5 text-sm transition ${
                    cortada
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-surface text-ink-400 hover:border-ink-300 hover:text-ink-600'
                  }`}
                >
                  <Scissors className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>

        <Rascunho
          questaoId={questao.id}
          open={rascunhoAberto}
          onClose={() => setRascunhoAberto(false)}
        />
      </div>

      {resposta ? (
        <div
          className={`rounded-[14px] border p-5 ${
            resposta.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
          }`}
        >
          <p className="text-sm font-bold text-ink-900">
            {resposta.acertou ? 'Você acertou' : `Você errou — gabarito ${resposta.gabarito}`}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
            {resposta.explicacao ||
              (resposta.origem === 'PROVA'
                ? 'Questão de prova oficial — o comentário será adicionado em breve.'
                : 'Sem comentário cadastrado para esta questão.')}
          </p>
          {resposta.fundamento ? (
            <p className="mt-3 text-xs text-ink-500">
              <strong>Fundamento:</strong> {resposta.fundamento}
            </p>
          ) : null}
          {resposta.precedente ? (
            <p className="mt-1 text-xs text-ink-500">
              <strong>Precedente:</strong> {resposta.precedente}
            </p>
          ) : null}
          {resposta.verificadoEm ? (
            <p className="mt-1 text-[11px] text-ink-400">
              Legislação conferida em {resposta.verificadoEm.split('-').reverse().join('/')}
            </p>
          ) : null}
          <button
            onClick={props.onProxima}
            className="mt-4 w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {props.indice + 1 >= props.total ? 'Ver resultado' : 'Próxima questão'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function Fim({ acertos, total, onNova }: { acertos: number; total: number; onNova: () => void }) {
  const pct = total === 0 ? 0 : Math.round((acertos * 1000) / total) / 10
  return (
    <div className="rounded-[14px] border border-ink-200 bg-surface p-8 text-center shadow-card">
      <p className="text-sm text-ink-500">Sessão concluída</p>
      <p className="mt-2 text-4xl font-bold text-ink-900">
        {acertos}/{total}
      </p>
      <p className="mt-1 text-sm text-ink-600">{pct}% de acerto</p>
      <button
        onClick={onNova}
        className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
      >
        Nova sessão
      </button>
    </div>
  )
}
