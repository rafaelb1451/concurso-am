import { useEffect, useMemo, useState } from 'react'
import { Check, CreditCard, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import {
  api,
  type AssinaturaAtual,
  type Concurso,
  type Plano,
  type UsoPlano,
} from './api'
import PlanoBadge from './PlanoBadge'
import SeletorCertames from './SeletorCertames'
import {
  certamesDaAssinatura,
  ehPlanoBasico,
  ehPlanoPlus,
  limiteCertamesDoPlano,
  nomeDoPlano,
  planoAtualEhPago,
  rotuloCertames,
  rotuloQuestoes,
  tutorIaDaAssinatura,
} from './plano'
import {
  Card,
  ErrorBanner,
  InfoBanner,
  LoadingState,
  PageHeader,
  ProgressBar,
  SuccessBanner,
} from './ui'

type TipoOferta = 'BASICO' | 'PLUS'

interface Oferta {
  tipo: TipoOferta
  titulo: string
  plano: Plano
  maximo: number
  tutor: boolean
  precoCentavos: number
  ciclo: string | null
}

function formatarPreco(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',')
}

function rotuloCiclo(ciclo: string | null): string {
  const normalizado = (ciclo ?? '').toUpperCase()
  if (normalizado === 'ANUAL') return '/ano'
  if (normalizado === 'MENSAL') return '/mês'
  return ''
}

