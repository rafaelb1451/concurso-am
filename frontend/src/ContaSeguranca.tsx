import { useState } from 'react'
import { Download, KeyRound, Mail, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api, type Usuario } from './api'
import GoogleBotao, { googleConfigurado } from './GoogleBotao'
import { Card, ErrorBanner, PageHeader, SuccessBanner } from './ui'

/**
 * Conta e privacidade.
 *
 * Ações sensíveis exigem confirmar identidade. Conta com senha local confirma digitando a senha;
 * conta criada apenas com Google (sem senha) confirma com um ID token novo do Google — que o
 * backend valida e compara com o vínculo da conta.
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
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível exportar os dados.')
    }
  }

  async function excluir() {
    if (
      !window.confirm(
        'Excluir permanentemente sua conta e todo o seu histórico? Esta ação não pode ser desfeita.',
      )
    ) {
      return
    }
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

  /** Bloco de confirmação: senha para contas locais, botão do Google para contas só-Google. */
  function confirmacao(
    valor: string,
    aoDigitar: (v: string) => void,
    aoConfirmarGoogle: (credential: string) => void,
    confirmado: boolean,
    variante: 'normal' | 'perigo',
  ) {
    if (temSenha) {
      return (
        <div className="min-w-0">
          <label htmlFor={variante === 'perigo' ? 'conta-senha-excluir' : 'conta-senha-email'} className="sr-only">
            Senha atual
          </label>
          <input
            id={variante === 'perigo' ? 'conta-senha-excluir' : 'conta-senha-email'}
            type="password"
            value={valor}
            onChange={(e) => aoDigitar(e.target.value)}
            placeholder="Senha atual"
            autoComplete="current-password"
            className={`qb-input ${
              variante === 'perigo' ? 'border-err-200 focus:border-err-400 focus:ring-err-400/15' : ''
            }`}
          />
        </div>
      )
    }
    if (!googleConfigurado()) {
      return (
        <p className="rounded-xl bg-err-50 px-3 py-2 text-xs font-semibold text-err-700">
          Esta conta entra pelo Google; o login com Google não está configurado neste ambiente.
        </p>
      )
    }
    if (confirmado) {
      return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ok-700">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Identidade confirmada com o Google.
        </p>
      )
    }
    return (
      <div className="min-w-0">
        <GoogleBotao onCredencial={aoConfirmarGoogle} />
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Confirme com o Google para continuar — esta conta não tem senha local.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sua conta"
        title="Conta e privacidade"
        description="Gerencie o e-mail de acesso, baixe seus dados e controle a exclusão da conta."
        actions={
          <span className="qb-chip bg-ok-50 text-ok-700 ring-1 ring-inset ring-ok-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            dados protegidos
          </span>
        }
      />

      {erro ? <ErrorBanner>{erro}</ErrorBanner> : null}
      {mensagem ? <SuccessBanner>{mensagem}</SuccessBanner> : null}

      <Card padded>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink-900">Dados de acesso</h2>
            <p className="mt-1 break-all text-sm text-ink-700">
              <Mail className="mr-1 inline h-4 w-4 align-[-2px] text-ink-400" aria-hidden="true" />
              {usuario.email}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
              {temSenha ? (
                <>
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Entrada por e-mail e senha.
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Entrada pelo Google (sem senha local).
                </>
              )}
            </p>
          </div>
          <span
            className={
              usuario.emailVerificado
                ? 'qb-chip bg-ok-50 text-ok-700 ring-1 ring-inset ring-ok-200'
                : 'qb-chip bg-accent-100 text-accent-800'
            }
          >
            {usuario.emailVerificado ? 'e-mail confirmado' : 'e-mail não confirmado'}
          </span>
        </div>
      </Card>

      <Card padded>
        <h3 className="text-sm font-bold text-ink-900">Alterar e-mail</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Enviamos um link de confirmação para o novo endereço antes de trocar.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {confirmacao(senhaEmail, setSenhaEmail, setCredEmail, Boolean(credEmail), 'normal')}
          <div className="min-w-0">
            <label htmlFor="conta-novo-email" className="sr-only">
              Novo e-mail
            </label>
            <input
              id="conta-novo-email"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="Novo e-mail"
              autoComplete="email"
              inputMode="email"
              className="qb-input"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void alterarEmail()}
          disabled={!confirmacaoEmail || !novoEmail}
          className="qb-btn mt-3 w-full disabled:opacity-50 sm:w-auto"
        >
          Enviar confirmação
        </button>
      </Card>

      <Card padded>
        <h3 className="text-sm font-bold text-ink-900">Meus dados (LGPD)</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-500">
          Baixe uma cópia das suas respostas, sessões de estudo e dados de perfil.
        </p>
        <button type="button" onClick={() => void exportar()} className="qb-btn-ghost mt-3 w-full sm:w-auto">
          <Download className="h-4 w-4" aria-hidden="true" />
          Exportar meus dados
        </button>
      </Card>

      <div className="rounded-[16px] border border-err-200 bg-err-50 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-err-700">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Excluir conta
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">
          Apaga permanentemente perfil, respostas, sessões de estudo e tokens. Esta ação não pode
          ser desfeita.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 sm:max-w-xs sm:flex-1">
            {confirmacao(senhaExcluir, setSenhaExcluir, setCredExcluir, Boolean(credExcluir), 'perigo')}
          </div>
          <button
            type="button"
            onClick={() => void excluir()}
            disabled={!confirmacaoExcluir}
            className="qb-btn-danger w-full sm:w-auto"
          >
            Excluir minha conta
          </button>
        </div>
      </div>
    </div>
  )
}
