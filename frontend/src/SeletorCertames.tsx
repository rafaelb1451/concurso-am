import { useMemo, useState } from 'react'
import { Check, Lock, Search } from 'lucide-react'
import type { Concurso } from './api'
import { normalizarBusca, rotuloQuestoes } from './plano'
import { ErrorBanner } from './ui'

/**
 * Seleção de certames com busca e contagem de questões.
 *
 * O limite do plano é aplicado aqui (desabilita os não marcados ao atingir o
 * máximo) e é revalidado pelo botão de confirmação. O backend valida de novo.
 */
export default function SeletorCertames({
  concursos,
  selecionados,
  onChange,
  maximo,
  idPrefix,
  carregando = false,
  erro = null,
  onTentarNovamente,
  desabilitado = false,
}: {
  concursos: Concurso[]
  selecionados: string[]
  onChange: (certames: string[]) => void
  maximo: number
  /** Prefixo único para os ids de label/input (há dois seletores na aplicação). */
  idPrefix: string
  carregando?: boolean
  erro?: string | null
  onTentarNovamente?: () => void
  desabilitado?: boolean
}) {
  const [busca, setBusca] = useState('')
  const termo = normalizarBusca(busca)

  const disponiveis = useMemo(
    () => concursos.filter((concurso) => concurso.id !== 'TODOS'),
    [concursos],
  )
  const filtrados = useMemo(() => {
    if (!termo) return disponiveis
    return disponiveis.filter((concurso) => normalizarBusca(concurso.id).includes(termo))
  }, [disponiveis, termo])

  const noLimite = selecionados.length >= maximo
  const ajudaId = `${idPrefix}-ajuda`
  const contadorId = `${idPrefix}-contador`

  function alternar(id: string) {
    if (desabilitado) return
    if (selecionados.includes(id)) {
      onChange(selecionados.filter((item) => item !== id))
      return
    }
    if (noLimite) return
    onChange([...selecionados, id])
  }

  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <label htmlFor={`${idPrefix}-busca`} className="qb-label">
          Buscar certame
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            id={`${idPrefix}-busca`}
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            disabled={desabilitado || carregando}
            placeholder="Digite a sigla, ex.: PM-AM"
            autoComplete="off"
            className="qb-input pl-9"
            aria-describedby={ajudaId}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={contadorId} className="text-xs font-semibold text-ink-700" aria-live="polite">
          {selecionados.length} de {maximo} {maximo === 1 ? 'selecionado' : 'selecionados'}
        </p>
        {selecionados.length > 0 && !desabilitado ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex min-h-8 items-center text-[11px] font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Limpar seleção
          </button>
        ) : null}
      </div>

      {erro ? (
        <ErrorBanner onRetry={onTentarNovamente}>{erro}</ErrorBanner>
      ) : null}

      {carregando ? (
        <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500" role="status">
          Carregando certames…
        </p>
      ) : null}

      {!carregando && !erro ? (
        <fieldset className="min-w-0" disabled={desabilitado} aria-describedby={ajudaId}>
          <legend className="sr-only">Certames disponíveis</legend>
          <div className="qb-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtrados.map((concurso) => {
              const marcado = selecionados.includes(concurso.id)
              const bloqueadoPeloLimite = !marcado && noLimite
              return (
                <label
                  key={concurso.id}
                  title={
                    bloqueadoPeloLimite
                      ? `Limite de ${maximo} ${maximo === 1 ? 'certame' : 'certames'} deste plano.`
                      : undefined
                  }
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 transition ${
                    marcado
                      ? 'border-brand-400 bg-brand-50'
                      : bloqueadoPeloLimite
                        ? 'cursor-not-allowed border-ink-200 bg-ink-50 opacity-60'
                        : 'cursor-pointer border-ink-200 bg-surface hover:border-brand-300 hover:bg-brand-50/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={bloqueadoPeloLimite}
                    onChange={() => alternar(concurso.id)}
                    className="h-4 w-4 shrink-0 accent-brand-700"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {concurso.id}
                    </span>
                    <span className="block text-[11px] font-medium text-ink-500">
                      {rotuloQuestoes(concurso.total)}
                    </span>
                  </span>
                  {marcado ? (
                    <Check className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  ) : null}
                  {bloqueadoPeloLimite ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                  ) : null}
                </label>
              )
            })}
          </div>

          {filtrados.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 bg-surface px-3 py-4 text-center text-xs text-ink-500">
              {disponiveis.length === 0
                ? 'Nenhum certame disponível para seleção agora.'
                : `Nenhum certame encontrado para “${busca.trim()}”.`}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <p id={ajudaId} className="text-[11px] leading-relaxed text-ink-500">
        {maximo === 1
          ? 'Este plano inclui exatamente 1 certame. Desmarque o atual para escolher outro.'
          : `Escolha de 1 a ${maximo} certames. Ao atingir o limite, os demais ficam bloqueados; desmarque um para trocar.`}
      </p>
    </div>
  )
}
