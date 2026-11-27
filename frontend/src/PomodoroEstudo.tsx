import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { api } from './api'

export type ModoTempo = 'pomodoro' | 'livre'

function formatar(segundos: number): string {
  const s = Math.max(0, segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function PomodoroEstudo({
  materia,
  modo,
  duracaoSegundos,
  onConcluir,
}: {
  materia: string
  modo: ModoTempo
  duracaoSegundos: number
  onConcluir?: () => void
}) {
  const [restante, setRestante] = useState(duracaoSegundos)
  const [pausado, setPausado] = useState(false)
  const [etapaPomodoro, setEtapaPomodoro] = useState<'foco' | 'pausa'>('foco')
  const concluido = useRef(false)
  const registrado = useRef(false)
  const restanteRef = useRef(duracaoSegundos)

  useEffect(() => {
    setRestante(duracaoSegundos)
    restanteRef.current = duracaoSegundos
    setPausado(false)
    setEtapaPomodoro('foco')
  }, [duracaoSegundos, modo])

  useEffect(() => {
    restanteRef.current = restante
  }, [restante])

  useEffect(() => {
    if (pausado || concluido.current) return
    if (restante <= 0) {
      concluido.current = true
      if (!registrado.current) {
        registrado.current = true
        void api.registrarEstudo(materia || null, duracaoSegundos)
      }
      if (modo === 'livre') {
        onConcluir?.()
      } else {
        setEtapaPomodoro((e) => (e === 'foco' ? 'pausa' : 'foco'))
        setRestante((e) => {
          void e
          return etapaPomodoro === 'foco' ? 5 * 60 : 25 * 60
        })
        concluido.current = false
      }
      return
    }
    const timer = window.setTimeout(() => setRestante((valor) => valor - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [restante, pausado, modo, materia, duracaoSegundos, onConcluir, etapaPomodoro])

  useEffect(() => {
    return () => {
      if (registrado.current) return
      const gasto = Math.max(1, duracaoSegundos - restanteRef.current)
      if (gasto >= 10) void api.registrarEstudo(materia || null, gasto)
      registrado.current = true
    }
  }, [duracaoSegundos, materia])

  function reiniciar() {
    concluido.current = false
    registrado.current = false
    setEtapaPomodoro('foco')
    setPausado(false)
    setRestante(duracaoSegundos)
  }

  const rotulo =
    modo === 'pomodoro'
      ? etapaPomodoro === 'foco'
        ? 'Pomodoro · foco'
        : 'Pomodoro · pausa'
      : 'Sessão cronometrada'

  return (
    <div className="qb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            etapaPomodoro === 'pausa' && modo === 'pomodoro'
              ? 'bg-accent-100 text-accent-800'
              : 'bg-brand-50 text-brand-700'
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-500">{rotulo}</p>
          <p
            className="mt-0.5 font-mono text-xl font-bold tabular-nums text-brand-800"
            role="timer"
            aria-label="Tempo restante"
            aria-live="off"
          >
            {formatar(restante)}
          </p>
        </div>
        {pausado ? (
          <span className="qb-chip bg-accent-100 text-accent-800" role="status">
            pausado
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          onClick={() => setPausado((valor) => !valor)}
          aria-pressed={pausado}
          className="qb-btn-ghost px-3 text-xs"
        >
          {pausado ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
          {pausado ? 'Retomar' : 'Pausar'}
        </button>
        <button type="button" onClick={reiniciar} className="qb-btn-ghost px-3 text-xs">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reiniciar
        </button>
      </div>
    </div>
  )
}
