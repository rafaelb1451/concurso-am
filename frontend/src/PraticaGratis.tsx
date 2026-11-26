import { useEffect, useState } from 'react'
import { api, type MateriaResumo, type QuestaoPublica, type RespostaPublica } from './api'
import type { PaginaPublica } from './SiteHeader'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
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
  const [materia, setMateria] = useState<string | null>(null)
  const [questoes, setQuestoes] = useState<QuestaoPublica[]>([])
  const [indice, setIndice] = useState(0)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [resultado, setResultado] = useState<RespostaPublica | null>(null)
  const [acertos, setAcertos] = useState(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.publicoMaterias().then(setMaterias).catch(() => setErro('Não foi possível carregar as matérias.'))
  }, [])

  async function começar(nome: string) {
    setErro(null)
    setCarregando(true)
    setMateria(nome)
    try {
      const lista = await api.publicoQuestoes(nome, LIMITE)
      setQuestoes(lista)
      setIndice(0)
      setEscolhida(null)
      setResultado(null)
      setAcertos(0)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar as questões.')
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
    }
  }

  function proxima() {
    setEscolhida(null)
    setResultado(null)
    setIndice((i) => i + 1)
  }

  const atual = questoes[indice]
  const terminou = questoes.length > 0 && indice >= questoes.length

  // ---------------------------------------------------------------- seleção de matéria
  if (!materia) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Prática gratuita
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Escolha <strong>uma matéria</strong> e responda até <strong>{LIMITE} questões</strong>, sem
          criar conta.
        </p>
        {erro ? (
          <p className="mt-4 rounded-xl bg-err-50 px-4 py-3 text-sm text-err-700">{erro}</p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {materias.map((m) => (
            <button
              key={m.materia}
              onClick={() => void começar(m.materia)}
              className="qb-card flex items-center justify-between p-4 text-left transition hover:border-brand-300"
            >
              <span>
                <span className="block text-sm font-bold text-ink-900">{m.materia}</span>
                <span className="block text-[12px] text-ink-400">{m.questoes} questões no banco</span>
              </span>
              <span className="text-brand-700">→</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-[12px] text-ink-400">
          Quer o banco completo?{' '}
          <button onClick={onCriarConta} className="font-semibold text-brand-700 underline">
            Crie sua conta grátis
          </button>
          .
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------- fim da prática
  if (terminou) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-14 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-700">
          Prática gratuita concluída
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">
          Você acertou {acertos} de {questoes.length}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Em {materia}. Para continuar treinando esta e as outras matérias, crie sua conta — o plano
          gratuito libera 10 questões por dia.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={onCriarConta} className="qb-btn px-6 py-3">
            Criar conta grátis
          </button>
          <button onClick={() => onNavegar('planos')} className="qb-btn-ghost px-6 py-3">
            Ver planos
          </button>
        </div>
        <button
          onClick={() => {
            setMateria(null)
            setQuestoes([])
          }}
          className="mt-6 text-[12px] font-semibold text-ink-400 underline"
        >
          Escolher outra matéria
        </button>
      </div>
    )
  }

  if (carregando || !atual) {
    return <p className="mx-auto max-w-2xl px-5 py-14 text-sm text-ink-500">Carregando questões…</p>
  }

  // ---------------------------------------------------------------- questão
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMateria(null)}
          className="text-[12px] font-semibold text-ink-400 hover:text-ink-700"
        >
          ← trocar matéria
        </button>
        <span className="qb-chip bg-brand-50 text-brand-800">
          {indice + 1} / {questoes.length} · {acertos} acerto{acertos === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${((indice + (escolhida !== null ? 1 : 0)) / questoes.length) * 100}%` }}
        />
      </div>

      <div className="qb-card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="qb-chip bg-ink-100 text-ink-600">{atual.materia}</span>
          <span className="qb-chip bg-ink-100 text-ink-600">{atual.assunto}</span>
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

        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink-800">
          {atual.enunciado}
        </p>

        <div className="mt-5 space-y-2">
          {atual.alternativas.map((texto, i) => {
            const escolhidaAqui = escolhida === i
            const correta = resultado && resultado.gabarito === i
            const errada = resultado && escolhidaAqui && !resultado.acertou
            return (
              <button
                key={i}
                onClick={() => void responder(i)}
                disabled={escolhida !== null}
                className={[
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                  correta
                    ? 'border-ok-400 bg-ok-50'
                    : errada
                      ? 'border-err-300 bg-err-50'
                      : escolhidaAqui
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-ink-200 bg-surface hover:border-brand-300',
                ].join(' ')}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-300 text-[11px] font-bold text-ink-600">
                  {LETRAS[i]}
                </span>
                <span className="whitespace-pre-line text-ink-700">{texto}</span>
              </button>
            )
          })}
        </div>

        {resultado ? (
          <div
            className={[
              'mt-5 rounded-xl px-4 py-3 text-sm',
              resultado.acertou ? 'bg-ok-50 text-ok-700' : 'bg-err-50 text-err-700',
            ].join(' ')}
          >
            <p className="font-bold">
              {resultado.acertou ? 'Você acertou!' : `Resposta correta: ${LETRAS[resultado.gabarito]}`}
            </p>
            {resultado.explicacao ? (
              <p className="mt-2 whitespace-pre-line text-ink-700">{resultado.explicacao}</p>
            ) : null}
            {resultado.fundamento ? (
              <p className="mt-2 text-[12px] font-semibold text-ink-500">
                Fundamento: {resultado.fundamento}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          {escolhida !== null ? (
            <button onClick={proxima} className="qb-btn">
              {indice + 1 === questoes.length ? 'Ver resultado' : 'Próxima questão'}
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-ink-400">
        Prática gratuita: 1 matéria, até {LIMITE} questões, sem cadastro.
      </p>
    </div>
  )
}
