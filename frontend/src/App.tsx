import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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
import { ABAS, AppHeader, MaisSheet, MobileTabBar, type Aba } from './AppShell'
import { EstudoQuestao, FimSessao, TreinoInicio } from './Treino'
import AuthScreen from './Auth'
import ContaSeguranca from './ContaSeguranca'
import SiteHeader, { SiteFooter, type PaginaPublica } from './SiteHeader'
import ContatoBar from './ContatoBar'
import Landing from './Inicio'
import PraticaGratis from './PraticaGratis'
import { ErrorBanner, LoadingState } from './ui'

// Abas pesadas só carregam quando o aluno abre a seção (code splitting).
const Fixacao = lazy(() => import('./Fixacao'))
const Simulado = lazy(() => import('./Simulado'))
const Evolucao = lazy(() => import('./Evolucao'))
const Certames = lazy(() => import('./Certames'))
const Planos = lazy(() => import('./Planos'))
const Admin = lazy(() => import('./Admin'))

type Fase = 'inicio' | 'estudando' | 'fim'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

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
  const [aba, setAba] = useState<Aba>('treino')
  const [maisAberto, setMaisAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregandoFiltros, setCarregandoFiltros] = useState(true)
  const [bancasIndisponiveis, setBancasIndisponiveis] = useState(false)
  const [concursosIndisponiveis, setConcursosIndisponiveis] = useState(false)

  const [fase, setFase] = useState<Fase>('inicio')
  const [materia, setMateria] = useState('')
  const [assunto, setAssunto] = useState('')
  const [quantidade, setQuantidade] = useState(10)
  const [modoTempo, setModoTempo] = useState<'pomodoro' | 'livre'>('pomodoro')
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

  // O login aberto por cima do site vira uma entrada no histórico: o botão
  // "voltar" do navegador fecha o login e retorna ao site (em vez de sair da página).
  useEffect(() => {
    function aoVoltarHistorico() {
      setMostrarAuth(false)
      setIntentAuth(null)
    }
    window.addEventListener('popstate', aoVoltarHistorico)
    return () => window.removeEventListener('popstate', aoVoltarHistorico)
  }, [])

  function onAutenticado(auth: AuthData) {
    // ponto único: vale para login por e-mail e por Google
    if (auth.token) localStorage.setItem('qb_token', auth.token)
    setUsuario(auth.usuario)
    setMostrarAuth(false)
    setMaisAberto(false)
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
      setDesempenho(null)
      setFase('inicio')
      setAba('treino')
      setMaisAberto(false)
      setPaginaPublica('inicio')
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

  useEffect(() => {
    setMaisAberto(false)
  }, [aba])

  useEffect(() => {
    if (typeof window === 'undefined' || window.scrollY <= 0) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    window.scrollTo({ top: 0, behavior: reduzir ? 'auto' : 'smooth' })
  }, [aba])

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
      const alvo = evento.target as HTMLElement | null
      if (
        alvo &&
        (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))
      ) {
        return
      }
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
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
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 text-sm text-ink-500">
        Abrindo sua conta…
      </div>
    )
  }

  function abrirAuth(intent?: 'planos') {
    setIntentAuth(intent === 'planos' ? 'planos' : null)
    window.history.pushState({ auth: true }, '')
    setMostrarAuth(true)
  }

  // visitante: site aberto (landing, prática grátis e planos) com login sob demanda
  if (!usuario) {
    if (mostrarAuth) {
      return (
        <AuthScreen
          onAutenticado={onAutenticado}
          onVoltar={() => window.history.back()}
        />
      )
    }
    return (
      <div className="flex min-h-dvh flex-col bg-canvas">
        <ContatoBar />
        <SiteHeader
          atual={paginaPublica}
          onNavegar={setPaginaPublica}
          onEntrar={abrirAuth}
          onCriarConta={abrirAuth}
        />
        <main id="conteudo" className="flex-1">
          {paginaPublica === 'inicio' ? (
            <Landing onNavegar={setPaginaPublica} onCriarConta={abrirAuth} />
          ) : null}
          {paginaPublica === 'pratica' ? (
            <PraticaGratis onNavegar={setPaginaPublica} onCriarConta={abrirAuth} />
          ) : null}
          {paginaPublica === 'planos' ? (
            <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
              <Suspense fallback={<LoadingState label="Carregando planos…" />}>
                <Planos anonimo onAssinar={() => abrirAuth('planos')} />
              </Suspense>
            </div>
          ) : null}
        </main>
        <SiteFooter />
      </div>
    )
  }

  const rotuloAtual = ABAS.find((item) => item.id === aba)?.rotulo ?? 'QB Concurso'

  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#conteudo" className="qb-skip-link">
        Pular para o conteúdo
      </a>

      <ContatoBar />
      <AppHeader
        usuario={usuario}
        desempenho={desempenho}
        aba={aba}
        onAba={setAba}
        onSair={() => void sair()}
      />

      <main
        id="conteudo"
        tabIndex={-1}
        className={`qb-main focus:outline-none ${aba === 'treino' ? 'max-w-4xl' : 'max-w-6xl'}`}
      >
        <p className="sr-only" aria-live="polite">
          {rotuloAtual}
        </p>

        {erro ? <ErrorBanner className="mb-4">{erro}</ErrorBanner> : null}

        <Suspense fallback={<LoadingState label="Abrindo seção…" />}>
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

          {aba === 'admin' && usuario.admin ? <Admin /> : null}

          {aba === 'conta' ? (
            <ContaSeguranca
              usuario={usuario}
              onSair={() => {
                localStorage.removeItem('qb_token')
                setUsuario(null)
                setPaginaPublica('inicio')
              }}
            />
          ) : null}

          {aba === 'treino' && fase === 'inicio' ? (
            <TreinoInicio
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
            <EstudoQuestao
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
            <FimSessao
              acertos={acertos}
              total={sessao.length}
              onNova={() => {
                setFase('inicio')
                setSessao([])
              }}
            />
          ) : null}
        </Suspense>
      </main>

      <MobileTabBar
        aba={aba}
        onAba={setAba}
        onMais={() => setMaisAberto((valor) => !valor)}
        maisAberto={maisAberto}
      />

      <MaisSheet
        aberto={maisAberto}
        onClose={() => setMaisAberto(false)}
        usuario={usuario}
        aba={aba}
        onAba={setAba}
        onSair={() => void sair()}
      />
    </div>
  )
}
