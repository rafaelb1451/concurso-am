import { useEffect, useState } from 'react'
import { Check, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import {
  api,
  type AssinaturaAtual,
  type Plano,
  type UsoPlano,
} from './api'
import {
  Card,
  ErrorBanner,
  LoadingState,
  PageHeader,
  ProgressBar,
  SuccessBanner,
} from './ui'

function formatarPreco(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

/** Só aceita redirecionar para uma URL https devolvida pelo gateway. */
function checkoutSeguro(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Planos e assinatura.
 *
 * O pagamento acontece na página hospedada do Mercado Pago: aqui só montamos o checkout e
 * redirecionamos. Nenhum dado de cartão passa por esta tela.
 */
export default function Planos({
  anonimo = false,
  onAssinar,
}: {
  anonimo?: boolean
  onAssinar?: () => void
} = {}) {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [assinatura, setAssinatura] = useState<AssinaturaAtual | null>(null)
  const [uso, setUso] = useState<UsoPlano | null>(null)
  const [planoEscolhido, setPlanoEscolhido] = useState<Plano | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    const carregar = anonimo
      ? api.planos().then((lista) => {
          if (ativo) setPlanos(lista)
        })
      : Promise.all([api.planos(), api.assinatura(), api.usoPlano()]).then(([lista, atual, usoAtual]) => {
          if (!ativo) return
          setPlanos(lista)
          setAssinatura(atual)
          setUso(usoAtual)
        })
    carregar
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os planos. Tente novamente.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [anonimo, tentativa])

  const pro = assinatura?.liberaPro === true
  const configurado = assinatura?.pagamentoConfigurado === true

  function abrirFormulario(plano: Plano) {
    setErro(null)
    setMensagem(null)
    setPlanoEscolhido(plano)
  }

  async function assinar() {
    if (!planoEscolhido) return
    setErro(null)
    setEnviando(true)
    try {
      const resposta = await api.iniciarCheckout({ plano: planoEscolhido.codigo })
      if (!checkoutSeguro(resposta.url)) {
        setErro('O endereço de pagamento retornado é inválido. Tente novamente em instantes.')
        return
      }
      // a página de pagamento é do gateway; o acesso só vale depois do webhook
      window.location.href = resposta.url
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar o pagamento.')
    } finally {
      setEnviando(false)
    }
  }

  async function verificarPagamento() {
    setErro(null)
    setMensagem(null)
    setVerificando(true)
    try {
      const atual = await api.assinatura()
      setAssinatura(atual)
      setMensagem(atual.liberaPro
        ? 'Pagamento confirmado! Seu PRO está liberado.'
        : 'Ainda não identificamos o pagamento. Se você acabou de pagar, aguarde alguns segundos e tente de novo.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível verificar o pagamento.')
    } finally {
      setVerificando(false)
    }
  }

  async function cancelar() {
    if (!window.confirm('Cancelar a renovação? Seu acesso continua até o fim do período já pago.')) return
    setErro(null)
    try {
      await api.cancelarAssinatura()
      setMensagem('Renovação cancelada. O acesso continua até o fim do período pago.')
      setAssinatura(await api.assinatura())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível cancelar.')
    }
  }

  if (carregando) return <LoadingState label="Carregando planos…" lines={4} />

  const pago = planos.filter((p) => p.pago)
  const mensal = pago.find((p) => p.ciclo === 'MENSAL')
  const anual = pago.find((p) => p.ciclo === 'ANUAL')
  const economia = mensal && anual ? mensal.valorCentavos * 12 - anual.valorCentavos : 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Assinatura"
        title="Planos"
        description={
          anonimo
            ? 'Comece grátis e assine quando quiser responder sem limite. Sem cartão para criar a conta.'
            : 'Gerencie seu acesso, veja os limites do plano e libere o PRO.'
        }
        actions={<span className="qb-chip bg-ink-100 text-ink-700">Mercado Pago</span>}
      />

      {erro ? (
        <ErrorBanner onRetry={() => setTentativa((n) => n + 1)}>{erro}</ErrorBanner>
      ) : null}
      {mensagem ? <SuccessBanner>{mensagem}</SuccessBanner> : null}

      {/* ---------------- plano atual */}
      <Card padded>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink-900">Seu plano</h2>
            <p className="mt-1 break-words text-sm text-ink-600">
              {pro ? (
                <>
                  <strong className="text-brand-800">{assinatura?.plano.nome}</strong>
                  {assinatura?.periodoFim ? (
                    <> — acesso até {formatarData(assinatura.periodoFim)}</>
                  ) : null}
                  {assinatura?.cancelaNoFim ? ' (renovação cancelada)' : null}
                </>
              ) : (
                <>
                  <strong className="text-ink-800">{assinatura?.plano.nome ?? 'Gratuito'}</strong> —
                  até {uso?.limiteDiarioQuestoes ?? 20} questões por dia
                </>
              )}
            </p>
          </div>
          <span className={pro ? 'qb-chip bg-brand-50 text-brand-800' : 'qb-chip bg-ink-100 text-ink-600'}>
            {pro ? 'PRO ativo' : 'FREE'}
          </span>
        </div>

        {/* medidor do FREE */}
        {!pro && uso ? (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-600">
              <span>Questões hoje</span>
              <span>
                {uso.respondidasHoje} / {uso.limiteDiarioQuestoes}
              </span>
            </div>
            <ProgressBar
              value={Math.min(
                100,
                (uso.respondidasHoje / Math.max(1, uso.limiteDiarioQuestoes)) * 100,
              )}
              label="Questões usadas hoje"
              className="mt-1.5"
            />
          </div>
        ) : null}

        {pro && !assinatura?.cancelaNoFim ? (
          <button type="button" onClick={() => void cancelar()} className="qb-btn-ghost mt-4">
            Cancelar renovação
          </button>
        ) : null}
      </Card>

      {/* ---------------- planos pagos */}
      {!pro ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[mensal, anual].filter(Boolean).map((plano) => (
            <div key={plano!.codigo} className="qb-card flex flex-col p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-ink-900">{plano!.nome}</h3>
                {plano!.ciclo === 'ANUAL' ? (
                  <span className="qb-chip bg-accent-100 text-accent-800">melhor preço</span>
                ) : null}
              </div>
              <p className="mt-2 break-words text-2xl font-extrabold text-brand-800">
                R$ {formatarPreco(plano!.valorCentavos)}
                <span className="text-sm font-semibold text-ink-500">
                  /{plano!.ciclo === 'ANUAL' ? 'ano' : 'mês'}
                </span>
              </p>
              {plano!.ciclo === 'ANUAL' && economia > 0 ? (
                <p className="mt-1 text-xs font-semibold text-ok-700">
                  economize R$ {formatarPreco(economia)} no ano
                </p>
              ) : null}
              <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden="true" />
                  questões ilimitadas
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden="true" />
                  tutor com IA sem limite diário
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" aria-hidden="true" />
                  simulados e evolução completa
                </li>
              </ul>
              <button
                type="button"
                onClick={() => (anonimo ? onAssinar?.() : abrirFormulario(plano!))}
                disabled={anonimo ? false : !configurado}
                className="qb-btn mt-4 w-full disabled:opacity-50"
              >
                {anonimo ? 'Criar conta para assinar' : configurado ? 'Assinar com Pix ou cartão' : 'Pagamento indisponível'}
              </button>
              {!anonimo && !configurado ? (
                <p className="mt-2 text-[11px] text-ink-500">
                  O pagamento ainda não está configurado neste ambiente.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!pro && configurado ? (
        <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-ink-600">
            Já pagou? A liberação acontece pelo webhook do Mercado Pago — às vezes leva alguns segundos.
          </p>
          <button
            type="button"
            onClick={() => void verificarPagamento()}
            disabled={verificando}
            className="qb-btn-ghost w-full sm:w-auto"
          >
            {verificando ? 'Verificando…' : 'Verificar pagamento'}
          </button>
        </Card>
      ) : null}

      {/* ---------------- confirmação do checkout */}
      {planoEscolhido ? (
        <Card padded>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-ink-900">Assinar {planoEscolhido.nome}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                Pagamento único do plano {planoEscolhido.nome} — Pix ou cartão na página segura do
                Mercado Pago. O acesso é liberado assim que o pagamento é confirmado, sem renovação
                automática.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void assinar()}
              disabled={enviando}
              className="qb-btn w-full sm:w-auto"
            >
              {enviando ? 'Abrindo pagamento…' : 'Ir para o pagamento'}
            </button>
            <button type="button" onClick={() => setPlanoEscolhido(null)} className="qb-btn-ghost w-full sm:w-auto">
              Cancelar
            </button>
          </div>
        </Card>
      ) : null}

      {pago.length === 0 ? (
        <div className="qb-empty">
          <p className="text-sm font-semibold text-ink-800">Nenhum plano pago disponível no momento.</p>
          <p className="mt-1 text-xs text-ink-500">O plano gratuito continua ativo.</p>
        </div>
      ) : null}

      <div className="rounded-xl bg-ink-50 px-4 py-3 text-center text-[11px] leading-relaxed text-ink-500">
        <p className="inline-flex items-start gap-1.5 text-left">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Pagamento processado pelo Mercado Pago. A liberação do PRO acontece quando o pagamento é
            confirmado — pode levar alguns segundos depois de você pagar.
          </span>
        </p>
        {anonimo ? (
          <p className="mt-2 inline-flex items-center gap-1 font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Crie sua conta para assinar com segurança.
          </p>
        ) : null}
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
