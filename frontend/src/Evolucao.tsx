import { useEffect, useMemo, useState } from 'react'
import { api, type Evolucao as EvolucaoDados, type Topico } from './api'

function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function Evolucao({ concurso, topicos }: { concurso: string; topicos: Topico[] }) {
  const [materia, setMateria] = useState('')
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<EvolucaoDados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const materias = useMemo(
    () => [...new Set(topicos.map((topico) => topico.materia))].sort(),
    [topicos],
  )

  useEffect(() => {
    api.evolucao(concurso, materia || undefined, dias)
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar a evolução'))
  }, [concurso, materia, dias])

  const serie = dados?.serie ?? []
  const largura = 760
  const altura = 220
  const padding = 28
  const pontos = serie.map((ponto, i) => {
    const x =
      serie.length <= 1
        ? largura / 2
        : padding + (i * (largura - padding * 2)) / (serie.length - 1)
    const y = padding + ((100 - ponto.percentual) * (altura - padding * 2)) / 100
    return { x, y, ponto }
  })
  const polyline = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(' ')

  return (
    <div className="space-y-4">
      <div className="qb-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Evolução</h2>
            <p className="mt-1 text-sm text-ink-500">
              Acompanhe o seu desempenho e o tempo estudado por matéria.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas as matérias</option>
              {materias.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
            <select
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              {[7, 30, 90, 365].map((valor) => (
                <option key={valor} value={valor}>{valor} dias</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {erro ? (
        <p className="rounded-xl bg-err-50 px-4 py-3 text-sm font-medium text-err-700">{erro}</p>
      ) : null}

      {dados ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Metrica titulo="Respondidas" valor={String(dados.respondidas)} />
            <Metrica titulo="Acertos" valor={String(dados.acertos)} />
            <Metrica titulo="Erros" valor={String(dados.respondidas - dados.acertos)} />
            <Metrica titulo="Aproveitamento" valor={`${dados.percentual}%`} destaque />
          </div>

          <div className="qb-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">Aproveitamento diário</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {materia || 'Todas as matérias'} · últimos {dias} dias
                </p>
              </div>
              <div className="rounded-xl bg-accent-50 px-3 py-2 text-right">
                <p className="text-xs text-ink-500">Tempo estudado</p>
                <p className="text-sm font-bold text-accent-700">
                  {formatarTempo(dados.tempoEstudoSegundos)}
                </p>
              </div>
            </div>

            {pontos.length ? (
              <div className="mt-5 overflow-x-auto">
                <svg
                  viewBox={`0 0 ${largura} ${altura}`}
                  className="h-[220px] min-w-[620px] w-full"
                  role="img"
                  aria-label="Gráfico de aproveitamento por dia"
                >
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = padding + ((100 - v) * (altura - padding * 2)) / 100
                    return (
                      <g key={v}>
                        <line x1={padding} x2={largura - padding} y1={y} y2={y}
                          stroke="#e7e5e4" strokeWidth="1" />
                        <text x="0" y={y + 4} fill="#78716c" fontSize="10">{v}%</text>
                      </g>
                    )
                  })}
                  {pontos.length > 1 ? (
                    <polyline
                      points={polyline}
                      fill="none"
                      stroke="#35507f"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {pontos.map(({ x, y, ponto }, i) => (
                    <g key={`${ponto.dia}-${i}`}>
                      <circle cx={x} cy={y} r="5" fill="#35507f" />
                      <title>{ponto.dia}: {ponto.percentual}% ({ponto.acertos}/{ponto.respondidas})</title>
                    </g>
                  ))}
                </svg>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">
                Ainda não há respostas neste período.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="qb-card p-8 text-center text-sm text-ink-500">Carregando evolução…</div>
      )}
    </div>
  )
}

function Metrica({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="qb-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{titulo}</p>
      <p className={destaque ? 'mt-1 text-2xl font-bold text-accent-600' : 'mt-1 text-2xl font-bold text-ink-900'}>
        {valor}
      </p>
    </div>
  )
}
