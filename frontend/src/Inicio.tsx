import { useEffect, useState } from 'react'
import { api, type MateriaResumo, type Plano } from './api'
import type { PaginaPublica } from './SiteHeader'

/**
 * Página inicial aberta: apresenta a plataforma para quem chega sem conta e leva
 * direto para a prática gratuita (1 matéria, 10 questões) ou para os planos.
 */
export default function Inicio({
  onNavegar,
  onCriarConta,
}: {
  onNavegar: (pagina: PaginaPublica) => void
  onCriarConta: () => void
}) {
  const [materias, setMaterias] = useState<MateriaResumo[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])

  useEffect(() => {
    api.publicoMaterias().then(setMaterias).catch(() => setMaterias([]))
    api.planos().then(setPlanos).catch(() => setPlanos([]))
  }, [])

  const totalQuestoes = materias.reduce((soma, m) => soma + m.questoes, 0)
  const pagos = planos.filter((p) => p.pago)
  const mensal = pagos.find((p) => p.ciclo === 'MENSAL')
  const anual = pagos.find((p) => p.ciclo === 'ANUAL')

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-ink-200 bg-gradient-to-b from-brand-900 to-brand-800 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold text-accent-200">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            Foco total em PM-AM e PC-AM · estilo FGV
          </p>

          <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight md:text-[42px]">
            Quebre a banca com{' '}
            <span className="text-accent-300">
              {totalQuestoes > 0 ? totalQuestoes.toLocaleString('pt-BR') : '1.000'} questões
            </span>{' '}
            comentadas e um tutor que explica cada resposta.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-brand-100 md:text-[17px]">
            Banco de questões no estilo FGV, com comentário fundamentado artigo por artigo,
            simulados cronometrados e um tutor de IA que responde só sobre a questão da tela.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onNavegar('pratica')}
              className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-brand-900 shadow-lg shadow-brand-900/30 transition hover:bg-accent-400"
            >
              Praticar grátis — 10 questões
            </button>
            <button
              onClick={() => onNavegar('planos')}
              className="rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Ver planos
            </button>
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <Numero valor={totalQuestoes > 0 ? String(totalQuestoes) : '1.004'} rotulo="questões" />
            <Numero valor="524" rotulo="assuntos" />
            <Numero valor="2" rotulo="concursos" />
            <Numero valor="100%" rotulo="comentadas" />
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------ materias */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Escolha uma matéria e comece agora
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Sem cadastro, você pratica uma matéria com 10 questões. Grátis, sem cartão.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {materias.map((m) => (
            <button
              key={m.materia}
              onClick={() => onNavegar('pratica')}
              className="group rounded-xl border border-ink-200 bg-surface px-4 py-3 text-left transition hover:border-brand-300 hover:shadow-sm"
            >
              <span className="block text-[13px] font-semibold text-ink-800 group-hover:text-brand-800">
                {m.materia}
              </span>
              <span className="block text-[11px] font-medium text-ink-400">
                {m.questoes} questões
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ como funciona */}
      <section className="border-y border-ink-200 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-xl font-bold tracking-tight text-ink-900">Como funciona</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Passo
              numero="1"
              titulo="Escolha o foco"
              texto="Filtre por concurso, matéria e assunto. São 524 assuntos mapeados do edital."
            />
            <Passo
              numero="2"
              titulo="Responda e entenda"
              texto="Errou? O comentário mostra o artigo, o inciso e por que os distratores estão errados."
            />
            <Passo
              numero="3"
              titulo="Feche a lacuna"
              texto="Peça ao tutor uma explicação diferente da mesma questão, quantas vezes precisar."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ diferenciais */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-xl font-bold tracking-tight text-ink-900">
          Por que estudar no QB Concurso
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Diferencial
            titulo="Comentário com fundamento literal"
            texto="Cada questão tem o artigo de lei ou item do edital que resolve. Nada de doutrina solta."
          />
          <Diferencial
            titulo="Procedência sempre visível"
            texto="Você sabe se está treinando prova real (FGV) ou questão autoral no mesmo estilo."
          />
          <Diferencial
            titulo="Tutor com IA focado na questão"
            texto="O tutor responde sobre a questão da tela e é proibido de inventar artigo ou súmula."
          />
          <Diferencial
            titulo="Simulado e evolução"
            texto="Prova cronometrada com o mesmo formato da banca e gráfico de desempenho por matéria."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ planos */}
      <section className="border-y border-ink-200 bg-brand-50/60">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink-900">Planos</h2>
              <p className="mt-1 text-sm text-ink-500">
                Comece grátis. Assine quando quiser responder sem limite.
              </p>
            </div>
            <button onClick={() => onNavegar('planos')} className="qb-btn-ghost text-[13px]">
              Ver detalhes
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="qb-card p-5">
              <h3 className="text-sm font-bold text-ink-900">Grátis</h3>
              <p className="mt-2 text-2xl font-extrabold text-ink-900">R$ 0</p>
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li>• 10 questões por dia após criar a conta</li>
                <li>• prática aberta: 1 matéria, 10 questões</li>
                <li>• comentário e gabarito</li>
              </ul>
              <button onClick={onCriarConta} className="qb-btn mt-4 w-full">
                Criar conta
              </button>
            </div>

            {mensal ? (
              <div className="qb-card p-5 ring-2 ring-brand-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink-900">{mensal.nome}</h3>
                  <span className="qb-chip bg-brand-700 text-white">recomendado</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-brand-800">
                  R$ {(mensal.valorCentavos / 100).toFixed(2).replace('.', ',')}
                  <span className="text-sm font-semibold text-ink-400">/mês</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-ink-600">
                  <li>• questões ilimitadas</li>
                  <li>• tutor com IA sem limite</li>
                  <li>• simulados e evolução completa</li>
                </ul>
                <button onClick={onCriarConta} className="qb-btn mt-4 w-full">
                  Assinar
                </button>
              </div>
            ) : null}

            {anual ? (
              <div className="qb-card p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink-900">{anual.nome}</h3>
                  <span className="qb-chip bg-accent-100 text-accent-800">economia</span>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-brand-800">
                  R$ {(anual.valorCentavos / 100).toFixed(2).replace('.', ',')}
                  <span className="text-sm font-semibold text-ink-400">/ano</span>
                </p>
                <ul className="mt-3 space-y-1 text-sm text-ink-600">
                  <li>• tudo do mensal</li>
                  <li>• {mensal ? economia(mensal, anual) : 'economia no ano'}</li>
                  <li>• um pagamento só</li>
                </ul>
                <button onClick={onCriarConta} className="qb-btn mt-4 w-full">
                  Assinar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA final */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Pronto para quebrar essa banca?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
          Faça as primeiras 10 questões agora, sem cadastro. Se gostar, crie a conta e continue de
          onde parou.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => onNavegar('pratica')} className="qb-btn px-6 py-3">
            Praticar grátis
          </button>
          <button onClick={onCriarConta} className="qb-btn-ghost px-6 py-3">
            Criar conta
          </button>
        </div>
      </section>

      <footer className="border-t border-ink-200 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12px] text-ink-400">
          <span>QB Concurso — Quebrando a Banca</span>
          <span>Conteúdo para PM-AM e PC-AM no estilo FGV</span>
        </div>
      </footer>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-200">{rotulo}</dt>
      <dd className="mt-0.5 text-xl font-extrabold text-white">{valor}</dd>
    </div>
  )
}

function Passo({ numero, titulo, texto }: { numero: string; titulo: string; texto: string }) {
  return (
    <div className="qb-card p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
        {numero}
      </span>
      <h3 className="mt-3 text-sm font-bold text-ink-900">{titulo}</h3>
      <p className="mt-1 text-sm text-ink-600">{texto}</p>
    </div>
  )
}

function Diferencial({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-[14px] border border-ink-200 bg-surface p-5">
      <h3 className="text-sm font-bold text-ink-900">{titulo}</h3>
      <p className="mt-1 text-sm text-ink-600">{texto}</p>
    </div>
  )
}

/** "economize R$ X no ano" comparando 12 meses com o plano anual. */
function economia(mensal: Plano, anual: Plano): string {
  const diferenca = mensal.valorCentavos * 12 - anual.valorCentavos
  if (diferenca <= 0) {
    return 'melhor preço do ano'
  }
  return `economize R$ ${(diferenca / 100).toFixed(2).replace('.', ',')} no ano`
}
