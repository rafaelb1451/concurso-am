import { useCallback, useEffect, useState } from 'react'
import { api, type AdminUsuario, type Plano } from './api'

/**
 * Painel administrativo: conceder PRO por cortesia/suporte e revogar.
 * Toda ação fica registrada na auditoria do backend (eventos_pagamento).
 */
export default function Admin() {
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([])
  const [planos, setPlanos] = useState<Plano[]>([])
  const [busca, setBusca] = useState('')
  const [email, setEmail] = useState('')
  const [plano, setPlano] = useState('PRO_MENSAL')
  const [dias, setDias] = useState(30)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const carregar = useCallback(async (filtro?: string) => {
    setCarregando(true)
    setErro(null)
    try {
      const [lista, catalogo] = await Promise.all([api.adminUsuarios(filtro), api.planos()])
      setUsuarios(lista)
      setPlanos(catalogo.filter((p) => p.pago))
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

  function status(alvo: AdminUsuario): string {
    if (alvo.liberaPro) return 'PRO ativo'
    return alvo.statusAssinatura === 'SEM_ASSINATURA' ? 'Gratuito' : alvo.statusAssinatura
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink-900">Administração</h1>
        <p className="text-xs text-ink-500">
          Conceda ou revogue o PRO manualmente. Cada ação fica registrada na auditoria.
        </p>
      </div>

      <div className="qb-card p-5">
        <h2 className="text-sm font-bold text-ink-900">Conceder acesso</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_100px_auto]">
          <label className="block">
            <span className="text-[11px] font-semibold text-ink-600">E-mail do aluno</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@email.com"
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-ink-600">Plano</span>
            <select
              value={plano}
              onChange={(e) => setPlano(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              {planos.map((p) => (
                <option key={p.codigo} value={p.codigo}>{p.nome}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-ink-600">Dias</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            onClick={() => void conceder()}
            disabled={enviando || !email.trim()}
            className="qb-btn mt-5 h-10 self-end disabled:opacity-50"
          >
            Conceder
          </button>
        </div>
      </div>

      {erro ? <p className="rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err-700">{erro}</p> : null}
      {mensagem ? <p className="rounded-xl bg-ok-50 px-3 py-2 text-sm font-medium text-ok-700">{mensagem}</p> : null}

      <div className="qb-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 p-4">
          <h2 className="text-sm font-bold text-ink-900">Alunos</h2>
          <span className="qb-chip">{usuarios.length}</span>
          <div className="ml-auto flex gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void carregar(busca) }}
              placeholder="Buscar por nome ou e-mail"
              className="w-56 rounded-xl border border-ink-200 px-3 py-1.5 text-xs"
            />
            <button onClick={() => void carregar(busca)} className="qb-btn-ghost px-3 py-1.5 text-xs">
              Buscar
            </button>
          </div>
        </div>

        {carregando ? (
          <p className="p-4 text-sm text-ink-500">Carregando…</p>
        ) : usuarios.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">Nenhum usuário encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-[11px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Aluno</th>
                  <th className="px-4 py-2.5 font-semibold">Plano</th>
                  <th className="px-4 py-2.5 font-semibold">Situação</th>
                  <th className="px-4 py-2.5 font-semibold">Até</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-ink-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{u.nome}</p>
                      <p className="text-xs text-ink-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.liberaPro ? 'qb-chip bg-brand-100 text-brand-800' : 'qb-chip'}>
                        {u.plano}
                      </span>
                      {u.admin ? <span className="qb-chip ml-1">admin</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600">{status(u)}</td>
                    <td className="px-4 py-3 text-xs text-ink-600">
                      {u.periodoFim ? new Date(u.periodoFim).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEmail(u.email) }}
                        className="qb-btn-ghost mr-2 px-2.5 py-1 text-xs"
                      >
                        Conceder
                      </button>
                      <button
                        onClick={() => void revogar(u)}
                        disabled={enviando || !u.liberaPro}
                        className="rounded-lg border border-err-200 px-2.5 py-1 text-xs font-semibold text-err-700 transition hover:bg-err-50 disabled:opacity-40"
                      >
                        Revogar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
