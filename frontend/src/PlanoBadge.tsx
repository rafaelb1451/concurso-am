import { CreditCard, Sparkles } from 'lucide-react'
import type { AssinaturaAtual } from './api'
import {
  certamesDaAssinatura,
  nomeDoPlano,
  planoAtualEhPago,
  rotuloCertamesAtivos,
} from './plano'

/**
 * Badge do plano atual: nome + quantidade de certames ativos.
 * Usado no header e na conta para a mesma informação ter o mesmo rótulo.
 */
export default function PlanoBadge({
  assinatura,
  className = '',
}: {
  assinatura: AssinaturaAtual | null | undefined
  className?: string
}) {
  if (!assinatura?.plano) return null

  const nome = nomeDoPlano(assinatura.plano)
  const certames = certamesDaAssinatura(assinatura)
  const pago = planoAtualEhPago(assinatura)
  const detalhe = rotuloCertamesAtivos(certames.length)

  return (
    <span
      className={`qb-chip ${
        pago
          ? 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200'
          : 'bg-ink-100 text-ink-600'
      } ${className}`}
      aria-label={`Plano ${nome}: ${detalhe}`}
      title={`Plano ${nome} · ${detalhe}`}
    >
      {pago ? (
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{nome}</span>
      <span aria-hidden="true" className="text-ink-400">
        ·
      </span>
      <span className="normal-case tracking-normal">{detalhe}</span>
    </span>
  )
}
