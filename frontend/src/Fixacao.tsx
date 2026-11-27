import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  api,
  type Answer,
  type ChatMensagem,
  type ContextoQuestao,
  type Question,
  type Topico,
} from './api'
import { PencilLine } from 'lucide-react'
import Rascunho from './Rascunho'

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const SUGESTOES = [
  'Por que a resposta certa é essa?',
  'Por que a minha alternativa está errada?',
  'Dá um exemplo parecido para eu treinar?',
]

/**
 * Aba de fixação: treino focado por matéria com o tutor ao lado.
 * O chat recebe o contexto da questão atual, então a resposta é sobre ELA — não genérica.
 */
export default function Fixacao({ banca = 'TODAS', concurso }: { banca?: string; concurso: string }) {
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
    api.topicos(banca, concurso).then(setTopicos).catch(() => setErro('Servidor indisponível.'))
    api.configDeepseek().then((c) => setConfigurado(c.configurado)).catch(() => setConfigurado(false))
  }, [banca, concurso])

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' })
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
    const conteudo = (texto ?? pergunta).trim()
    if (!conteudo || pensando) return
    const novas: ChatMensagem[] = [...mensagens, { role: 'user', content: conteudo }]
    setMensagens(novas)
    setPergunta('')
    setPensando(true)
    try {
      // O backend aceita no maximo 20 mensagens por requisicao: envia a janela mais recente.
      const r = await api.chat(novas.slice(-20), montarContexto())
      setMensagens([...novas, { role: 'assistant', content: r.resposta }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao falar com o tutor.'
      setMensagens([
        ...novas,
        { role: 'assistant', content: `Não consegui responder: ${msg}` },
      ])
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
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ---------------- coluna da questão ---------------- */}
      <section>
        <div className="mb-4 rounded-[14px] border border-ink-200 bg-surface p-5 shadow-card">
          <h2 className="text-base font-bold text-ink-900">Exercícios de fixação</h2>
          <p className="mt-1 text-sm text-ink-500">
            Treine a matéria e peça ajuda ao tutor ao lado, a qualquer momento.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="min-w-[240px] flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas as matérias</option>
              {materias.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              onClick={comecar}
              disabled={carregando}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
            >
              {carregando ? 'Carregando…' : fila.length ? 'Nova sequência' : 'Começar fixação'}
            </button>
          </div>
        </div>

        {erro ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{erro}</p>
        ) : null}

        {atual ? (
          <div className="rounded-[14px] border border-ink-200 bg-surface p-5 shadow-card">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-ink-100 px-2.5 py-1 font-semibold text-ink-700">
                {atual.materia}
              </span>
              <span className="rounded-full bg-ink-50 px-2.5 py-1 font-semibold text-ink-600">
                {atual.assunto}
              </span>
              <span
                className={
                  atual.origem === 'PROVA'
                    ? 'rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700'
                    : 'rounded-full bg-accent-50 px-2.5 py-1 font-semibold text-accent-700'
                }
              >
                {atual.origem === 'PROVA' ? 'Prova oficial' : 'Autoral'}
              </span>
              <button
                onClick={() => setRascunhoAberto(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-2.5 py-1.5 font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Rascunho
              </button>
              <span className="text-ink-400">
                {indice + 1} de {fila.length}
              </span>
            </div>

            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-900">
              {atual.enunciado}
            </p>

            <ul className="mt-4 space-y-2">
              {atual.alternativas.map((texto, i) => {
                const marcada = escolhida === i
                const correta = resposta ? resposta.correta === i : false
                let classe =
                  'w-full rounded-xl border px-4 py-3 text-left text-sm transition border-ink-200 bg-white hover:border-brand-300'
                if (resposta) {
                  if (correta) classe = 'w-full rounded-xl border px-4 py-3 text-left text-sm border-ok-500 bg-ok-50 text-ink-900'
                  else if (marcada) classe = 'w-full rounded-xl border px-4 py-3 text-left text-sm border-err-400 bg-err-50 text-ink-900'
                  else classe = 'w-full rounded-xl border px-4 py-3 text-left text-sm border-ink-100 bg-surface text-ink-400'
                }
                return (
                  <li key={i}>
                    <button disabled={!!resposta} onClick={() => void responder(i)} className={classe}>
                      <span className="mr-2 font-bold">{LETRAS[i]})</span>
                      {texto}
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
                className={`mt-4 rounded-[14px] border p-4 ${
                  resposta.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
                }`}
              >
                <p className="text-sm font-bold text-ink-900">
                  {resposta.acertou ? 'Você acertou' : `Você errou — gabarito ${resposta.gabarito}`}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
                  {resposta.explicacao ||
                    (resposta.origem === 'PROVA'
                      ? 'Questão de prova oficial — sem comentário cadastrado. Peça ao tutor.'
                      : 'Sem comentário cadastrado.')}
                </p>
                {resposta.fundamento ? (
                  <p className="mt-2 text-xs text-ink-500">
                    <strong>Fundamento:</strong> {resposta.fundamento}
                  </p>
                ) : null}
                <button
                  onClick={proxima}
                  className="mt-3 w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
                >
                  Próxima questão
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            Escolha a matéria e clique em <strong>Começar fixação</strong>.
          </div>
        )}
      </section>

      {/* ---------------- coluna do tutor ---------------- */}
      <aside className="flex h-[560px] flex-col rounded-[14px] border border-ink-200 bg-surface shadow-card lg:h-[640px]">
        <div className="border-b border-ink-100 px-4 py-3">
          <h3 className="text-sm font-bold text-ink-900">Tutor</h3>
          <p className="text-[11px] text-ink-400">Ele vê a questão que você está resolvendo.</p>
        </div>

        {configurado === false ? (
          <div className="flex flex-1 flex-col justify-center gap-3 p-4">
            <p className="text-sm text-ink-600">
              Cole a sua chave da DeepSeek. Ela fica gravada no servidor e não vai para o
              repositório.
            </p>
            <input
              type="password"
              value={chaveTmp}
              onChange={(e) => setChaveTmp(e.target.value)}
              placeholder="sk-..."
              className="rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
            <button
              onClick={() => void salvar()}
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Salvar chave
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensagens.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-ink-500">
                    {atual
                      ? 'Resolva a questão e pergunte o que quiser sobre ela.'
                      : 'Comece uma fixação para o tutor conhecer a questão.'}
                  </p>
                  {atual
                    ? SUGESTOES.map((s) => (
                        <button
                          key={s}
                          onClick={() => void perguntar(s)}
                          className="block w-full rounded-xl border border-ink-200 px-3 py-2 text-left text-xs text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
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
                      ? 'ml-6 rounded-2xl rounded-br-sm bg-brand-700 px-3 py-2 text-sm text-white'
                      : 'mr-2 rounded-2xl rounded-bl-sm bg-ink-50 px-3 py-2 text-sm whitespace-pre-line text-ink-800'
                  }
                >
                  {m.content}
                </div>
              ))}
              {pensando ? <p className="text-xs text-ink-400">o tutor está pensando…</p> : null}
              <div ref={fim} />
            </div>

            <div className="border-t border-ink-100 p-3">
              <div className="flex gap-2">
                <input
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void perguntar()
                  }}
                  placeholder="Pergunte sobre a questão…"
                  className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void perguntar()}
                  disabled={pensando || !pergunta.trim()}
                  className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
