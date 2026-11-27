import { useEffect, useState } from 'react'
import {
  api,
  type AssinaturaAtual,
  type Plano,
  type UsoPlano,
} from './api'

/**
 * Planos e assinatura.
 *
 * O pagamento acontece na página hospedada do Mercado Pago: aqui só montamos o checkout e
 * redirecionamos. Nenhum dado de cartão passa por esta tela.
 */
export default function Planos({ anonimo = false, onAssinar }: { anonimo?: boolean; onAssinar?: () => void } = {}) {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [assinatura, setAssinatura] = useState<AssinaturaAtual | null>(null)
  const [uso, setUso] = useState<UsoPlano | null>(null)
  const [planoEscolhido, setPlanoEscolhido] = useState<Plano | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
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
        if (ativo) setErro('Não foi possível carregar os planos.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

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
      // a página de pagamento é do gateway; o acesso só vale depois do webhook
      window.location.href = resposta.url
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível iniciar o pagamento.')
      setEnviando(false)
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

  if (carregando) {
    return <p className="text-sm text-ink-500">Carregando planos…</p>
  }

  const pago = planos.filter((p) => p.pago)
  const mensal = pago.find((p) => p.ciclo === 'MENSAL')
  const anual = pago.find((p) => p.ciclo === 'ANUAL')
  const economia =
    mensal && anual ? mensal.valorCentavos * 12 - anual.valorCentavos : 0

  return (
    <div className="space-y-4">
      {erro ? (
        <p className="rounded-xl bg-err-50 px-4 py-3 text-sm font-medium text-err-700">{erro}</p>
      ) : null}
      {mensagem ? (
        <p className="rounded-xl bg-ok-50 px-4 py-3 text-sm font-medium text-ok-700">{mensagem}</p>
      ) : null}

      {/* ---------------- plano atual */}
      <div className="qb-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Seu plano</h2>
            <p className="mt-1 text-sm text-ink-500">
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
          <span
            className={
              pro
                ? 'qb-chip bg-brand-50 text-brand-800'
                : 'qb-chip bg-ink-100 text-ink-600'
            }
          >
            {pro ? 'PRO ativo' : 'FREE'}
          </span>
        </div>

        {/* medidor do FREE */}
        {!pro && uso ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
              <span>Questões hoje</span>
              <span>
                {uso.respondidasHoje} / {uso.limiteDiarioQuestoes}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{
                  width: `${Math.min(100, (uso.respondidasHoje / Math.max(1, uso.limiteDiarioQuestoes)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {pro && !assinatura?.cancelaNoFim ? (
          <button onClick={() => void cancelar()} className="qb-btn-ghost mt-4">
            Cancelar renovação
          </button>
        ) : null}
      </div>

      {/* ---------------- planos pagos */}
      {!pro ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[mensal, anual].filter(Boolean).map((plano) => (
            <div
              key={plano!.codigo}
              className="qb-card flex flex-col p-5"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-ink-900">{plano!.nome}</h3>
                {plano!.ciclo === 'ANUAL' ? (
                  <span className="qb-chip bg-accent-100 text-accent-800">melhor preço</span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-brand-800">
                R$ {(plano!.valorCentavos / 100).toFixed(2).replace('.', ',')}
                <span className="text-sm font-semibold text-ink-400">
                  /{plano!.ciclo === 'ANUAL' ? 'ano' : 'mês'}
                </span>
              </p>
              {plano!.ciclo === 'ANUAL' && economia > 0 ? (
                <p className="mt-1 text-xs font-semibold text-ok-700">
                  economize R$ {(economia / 100).toFixed(2).replace('.', ',')} no ano
                </p>
              ) : null}
              <ul className="mt-3 space-y-1 text-sm text-ink-600">
                <li>• questões ilimitadas</li>
                <li>• tutor com IA sem limite diário</li>
                <li>• simulados e evolução completa</li>
              </ul>
              <button
                onClick={() => (anonimo ? onAssinar?.() : abrirFormulario(plano!))}
                disabled={anonimo ? false : !configurado}
                className="qb-btn mt-4 w-full disabled:opacity-50"
              >
                {anonimo ? 'Criar conta para assinar' : configurado ? (plano!.ciclo === 'ANUAL' ? 'Assinar com Pix ou cartão' : 'Assinar com cartão') : 'Pagamento indisponível'}
              </button>
              {!configurado ? (
                <p className="mt-2 text-[11px] text-ink-400">
                  O pagamento ainda não está configurado neste ambiente.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------------- confirmação do checkout */}
      {planoEscolhido ? (
        <div className="qb-card p-5">
          <h3 className="text-sm font-bold text-ink-900">Assinar {planoEscolhido.nome}</h3>
          <p className="mt-1 text-xs text-ink-500">
            {planoEscolhido.ciclo === 'ANUAL'
              ? 'Pagamento único do plano anual — Pix ou cartão na página segura do Mercado Pago. Sem renovação automática.'
              : 'Assinatura mensal recorrente no cartão, na página segura do Mercado Pago. Cancele quando quiser.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void assinar()} disabled={enviando} className="qb-btn disabled:opacity-50">
              {enviando ? 'Abrindo pagamento…' : 'Ir para o pagamento'}
            </button>
            <button onClick={() => setPlanoEscolhido(null)} className="qb-btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-center text-[11px] text-ink-400">
        Pagamento processado pelo Mercado Pago. A liberação do PRO acontece quando o pagamento é
        confirmado — pode levar alguns segundos depois de você pagar.
      </p>
    </div>
  )
}



function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}
