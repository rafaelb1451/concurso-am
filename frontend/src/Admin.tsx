import { useCallback, useEffect, useState } from 'react'
import { Search, ShieldCheck, Tag, UserRound } from 'lucide-react'
import { api, type AdminUsuario, type Concurso, type Plano } from './api'
import { Card, ErrorBanner, LoadingState, PageHeader, SuccessBanner } from './ui'
import Sheet from './Sheet'

/**
 * Painel administrativo: conceder PRO por cortesia/suporte e revogar.
 * Toda ação fica registrada na auditoria do backend (eventos_pagamento).
 */
export default function Admin() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [busca, setBusca] = useState('')
  const [email, setEmail] = useState('')
  const [plano, setPlano] = useState('')
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<Concurso[]>([])
  const [editando, setEditando] = useState<AdminUsuario | null>(null)
  const [selecao, setSelecao] = useState<string[]>([])

  const carregar = useCallback(async (filtro?: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, catalogoC] = await Promise.all([api.adminUsuarios(filtro), api.planos()])
      setUsuarios(lista)
      const pagos = catalogoC.filter((p) => p.pago ?? p.codigo !== 'FREE')
      setPlanos(pagos)
      setPlano((atual) =>
        pagos.some((p) => p.codigo === atual) ? atual : (pagos[0]?.codigo ?? ''),
      )
      const certames = await api.concursos(true)
      setCatalogo(certames.filter((c) => c.id !== 'TODOS'))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o painel.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function conceder() {
    setEnviando(true)
    setErro(null)
    setMensagem(null)
    try {
      const r = await api.adminConceder(email.trim(), plano, dias)
      const fim = r.periodoFim ? new Date(r.periodoFim).toLocaleDateString('pt-BR') : '—'
      setMensagem(`${email.trim()} agora tem ${r.plano} até ${fim}.`)
      setEmail('')
      await carregar(busca)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conceder o acesso.')
    } finally {
      setEnviando(false)
    }
  }

  async function revogar(alvo: AdminUsuario) {
    if (!window.confirm(`Revogar o acesso de ${alvo.email}?`)) return
    setEnviando(true)
    setErro(null)
    setMensagem(null)
    try {
      await api.adminRevogar(alvo.email)
      setMensagem(`Acesso de ${alvo.email} revogado.`)
      await carregar(busca)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível revogar.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirCertames(u: AdminUsuario) {
    setEditando(u)
    setSelecao([...(u.certames ?? [])])
    setErro(null)
    setMensagem(null)
  }

  async function salvarCertames() {
    if (!editando) return
    setEnviando(true)
    setErro(null)
    setMensagem(null)
    try {
      const novos = await api.adminDefinirCertames(editando.id, selecao)
      setMensagem(`Certames de ${editando.email} atualizados (${novos.length}).`)
      setEditando(null)
      await carregar(busca)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível atualizar os certames.')
    } finally {
      setEnviando(false)
    }
  }

  function alternarCertame(id: string) {
    setSelecao((atual) =>
      atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id],
    )
  }

  function status(alvo: AdminUsuario): string {
    if (alvo.liberaPro) return 'PRO ativo'
    return alvo.statusAssinatura === 'SEM_ASSINATURA' ? 'Gratuito' : alvo.statusAssinatura
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administração"
        title="Acesso dos alunos"
        description="Conceda ou revogue o PRO manualmente. Cada ação fica registrada na auditoria."
        actions={
          <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            auditoria ativa
          </span>
        }
      />

      {erro ? <ErrorBanner>{erro}</ErrorBanner> : null}
      {mensagem ? <SuccessBanner>{mensagem}</SuccessBanner> : null}

      <Card padded>
        <h2 className="text-sm font-bold text-ink-900">Conceder acesso</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_100px_auto] lg:items-end">
          <div className="min-w-0">
            <label htmlFor="admin-email" className="qb-label">
              E-mail do aluno
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@email.com"
              autoComplete="email"
              className="qb-input"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="admin-plano" className="qb-label">
              Plano
            </label>
            <select
              id="admin-plano"
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
              className="qb-select"
            >
              {planos.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="admin-dias" className="qb-label">
              Dias
            </label>
            <input
              id="admin-dias"
              type="number"
              min={1}
              max={3650}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="qb-input"
            />
          </div>
          <button
            type="button"
            onClick={() => void conceder()}
            disabled={enviando || !email.trim() || !plano}
            className="qb-btn w-full disabled:opacity-50 lg:w-auto lg:px-6"
          >
            Conceder
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="h-4 w-4 text-brand-700" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink-900">Alunos</h2>
            <span className="qb-chip bg-ink-100 text-ink-700">{usuarios.length}</span>
          </div>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(evento) => {
              evento.preventDefault()
              void carregar(busca)
            }}
          >
            <label htmlFor="admin-busca" className="sr-only">
              Buscar aluno por nome ou e-mail
            </label>
            <input
              id="admin-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="qb-input min-w-0 flex-1"
            />
            <button type="submit" className="qb-btn-ghost w-full shrink-0 sm:w-auto">
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </button>
          </form>
        </div>

        {carregando ? (
          <LoadingState label="Carregando alunos…" lines={4} className="m-4" />
        ) : usuarios.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-ink-800">Nenhum usuário encontrado.</p>
            <p className="mt-1 text-xs text-ink-500">Ajuste a busca ou conceda acesso pelo e-mail.</p>
          </div>
        ) : (
          <>
            {/* --------- mobile: cards --------- */}
            <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
              {usuarios.map((u) => (
                <li key={u.id} className="rounded-xl border border-ink-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-ink-900">{u.nome}</p>
                      <p className="break-all text-xs text-ink-500">{u.email}</p>
                    </div>
                    <span className={u.liberaPro ? 'qb-chip bg-brand-50 text-brand-800' : 'qb-chip bg-ink-100 text-ink-700'}>
                      {u.liberaPro ? 'PRO' : 'FREE'}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-ink-500">Plano</dt>
                      <dd className="mt-0.5 break-words text-ink-800">{u.plano}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-ink-500">Situação</dt>
                      <dd className="mt-0.5 break-words text-ink-800">{status(u)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-ink-500">Até</dt>
                      <dd className="mt-0.5 text-ink-800">
                        {u.periodoFim ? new Date(u.periodoFim).toLocaleDateString('pt-BR') : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-ink-500">Perfil</dt>
                      <dd className="mt-0.5 text-ink-800">{u.admin ? 'Administrador' : 'Aluno'}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {(u.certames ?? []).length > 0 ? (
                      u.certames.map((c) => (
                        <span key={c} className="qb-chip bg-ink-100 text-ink-700">{c}</span>
                      ))
                    ) : (
                      <span className="text-xs text-ink-400">Sem certames definidos</span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirCertames(u)}
                      className="qb-btn-ghost min-h-11 flex-1 text-xs"
                    >
                      <Tag className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                      Certames
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(u.email)
                        window.scrollTo({
                          top: 0,
                          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
                            ? 'auto'
                            : 'smooth',
                        })
                      }}
                      className="qb-btn-ghost min-h-11 flex-1 text-xs"
                    >
                      Conceder
                    </button>
                    <button
                      type="button"
                      onClick={() => void revogar(u)}
                      disabled={enviando || !u.liberaPro}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-err-200 px-3 text-xs font-semibold text-err-700 transition hover:bg-err-50 disabled:opacity-40"
                    >
                      Revogar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* --------- desktop: tabela --------- */}
            <div className="qb-table-wrap hidden lg:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Alunos cadastrados, plano e situação de acesso</caption>
                <thead className="bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Aluno</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Plano</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Certames</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Situação</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Até</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-t border-ink-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-900">{u.nome}</p>
                        <p className="break-all text-xs text-ink-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.liberaPro ? 'qb-chip bg-brand-100 text-brand-800' : 'qb-chip bg-ink-100 text-ink-700'}>
                          {u.plano}
                        </span>
                        {u.admin ? <span className="qb-chip ml-1 bg-accent-100 text-accent-800">admin</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-600">
                        <div className="flex flex-wrap gap-1">
                          {(u.certames ?? []).length > 0 ? (
                            u.certames.map((c) => (
                              <span key={c} className="qb-chip bg-ink-100 text-ink-700">{c}</span>
                            ))
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-600">{status(u)}</td>
                      <td className="px-4 py-3 text-xs text-ink-600">
                        {u.periodoFim ? new Date(u.periodoFim).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirCertames(u)}
                          className="qb-btn-ghost mr-2 min-h-11 px-2.5 py-1 text-xs"
                        >
                          Certames
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmail(u.email)}
                          className="qb-btn-ghost mr-2 min-h-11 px-2.5 py-1 text-xs"
                        >
                          Conceder
                        </button>
                        <button
                          type="button"
                          onClick={() => void revogar(u)}
                          disabled={enviando || !u.liberaPro}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-err-200 px-2.5 py-1 text-xs font-semibold text-err-700 transition hover:bg-err-50 disabled:opacity-40"
                        >
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Sheet
        open={editando !== null}
        onClose={() => setEditando(null)}
        title="Ajustar certames"
        description={
          editando
            ? `Exceção manual para ${editando.email}. O acesso passa a valer apenas para os certames marcados.`
            : undefined
        }
        icon={<Tag className="h-5 w-5 text-brand-700" aria-hidden="true" />}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(null)} className="qb-btn-ghost">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvarCertames()}
              disabled={enviando}
              className="qb-btn disabled:opacity-50"
            >
              {enviando ? 'Salvando…' : `Salvar (${selecao.length})`}
            </button>
          </div>
        }
      >
        <div className="space-y-1">
          {catalogo.map((c) => {
            const marcado = selecao.includes(c.id)
            return (
              <label
                key={c.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                  marcado
                    ? 'border-brand-300 bg-brand-50 text-ink-900'
                    : 'border-ink-200 bg-surface text-ink-700 hover:border-brand-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternarCertame(c.id)}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="flex-1 font-medium">{c.id}</span>
                <span className="text-xs text-ink-500">{c.total} questões</span>
              </label>
            )
          })}
          {catalogo.length === 0 ? (
            <p className="p-3 text-sm text-ink-500">Carregando catálogo de certames…</p>
          ) : null}
        </div>
      </Sheet>
    </div>
  )
}