/** Só aceita redirecionar para uma URL https devolvida pelo gateway. */
function checkoutSeguro(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
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

function localizarPlano(planos: Plano[], tipo: TipoOferta): Plano | null {
  const codigos = tipo === 'BASICO' ? ['BASICO', 'PRO_MENSAL'] : ['PLUS', 'PRO_ANUAL']
  for (const codigo of codigos) {
    const encontrado = planos.find((plano) => plano.codigo === codigo)
    if (encontrado) return encontrado
  }
  return null
}

function criarOferta(tipo: TipoOferta, plano: Plano): Oferta {
  return {
    tipo,
    titulo: tipo === 'BASICO' ? 'Básico' : 'Plus',
    plano,
    maximo: limiteCertamesDoPlano(plano),
    // O Básico não inclui tutor; o Plus inclui. O backend manda `tutorIa` e vence.
    tutor: tipo === 'PLUS' ? (plano.tutorIa ?? true) : (plano.tutorIa ?? false),
    precoCentavos: plano.valorCentavos,
    ciclo: plano.ciclo,
  }
}

/**
 * Planos e assinatura.
 *
 * Comparação Básico × Plus com seleção de certames no checkout. O pagamento
 * acontece na página hospedada do gateway: nenhum dado de cartão passa aqui.
 * Se o backend novo de escopo ainda não estiver no ar, a tela degrada para o
 * catálogo legado (PRO_MENSAL/PRO_ANUAL) sem quebrar.
 */
export default function Planos({
  anonimo = false,
  onAssinar,
  onCheckoutUrl,
}: {
  anonimo?: boolean
  onAssinar?: () => void
  /** Injeção usada nos testes para não navegar de verdade no jsdom. */
  onCheckoutUrl?: (url: string) => void
} = {}) {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [assinatura, setAssinatura] = useState<AssinaturaAtual | null>(null)
  const [uso, setUso] = useState<UsoPlano | null>(null)
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [concursosErro, setConcursosErro] = useState<string | null>(null)
  const [planoEscolhido, setPlanoEscolhido] = useState<TipoOferta | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [validacao, setValidacao] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)

    Promise.all([
      api.planos(),
      anonimo ? Promise.resolve(null) : api.assinatura().catch(() => null),
      anonimo ? Promise.resolve(null) : api.usoPlano().catch(() => null),
      api.concursos(true).catch(() => null),
    ])
      .then(([lista, atual, usoAtual, listaConcursos]) => {
        if (!ativo) return
        setPlanos(Array.isArray(lista) ? lista : [])
        setAssinatura(atual)
        setUso(usoAtual)
        if (Array.isArray(listaConcursos)) {
          setConcursos(listaConcursos)
          setConcursosErro(null)
        } else {
          setConcursos([])
          setConcursosErro('Não foi possível carregar a lista de certames.')
        }
      })
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

  const ofertas = useMemo(() => {
    const lista: Oferta[] = []
    const basico = localizarPlano(planos, 'BASICO')
    const plus = localizarPlano(planos, 'PLUS')
    if (basico) lista.push(criarOferta('BASICO', basico))
    if (plus) lista.push(criarOferta('PLUS', plus))
    return lista
  }, [planos])

  const ofertaPlus = ofertas.find((oferta) => oferta.tipo === 'PLUS') ?? null
  const ofertaSelecionada = ofertas.find((oferta) => oferta.tipo === planoEscolhido) ?? null

  const codigoAtual = assinatura?.plano?.codigo
  const planoAtualPago = planoAtualEhPago(assinatura)
  const certamesAtivos = certamesDaAssinatura(assinatura)
  const tutorLiberado = tutorIaDaAssinatura(assinatura)
  const tutorUso = assinatura?.tutorUso
  const limiteDiario =
    uso?.limiteDiarioQuestoes ?? assinatura?.plano?.limiteDiarioQuestoes ?? 20
  const respondidasHoje = uso?.respondidasHoje ?? 0
  const pagamentoConfigurado = assinatura?.pagamentoConfigurado !== false

  function ofertaEhAtual(oferta: Oferta): boolean {
    if (!codigoAtual) return false
    return oferta.tipo === 'BASICO'
      ? ehPlanoBasico(codigoAtual)
      : ehPlanoPlus(codigoAtual)
  }

  function escolherOferta(oferta: Oferta) {
    if (ofertaEhAtual(oferta)) return
    setErro(null)
    setMensagem(null)
    setValidacao(null)
    setPlanoEscolhido(oferta.tipo)
    // Upgrade/downgrade já leva os certames atuais, cortados no limite do novo plano.
    setSelecionados(certamesAtivos.slice(0, oferta.maximo))
  }

  function fecharCheckout() {
    setPlanoEscolhido(null)
    setSelecionados([])
    setValidacao(null)
    setErro(null)
  }

  const avisoSelecao = useMemo(() => {
    if (!ofertaSelecionada) return null
    if (anonimo) {
      return 'Crie sua conta para escolher o certame e concluir a assinatura.'
    }
    if (selecionados.length === 0) {
      return ofertaSelecionada.tipo === 'BASICO'
        ? 'Selecione 1 certame para continuar.'
        : 'Selecione ao menos 1 certame para continuar.'
    }
    if (selecionados.length > ofertaSelecionada.maximo) {
      return `O plano ${ofertaSelecionada.titulo} aceita no máximo ${ofertaSelecionada.maximo} certames.`
    }
    return null
  }, [anonimo, ofertaSelecionada, selecionados.length])

  const selecaoValida = Boolean(
    ofertaSelecionada && selecionados.length >= 1 && selecionados.length <= ofertaSelecionada.maximo,
  )
  // O visitante escolhe o certame depois de criar a conta; o checkout exige sessão.
  const podeAssinar = anonimo
    ? Boolean(ofertaSelecionada) && !enviando
    : selecaoValida && !enviando && pagamentoConfigurado

  async function assinar() {
    if (!ofertaSelecionada) return
    if (anonimo) {
      setErro(null)
      setMensagem(null)
      setValidacao(null)
      onAssinar?.()
      return
    }
    if (!selecaoValida) {
      setValidacao(avisoSelecao ?? 'Selecione os certames do plano para continuar.')
      return
    }
    setErro(null)
    setMensagem(null)
    setValidacao(null)

    if (!pagamentoConfigurado) {
      setErro('O pagamento ainda não está configurado neste ambiente.')
      return
    }

    setEnviando(true)
    try {
      const resposta = await api.iniciarCheckout(
        ofertaSelecionada.plano.codigo,
        selecionados,
      )
      if (!checkoutSeguro(resposta.url)) {
        setErro('O endereço de pagamento retornado é inválido. Tente novamente em instantes.')
        return
      }
      if (onCheckoutUrl) {
        onCheckoutUrl(resposta.url)
      } else {
        window.location.assign(resposta.url)
      }
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
      setMensagem(
        planoAtualEhPago(atual)
          ? `Pagamento confirmado! Seu plano ${nomeDoPlano(atual.plano)} está liberado.`
          : 'Ainda não identificamos o pagamento. Se você acabou de pagar, aguarde alguns segundos e tente de novo.',
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível verificar o pagamento.')
    } finally {
      setVerificando(false)
    }
  }

  async function cancelar() {
    if (!window.confirm('Cancelar a renovação? Seu acesso continua até o fim do período já pago.')) {
      return
    }
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Assinatura"
        title="Planos"
        description={
          anonimo
            ? 'Compare Básico e Plus, escolha o certame e assine quando quiser responder sem limite.'
            : 'Compare Básico e Plus, veja seu escopo atual e escolha os certames do seu plano.'
        }
        actions={<span className="qb-chip bg-ink-100 text-ink-700">Mercado Pago</span>}
      />

      {erro ? (
        <ErrorBanner onRetry={() => setTentativa((n) => n + 1)}>{erro}</ErrorBanner>
      ) : null}
      {mensagem ? <SuccessBanner>{mensagem}</SuccessBanner> : null}

      {/* ---------------- plano atual ---------------- */}
      {!anonimo ? (
        <Card padded>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="qb-eyebrow">Seu plano</p>
              <h2 className="mt-1 text-base font-bold text-ink-900">
                {nomeDoPlano(assinatura?.plano)}
              </h2>
              <p className="mt-1 break-words text-sm leading-relaxed text-ink-600">
                {planoAtualPago ? (
                  <>
                    {certamesAtivos.length > 0
                      ? `${rotuloCertames(certamesAtivos.length)} no seu escopo`
                      : 'Certames ainda não vinculados'}
                    {assinatura?.periodoFim
                      ? ` · acesso até ${formatarData(assinatura.periodoFim)}`
                      : ''}
                    {assinatura?.cancelaNoFim ? ' (renovação cancelada)' : ''}
                  </>
                ) : (
                  <>
                    até {limiteDiario} questões por dia · sem Tutor de IA
                  </>
                )}
              </p>

              {planoAtualPago && certamesAtivos.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Certames do plano">
                  {certamesAtivos.map((certame) => (
                    <li key={certame}>
                      <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
                        {certame}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {assinatura ? (
              <PlanoBadge assinatura={assinatura} />
            ) : (
              <span className="qb-chip bg-ink-100 text-ink-600">Gratuito</span>
            )}
          </div>

          {!planoAtualPago && uso ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-600">
                <span>Questões hoje</span>
                <span>
                  {respondidasHoje} / {limiteDiario}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, (respondidasHoje / Math.max(1, limiteDiario)) * 100)}
                label="Questões usadas hoje"
                className="mt-1.5"
              />
            </div>
          ) : null}

          {planoAtualPago && tutorLiberado && tutorUso ? (
            <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-700">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-accent-700" aria-hidden="true" />
                  Tutor de IA hoje
                </span>
                <span>
                  {tutorUso.cota < 0
                    ? 'ilimitado'
                    : `${tutorUso.usado} / ${tutorUso.cota}`}
                </span>
              </div>
              {tutorUso.cota > 0 ? (
                <ProgressBar
                  value={Math.min(100, (tutorUso.usado / Math.max(1, tutorUso.cota)) * 100)}
                  label="Uso do Tutor de IA hoje"
                  className="mt-1.5"
                  height="h-1.5"
                />
              ) : null}
            </div>
          ) : null}

          {planoAtualPago && !tutorLiberado ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-accent-50 px-3.5 py-3 text-xs font-medium text-ink-700">
              <Lock className="h-4 w-4 shrink-0 text-accent-700" aria-hidden="true" />
              <span>O Tutor de IA é exclusivo do Plus.</span>
              {ofertaPlus ? (
                <button
                  type="button"
                  onClick={() => escolherOferta(ofertaPlus)}
                  className="qb-link inline-flex min-h-8 items-center text-xs"
                >
                  Conheça o Plus
                </button>
              ) : null}
            </p>
          ) : null}

          {planoAtualPago && !assinatura?.cancelaNoFim ? (
            <button type="button" onClick={() => void cancelar()} className="qb-btn-ghost mt-4">
              Cancelar renovação
            </button>
          ) : null}
        </Card>
      ) : null}

      {/* ---------------- comparação Básico × Plus ---------------- */}
      <section className="space-y-3" aria-labelledby="comparar-planos">
        <div>
          <h2 id="comparar-planos" className="qb-section-title">
            Básico × Plus
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
            O Básico cobre 1 certame. O Plus cobre até 3 e libera o Tutor de IA. Questões e
            materiais seguem sempre o escopo contratado.
          </p>
        </div>

        {ofertas.length === 0 ? (
          <div className="qb-empty">
            <p className="text-sm font-semibold text-ink-800">
              Nenhum plano pago disponível no momento.
            </p>
            <p className="mt-1 text-xs text-ink-500">O plano gratuito continua ativo.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {ofertas.map((oferta) => {
              const atual = ofertaEhAtual(oferta)
              const escolhido = planoEscolhido === oferta.tipo
              const limite = oferta.plano.limiteDiarioQuestoes
              return (
                <article
                  key={oferta.tipo}
                  aria-labelledby={`plano-${oferta.tipo}-titulo`}
                  className={`qb-card flex flex-col p-5 ${
                    escolhido ? 'ring-2 ring-brand-600' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3
                      id={`plano-${oferta.tipo}-titulo`}
                      className="text-base font-bold text-ink-900"
                    >
                      {oferta.titulo}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {atual ? (
                        <span className="qb-chip bg-brand-700 text-white">seu plano</span>
                      ) : null}
                      {oferta.tipo === 'PLUS' ? (
                        <span className="qb-chip bg-accent-100 text-accent-800">Tutor de IA</span>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-2 break-words text-2xl font-extrabold text-brand-800">
                    R$ {formatarPreco(oferta.precoCentavos)}
                    <span className="text-sm font-semibold text-ink-500">
                      {rotuloCiclo(oferta.ciclo)}
                    </span>
                  </p>

                  <dl className="mt-4 space-y-3 border-t border-ink-100 pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-ink-600">Certames</dt>
                      <dd className="text-right font-semibold text-ink-900">
                        {oferta.maximo === 1 ? '1 certame' : `até ${oferta.maximo} certames`}
                      </dd>
                    </div>

                    <div
                      className="flex items-start justify-between gap-3"
                      title={
                        oferta.tutor
                          ? 'Tutor de IA liberado neste plano.'
                          : 'Tutor de IA bloqueado no Básico — disponível no Plus.'
                      }
                    >
                      <dt className="font-semibold text-ink-600">Tutor de IA</dt>
                      <dd className="text-right">
                        {oferta.tutor ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-ok-700">
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-ink-500">
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            Bloqueado
                          </span>
                        )}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-ink-600">Questões e materiais</dt>
                      <dd className="text-right font-semibold text-ink-900">
                        {oferta.maximo === 1
                          ? 'do certame contratado'
                          : `dos até ${oferta.maximo} certames`}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <dt className="font-semibold text-ink-600">Limite diário</dt>
                      <dd className="text-right font-semibold text-ink-900">
                        {limite < 0 ? 'ilimitado' : `${limite} questões/dia`}
                      </dd>
                    </div>
                  </dl>

                  {!oferta.tutor && ofertaPlus ? (
                    <button
                      type="button"
                      onClick={() => escolherOferta(ofertaPlus)}
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-xs font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 transition hover:text-brand-800"
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Conheça o Plus
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => escolherOferta(oferta)}
                    disabled={atual}
                    aria-pressed={escolhido}
                    className={`mt-4 w-full ${escolhido ? 'qb-btn-accent' : 'qb-btn'}`}
                  >
                    {atual ? 'Seu plano atual' : `Escolher ${oferta.titulo}`}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------------- seleção de certames + checkout ---------------- */}
      {ofertaSelecionada ? (
        <Card padded>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="qb-eyebrow">Checkout</p>
              <h2 id="checkout-titulo" className="mt-1 text-base font-bold text-ink-900">
                Escolha os certames do {ofertaSelecionada.titulo}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                {ofertaSelecionada.tipo === 'BASICO'
                  ? 'O Básico inclui exatamente 1 certame. Você poderá trocar 1 vez por ciclo.'
                  : `O Plus inclui de 1 a ${ofertaSelecionada.maximo} certames. Você poderá trocar 1 vez por ciclo.`}
              </p>
            </div>
          </div>

          <div className="mt-4">
            {anonimo && concursos.length === 0 ? (
              <InfoBanner>
                A lista de certames exige uma conta. Crie a sua para escolher o certame e concluir a
                assinatura — o plano escolhido fica selecionado.
              </InfoBanner>
            ) : (
              <SeletorCertames
                idPrefix={`checkout-${ofertaSelecionada.tipo.toLowerCase()}`}
                concursos={concursos}
                selecionados={selecionados}
                onChange={(ids) => {
                  setSelecionados(ids)
                  setValidacao(null)
                }}
                maximo={ofertaSelecionada.maximo}
                carregando={false}
                erro={concursosErro}
                onTentarNovamente={() => setTentativa((n) => n + 1)}
              />
            )}
          </div>

          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink-900">Prévia do pedido</h3>
              <span className="qb-chip bg-surface text-ink-700 ring-1 ring-inset ring-ink-200">
                {selecionados.length} de {ofertaSelecionada.maximo}
              </span>
            </div>

            {selecionados.length === 0 ? (
              <p className="mt-2 text-xs text-ink-500">Nenhum certame selecionado ainda.</p>
            ) : (
              <ul className="mt-2 space-y-1" aria-label="Certames selecionados">
                {selecionados.map((id) => {
                  const total = concursos.find((concurso) => concurso.id === id)?.total
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-2 text-xs font-medium text-ink-700"
                    >
                      <Check className="h-3.5 w-3.5 shrink-0 text-ok-600" aria-hidden="true" />
                      <span className="min-w-0 break-words">
                        {id}
                        {typeof total === 'number' ? ` — ${rotuloQuestoes(total)}` : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="mt-2 border-t border-ink-200 pt-2 text-xs font-semibold text-ink-700">
              {rotuloCertames(selecionados.length)} · R$ {formatarPreco(ofertaSelecionada.precoCentavos)}
              {rotuloCiclo(ofertaSelecionada.ciclo)}
            </p>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-600" role="status" aria-live="polite">
            {avisoSelecao ?? 'Seleção pronta para o checkout.'}
          </p>
          {validacao ? (
            <p className="mt-2 rounded-xl bg-err-50 px-3 py-2 text-xs font-semibold text-err-700" role="alert">
              {validacao}
            </p>
          ) : null}
          {!pagamentoConfigurado ? (
            <p className="mt-2 text-[11px] text-ink-500">
              O pagamento ainda não está configurado neste ambiente.
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void assinar()}
              disabled={!podeAssinar}
              aria-describedby="checkout-ajuda"
              className="qb-btn w-full sm:w-auto sm:px-6"
            >
              {enviando ? 'Abrindo pagamento…' : 'Assinar'}
            </button>
            <button
              type="button"
              onClick={fecharCheckout}
              className="qb-btn-ghost w-full sm:w-auto"
            >
              Cancelar
            </button>
          </div>
          <p id="checkout-ajuda" className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Pagamento processado pelo Mercado Pago. O acesso é liberado quando o pagamento é
            confirmado — pode levar alguns segundos.
          </p>
          {anonimo ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Crie sua conta para concluir a assinatura com segurança.
            </p>
          ) : null}
        </Card>
      ) : null}

      {!anonimo && pagamentoConfigurado ? (
        <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-ink-600">
            Já pagou? A liberação acontece pelo webhook do Mercado Pago — às vezes leva alguns
            segundos.
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

      <div className="rounded-xl bg-ink-50 px-4 py-3 text-center text-[11px] leading-relaxed text-ink-500">
        <p className="inline-flex items-start gap-1.5 text-left">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Pagamento processado pelo Mercado Pago. A liberação do plano acontece quando o pagamento
            é confirmado — pode levar alguns segundos depois de você pagar.
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
