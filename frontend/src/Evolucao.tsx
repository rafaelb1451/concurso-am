import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarChart3, Clock3, TrendingUp } from 'lucide-react'
import {
  api,
  type Banca,
  type Concurso,
  type Evolucao as EvolucaoDados,
  type EvolucaoPonto,
  type Topico,
} from './api'
import { Card, ErrorBanner, LoadingState, PageHeader, StatCard } from './ui'

function formatarTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatarDia(dia: string): string {
  const partes = dia.split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : dia
}

/** Mede a largura disponível para o gráfico (sem overflow e sem layout shift). */
function useLarguraDoGrafico(ativo: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [largura, setLargura] = useState(0)

  useLayoutEffect(() => {
    if (!ativo) return
    const elemento = ref.current
    if (!elemento) return
    const medir = () => {
      const medida = elemento.getBoundingClientRect().width
      if (medida > 0) setLargura(Math.round(medida))
    }
    medir()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir)
      return () => window.removeEventListener('resize', medir)
    }
    const observador = new ResizeObserver(medir)
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [ativo])

  return [ref, largura] as const
}

export default function Evolucao({
  banca,
  concurso,
  topicos,
  bancas = [],
  concursos = [],
  onBanca,
  onConcurso,
}: {
  banca: string
  concurso: string
  topicos: Topico[]
  bancas?: Banca[]
  concursos?: Concurso[]
  onBanca: (valor: string) => void
  onConcurso: (valor: string) => void
}) {
  const [materia, setMateria] = useState('')
  const [dias, setDias] = useState(30)
  const [dados, setDados] = useState<EvolucaoDados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [refGrafico, larguraGrafico] = useLarguraDoGrafico(Boolean(dados))

  const materias = useMemo(
    () => [...new Set(topicos.map((topico) => topico.materia))].sort(),
    [topicos],
  )

  // Ao trocar banca/certame o universo de matérias muda: evita filtro órfão.
  useEffect(() => {
    setMateria('')
  }, [banca, concurso])

  useEffect(() => {
    let ativo = true
    setErro(null)
    setDados(null)
    api.evolucao(banca, concurso, materia || undefined, dias)
      .then((resultado) => {
        if (ativo) setDados(resultado)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar a evolução')
      })
    return () => {
      ativo = false
    }
  }, [banca, concurso, materia, dias, tentativa])

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
        eyebrow="Desempenho"
        title="Evolução"
        description="Acompanhe o seu desempenho e o tempo estudado por banca, certame e matéria."
        actions={
          <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            últimos {dias} dias
          </span>
        }
      />

      <Card padded>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filtro rotulo="Banca" valor={banca} onChange={onBanca}>
            <option value="TODAS">Todas as bancas</option>
            {opcoesBanca.map((item) => (
              <option key={item.banca} value={item.banca}>
                {item.banca}
              </option>
            ))}
          </Filtro>
          <Filtro rotulo="Certame" valor={concurso} onChange={onConcurso}>
            <option value="TODOS">Todos os certames</option>
            {opcoesCertame.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </Filtro>
          <Filtro rotulo="Matéria" valor={materia} onChange={setMateria}>
            <option value="">Todas as matérias</option>
            {materias.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Filtro>
          <Filtro rotulo="Período" valor={String(dias)} onChange={(valor) => setDias(Number(valor))}>
            {[7, 30, 90, 365].map((valor) => (
              <option key={valor} value={valor}>
                {valor} dias
              </option>
            ))}
          </Filtro>
        </div>
      </Card>

      {erro ? (
        <ErrorBanner onRetry={() => setTentativa((n) => n + 1)}>{erro}</ErrorBanner>
      ) : null}

      {!dados && !erro ? <LoadingState label="Carregando evolução…" lines={4} /> : null}

      {dados ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Respondidas" value={String(dados.respondidas)} />
            <StatCard label="Acertos" value={String(dados.acertos)} />
            <StatCard label="Erros" value={String(Math.max(0, dados.respondidas - dados.acertos))} />
            <StatCard label="Aproveitamento" value={`${dados.percentual}%`} destaque />
          </div>

          <Card padded>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-ink-900">Aproveitamento diário</h2>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                  {banca === 'TODAS' ? 'Todas as bancas' : banca} ·{' '}
                  {concurso === 'TODOS' ? 'Todos os certames' : concurso} ·{' '}
                  {materia || 'Todas as matérias'} · últimos {dias} dias
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-accent-50 px-3 py-2">
                <Clock3 className="h-4 w-4 text-accent-700" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    Tempo estudado
                  </p>
                  <p className="text-sm font-bold text-accent-800">
                    {formatarTempo(dados.tempoEstudoSegundos)}
                  </p>
                </div>
              </div>
            </div>

            <div ref={refGrafico} className="mt-5 w-full">
              {dados.serie.length ? (
                <>
                  <Grafico serie={dados.serie} largura={larguraGrafico} />
                  <TabelaAcessivel serie={dados.serie} />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-ink-300 py-10 text-center sm:py-12">
                  <p className="text-sm font-semibold text-ink-700">Ainda não há respostas neste período.</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Responda algumas questões para começar a ver sua curva de aproveitamento.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function Grafico({ serie, largura }: { serie: EvolucaoPonto[]; largura: number }) {
  const idGradiente = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const medida = largura > 0 ? Math.max(280, largura) : 640
  const compacto = medida < 480
  const altura = compacto ? 190 : 220
  const margem = {
    topo: 14,
    direita: compacto ? 8 : 16,
    base: 28,
    esquerda: compacto ? 30 : 36,
  }
  const larguraInterna = medida - margem.esquerda - margem.direita
  const alturaInterna = altura - margem.topo - margem.base

  const pontos = serie.map((ponto, i) => {
    const x =
      serie.length <= 1
        ? margem.esquerda + larguraInterna / 2
        : margem.esquerda + (i * larguraInterna) / (serie.length - 1)
    const percentual = Math.min(100, Math.max(0, ponto.percentual))
    const y = margem.topo + ((100 - percentual) * alturaInterna) / 100
    return { x, y, ponto }
  })

  const polyline = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(' ')
  const base = margem.topo + alturaInterna
  const area = pontos.length
    ? `${pontos[0].x},${base} ${polyline} ${pontos[pontos.length - 1].x},${base}`
    : ''

  const indicesRotulo = new Set<number>()
  if (serie.length <= 4) {
    serie.forEach((_, i) => indicesRotulo.add(i))
  } else {
    indicesRotulo.add(0)
    indicesRotulo.add(Math.floor((serie.length - 1) / 2))
    indicesRotulo.add(serie.length - 1)
  }

  return (
    <svg
      viewBox={`0 0 ${medida} ${altura}`}
      width="100%"
      height={altura}
      className="block h-auto w-full"
      role="img"
      aria-label="Gráfico de aproveitamento por dia"
    >
      <defs>
        <linearGradient id={`qb-area-${idGradiente}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#35507f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#35507f" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((valor) => {
        const y = margem.topo + ((100 - valor) * alturaInterna) / 100
        return (
          <g key={valor}>
            <line
              x1={margem.esquerda}
              x2={medida - margem.direita}
              y1={y}
              y2={y}
              stroke="#e7e5e4"
              strokeWidth="1"
            />
            <text x="0" y={y + 4} fill="#78716c" fontSize={compacto ? 9 : 10}>
              {valor}%
            </text>
          </g>
        )
      })}

      {area ? <polygon points={area} fill={`url(#qb-area-${idGradiente})`} /> : null}

      {pontos.length > 1 ? (
        <polyline
          points={polyline}
          fill="none"
          stroke="#35507f"
          strokeWidth={compacto ? 2.5 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {pontos.map(({ x, y, ponto }, i) => (
        <g key={`${ponto.dia}-${i}`}>
          <circle cx={x} cy={y} r={compacto ? 3.5 : 4.5} fill="#35507f" />
          <circle cx={x} cy={y} r={compacto ? 6 : 8} fill="transparent">
            <title>
              {formatarDia(ponto.dia)}: {ponto.percentual}% ({ponto.acertos}/{ponto.respondidas})
            </title>
          </circle>
        </g>
      ))}

      {pontos.map(({ x, ponto }, i) =>
        indicesRotulo.has(i) ? (
          <text
            key={`rotulo-${ponto.dia}-${i}`}
            x={x}
            y={altura - 8}
            fill="#78716c"
            fontSize={compacto ? 9 : 10}
            textAnchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'}
          >
            {formatarDia(ponto.dia)}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function TabelaAcessivel({ serie }: { serie: EvolucaoPonto[] }) {
  return (
    <div className="sr-only">
      <table>
      <caption>Série diária de desempenho</caption>
      <thead>
        <tr>
          <th scope="col">Dia</th>
          <th scope="col">Respondidas</th>
          <th scope="col">Acertos</th>
          <th scope="col">Aproveitamento</th>
        </tr>
      </thead>
      <tbody>
        {serie.map((ponto) => (
          <tr key={ponto.dia}>
            <th scope="row">{formatarDia(ponto.dia)}</th>
            <td>{ponto.respondidas}</td>
            <td>{ponto.acertos}</td>
            <td>{ponto.percentual}%</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  )
}

function Filtro({
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
  const id = useId()
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
