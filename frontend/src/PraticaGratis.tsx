import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react'
import { api, type MateriaResumo, type QuestaoPublica, type RespostaPublica } from './api'
import type { PaginaPublica } from './SiteHeader'
import { Card, EmptyState, ErrorBanner, LoadingState, PageHeader, ProgressBar } from './ui'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
function certoErrado(alternativas: string[]): boolean {
  return alternativas.length === 2 && alternativas[0] === 'Certo' && alternativas[1] === 'Errado'
}
/** Mesmo teto do backend — a regra real é imposta lá. */
const LIMITE = 10

/**
 * Prática gratuita sem conta: uma matéria, até 10 questões.
 * Depois do limite o visitante é convidado a criar conta.
 */
export default function PraticaGratis({
  onNavegar,
  onCriarConta,
}: {
  onNavegar: (pagina: PaginaPublica) => void
  onCriarConta: () => void
}) {
  const [materias, setMaterias] = useState<MateriaResumo[]>([])
  const [carregandoMaterias, setCarregandoMaterias] = useState(true)
  const [materia, setMateria] = useState<string | null>(null)
  const [questoes, setQuestoes] = useState<QuestaoPublica[]>([])
  const [indice, setIndice] = useState(0)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [resultado, setResultado] = useState<RespostaPublica | null>(null)
  const [acertos, setAcertos] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const carregarMaterias = useCallback(() => {
    setCarregandoMaterias(true)
    setErro(null)
    api.publicoMaterias()
      .then(setMaterias)
      .catch(() => setErro('Não foi possível carregar as matérias. Tente novamente.'))
      .finally(() => setCarregandoMaterias(false))
  }, [])

  useEffect(() => {
    carregarMaterias()
  }, [carregarMaterias, tentativa])

  async function começar(nome: string) {
    setErro(null)
    setCarregando(true)
    setMateria(nome)
    try {
      const lista = await api.publicoQuestoes(nome, LIMITE)
      if (!lista.length) {
        setErro('Nenhuma questão disponível nesta matéria no momento. Tente outra.')
        setMateria(null)
        return
      }
      setQuestoes(lista)
      setIndice(0)
      setEscolhida(null)
      setResultado(null)
      setAcertos(0)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as questões.')
      setMateria(null)
    } finally {
      setCarregando(false)
    }
  }

  async function responder(alternativa: number) {
    if (escolhida !== null || !questoes[indice]) return
    setEscolhida(alternativa)
    try {
      const r = await api.publicoResponder(questoes[indice].id, alternativa)
      setResultado(r)
      if (r.acertou) setAcertos((n) => n + 1)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível corrigir a resposta.')
      setEscolhida(null)
    }
  }

  function proxima() {
    setEscolhida(null)
    setResultado(null)
    setIndice((i) => i + 1)
  }

  const atual = questoes[indice]
  const terminou = questoes.length > 0 && indice >= questoes.length
  const progresso = questoes.length > 0 ? (indice / questoes.length) * 100 : 0
  const totalMaterias = useMemo(
    () => materias.reduce((soma, m) => soma + m.questoes, 0),
    [materias],
  )

  // ---------------------------------------------------------------- seleção de matéria
  if (!materia) {
    return (
      <div className="qb-container max-w-4xl py-10 sm:py-14">
        <PageHeader
          eyebrow="Sem cadastro"
          title="Prática gratuita"
          description={
            <>
              Escolha <strong>uma matéria</strong> e responda até <strong>{LIMITE} questões</strong>,
              sem criar conta.
            </>
          }
          actions={
            <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {totalMaterias} questões no banco
            </span>
          }
        />

        {erro ? (
          <ErrorBanner className="mt-5" onRetry={() => setTentativa((n) => n + 1)}>
            {erro}
          </ErrorBanner>
        ) : null}

        {carregandoMaterias ? <LoadingState className="mt-5" label="Carregando matérias…" lines={4} /> : null}

        {!carregandoMaterias && !erro && materias.length === 0 ? (
          <EmptyState
            className="mt-5"
            icon={BookOpen}
            title="Nenhuma matéria disponível no momento."
            description="Tente novamente em instantes ou crie sua conta para acessar o banco completo."
            action={
              <button type="button" onClick={onCriarConta} className="qb-btn">
                Criar conta grátis
              </button>
            }
          />
        ) : null}

        {!carregandoMaterias && materias.length > 0 ? (
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {materias.map((m) => (
              <button
                key={m.materia}
                type="button"
                onClick={() => void começar(m.materia)}
                className="qb-card-interactive flex min-h-14 items-center justify-between gap-3 p-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block break-words text-sm font-bold text-ink-900">{m.materia}</span>
                  <span className="block text-[12px] text-ink-500">{m.questoes} questões no banco</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 rounded-xl bg-ink-50 px-4 py-3 text-center text-[12px] leading-relaxed text-ink-600">
          Quer o banco completo?{' '}
          <button type="button" onClick={onCriarConta} className="qb-link">
            Crie sua conta grátis
          </button>
          .
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------- fim da prática
  if (terminou) {
    return (
      <div className="qb-container max-w-2xl py-12 text-center sm:py-16">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-50 text-ok-600">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="qb-eyebrow mt-4">Prática gratuita concluída</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Você acertou {acertos} de {questoes.length}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">
          Em {materia}. Para continuar treinando esta e as outras matérias, crie sua conta — o plano
          gratuito libera 10 questões por dia.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col justify-center gap-2.5 sm:flex-row">
          <button type="button" onClick={onCriarConta} className="qb-btn w-full sm:w-auto sm:px-6">
            Criar conta grátis
          </button>
          <button type="button" onClick={() => onNavegar('planos')} className="qb-btn-ghost w-full sm:w-auto sm:px-6">
            Ver planos
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setMateria(null)
            setQuestoes([])
          }}
          className="mt-6 inline-flex min-h-11 items-center text-[12px] font-semibold text-ink-500 underline"
        >
          Escolher outra matéria
        </button>
      </div>
    )
  }

  if (carregando || !atual) {
    return (
      <div className="qb-container max-w-2xl py-12">
        <LoadingState label="Carregando questões…" lines={5} />
      </div>
    )
  }

  // ---------------------------------------------------------------- questão
  return (
    <div className="qb-container max-w-3xl py-8 sm:py-10">
      <h1 className="sr-only">Prática gratuita — {atual.materia}</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setMateria(null)
            setQuestoes([])
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[12px] font-semibold text-ink-600 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          trocar matéria
        </button>
        <span className="qb-chip bg-brand-50 text-brand-800">
          {indice + 1} / {questoes.length} · {acertos} acerto{acertos === 1 ? '' : 's'}
        </span>
      </div>

      <ProgressBar value={progresso} label="Progresso da prática gratuita" height="h-1.5" className="mt-3" />

      {erro ? <ErrorBanner className="mt-4">{erro}</ErrorBanner> : null}

      <Card className="mt-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className="qb-chip max-w-full truncate bg-ink-100 text-ink-700">{atual.materia}</span>
          <span className="qb-chip max-w-full truncate bg-ink-50 text-ink-600">{atual.assunto}</span>
          <span
            className={
              atual.origem === 'PROVA'
                ? 'qb-chip bg-brand-50 text-brand-800'
                : 'qb-chip bg-accent-100 text-accent-800'
            }
          >
            {atual.origem === 'PROVA' ? `Prova ${atual.banca} ${atual.ano}` : 'Autoral'}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-800">
          {atual.enunciado}
        </p>

        <div className="mt-5 space-y-2.5">
          {atual.alternativas.map((texto, i) => {
            const escolhidaAqui = escolhida === i
            const correta = resultado && resultado.gabarito === i
            const errada = resultado && escolhidaAqui && !resultado.acertou
            return (
              <button
                key={i}
                type="button"
                onClick={() => void responder(i)}
                disabled={escolhida !== null}
                aria-pressed={escolhidaAqui}
                className={[
                  'flex min-h-12 w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition',
                  correta
                    ? 'border-ok-400 bg-ok-50 text-ink-900'
                    : errada
                      ? 'border-err-400 bg-err-50 text-ink-900'
                      : escolhidaAqui
                        ? 'border-brand-400 bg-brand-50 text-ink-900'
                        : 'border-ink-200 bg-surface text-ink-800 hover:border-brand-300',
                ].join(' ')}
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink-300 text-[11px] font-bold text-ink-600">
                  {certoErrado(atual.alternativas) ? (i === 0 ? 'Certo' : 'Errado') : LETRAS[i]}
                </span>
                <span className="min-w-0 whitespace-pre-line break-words leading-relaxed">{texto}</span>
              </button>
            )
          })}
        </div>

        {resultado ? (
          <div
            role="status"
            aria-live="polite"
            className={[
              'mt-5 rounded-xl px-4 py-3 text-sm ring-1 ring-inset',
              resultado.acertou
                ? 'bg-ok-50 text-ok-700 ring-ok-200'
                : 'bg-err-50 text-err-700 ring-err-200',
            ].join(' ')}
          >
            <p className="font-bold">
              {resultado.acertou ? 'Você acertou!' : `Resposta correta: ${LETRAS[resultado.gabarito]}`}
            </p>
            {resultado.explicacao ? (
              <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-ink-700">
                {resultado.explicacao}
              </p>
            ) : null}
            {resultado.fundamento ? (
              <p className="mt-2 break-words text-[12px] font-semibold leading-relaxed text-ink-600">
                Fundamento: {resultado.fundamento}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          {escolhida !== null ? (
            <button type="button" onClick={proxima} className="qb-btn w-full sm:w-auto sm:px-6">
              {indice + 1 === questoes.length ? 'Ver resultado' : 'Próxima questão'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </Card>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
        Prática gratuita: 1 matéria, até {LIMITE} questões, sem cadastro.
      </p>
    </div>
  )
}
