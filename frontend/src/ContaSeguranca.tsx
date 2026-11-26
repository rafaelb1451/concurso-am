import { useState } from 'react'
import { api, type Usuario } from './api'
import GoogleBotao, { googleConfigurado } from './GoogleBotao'

/**
 * Conta e privacidade.
 *
 * Acoes sensiveis exigem confirmar identidade. Conta com senha local confirma digitando a senha;
 * conta criada apenas com Google (sem senha) confirma com um ID token novo do Google — que o
 * backend valida e compara com o vinculo da conta.
 */
export default function ContaSeguranca({
  usuario,
  onSair,
}: {
  usuario: Usuario
  onSair: () => void
}) {
  const [novoEmail, setNovoEmail] = useState('')
  const [senhaEmail, setSenhaEmail] = useState('')
  const [senhaExcluir, setSenhaExcluir] = useState('')
  const [credEmail, setCredEmail] = useState<string | null>(null)
  const [credExcluir, setCredExcluir] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const temSenha = usuario.temSenha
  const confirmacaoEmail = temSenha ? senhaEmail : (credEmail ?? '')
  const confirmacaoExcluir = temSenha ? senhaExcluir : (credExcluir ?? '')

  async function alterarEmail() {
    setErro(null)
    setMensagem(null)
    try {
      await api.alterarEmail(
        temSenha ? senhaEmail : null,
        novoEmail,
        temSenha ? undefined : (credEmail ?? undefined),
      )
      setMensagem('Link de confirmação enviado ao novo e-mail.')
      setSenhaEmail('')
      setNovoEmail('')
      setCredEmail(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível solicitar a alteração.')
    }
  }

  async function exportar() {
    setErro(null)
    try {
      const dados = await api.dadosPessoais()
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'qb-concurso-meus-dados.json'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível exportar os dados.')
    }
  }

  async function excluir() {
    if (!window.confirm('Excluir permanentemente sua conta e todo o seu histórico? Esta ação não pode ser desfeita.')) return
    setErro(null)
    try {
      await api.excluirConta(
        temSenha ? senhaExcluir : null,
        temSenha ? undefined : (credExcluir ?? undefined),
      )
      localStorage.removeItem('qb_token')
      onSair()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a conta.')
    }
  }

  /** Bloco de confirmacao: senha para contas locais, botao do Google para contas so'-Google. */
  function confirmacao(
    valor: string,
    aoDigitar: (v: string) => void,
    aoConfirmarGoogle: (credential: string) => void,
    confirmado: boolean,
    cor: 'normal' | 'perigo',
  ) {
    if (temSenha) {
      return (
        <input
          type="password"
          value={valor}
          onChange={(e) => aoDigitar(e.target.value)}
          placeholder="Senha atual"
          className={
            cor === 'perigo'
              ? 'rounded-xl border border-err-200 bg-white px-3 py-2 text-sm'
              : 'rounded-xl border border-ink-200 px-3 py-2 text-sm'
          }
        />
      )
    }
    if (!googleConfigurado()) {
      return (
        <p className="text-xs font-semibold text-err-700">
          Esta conta entra pelo Google; o login com Google não está configurado neste ambiente.
        </p>
      )
    }
    if (confirmado) {
      return (
        <p className="text-xs font-semibold text-ok-700">
          Identidade confirmada com o Google.
        </p>
      )
    }
    return (
      <div>
        <GoogleBotao onCredencial={aoConfirmarGoogle} />
        <p className="mt-1 text-xs text-ink-500">
          Confirme com o Google para continuar — esta conta não tem senha local.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="qb-card p-5">
        <h2 className="text-lg font-bold text-ink-900">Conta e privacidade</h2>
        <p className="mt-1 text-sm text-ink-500">
          E-mail cadastrado: <strong>{usuario.email}</strong>
        </p>
        <p className="mt-1 text-xs text-ink-400">
          {temSenha ? 'Entrada por e-mail e senha.' : 'Entrada pelo Google (sem senha local).'}
        </p>
        {!usuario.emailVerificado ? (
          <p className="mt-2 text-xs font-semibold text-accent-700">
            E-mail ainda não confirmado.
          </p>
        ) : null}

        {erro ? (
          <p className="mt-3 rounded-xl bg-err-50 px-3 py-2 text-sm text-err-700">{erro}</p>
        ) : null}
        {mensagem ? (
          <p className="mt-3 rounded-xl bg-ok-50 px-3 py-2 text-sm text-ok-700">{mensagem}</p>
        ) : null}
      </div>

      <div className="qb-card p-5">
        <h3 className="text-sm font-bold text-ink-900">Alterar e-mail</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {confirmacao(
            senhaEmail,
            setSenhaEmail,
            setCredEmail,
            Boolean(credEmail),
            'normal',
          )}
          <input
            type="email"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            placeholder="Novo e-mail"
            className="rounded-xl border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => void alterarEmail()}
          disabled={!confirmacaoEmail || !novoEmail}
          className="qb-btn mt-3 disabled:opacity-50"
        >
          Enviar confirmação
        </button>
      </div>

      <div className="qb-card p-5">
        <h3 className="text-sm font-bold text-ink-900">Meus dados (LGPD)</h3>
        <p className="mt-1 text-sm text-ink-500">
          Baixe uma cópia das suas respostas, sessões de estudo e dados de perfil.
        </p>
        <button onClick={() => void exportar()} className="qb-btn-ghost mt-3">
          Exportar meus dados
        </button>
      </div>

      <div className="rounded-[14px] border border-err-200 bg-err-50 p-5">
        <h3 className="text-sm font-bold text-err-700">Excluir conta</h3>
        <p className="mt-1 text-sm text-ink-600">
          Apaga permanentemente perfil, respostas, sessões de estudo e tokens.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {confirmacao(
            senhaExcluir,
            setSenhaExcluir,
            setCredExcluir,
            Boolean(credExcluir),
            'perigo',
          )}
          <button
            onClick={() => void excluir()}
            disabled={!confirmacaoExcluir}
            className="rounded-xl bg-err-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Excluir minha conta
          </button>
        </div>
      </div>
    </div>
  )
}
