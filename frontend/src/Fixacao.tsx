import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Lock, PencilLine, Send, Sparkles } from 'lucide-react'
import {
  api,
  type Answer,
  type ChatMensagem,
  type ContextoQuestao,
  type Question,
  type Topico,
  type TutorUso,
} from './api'
import Rascunho from './Rascunho'
import { Card, ErrorBanner, PageHeader } from './ui'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
function certoErrado(alternativas: string[]): boolean {
  return alternativas.length === 2 && alternativas[0] === 'Certo' && alternativas[1] === 'Errado'
}
const SUGESTOES = [
  'Por que a resposta certa é essa?',
  'Por que a minha alternativa está errada?',
  'Dá um exemplo parecido para eu treinar?',
]

/**
 * Aba de fixação: treino focado por matéria com o tutor ao lado.
 * O chat recebe o contexto da questão atual, então a resposta é sobre ELA — não genérica.
 */
export default function Fixacao({
  banca = 'TODAS',
  concurso,
  tutorIa,
  tutorUso = null,
  onConhecerPlus,
}: {
  banca?: string
  concurso: string
  /** `false` bloqueia o tutor; `undefined` mantém o comportamento legado (só checa a chave). */
  tutorIa?: boolean
  tutorUso?: TutorUso | null
  onConhecerPlus?: () => void
}) {
  const tutorLiberado = tutorIa !== false
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [materia, setMateria] = useState('')
  const [fila, setFila] = useState<Question[]>([])
  const [indice, setIndice] = useState(0)
  const [resposta, setResposta] = useState<Answer | null>(null)
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [rascunhoAberto, setRascunhoAberto] = useState(false)

  // tutor
  const [configurado, setConfigurado] = useState<boolean | null>(null)
  const [chaveTmp, setChaveTmp] = useState('')
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([])
  const [pergunta, setPergunta] = useState('')
  const [pensando, setPensando] = useState(false)
  const fim = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    api.topicos(banca, concurso).then(setTopicos).catch(() => setErro('Servidor indisponível. Recarregue e tente de novo.'))
    if (!tutorLiberado) {
      setConfigurado(false)
      return
    }
    api.configDeepseek().then((c) => setConfigurado(c.configurado)).catch(() => setConfigurado(false))
  }, [banca, concurso, tutorLiberado])

  useEffect(() => {
    if (mensagens.length === 0 && !pensando) return
    const reduzir =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    fim.current?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'nearest' })
  }, [mensagens, pensando])

  const materias = useMemo(() => [...new Set(topicos.map((t) => t.materia))].sort(), [topicos])
  const atual = fila[indice]

  // A gaveta de rascunho pertence à questão atual: fecha ao avançar.
  useEffect(() => {
    setRascunhoAberto(false)
  }, [atual?.id])

  async function comecar() {
    setCarregando(true)
    setErro(null)
    try {
      const qs = await api.questoes(banca, concurso, materia || undefined, undefined, 10)
      if (!qs.length) {
        setErro('Nenhuma questão nessa matéria.')
        return
      }
      setFila(qs)
      setIndice(0)
      setResposta(null)
      setEscolhida(null)
      setMensagens([])
      setRascunhoAberto(false)
    } catch {
      setErro('Não foi possível carregar as questões.')
    } finally {
      setCarregando(false)
    }
  }

  const responder = useCallback(
    async (alternativa: number) => {
      if (!atual || resposta) return
      setEscolhida(alternativa)
      try {
        const r = await api.responder(atual.id, alternativa)
        setResposta(r)
      } catch {
        setErro('Não foi possível registrar a resposta.')
      }
    },
    [atual, resposta],
  )

  function proxima() {
    setResposta(null)
    setEscolhida(null)
    setMensagens([])
    setRascunhoAberto(false)
    setIndice((i) => (i + 1 < fila.length ? i + 1 : 0))
  }

  function montarContexto(): ContextoQuestao | null {
    if (!atual) return null
    return {
      materia: atual.materia,
      assunto: atual.assunto,
      enunciado: atual.enunciado,
      alternativas: atual.alternativas,
      gabarito: resposta?.gabarito ?? null,
      alternativaAluno: escolhida !== null ? LETRAS[escolhida] : null,
      acertou: resposta ? resposta.acertou : null,
      fundamento: resposta?.fundamento ?? null,
      explicacao: resposta?.explicacao ?? null,
    }
  }

  async function perguntar(texto?: string) {
    if (!tutorLiberado) return
    const conteudo = (texto ?? pergunta).trim()
    if (!conteudo || pensando) return
    const novas: ChatMensagem[] = [...mensagens, { role: 'user', content: conteudo }]
    setMensagens(novas)
    setPergunta('')
    setPensando(true)
    try {
      // O backend aceita no máximo 20 mensagens por requisição: envia a janela mais recente.
      const r = await api.chat(novas.slice(-20), montarContexto())
      setMensagens([...novas, { role: 'assistant', content: r.resposta }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao falar com o tutor.'
      setMensagens([...novas, { role: 'assistant', content: `Não consegui responder: ${msg}` }])
    } finally {
      setPensando(false)
    }
  }

  async function salvar() {
    if (!chaveTmp.trim()) return
    try {
      const c = await api.salvarChave(chaveTmp.trim())
      setConfigurado(c.configurado)
      setChaveTmp('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar a chave.')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Treino focado"
        title="Fixação"
        description="Resolva questões da matéria e peça ajuda ao tutor ao lado, a qualquer momento."
        actions={
          tutorLiberado ? (
            <span className="qb-chip bg-accent-100 text-accent-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              tutor de IA
            </span>
          ) : (
            <span
              className="qb-chip bg-ink-100 text-ink-600"
              title="O Tutor de IA está disponível no plano Plus."
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              tutor no Plus
            </span>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* ---------------- coluna da questão ---------------- */}
        <section className="min-w-0 space-y-4">
          <Card padded>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <h2 className="text-sm font-bold text-ink-900">Exercícios de fixação</h2>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="fixacao-materia" className="qb-label">
                  Matéria
                </label>
                <select
                  id="fixacao-materia"
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="qb-select"
                >
                  <option value="">Todas as matérias</option>
                  {materias.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={comecar}
                disabled={carregando}
                className="qb-btn min-h-11 shrink-0 sm:px-5"
              >
                {carregando ? 'Carregando…' : fila.length ? 'Nova sequência' : 'Começar fixação'}
              </button>
            </div>
          </Card>

          {erro ? <ErrorBanner>{erro}</ErrorBanner> : null}

          {atual ? (
            <Card className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="qb-chip max-w-full truncate bg-ink-100 text-ink-700">{atual.materia}</span>
                <span className="qb-chip max-w-full truncate bg-ink-50 text-ink-600">{atual.assunto}</span>
                <span
                  className={
                    atual.origem === 'PROVA'
                      ? 'qb-chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200'
                      : 'qb-chip bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-200'
                  }
                >
                  {atual.origem === 'PROVA' ? 'Prova oficial' : 'Autoral'}
                </span>
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
                <span className="text-ink-500">
                  {indice + 1} de {fila.length}
                </span>
              </div>

              <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-900">
                {atual.enunciado}
              </p>

              <ul className="mt-4 space-y-2.5">
                {atual.alternativas.map((texto, i) => {
                  const marcada = escolhida === i
                  const correta = resposta ? resposta.correta === i : false
                  let classe =
                    'flex min-h-12 w-full items-start gap-2.5 rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-left text-sm text-ink-800 transition hover:border-brand-300'
                  if (resposta) {
                    if (correta) {
                      classe = 'flex min-h-12 w-full items-start gap-2.5 rounded-xl border border-ok-500 bg-ok-50 px-3.5 py-3 text-left text-sm text-ink-900'
                    } else if (marcada) {
                      classe = 'flex min-h-12 w-full items-start gap-2.5 rounded-xl border border-err-400 bg-err-50 px-3.5 py-3 text-left text-sm text-ink-900'
                    } else {
                      classe = 'flex min-h-12 w-full items-start gap-2.5 rounded-xl border border-ink-100 bg-surface px-3.5 py-3 text-left text-sm text-ink-500'
                    }
                  }
                  return (
                    <li key={i}>
                      <button type="button" disabled={Boolean(resposta)} onClick={() => void responder(i)} className={classe}>
                        {certoErrado(atual.alternativas) ? null : <span className="mt-0.5 font-bold">{LETRAS[i]})</span>}
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

              {resposta ? (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-4 rounded-[16px] border p-4 ${
                    resposta.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
                  }`}
                >
                  <p className="text-sm font-bold text-ink-900">
                    {resposta.acertou ? 'Você acertou' : `Você errou — gabarito ${resposta.gabarito}`}
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-800">
                    {resposta.explicacao ||
                      (resposta.origem === 'PROVA'
                        ? 'Questão de prova oficial — sem comentário cadastrado. Peça ao tutor.'
                        : 'Sem comentário cadastrado.')}
                  </p>
                  {resposta.fundamento ? (
                    <p className="mt-2 break-words text-xs leading-relaxed text-ink-600">
                      <strong className="font-semibold text-ink-800">Fundamento:</strong> {resposta.fundamento}
                    </p>
                  ) : null}
                  <button type="button" onClick={proxima} className="qb-btn mt-3 w-full sm:w-auto sm:px-5">
                    Próxima questão
                  </button>
                </div>
              ) : null}
            </Card>
          ) : (
            <div className="qb-empty">
              <p className="text-sm font-semibold text-ink-800">
                Escolha a matéria e clique em <strong>Começar fixação</strong>.
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Você recebe 10 questões e o tutor acompanha cada uma.
              </p>
            </div>
          )}
        </section>

        {/* ---------------- coluna do tutor ---------------- */}
        <aside className="flex h-[520px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-ink-200 bg-surface shadow-card lg:sticky lg:top-28 lg:h-[640px]">
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="flex items-center gap-2">
              {tutorLiberado ? (
                <Sparkles className="h-4 w-4 text-accent-700" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4 text-ink-400" aria-hidden="true" />
              )}
              <h3 className="text-sm font-bold text-ink-900">Tutor</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {!tutorLiberado
                ? 'Disponível no plano Plus.'
                : tutorUso && tutorUso.cota > 0
                  ? `Ele vê a questão que você está resolvendo · hoje: ${tutorUso.usado}/${tutorUso.cota}.`
                  : 'Ele vê a questão que você está resolvendo.'}
            </p>
          </div>

          {!tutorLiberado ? (
            <>
              <div className="flex flex-1 flex-col justify-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </span>
                <h4 className="text-sm font-bold text-ink-900">Tutor de IA exclusivo do Plus</h4>
                <p className="text-sm leading-relaxed text-ink-600">
                  No Básico você estuda as questões e os materiais do certame contratado. O tutor
                  que explica cada resposta está disponível no Plus.
                </p>
                <button
                  type="button"
                  onClick={onConhecerPlus}
                  disabled={!onConhecerPlus}
                  className="qb-btn-accent w-full"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Conheça o Plus
                </button>
              </div>
              <div className="border-t border-ink-100 p-3">
                <label htmlFor="tutor-pergunta-bloqueado" className="sr-only">
                  Pergunta ao tutor (bloqueada no plano atual)
                </label>
                <div className="flex gap-2">
                  <input
                    id="tutor-pergunta-bloqueado"
                    disabled
                    placeholder="Disponível no Plus"
                    title="Assine o Plus para conversar com o Tutor de IA."
                    className="qb-input min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    disabled
                    aria-label="Enviar pergunta"
                    className="qb-btn min-h-11 w-11 shrink-0 px-0"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-ink-500">
                  O botão de enviar fica desabilitado enquanto o tutor não está no plano.
                </p>
              </div>
            </>
          ) : configurado === false ? (
            <div className="flex flex-1 flex-col justify-center gap-3 p-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Cole a sua chave da DeepSeek. Ela fica gravada no servidor e não vai para o
                repositório.
              </p>
              <label htmlFor="tutor-chave" className="sr-only">
                Chave da DeepSeek
              </label>
              <input
                id="tutor-chave"
                type="password"
                value={chaveTmp}
                onChange={(e) => setChaveTmp(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                className="qb-input"
              />
              <button type="button" onClick={() => void salvar()} className="qb-btn w-full">
                Salvar chave
              </button>
            </div>
          ) : (
            <>
              <div
                className="qb-scroll flex-1 space-y-3 overflow-y-auto p-4"
                role="log"
                aria-label="Conversa com o tutor"
                aria-live="polite"
              >
                {mensagens.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-ink-500">
                      {atual
                        ? 'Resolva a questão e pergunte o que quiser sobre ela.'
                        : 'Comece uma fixação para o tutor conhecer a questão.'}
                    </p>
                    {atual
                      ? SUGESTOES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => void perguntar(s)}
                            className="block min-h-11 w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-xs leading-relaxed text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
                          >
                            {s}
                          </button>
                        ))
                      : null}
                  </div>
                ) : null}

                {mensagens.map((m, i) => (
                  <div
                    key={i}
                    className={
                      m.role === 'user'
                        ? 'ml-6 break-words rounded-2xl rounded-br-sm bg-brand-700 px-3 py-2 text-sm text-white'
                        : 'mr-2 whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-ink-50 px-3 py-2 text-sm text-ink-800'
                    }
                  >
                    {m.content}
                  </div>
                ))}
                {pensando ? <p className="text-xs text-ink-500">o tutor está pensando…</p> : null}
                <div ref={fim} />
              </div>

              <div className="border-t border-ink-100 p-3">
                <label htmlFor="tutor-pergunta" className="sr-only">
                  Pergunte sobre a questão
                </label>
                <div className="flex gap-2">
                  <input
                    id="tutor-pergunta"
                    value={pergunta}
                    onChange={(e) => setPergunta(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void perguntar()
                    }}
                    placeholder="Pergunte sobre a questão…"
                    className="qb-input min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => void perguntar()}
                    disabled={pensando || !pergunta.trim()}
                    aria-label="Enviar pergunta"
                    className="qb-btn min-h-11 w-11 shrink-0 px-0"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
