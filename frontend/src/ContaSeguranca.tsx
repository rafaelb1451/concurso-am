import { useEffect, useState } from 'react'
import {
  CalendarClock,
  Download,
  KeyRound,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { api, type AssinaturaAtual, type Concurso, type Usuario } from './api'
import GoogleBotao, { googleConfigurado } from './GoogleBotao'
import PlanoBadge from './PlanoBadge'
import SeletorCertames from './SeletorCertames'
import {
  certamesDaAssinatura,
  limiteCertamesDoPlano,
  planoAtualEhPago,
  rotuloCertames,
  tutorIaDaAssinatura,
} from './plano'
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
  assinatura = null,
  onAssinaturaAtualizada,
  onIrPlanos,
}: {
  usuario: Usuario
  onSair: () => void
  assinatura?: AssinaturaAtual | null
  onAssinaturaAtualizada?: (assinatura: AssinaturaAtual) => void
  onIrPlanos?: () => void
}) {
  const [novoEmail, setNovoEmail] = useState('')
  const [senhaEmail, setSenhaEmail] = useState('')
  const [credEmail, setCredEmail] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Plano e troca de certames (1 troca por ciclo, auditada no backend).
  const [assinaturaLocal, setAssinaturaLocal] = useState<AssinaturaAtual | null>(null)
  const [trocando, setTrocando] = useState(false)
  const [selecao, setSelecao] = useState<string[]>([])
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [carregandoConcursos, setCarregandoConcursos] = useState(false)
  const [concursosErro, setConcursosErro] = useState<string | null>(null)
  const [tentativaConcursos, setTentativaConcursos] = useState(0)
  const [enviandoTroca, setEnviandoTroca] = useState(false)

  const atual = assinaturaLocal ?? assinatura
  const pago = planoAtualEhPago(atual)
  const tutorLiberado = tutorIaDaAssinatura(atual)
  const certamesAtivos = certamesDaAssinatura(atual)
  const maximo = limiteCertamesDoPlano(atual?.plano)
  const tutorUso = atual?.tutorUso
  const podeTrocarCertame = atual?.podeTrocarCertame

  useEffect(() => {
    if (!trocando || concursos.length > 0) return
    let ativo = true
    setCarregandoConcursos(true)
    setConcursosErro(null)
    api.concursos(true)
      .then((lista) => {
        if (ativo) setConcursos(lista)
      })
      .catch(() => {
        if (ativo) setConcursosErro('Não foi possível carregar os certames. Tente novamente.')
      })
      .finally(() => {
        if (ativo) setCarregandoConcursos(false)
      })
    return () => {
      ativo = false
    }
  }, [trocando, concursos.length, tentativaConcursos])

  const temSenha = usuario.temSenha
  const confirmacaoEmail = temSenha ? senhaEmail : (credEmail ?? '')

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
      await api.excluirConta()
      localStorage.removeItem('qb_token')
      onSair()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível excluir a conta.')
    }
  }

  function abrirTroca() {
    setErro(null)
    setMensagem(null)
    setSelecao(certamesAtivos)
    setTrocando(true)
  }

  function fecharTroca() {
    if (enviandoTroca) return
    setTrocando(false)
    setErro(null)
  }

  async function confirmarTroca() {
    if (!atual) return
    if (selecao.length < 1 || selecao.length > maximo) {
      setErro(
        maximo === 1
          ? 'Selecione exatamente 1 certame para este plano.'
          : `Selecione de 1 a ${maximo} certames para este plano.`,
      )
      return
    }
    setEnviandoTroca(true)
    setErro(null)
    setMensagem(null)
    try {
      await api.trocarCertames(selecao)
      setMensagem('Certames atualizados. A troca deste ciclo foi registrada na auditoria.')
      setTrocando(false)
      try {
        const nova = await api.assinatura()
        setAssinaturaLocal(nova)
        onAssinaturaAtualizada?.(nova)
      } catch {
        // O backend já registrou a troca; a UI só não conseguiu recarregar o resumo.
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível trocar os certames.')
    } finally {
      setEnviandoTroca(false)
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="qb-eyebrow">Assinatura</p>
            <h2 className="mt-1 text-base font-bold text-ink-900">Plano e certames</h2>
            <p className="mt-1 break-words text-sm leading-relaxed text-ink-600">
              {pago ? (
                <>
                  {certamesAtivos.length > 0
                    ? `${rotuloCertames(certamesAtivos.length)} no seu escopo`
                    : 'Nenhum certame vinculado ainda'}
                  {atual?.periodoFim ? ` · acesso até ${formatarData(atual.periodoFim)}` : ''}
                </>
              ) : (
                <>plano gratuito · {atual?.plano?.limiteDiarioQuestoes ?? 20} questões por dia</>
              )}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {atual ? (
              <PlanoBadge assinatura={atual} />
            ) : (
              <span className="qb-chip bg-ink-100 text-ink-600">Gratuito</span>
            )}
            {onIrPlanos ? (
              <button
                type="button"
                onClick={onIrPlanos}
                className="inline-flex min-h-9 items-center text-xs font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 transition hover:text-brand-800"
              >
                {pago ? 'Ver planos' : 'Conheça o Plus'}
              </button>
            ) : null}
          </div>
        </div>

        {certamesAtivos.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Certames ativos">
            {certamesAtivos.map((certame) => (
              <li key={certame}>
                <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
                  {certame}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-4 grid gap-3 border-t border-ink-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="qb-label">Tutor de IA</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-1.5 font-semibold text-ink-800">
              {tutorLiberado ? (
                <>
                  <Sparkles className="h-4 w-4 text-accent-700" aria-hidden="true" />
                  Liberado
                  {tutorUso ? (
                    <span className="font-medium text-ink-500">
                      · hoje: {tutorUso.cota < 0 ? 'ilimitado' : `${tutorUso.usado}/${tutorUso.cota}`}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-ink-400" aria-hidden="true" />
                  Bloqueado (disponível no Plus)
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="qb-label">Escopo</dt>
            <dd className="mt-1 font-semibold text-ink-800">
              {pago
                ? maximo === 1
                  ? '1 certame por ciclo'
                  : `até ${maximo} certames por ciclo`
                : 'sem certame contratado'}
            </dd>
          </div>
        </dl>

        {pago && certamesAtivos.length > 0 ? (
          trocando ? (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    <CalendarClock className="h-4 w-4 text-brand-700" aria-hidden="true" />
                    Trocar certames
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                    Você tem 1 troca por ciclo. A alteração fica registrada na auditoria do backend.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharTroca}
                  disabled={enviandoTroca}
                  className="inline-flex min-h-9 items-center text-xs font-semibold text-ink-600 underline underline-offset-2 hover:text-ink-900"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-3">
                <SeletorCertames
                  idPrefix="conta-certames"
                  concursos={concursos}
                  selecionados={selecao}
                  onChange={setSelecao}
                  maximo={maximo}
                  carregando={carregandoConcursos}
                  erro={concursosErro}
                  onTentarNovamente={() => setTentativaConcursos((n) => n + 1)}
                  desabilitado={enviandoTroca}
                />
              </div>

              <button
                type="button"
                onClick={() => void confirmarTroca()}
                disabled={
                  enviandoTroca ||
                  selecao.length < 1 ||
                  selecao.length > maximo ||
                  carregandoConcursos
                }
                className="qb-btn mt-3 w-full sm:w-auto"
              >
                {enviandoTroca ? 'Salvando…' : 'Confirmar troca'}
              </button>
            </div>
          ) : (
            <div className="mt-4 border-t border-ink-100 pt-4">
              {podeTrocarCertame === true ? (
                <>
                  <button type="button" onClick={abrirTroca} className="qb-btn-ghost w-full sm:w-auto">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    Trocar certames
                  </button>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
                    Você pode fazer 1 troca por ciclo. A troca é auditada no backend.
                  </p>
                </>
              ) : podeTrocarCertame === false ? (
                <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
                  A troca de certames deste ciclo já foi utilizada. Ela fica disponível novamente no
                  próximo ciclo.
                </p>
              ) : (
                <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
                  A troca de certames não está disponível neste ambiente.
                </p>
              )}
            </div>
          )
        ) : !pago ? (
          <p className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
            O plano gratuito não tem certames contratados. Assine o Básico ou o Plus para estudar com
            escopo por certame.
          </p>
        ) : null}
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
          Apaga permanentemente perfil, respostas, sessões de estudo, assinaturas e tokens. Esta
          ação não pode ser desfeita.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void excluir()}
            className="qb-btn-danger w-full sm:w-auto"
          >
            Excluir minha conta
          </button>
        </div>
      </div>
    </div>
  )
}

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
