import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpenCheck, CheckCircle2, Sparkles, Target, Trophy } from 'lucide-react'
import { api, type MateriaResumo, type Plano } from './api'
import { ErrorBanner, Skeleton } from './ui'
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
  const [carregandoMaterias, setCarregandoMaterias] = useState(true)
  const [erroMaterias, setErroMaterias] = useState(false)
  const [tentativaMaterias, setTentativaMaterias] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregandoMaterias(true)
    setErroMaterias(false)
    api.publicoMaterias()
      .then((lista) => {
        if (ativo) setMaterias(lista)
      })
      .catch(() => {
        if (ativo) setErroMaterias(true)
      })
      .finally(() => {
        if (ativo) setCarregandoMaterias(false)
      })
    api.planos().then((lista) => {
      if (ativo) setPlanos(lista)
    }).catch(() => {
      if (ativo) setPlanos([])
    })
    return () => {
      ativo = false
    }
  }, [tentativaMaterias])

  const totalQuestoes = materias.reduce((soma, m) => soma + m.questoes, 0)
  const pagos = planos.filter((p) => p.pago ?? p.codigo !== 'FREE')
  const basico =
    planos.find((p) => p.codigo === 'BASICO') ??
    planos.find((p) => p.codigo === 'PRO_MENSAL') ??
    pagos[0]
  const plus =
    planos.find((p) => p.codigo === 'PLUS') ??
    planos.find((p) => p.codigo === 'PRO_ANUAL') ??
    pagos[1]

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-900 to-brand-800 text-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="qb-container relative py-12 sm:py-16 lg:py-20">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold leading-snug text-accent-200 sm:text-[12px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden="true" />
            <span className="truncate sm:whitespace-normal">
              Estudo por banca e certame · questões comentadas
            </span>
          </p>

          <h1 className="mt-4 max-w-3xl text-[30px] font-extrabold leading-[1.15] tracking-tight sm:mt-5 sm:text-4xl lg:text-[44px]">
            Quebre a banca com{' '}
            <span className="text-accent-300">
              {totalQuestoes > 0 ? totalQuestoes.toLocaleString('pt-BR') : '1.000'} questões
            </span>{' '}
            comentadas e um tutor que explica cada resposta.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-100 sm:text-base lg:text-[17px]">
            Banco de questões organizado por banca e certame, com comentário fundamentado artigo
            por artigo, simulados cronometrados e um tutor de IA que responde só sobre a questão da
            tela.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={() => onNavegar('pratica')}
              className="qb-btn-accent w-full text-sm sm:w-auto sm:px-6"
            >
              Praticar grátis — 10 questões
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavegar('planos')}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Ver planos
            </button>
          </div>

          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-4 sm:gap-4">
            <Numero valor={totalQuestoes > 0 ? String(totalQuestoes) : '1.004'} rotulo="questões" />
            <Numero valor="524" rotulo="assuntos" />
            <Numero valor="3" rotulo="certames" />
            <Numero valor="100%" rotulo="comentadas" />
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------ materias */}
      <section className="qb-container py-12 sm:py-14">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Escolha uma matéria e comece agora
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            Sem cadastro, você pratica uma matéria com 10 questões. Grátis, sem cartão.
          </p>
        </div>
        {carregandoMaterias ? (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-2xl" />
            ))}
          </div>
        ) : erroMaterias ? (
          <ErrorBanner className="mt-5" onRetry={() => setTentativaMaterias((n) => n + 1)}>
            Não foi possível carregar as matérias agora. Você ainda pode começar pela prática
            gratuita.
          </ErrorBanner>
        ) : materias.length ? (
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {materias.map((m) => (
              <button
                key={m.materia}
                type="button"
                onClick={() => onNavegar('pratica')}
                className="qb-card-interactive group flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block break-words text-[13px] font-semibold text-ink-800 group-hover:text-brand-800">
                    {m.materia}
                  </span>
                  <span className="block text-[11px] font-medium text-ink-500">
                    {m.questoes} questões
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">
            Nenhuma matéria publicada no momento. A prática gratuita continua disponível.
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ como funciona */}
      <section className="border-y border-ink-200 bg-surface">
        <div className="qb-container py-12 sm:py-14">
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Como funciona</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-4">
            <Passo
              numero="1"
              icone={<Target className="h-4 w-4" aria-hidden="true" />}
              titulo="Escolha o foco"
              texto="Filtre por banca, certame, matéria e assunto. São 524 assuntos mapeados do edital."
            />
            <Passo
              numero="2"
              icone={<BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
              titulo="Responda e entenda"
              texto="Errou? O comentário mostra o artigo, o inciso e por que os distratores estão errados."
            />
            <Passo
              numero="3"
              icone={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              titulo="Feche a lacuna"
              texto="No Plus, peça ao tutor uma explicação diferente da mesma questão, quantas vezes precisar."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ diferenciais */}
      <section className="qb-container py-12 sm:py-14">
        <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          Por que estudar no QB Concurso
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Diferencial
            titulo="Comentário com fundamento literal"
            texto="Cada questão tem o artigo de lei ou item do edital que resolve. Nada de doutrina solta."
          />
          <Diferencial
            titulo="Procedência sempre visível"
            texto="Você sabe se está treinando prova real da banca ou questão autoral no mesmo estilo."
          />
          <Diferencial
            titulo="Tutor com IA focado na questão"
            texto="No plano Plus, o tutor responde sobre a questão da tela e é proibido de inventar artigo ou súmula."
          />
          <Diferencial
            titulo="Simulado e evolução"
            texto="Prova cronometrada com o mesmo formato da banca e gráfico de desempenho por matéria."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ para quem */}
      <section className="qb-container py-12 sm:py-14">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Para quem é o QB Concurso
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            Conteúdo separado por edital e no estilo da banca de cada prova.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-4">
          <Certame
            nome="PM-AM — Soldado"
            banca="FGV"
            texto="Português, RLM, Informática, Direito Constitucional, Legislação Institucional, História e Geografia do Amazonas."
          />
          <Certame
            nome="PC-AM — Investigador"
            banca="FGV"
            texto="Direito Penal e Processual Penal, Administrativo, Constitucional, Português, RLM, Informática, Administração e Contabilidade."
          />
          <Certame
            nome="CREA-AM"
            banca="ACCESS"
            texto="Lei 5.194/66, Lei 6.496/77, resoluções do CONFEA e Regimento Interno, com material de estudo e questões autorais."
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ planos */}
      <section className="border-y border-ink-200 bg-brand-50/60">
        <div className="qb-container py-12 sm:py-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">Planos</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Comece grátis. Assine quando quiser responder sem limite.
              </p>
            </div>
            <button type="button" onClick={() => onNavegar('planos')} className="qb-btn-ghost text-[13px]">
              Ver detalhes
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 md:gap-4">
            <div className="qb-card flex flex-col p-5">
              <h3 className="text-sm font-bold text-ink-900">Grátis</h3>
              <p className="mt-2 text-2xl font-extrabold text-ink-900">R$ 0</p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                <li>• 10 questões por dia após criar a conta</li>
                <li>• prática aberta: 1 matéria, 10 questões</li>
                <li>• comentário e gabarito</li>
              </ul>
              <button type="button" onClick={onCriarConta} className="qb-btn mt-4 w-full">
                Criar conta
              </button>
            </div>

            {basico ? (
              <div className="qb-card flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink-900">{basico.nome}</h3>
                  <span className="qb-chip bg-ink-100 text-ink-600">1 certame</span>
                </div>
                <p className="mt-2 break-words text-2xl font-extrabold text-brand-800">
                  R$ {(basico.valorCentavos / 100).toFixed(2).replace('.', ',')}
                  <span className="text-sm font-semibold text-ink-500">/mês</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                  <li>• 1 certame contratado</li>
                  <li>• questões e materiais do certame</li>
                  <li>• Tutor de IA no Plus</li>
                </ul>
                <button type="button" onClick={onCriarConta} className="qb-btn-ghost mt-4 w-full">
                  Assinar o Básico
                </button>
              </div>
            ) : null}

            {plus ? (
              <div className="qb-card flex flex-col p-5 ring-2 ring-brand-600">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink-900">{plus.nome}</h3>
                  <span className="qb-chip bg-brand-700 text-white">recomendado</span>
                </div>
                <p className="mt-2 break-words text-2xl font-extrabold text-brand-800">
                  R$ {(plus.valorCentavos / 100).toFixed(2).replace('.', ',')}
                  <span className="text-sm font-semibold text-ink-500">/mês</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                  <li>• até 3 certames no escopo</li>
                  <li>• Tutor de IA com cota diária</li>
                  <li>• questões e materiais dos certames</li>
                </ul>
                <button type="button" onClick={onCriarConta} className="qb-btn mt-4 w-full">
                  Assinar o Plus
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ faq */}
      <section className="border-t border-ink-200 bg-surface">
        <div className="qb-container py-12 sm:py-14">
          <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Perguntas frequentes
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Pergunta
              pergunta="O que é o QB Concurso?"
              resposta="Plataforma de questões comentadas para PM-AM, PC-AM e CREA-AM, organizada por banca e assunto, com fundamento legal."
            />
            <Pergunta
              pergunta="O plano gratuito inclui o quê?"
              resposta="20 questões por dia com comentário e gabarito, além da prática aberta sem cadastro."
            />
            <Pergunta
              pergunta="Tem tutor de IA?"
              resposta="Sim, no plano Plus: ele responde dúvidas sobre a questão em estudo, com foco na letra da lei."
            />
            <Pergunta
              pergunta="Como é o pagamento?"
              resposta="Mercado Pago (Pix ou cartão); o acesso ao plano é liberado automaticamente após a confirmação."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA final */}
      <section className="qb-container py-14 text-center sm:py-16">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Pronto para quebrar essa banca?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-600">
          Faça as primeiras 10 questões agora, sem cadastro. Se gostar, crie a conta e continue de
          onde parou.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button type="button" onClick={() => onNavegar('pratica')} className="qb-btn w-full sm:w-auto sm:px-6">
            Praticar grátis
          </button>
          <button type="button" onClick={onCriarConta} className="qb-btn-ghost w-full sm:w-auto sm:px-6">
            Criar conta
          </button>
        </div>
      </section>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-200 sm:text-[11px]">
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-lg font-extrabold text-white sm:text-xl">{valor}</dd>
    </div>
  )
}

function Passo({
  numero,
  icone,
  titulo,
  texto,
}: {
  numero: string
  icone: ReactNode
  titulo: string
  texto: string
}) {
  return (
    <div className="qb-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
          {numero}
        </span>
        <span className="text-brand-700">{icone}</span>
      </div>
      <h3 className="mt-3 text-sm font-bold text-ink-900">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{texto}</p>
    </div>
  )
}

function Diferencial({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="qb-card flex gap-3 p-5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-ink-900">{titulo}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{texto}</p>
      </div>
    </div>
  )
}

function Certame({ nome, banca, texto }: { nome: string; banca: string; texto: string }) {
  return (
    <div className="qb-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Trophy className="h-4 w-4 text-accent-700" aria-hidden="true" />
        <h3 className="min-w-0 break-words text-sm font-bold text-ink-900">{nome}</h3>
        <span className="qb-chip bg-accent-100 text-accent-800">{banca}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{texto}</p>
    </div>
  )
}

function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  return (
    <div className="rounded-[16px] border border-ink-200 bg-white p-4">
      <h3 className="text-sm font-bold text-ink-900">{pergunta}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{resposta}</p>
    </div>
  )
}
