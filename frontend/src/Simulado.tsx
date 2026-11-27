import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Clock3, Flag, PencilLine, Timer, Trophy } from 'lucide-react'
import {
  api,
  type Banca,
  type Concurso,
  type Correcao,
  type Simulado as SimuladoTipo,
} from './api'
import Rascunho from './Rascunho'
import { Card, ErrorBanner, PageHeader, ProgressBar } from './ui'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

/** Estimativa de prova: ~3,5 min por questão, arredondada para 5 minutos. */
function duracaoMinutos(quantidade: number): number {
  return Math.max(30, Math.round((quantidade * 3.5) / 5) * 5)
}

/** Total previsto pelo backend; cai para a quantidade pedida quando ele não informa. */
function totalDaProva(simulado: SimuladoTipo, quantidade: number): number {
  return simulado.totalPrevisto > 0 ? simulado.totalPrevisto : quantidade
}

type Etapa = 'inicio' | 'prova' | 'resultado'

function formatar(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/**
 * Simulado no formato da prova: mesma distribuição de matérias do caderno,
 * tempo de prova, e gabarito só no final — como na banca.
 */
export default function Simulado({
  bancaInicial = 'TODAS',
  concursoInicial = 'TODOS',
  bancas = [],
  concursos = [],
}: {
  bancaInicial?: string
  concursoInicial?: string
  bancas?: Banca[]
  concursos?: Concurso[]
}) {
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [banca, setBanca] = useState(bancaInicial)
  const [concurso, setConcurso] = useState(concursoInicial)
  const [quantidade, setQuantidade] = useState(50)
  const [simulado, setSimulado] = useState<SimuladoTipo | null>(null)
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [restante, setRestante] = useState(0)
  const [correcao, setCorrecao] = useState<Correcao | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tempoGasto, setTempoGasto] = useState(0)
  const [rascunhoAberto, setRascunhoAberto] = useState(false)
  const finalizando = useRef(false)

  const finalizar = useCallback(async () => {
    if (!simulado || finalizando.current) return
    finalizando.current = true
    setCarregando(true)
    try {
      const lista = simulado.questoes
        .filter((q) => respostas[q.id] !== undefined)
        .map((q) => ({ questaoId: q.id, alternativa: respostas[q.id] }))
      const c = await api.corrigirSimulado(simulado.concurso, lista)
      const total = totalDaProva(simulado, quantidade)
      setTempoGasto(duracaoMinutos(total) * 60 - restante)
      setCorrecao(c)
      setEtapa('resultado')
    } catch {
      setErro('Não foi possível corrigir o simulado. Tente novamente.')
    } finally {
      setCarregando(false)
      finalizando.current = false
    }
  }, [simulado, respostas, restante, quantidade])

  useEffect(() => {
    if (etapa !== 'prova') return
    if (restante <= 0) {
      void finalizar()
      return
    }
    const t = window.setTimeout(() => setRestante((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [etapa, restante, finalizar])

  async function iniciar() {
    setCarregando(true)
    setErro(null)
    try {
      const s = await api.simulado(banca, concurso, quantidade)
      setSimulado(s)
      setRespostas({})
      setIndice(0)
      // O backend pode ajustar o total (formato do caderno); o cronômetro segue o total real.
      setRestante(duracaoMinutos(totalDaProva(s, quantidade)) * 60)
      setTempoGasto(0)
      setCorrecao(null)
      setRascunhoAberto(false)
      setEtapa('prova')
    } catch {
      setErro('Não foi possível montar o simulado. Verifique os filtros e tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  const atual = simulado?.questoes[indice]

  // Ao navegar entre questões, a gaveta fecha para não cobrir a próxima.
  useEffect(() => {
    setRascunhoAberto(false)
  }, [atual?.id])

  const respondidas = Object.keys(respostas).length
  const progresso = simulado ? Math.round((respondidas / Math.max(1, simulado.questoes.length)) * 100) : 0
  const emRisco = restante > 0 && restante < 300

  const porMateria = useMemo(() => {
    if (!simulado) return []
    const mapa = new Map<string, number>()
    simulado.questoes.forEach((q) => mapa.set(q.materia, (mapa.get(q.materia) ?? 0) + 1))
    return [...mapa.entries()]
  }, [simulado])

  // ---------------- início ----------------
  if (etapa === 'inicio') {
    const certames = concursos.filter((item) => item.id !== 'TODOS')
    const opcoesCertame =
      concurso !== 'TODOS' && !certames.some((item) => item.id === concurso)
        ? [{ id: concurso, total: 0 }, ...certames]
        : certames
    const opcoesBanca =
      banca !== 'TODAS' && !bancas.some((item) => item.banca === banca)
        ? [{ banca, questoes: 0 }, ...bancas]
        : bancas

    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Modo prova"
          title="Simulado"
          description="Prova no formato do caderno da banca: distribuição de matérias e tempo de prova. O gabarito aparece só no final."
          actions={
            <span className="qb-chip bg-accent-100 text-accent-800">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              correção comentada
            </span>
          }
        />

        <Card padded>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo="Banca" valor={banca} onChange={setBanca}>
              <option value="TODAS">Todas as bancas</option>
              {opcoesBanca.map((item) => (
                <option key={item.banca} value={item.banca}>
                  {item.banca} ({item.questoes})
                </option>
              ))}
            </Campo>

            <Campo rotulo="Certame" valor={concurso} onChange={setConcurso}>
              <option value="TODOS">Todos os certames</option>
              {opcoesCertame.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} ({item.total})
                </option>
              ))}
            </Campo>

            <Campo rotulo="Quantidade" valor={String(quantidade)} onChange={(valor) => setQuantidade(Number(valor))}>
              {[20, 30, 40, 50].map((n) => (
                <option key={n} value={n}>
                  {n} questões
                </option>
              ))}
            </Campo>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Info icone={<Clock3 className="h-4 w-4" aria-hidden="true" />} titulo={`${duracaoMinutos(quantidade)} min`} texto="de prova" />
            <Info icone={<Timer className="h-4 w-4" aria-hidden="true" />} titulo={`${quantidade} questões`} texto="no caderno" />
            <Info icone={<Flag className="h-4 w-4" aria-hidden="true" />} titulo="Gabarito no fim" texto="como na banca" />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Duração estimada: {duracaoMinutos(quantidade)} minutos · sem consulta · correção com
            comentários no fim.
          </p>

          {erro ? (
            <ErrorBanner className="mt-4">{erro}</ErrorBanner>
          ) : null}

          <button
            type="button"
            onClick={() => void iniciar()}
            disabled={carregando}
            className="qb-btn mt-5 min-h-12 w-full text-sm sm:w-auto sm:px-7"
          >
            {carregando ? 'Montando…' : 'Iniciar simulado'}
          </button>
        </Card>
      </div>
    )
  }

  // ---------------- resultado ----------------
  if (etapa === 'resultado' && correcao) {
    return (
      <div className="space-y-4">
        <Card padded>
          <h1 className="qb-eyebrow">{simulado?.nome}</h1>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {correcao.acertos} / {correcao.total}
          </p>
          <p className="text-sm text-ink-600">
            {correcao.percentual}% de acerto · tempo usado {formatar(tempoGasto)}
          </p>

          <div className="mt-4 border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Por matéria</p>
            <ul className="mt-2 space-y-2.5">
              {correcao.porMateria.map((m) => {
                const pct = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0
                return (
                  <li key={m.materia} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words text-ink-700">{m.materia}</span>
                      <span className="shrink-0 font-semibold text-ink-900">
                        {m.acertos}/{m.total}
                        <span className="ml-2 text-xs font-medium text-ink-500">{pct}%</span>
                      </span>
                    </div>
                    <ProgressBar value={pct} label={`Acertos em ${m.materia}`} height="h-1.5" className="mt-1" />
                  </li>
                )
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => {
              setEtapa('inicio')
              setCorrecao(null)
              setSimulado(null)
              setRascunhoAberto(false)
            }}
            className="qb-btn mt-5 w-full sm:w-auto sm:px-6"
          >
            Novo simulado
          </button>
        </Card>

        <div className="space-y-3">
          {correcao.itens.map((item, i) => (
            <article
              key={item.questaoId}
              className={`rounded-[16px] border p-4 ${
                item.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
              }`}
            >
              <p className="break-words text-xs font-semibold text-ink-600">
                {i + 1}. {item.materia} · {item.assunto}
              </p>
              <p className="mt-1 break-words text-sm text-ink-900">
                {item.acertou ? 'Acertou' : 'Errou'} — gabarito <strong>{item.gabarito}</strong>
                {item.alternativaAluno !== null && item.alternativaAluno >= 0
                  ? ` · você marcou ${LETRAS[item.alternativaAluno]}`
                  : ' · em branco'}
              </p>
              {item.explicacao ? (
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-800">
                  {item.explicacao}
                </p>
              ) : null}
              {item.fundamento ? (
                <p className="mt-2 break-words text-xs leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-800">Fundamento:</strong> {item.fundamento}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    )
  }

  // ---------------- prova ----------------
  if (!simulado || !atual) return null

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Simulado em andamento</h1>
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              {simulado.nome}
            </p>
            <p className="text-sm font-semibold text-ink-900">
              Questão {indice + 1} de {simulado.questoes.length} · {respondidas} respondidas
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 font-mono text-lg font-bold tabular-nums sm:flex-none ${
                emRisco ? 'bg-accent-100 text-accent-800' : 'bg-ink-50 text-ink-800'
              }`}
              role="timer"
              aria-label="Tempo restante de prova"
            >
              {formatar(restante)}
            </span>
            <button
              type="button"
              onClick={() => void finalizar()}
              disabled={carregando}
              className="qb-btn-ghost flex-1 border-brand-200 text-brand-800 sm:flex-none"
            >
              {carregando ? 'Corrigindo…' : 'Finalizar'}
            </button>
          </div>
        </div>
      </Card>

      <ProgressBar value={progresso} label="Questões respondidas" height="h-1.5" />

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="qb-chip max-w-full truncate bg-ink-100 text-ink-700">{atual.materia}</span>
          <span className="qb-chip max-w-full truncate bg-ink-50 text-ink-600">{atual.assunto}</span>
          <button
            type="button"
            onClick={() => setRascunhoAberto(true)}
            aria-haspopup="dialog"
            aria-expanded={rascunhoAberto}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Rascunho
          </button>
        </div>

        <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-900">
          {atual.enunciado}
        </p>

        <ul className="mt-4 space-y-2.5">
          {atual.alternativas.map((texto, i) => {
            const marcada = respostas[atual.id] === i
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setRespostas((r) => ({ ...r, [atual.id]: i }))}
                  aria-pressed={marcada}
                  className={
                    marcada
                      ? 'flex min-h-12 w-full items-start gap-3 rounded-xl border border-brand-400 bg-brand-50 px-3.5 py-3 text-left text-sm text-brand-900'
                      : 'flex min-h-12 w-full items-start gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-left text-sm text-ink-800 transition hover:border-brand-300'
                  }
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold text-ink-700 ring-1 ring-inset ring-ink-200">
                    {LETRAS[i]}
                  </span>
                  <span className="min-w-0 break-words leading-relaxed">{texto}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <Rascunho
          questaoId={atual.id}
          open={rascunhoAberto}
          onClose={() => setRascunhoAberto(false)}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
          <button
            type="button"
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={indice === 0}
            className="qb-btn-ghost px-4"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => {
              setRespostas((r) => {
                const copia = { ...r }
                delete copia[atual.id]
                return copia
              })
            }}
            className="inline-flex min-h-11 items-center px-2 text-xs font-medium text-ink-500 underline transition hover:text-ink-800"
          >
            limpar marcação
          </button>
          <button
            type="button"
            onClick={() => setIndice((i) => Math.min(simulado.questoes.length - 1, i + 1))}
            disabled={indice === simulado.questoes.length - 1}
            className="qb-btn px-4 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Navegação</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ir para uma questão">
          {simulado.questoes.map((q, i) => {
            const respondida = respostas[q.id] !== undefined
            const ativa = i === indice
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndice(i)}
                aria-label={`Ir para a questão ${i + 1}${respondida ? ' (respondida)' : ''}`}
                aria-current={ativa ? 'step' : undefined}
                className={
                  ativa
                    ? 'h-11 w-11 rounded-lg bg-brand-700 text-xs font-bold text-white'
                    : respondida
                      ? 'h-11 w-11 rounded-lg bg-brand-100 text-xs font-bold text-brand-800'
                      : 'h-11 w-11 rounded-lg bg-ink-50 text-xs font-semibold text-ink-600'
                }
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        {simulado.avisos.length ? (
          <p className="mt-3 text-xs leading-relaxed text-accent-800">{simulado.avisos.join(' · ')}</p>
        ) : null}
      </Card>

      <p className="px-1 text-center text-xs leading-relaxed text-ink-500">
        As respostas são registradas ao finalizar. Perguntas por matéria:{' '}
        {porMateria.map(([m, n]) => `${m} ${n}`).join(' · ')}
      </p>
    </div>
  )
}

function Campo({
  rotulo,
  valor,
  onChange,
  children,
}: {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  children: ReactNode
}) {
  const id = `simulado-${rotulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="qb-label">
        {rotulo}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)} className="qb-select">
        {children}
      </select>
    </div>
  )
}

function Info({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-3 py-2.5">
      <span className="text-brand-700">{icone}</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-ink-900">{titulo}</p>
        <p className="text-[11px] text-ink-500">{texto}</p>
      </div>
    </div>
  )
}
