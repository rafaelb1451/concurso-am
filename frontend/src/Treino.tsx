import { useEffect, useId, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpen, Clock3, Highlighter, Pencil, Scissors, Sparkles } from 'lucide-react'
import type { Answer, Banca, Concurso, Question } from './api'
import PomodoroEstudo, { type ModoTempo } from './PomodoroEstudo'
import MarcadorTexto from './MarcadorTexto'
import Rascunho from './Rascunho'
import { Card, PageHeader, ProgressBar } from './ui'

const LETRAS = ['A', 'B', 'C', 'D', 'E']

/** Itens de julgamento (Cebraspe): duas alternativas "Certo"/"Errado" sem letra. */
function certoErrado(alternativas: string[]): boolean {
  return alternativas.length === 2 && alternativas[0] === 'Certo' && alternativas[1] === 'Errado'
}

/* =========================================================================
   Aba Questões: configuração da sessão, resolução e resultado.
   ========================================================================= */

export function TreinoInicio(props: {
  bancas: Banca[]
  concursos: Concurso[]
  banca: string
  concurso: string
  carregandoFiltros: boolean
  bancasIndisponiveis: boolean
  concursosIndisponiveis: boolean
  materias: string[]
  assuntos: string[]
  materia: string
  assunto: string
  quantidade: number
  carregando: boolean
  totalQuestoes: number
  modoTempo: ModoTempo
  duracaoSessao: number
  onBanca: (v: string) => void
  onConcurso: (v: string) => void
  onMateria: (v: string) => void
  onAssunto: (v: string) => void
  onQuantidade: (v: number) => void
  onModoTempo: (v: ModoTempo) => void
  onDuracaoSessao: (v: number) => void
  onComecar: () => void
}) {
  const certames = props.concursos.filter((concurso) => concurso.id !== 'TODOS')
  const filtrosIndisponiveis = props.bancasIndisponiveis || props.concursosIndisponiveis
  const bancaAtual = props.bancas.find((item) => item.banca === props.banca)
  const certameAtual = certames.find((item) => item.id === props.concurso)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Estudo por banca"
        title="Escolha a banca e o que estudar"
        description={`${props.totalQuestoes} questões disponíveis com os filtros atuais. Combine banca, certame, matéria e assunto — ou resolva tudo.`}
      />

      <Card padded>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Banca"
            valor={props.banca}
            onChange={props.onBanca}
            dica="Define o estilo das questões."
          >
            <option value="TODAS">Todas as bancas</option>
            {props.bancas.map((item) => (
              <option key={item.banca} value={item.banca}>
                {item.banca} ({item.questoes})
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            rotulo="Certame"
            valor={props.concurso}
            onChange={props.onConcurso}
            dica="Filtra pelo concurso-alvo."
          >
            <option value="TODOS">Todos os certames</option>
            {certames.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} ({item.total})
              </option>
            ))}
          </CampoSelect>

          <CampoSelect rotulo="Matéria" valor={props.materia} onChange={props.onMateria}>
            <option value="">Todas as matérias</option>
            {props.materias.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect rotulo="Assunto" valor={props.assunto} onChange={props.onAssunto}>
            <option value="">Todos os assuntos</option>
            {props.assuntos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </CampoSelect>
        </div>

        {props.carregandoFiltros ? (
          <p className="mt-3 text-[11px] font-medium text-ink-500" role="status">
            Carregando bancas e certames…
          </p>
        ) : filtrosIndisponiveis ? (
          <p className="mt-3 text-[11px] font-medium text-ink-500">
            Alguns filtros estão indisponíveis no momento. Você ainda pode estudar todas as questões.
          </p>
        ) : null}

        <div className="mt-5 border-t border-ink-100 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink-900">Ritmo da sessão</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CampoSelect
              rotulo="Quantidade"
              valor={String(props.quantidade)}
              onChange={(valor) => props.onQuantidade(Number(valor))}
              desabilitado={props.modoTempo === 'livre'}
            >
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} questões
                </option>
              ))}
            </CampoSelect>

            <CampoSelect
              rotulo="Modo de estudo"
              valor={props.modoTempo}
              onChange={(valor) => props.onModoTempo(valor as ModoTempo)}
            >
              <option value="pomodoro">Pomodoro (25/5 min)</option>
              <option value="livre">Estudar por tempo</option>
            </CampoSelect>

            {props.modoTempo === 'livre' ? (
              <CampoSelect
                rotulo="Duração"
                valor={String(props.duracaoSessao)}
                onChange={(valor) => props.onDuracaoSessao(Number(valor))}
              >
                {[15, 25, 45, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} minutos
                  </option>
                ))}
              </CampoSelect>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
          {props.banca === 'TODAS' && props.concurso === 'TODOS' ? (
            'Sem filtro de banca ou certame: você treina o banco completo.'
          ) : (
            <>
              Filtros ativos: {bancaAtual ? bancaAtual.banca : 'todas as bancas'} ·{' '}
              {certameAtual ? certameAtual.id : 'todos os certames'}
              {props.materia ? ` · ${props.materia}` : ''}
              {props.assunto ? ` · ${props.assunto}` : ''}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={props.onComecar}
          disabled={props.carregando}
          className="qb-btn mt-4 min-h-12 w-full text-sm sm:w-auto sm:px-7"
        >
          {props.carregando ? 'Carregando…' : 'Começar sessão'}
          {props.carregando ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Dica
          icone={<BookOpen className="h-4 w-4" aria-hidden="true" />}
          titulo="20 questões por dia"
          texto="No plano gratuito você já pratica com comentário e gabarito."
        />
        <Dica
          icone={<Clock3 className="h-4 w-4" aria-hidden="true" />}
          titulo="Pomodoro ou tempo livre"
          texto="Escolha o ritmo e mantenha o foco sem perder a noção do tempo."
        />
        <Dica
          icone={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          titulo="Comentário fundamentado"
          texto="Cada resposta mostra o artigo de lei ou item do edital que resolve."
        />
      </div>
    </div>
  )
}

function Dica({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="qb-card flex items-start gap-3 p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icone}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-ink-900">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{texto}</p>
      </div>
    </div>
  )
}

function CampoSelect({
  rotulo,
  valor,
  onChange,
  dica,
  desabilitado = false,
  children,
}: {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  dica?: string
  desabilitado?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="qb-label">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={desabilitado}
        className="qb-select"
      >
        {children}
      </select>
      {dica ? <p className="mt-1.5 text-[11px] text-ink-500">{dica}</p> : null}
    </div>
  )
}

export function EstudoQuestao(props: {
  questao: Question
  indice: number
  total: number
  resposta: Answer | null
  escolhida: number | null
  modoTempo: ModoTempo
  duracaoSessao: number
  onResponder: (i: number) => void
  onProxima: () => void
  onConcluirTempo: () => void
}) {
  const { questao, resposta, escolhida } = props
  const [cortadas, setCortadas] = useState<Set<number>>(() => new Set())
  const [rascunhoAberto, setRascunhoAberto] = useState(false)
  const [marcadorAtivo, setMarcadorAtivo] = useState(false)

  useEffect(() => {
    setCortadas(new Set())
    setRascunhoAberto(false)
    setMarcadorAtivo(false)
  }, [questao.id])

  function alternarCortar(indice: number) {
    setCortadas((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(indice)) proximo.delete(indice)
      else proximo.add(indice)
      return proximo
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Resolvendo questões</h1>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-xs font-semibold text-ink-600">
          Questão {props.indice + 1} de {props.total}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={
              questao.origem === 'PROVA'
                ? 'qb-chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200'
                : 'qb-chip bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-200'
            }
          >
            {questao.origem === 'PROVA' ? 'Prova oficial' : 'Autoral'}
          </span>
          <span className="qb-chip max-w-full truncate bg-ink-100 text-ink-700">
            {questao.materia} · {questao.assunto}
          </span>
        </div>
      </div>

      <ProgressBar
        value={((props.indice + (resposta ? 1 : 0)) / Math.max(1, props.total)) * 100}
        label="Progresso da sessão"
        height="h-1.5"
      />

      <PomodoroEstudo
        materia={questao.materia}
        modo={props.modoTempo}
        duracaoSegundos={props.modoTempo === 'livre' ? props.duracaoSessao * 60 : 25 * 60}
        onConcluir={props.onConcluirTempo}
      />

      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-ink-100 pb-3">
          <button
            type="button"
            onClick={() => setMarcadorAtivo((v) => !v)}
            aria-pressed={marcadorAtivo}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
              marcadorAtivo
                ? 'border-accent-300 bg-accent-50 text-accent-800'
                : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            <Highlighter className="h-4 w-4" aria-hidden="true" />
            Marcador
          </button>
          <button
            type="button"
            onClick={() => setRascunhoAberto((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={rascunhoAberto}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
              rascunhoAberto
                ? 'border-brand-300 bg-brand-50 text-brand-800'
                : 'border-ink-200 bg-surface text-ink-700 hover:border-ink-300 hover:bg-ink-50'
            }`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Rascunho
          </button>
          {marcadorAtivo ? (
            <span className="text-[11px] leading-snug text-ink-500">
              Selecione um trecho do enunciado para marcá-lo.
            </span>
          ) : null}
        </div>

        {questao.banca ? (
          <p className="mb-3 break-words text-xs text-ink-500">
            {questao.banca}
            {questao.ano ? ` · ${questao.ano}` : ''}
            {questao.orgao ? ` · ${questao.orgao}` : ''}
            {questao.cargo ? ` · ${questao.cargo}` : ''}
          </p>
        ) : null}

        <MarcadorTexto texto={questao.enunciado} questaoId={questao.id} ativo={marcadorAtivo} />

        <ul className="mt-5 space-y-2.5">
          {questao.alternativas.map((texto, i) => {
            const ce = certoErrado(questao.alternativas)
            const cortada = cortadas.has(i)
            const correta = resposta && i === resposta.correta
            const errada = resposta && i === escolhida && !resposta.acertou
            const classe = correta
              ? 'border-ok-500 bg-ok-50 text-ink-900'
              : errada
                ? 'border-err-400 bg-err-50 text-ink-900'
                : 'border-ink-200 bg-surface hover:border-brand-300 hover:bg-ink-50'
            return (
              <li key={i} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => props.onResponder(i)}
                  disabled={resposta !== null}
                  className={`flex min-h-12 flex-1 items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition ${classe} disabled:cursor-default ${
                    cortada ? 'opacity-45' : ''
                  }`}
                >
                  {!ce ? (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                      {LETRAS[i]}
                    </span>
                  ) : null}
                  <span className={`min-w-0 break-words leading-relaxed ${cortada ? 'line-through' : ''}`}>
                    {ce ? (i === 0 ? 'Certo' : 'Errado') : texto}
                  </span>
                </button>
                {!ce ? (
                <button
                  type="button"
                  onClick={() => alternarCortar(i)}
                  disabled={resposta !== null}
                  aria-label={cortada ? `Restaurar alternativa ${LETRAS[i]}` : `Eliminar alternativa ${LETRAS[i]}`}
                  aria-pressed={cortada}
                  title={cortada ? 'Restaurar alternativa' : 'Eliminar alternativa'}
                  className={`flex min-h-11 w-11 shrink-0 items-center justify-center self-stretch rounded-xl border text-sm transition ${
                    cortada
                      ? 'border-brand-300 bg-brand-50 text-brand-700'
                      : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'
                  }`}
                >
                  <Scissors className="h-4 w-4" aria-hidden="true" />
                </button>
                ) : null}
              </li>
            )
          })}
        </ul>

        <Rascunho
          questaoId={questao.id}
          open={rascunhoAberto}
          onClose={() => setRascunhoAberto(false)}
        />
      </Card>

      {resposta ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-[16px] border p-4 sm:p-5 ${
            resposta.acertou ? 'border-ok-200 bg-ok-50' : 'border-err-200 bg-err-50'
          }`}
        >
          <p className="text-sm font-bold text-ink-900">
            {resposta.acertou ? 'Você acertou' : `Você errou — gabarito ${resposta.gabarito}`}
          </p>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-800">
            {resposta.explicacao ||
              (resposta.origem === 'PROVA'
                ? 'Questão de prova oficial — o comentário será adicionado em breve.'
                : 'Sem comentário cadastrado para esta questão.')}
          </p>
          {resposta.fundamento ? (
            <p className="mt-3 break-words text-xs leading-relaxed text-ink-600">
              <strong className="font-semibold text-ink-800">Fundamento:</strong> {resposta.fundamento}
            </p>
          ) : null}
          {resposta.precedente ? (
            <p className="mt-1 break-words text-xs leading-relaxed text-ink-600">
              <strong className="font-semibold text-ink-800">Precedente:</strong> {resposta.precedente}
            </p>
          ) : null}
          {resposta.verificadoEm ? (
            <p className="mt-1 text-[11px] text-ink-500">
              Legislação conferida em {resposta.verificadoEm.split('-').reverse().join('/')}
            </p>
          ) : null}
          <button
            type="button"
            onClick={props.onProxima}
            className="qb-btn mt-4 w-full sm:w-auto sm:px-6"
          >
            {props.indice + 1 >= props.total ? 'Ver resultado' : 'Próxima questão'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function FimSessao({
  acertos,
  total,
  onNova,
}: {
  acertos: number
  total: number
  onNova: () => void
}) {
  const pct = total === 0 ? 0 : Math.round((acertos * 1000) / total) / 10
  return (
    <Card className="p-6 text-center sm:p-10">
      <h1 className="qb-eyebrow">Sessão concluída</h1>
      <p className="mt-2 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
        {acertos}/{total}
      </p>
      <p className="mt-1.5 text-sm text-ink-600">{pct}% de acerto</p>
      <div className="mx-auto mt-5 max-w-xs">
        <ProgressBar value={pct} label="Aproveitamento da sessão" height="h-2.5" />
      </div>
      <button type="button" onClick={onNova} className="qb-btn mt-6 min-h-12 w-full sm:w-auto sm:px-8">
        Nova sessão
      </button>
    </Card>
  )
}
