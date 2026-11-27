import type { ComponentType, ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, RotateCcw } from 'lucide-react'

/* =========================================================================
   Primitivos visuais compartilhados. Mantêm espaçamento, tipografia e
   estados (vazio/erro/carregando) consistentes em todas as telas.
   ========================================================================= */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="qb-eyebrow">{eyebrow}</p> : null}
        <h1 className="qb-page-title">{title}</h1>
        {description ? <p className="qb-page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Card({
  children,
  className = '',
  padded = false,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={`qb-card ${padded ? 'qb-card-pad' : ''} ${className}`}>{children}</div>
}

export function ErrorBanner({
  children,
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
}: {
  children: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div className={`qb-alert-error ${className}`} role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="break-words">{children}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="qb-link mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function SuccessBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`qb-alert-success ${className}`} role="status">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 break-words">{children}</p>
    </div>
  )
}

export function InfoBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`qb-alert-info ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`qb-empty ${className}`}>
      {Icon ? (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description ? <div className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function LoadingState({
  label = 'Carregando…',
  lines = 3,
  className = '',
}: {
  label?: string
  lines?: number
  className?: string
}) {
  return (
    <div className={`qb-card qb-card-pad ${className}`} aria-busy="true" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-4 space-y-2.5" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className={`qb-skeleton h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`qb-skeleton ${className}`} aria-hidden="true" />
}

export function StatCard({
  label,
  value,
  hint,
  destaque = false,
}: {
  label: string
  value: string
  hint?: string
  destaque?: boolean
}) {
  return (
    <div className="qb-card p-3.5 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold leading-none ${destaque ? 'text-accent-700' : 'text-ink-900'}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-ink-500">{hint}</p> : null}
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  className = '',
  height = 'h-2',
}: {
  value: number
  label: string
  className?: string
  height?: string
}) {
  const seguro = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-ink-100 ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(seguro)}
    >
      <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${seguro}%` }} />
    </div>
  )
}
