import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type Correcao, type Simulado as SimuladoTipo } from './api'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const DURACAO_MIN: Record<string, number> = { 'PM-AM': 210, 'PC-AM': 240 }

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
export default function Simulado({ concursoInicial }: { concursoInicial: string }) {
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [concurso, setConcurso] = useState(concursoInicial === 'PC-AM' ? 'PC-AM' : 'PM-AM')
  const [simulado, setSimulado] = useState<SimuladoTipo | null>(null)
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [restante, setRestante] = useState(0)
  const [correcao, setCorrecao] = useState<Correcao | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tempoGasto, setTempoGasto] = useState(0)
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
      setTempoGasto((DURACAO_MIN[simulado.concurso] ?? 210) * 60 - restante)
      setCorrecao(c)
      setEtapa('resultado')
    } catch {
      setErro('Não foi possível corrigir o simulado.')
    } finally {
      setCarregando(false)
      finalizando.current = false
    }
  }, [simulado, respostas])

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
      const s = await api.simulado(concurso)
      setSimulado(s)
      setRespostas({})
      setIndice(0)
      setRestante((DURACAO_MIN[s.concurso] ?? 210) * 60)
      setTempoGasto(0)
      setCorrecao(null)
      setEtapa('prova')
    } catch {
      setErro('Não foi possível montar o simulado.')
    } finally {
      setCarregando(false)
    }
  }

  const atual = simulado?.questoes[indice]
  const respondidas = Object.keys(respostas).length
  const progresso = simulado ? Math.round((respondidas / simulado.questoes.length) * 100) : 0
  const emRisco = restante > 0 && restante < 300

  const porMateria = useMemo(() => {
    if (!simulado) return []
    const mapa = new Map<string, number>()
    simulado.questoes.forEach((q) => mapa.set(q.materia, (mapa.get(q.materia) ?? 0) + 1))
    return [...mapa.entries()]
  }, [simulado])

  // ---------------- início ----------------
  if (etapa === 'inicio') {
    return (
      <div className="rounded-[14px] border border-ink-200 bg-surface p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Simulado</h2>
        <p className="mt-1 text-sm text-ink-500">
          Prova no formato do caderno da banca: mesma distribuição de matérias e tempo de prova. O
          gabarito aparece só no final.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['PM-AM', 'PC-AM'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setConcurso(c)}
              className={
                concurso === c
                  ? 'rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700'
              }
            >
              {c === 'PM-AM' ? 'Soldado PM-AM (60 questões)' : 'Investigador PC-AM (80 questões)'}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-ink-400">
          Duração: {DURACAO_MIN[concurso]} minutos · sem consulta · correção com comentários no fim.
        </p>

        {erro ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{erro}</p>
        ) : null}

        <button
          onClick={() => void iniciar()}
          disabled={carregando}
          className="mt-5 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
        >
          {carregando ? 'Montando…' : 'Iniciar simulado'}
        </button>
      </div>
    )
  }

  // ---------------- resultado ----------------
  if (etapa === 'resultado' && correcao) {
    return (
      <div className="space-y-4">
        <div className="rounded-[14px] border border-ink-200 bg-surface p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {simulado?.nome}
          </p>
          <p className="mt-1 text-3xl font-bold text-ink-900">
            {correcao.acertos} / {correcao.total}
          </p>
          <p className="text-sm text-ink-600">
            {correcao.percentual}% de acerto · tempo usado {formatar(tempoGasto)}
          </p>

          <table className="mt-4 w-full text-sm">
            <tbody>
              {correcao.porMateria.map((m) => (
                <tr key={m.materia} className="border-t border-ink-100">
                  <td className="py-1.5 text-ink-700">{m.materia}</td>
                  <td className="py-1.5 text-right font-semibold text-ink-900">
                    {m.acertos}/{m.total}
                  </td>
                  <td className="py-1.5 pl-3 text-right text-xs text-ink-500">
                    {Math.round((m.acertos / m.total) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setEtapa('inicio')
                setCorrecao(null)
                setSimulado(null)
              }}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Novo simulado
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {correcao.itens.map((item, i) => (
            <article
              key={item.questaoId}
              className={`rounded-[14px] border p-4 ${
                item.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
              }`}
            >
              <p className="text-xs font-semibold text-ink-500">
                {i + 1}. {item.materia} · {item.assunto}
              </p>
              <p className="mt-1 text-sm text-ink-900">
                {item.acertou ? 'Acertou' : 'Errou'} — gabarito{' '}
                <strong>{item.gabarito}</strong>
                {item.alternativaAluno !== null && item.alternativaAluno >= 0
                  ? ` · você marcou ${LETRAS[item.alternativaAluno]}`
                  : ' · em branco'}
              </p>
              {item.explicacao ? (
                <p className="mt-2 whitespace-pre-line text-sm text-ink-800">{item.explicacao}</p>
              ) : null}
              {item.fundamento ? (
                <p className="mt-2 text-xs text-ink-500">
                  <strong>Fundamento:</strong> {item.fundamento}
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-ink-200 bg-surface px-4 py-3 shadow-card">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {simulado.nome}
          </p>
          <p className="text-sm font-semibold text-ink-900">
            Questão {indice + 1} de {simulado.questoes.length} · {respondidas} respondidas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-xl px-3 py-1.5 font-mono text-lg font-bold ${
              emRisco ? 'bg-accent-100 text-accent-800' : 'bg-ink-50 text-ink-800'
            }`}
          >
            {formatar(restante)}
          </span>
          <button
            onClick={() => void finalizar()}
            disabled={carregando}
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
          >
            {carregando ? 'Corrigindo…' : 'Finalizar'}
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${progresso}%` }} />
      </div>

      <div className="rounded-[14px] border border-ink-200 bg-surface p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-ink-100 px-2.5 py-1 font-semibold text-ink-700">
            {atual.materia}
          </span>
          <span className="rounded-full bg-ink-50 px-2.5 py-1 font-semibold text-ink-600">
            {atual.assunto}
          </span>
        </div>

        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-900">
          {atual.enunciado}
        </p>

        <ul className="mt-4 space-y-2">
          {atual.alternativas.map((texto, i) => {
            const marcada = respostas[atual.id] === i
            return (
              <li key={i}>
                <button
                  onClick={() => setRespostas((r) => ({ ...r, [atual.id]: i }))}
                  className={
                    marcada
                      ? 'w-full rounded-xl border border-brand-400 bg-brand-50 px-4 py-3 text-left text-sm text-brand-900'
                      : 'w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm transition hover:border-brand-300'
                  }
                >
                  <span className="mr-2 font-bold">{LETRAS[i]})</span>
                  {texto}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={indice === 0}
            className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => {
              setRespostas((r) => {
                const copia = { ...r }
                delete copia[atual.id]
                return copia
              })
            }}
            className="text-xs text-ink-400 underline"
          >
            limpar marcação
          </button>
          <button
            onClick={() => setIndice((i) => Math.min(simulado.questoes.length - 1, i + 1))}
            disabled={indice === simulado.questoes.length - 1}
            className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="rounded-[14px] border border-ink-200 bg-surface p-4 shadow-card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Navegação</p>
        <div className="flex flex-wrap gap-1.5">
          {simulado.questoes.map((q, i) => {
            const respondida = respostas[q.id] !== undefined
            const ativa = i === indice
            return (
              <button
                key={q.id}
                onClick={() => setIndice(i)}
                className={
                  ativa
                    ? 'h-8 w-8 rounded-lg bg-brand-700 text-xs font-bold text-white'
                    : respondida
                      ? 'h-8 w-8 rounded-lg bg-brand-100 text-xs font-bold text-brand-800'
                      : 'h-8 w-8 rounded-lg bg-ink-50 text-xs font-semibold text-ink-500'
                }
              >
                {i + 1}
              </button>
            )
          })}
        </div>
        {simulado.avisos.length ? (
          <p className="mt-3 text-xs text-accent-700">{simulado.avisos.join(' · ')}</p>
        ) : null}
      </div>

      <p className="text-center text-xs text-ink-400">
        As respostas são registradas ao finalizar. Perguntas por matéria: {porMateria.map(([m, n]) => `${m} ${n}`).join(' · ')}
      </p>
    </div>
  )
}
