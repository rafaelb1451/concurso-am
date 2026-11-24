import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type Answer, type Concurso, type Desempenho, type Question, type Topico } from './api'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

type Fase = 'inicio' | 'estudando' | 'fim'

export default function App() {
  const [topico, setTopico] = useState<Topico[]>([])
  const [desempenho, setDesempenho] = useState<Desempenho | null>(null)
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [concurso, setConcurso] = useState('TODOS')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [fase, setFase] = useState<Fase>('inicio')
  const [materia, setMateria] = useState('')
  const [assunto, setAssunto] = useState('')
  const [quantidade, setQuantidade] = useState(10)

  const [sessao, setSessao] = useState<Question[]>([])
  const [indice, setIndice] = useState(0)
  const [resposta, setResposta] = useState<Answer | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [acertos, setAcertos] = useState(0)

  const carregarPainel = useCallback(async () => {
    try {
      const [t, d, c] = await Promise.all([
        api.topicos(concurso),
        api.desempenho(concurso),
        api.concursos(),
      ])
      setTopico(t)
      setDesempenho(d)
      setConcursos(c)
    } catch {
      setErro('Não foi possível falar com o servidor. Ele está rodando?')
    }
  }, [concurso])

  useEffect(() => {
    void carregarPainel()
  }, [carregarPainel])

  /** Troca o concurso alvo: zera filtros e sessao, porque o universo de questoes muda. */
  function trocarConcurso(id: string) {
    setConcurso(id)
    setMateria('')
    setAssunto('')
    setFase('inicio')
    setSessao([])
    setResposta(null)
    setEscolhida(null)
    setErro(null)
  }

  const materias = useMemo(() => [...new Set(topico.map((t) => t.materia))].sort(), [topico])
  const assuntos = useMemo(
    () => topico.filter((t) => !materia || t.materia === materia).map((t) => t.assunto),
    [topico, materia],
  )

  async function comecar() {
    setCarregando(true)
    setErro(null)
    try {
      const qs = await api.questoes(concurso, materia || undefined, assunto || undefined, quantidade)
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

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
              PM-AM · PC-AM
            </p>
            <h1 className="text-xl font-bold text-ink-900">Banco de questões</h1>
          </div>
          {desempenho ? (
            <div className="flex gap-4 text-center">
              <Metrica valor={String(desempenho.respondidas)} rotulo="respondidas" />
              <Metrica valor={String(desempenho.acertos)} rotulo="acertos" />
              <Metrica valor={`${desempenho.percentual}%`} rotulo="aproveitamento" destaque />
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {erro ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {erro}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Estudando para
          </span>
          {concursos.map((c) => {
            const ativo = c.id === concurso
            return (
              <button
                key={c.id}
                onClick={() => trocarConcurso(c.id)}
                className={
                  ativo
                    ? 'rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white'
                    : 'rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700'
                }
              >
                {rotuloConcurso(c.id)}
                <span className={ativo ? 'ml-1 opacity-75' : 'ml-1 text-ink-400'}>{c.total}</span>
              </button>
            )
          })}
        </div>

        {fase === 'inicio' ? (
          <Inicio
            materias={materias}
            assuntos={assuntos}
            materia={materia}
            assunto={assunto}
            quantidade={quantidade}
            carregando={carregando}
            onMateria={(valor) => {
              setMateria(valor)
              setAssunto('')
            }}
            onAssunto={setAssunto}
            onQuantidade={setQuantidade}
            onComecar={comecar}
            totalQuestoes={topico.reduce((soma, t) => soma + t.total, 0)}
          />
        ) : null}

        {fase === 'estudando' && atual ? (
          <Estudo
            questao={atual}
            indice={indice}
            total={sessao.length}
            resposta={resposta}
            escolhida={escolhida}
            onResponder={responder}
            onProxima={proxima}
          />
        ) : null}

        {fase === 'fim' ? (
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

function rotuloConcurso(id: string): string {
  if (id === 'PM-AM') return 'Soldado PM-AM'
  if (id === 'PC-AM') return 'Investigador PC-AM'
  return 'Todos'
}

function Metrica({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {  return (
    <div>
      <p className={destaque ? 'text-lg font-bold text-accent-600' : 'text-lg font-bold text-ink-900'}>
        {valor}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{rotulo}</p>
    </div>
  )
}

function Inicio(props: {
  materias: string[]
  assuntos: string[]
  materia: string
  assunto: string
  quantidade: number
  carregando: boolean
  totalQuestoes: number
  onMateria: (v: string) => void
  onAssunto: (v: string) => void
  onQuantidade: (v: number) => void
  onComecar: () => void
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink-900">Montar sessão</h2>
      <p className="mt-1 text-sm text-ink-500">
        {props.totalQuestoes} questões no banco. Filtre por matéria e assunto, ou treine tudo.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Matéria</span>
          <select
            value={props.materia}
            onChange={(e) => props.onMateria(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="">Todas</option>
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
            value={props.assunto}
            onChange={(e) => props.onAssunto(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            <option value="">Todos</option>
            {props.assuntos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Questões</span>
          <select
            value={props.quantidade}
            onChange={(e) => props.onQuantidade(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        onClick={props.onComecar}
        disabled={props.carregando}
        className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
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
  onResponder: (i: number) => void
  onProxima: () => void
}) {
  const { questao, resposta, escolhida } = props
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

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        {questao.banca ? (
          <p className="mb-3 text-xs text-ink-500">
            {questao.banca}
            {questao.ano ? ` · ${questao.ano}` : ''}
            {questao.orgao ? ` · ${questao.orgao}` : ''}
            {questao.cargo ? ` · ${questao.cargo}` : ''}
          </p>
        ) : null}

        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-900">
          {questao.enunciado}
        </p>

        <ul className="mt-5 space-y-2">
          {questao.alternativas.map((texto, i) => {
            const correta = resposta && i === resposta.correta
            const errada = resposta && i === escolhida && !resposta.acertou
            const classe = correta
              ? 'border-brand-500 bg-brand-50 text-ink-900'
              : errada
                ? 'border-red-400 bg-red-50 text-ink-900'
                : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-ink-50'
            return (
              <li key={i}>
                <button
                  onClick={() => props.onResponder(i)}
                  disabled={resposta !== null}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${classe} disabled:cursor-default`}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                    {LETRAS[i]}
                  </span>
                  <span className="leading-relaxed">{texto}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {resposta ? (
        <div
          className={`rounded-2xl border p-5 ${
            resposta.acertou ? 'border-brand-200 bg-brand-50' : 'border-accent-200 bg-accent-50'
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
            className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
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
    <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
      <p className="text-sm text-ink-500">Sessão concluída</p>
      <p className="mt-2 text-4xl font-bold text-ink-900">
        {acertos}/{total}
      </p>
      <p className="mt-1 text-sm text-ink-600">{pct}% de acerto</p>
      <button
        onClick={onNova}
        className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Nova sessão
      </button>
    </div>
  )
}
