import { useEffect, useRef, useState } from 'react'
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-ink-200 bg-surface px-4 py-3 shadow-card">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
          {modo === 'pomodoro'
            ? etapaPomodoro === 'foco'
              ? 'Pomodoro · foco'
              : 'Pomodoro · pausa'
            : 'Sessão cronometrada'}
        </p>
        <p className="mt-0.5 font-mono text-lg font-bold text-brand-800">{formatar(restante)}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setPausado((valor) => !valor)}
          className="qb-btn-ghost px-3 py-2 text-xs"
        >
          {pausado ? 'Retomar' : 'Pausar'}
        </button>
        <button onClick={reiniciar} className="qb-btn-ghost px-3 py-2 text-xs">
          Reiniciar
        </button>
      </div>
    </div>
  )
}
