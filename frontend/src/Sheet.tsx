import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal reutilizável.
 *
 * - celular: folha inferior (bottom sheet);
 * - desktop: painel lateral.
 *
 * Cuida de foco inicial, armadilha de foco, ESC, bloqueio do scroll do corpo e
 * devolução do foco ao elemento que abriu a folha.
 */
export default function Sheet({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  side = 'auto',
  overlayLabel = 'Fechar',
  panelId,
  initialFocus,
  className = '',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  side?: 'auto' | 'bottom'
  overlayLabel?: string
  panelId?: string
  initialFocus?: RefObject<HTMLElement | null>
  className?: string
}) {
  const tituloId = useId()
  const painel = useRef<HTMLDivElement>(null)
  const fechar = useRef(onClose)
  fechar.current = onClose

  useEffect(() => {
    if (!open) return
    const anterior = document.activeElement as HTMLElement | null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const foco = window.setTimeout(() => {
      const alvo =
        initialFocus?.current ??
        painel.current?.querySelector<HTMLElement>(FOCAVEIS) ??
        painel.current
      alvo?.focus()
    }, 30)

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        fechar.current()
        return
      }
      if (evento.key !== 'Tab' || !painel.current) return
      const lista = [...painel.current.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (elemento) => elemento.offsetParent !== null || elemento === document.activeElement,
      )
      if (lista.length === 0) {
        evento.preventDefault()
        painel.current.focus()
        return
      }
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      window.clearTimeout(foco)
      document.body.style.overflow = overflowAnterior
      anterior?.focus?.()
    }
  }, [open, initialFocus])

  if (!open) return null

  const painelClasses =
    side === 'bottom'
      ? 'qb-sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl border border-ink-200 bg-surface shadow-pop sm:max-w-xl'
      : 'qb-sheet-panel absolute inset-x-0 bottom-0 flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-ink-200 bg-surface shadow-pop sm:qb-sheet-panel-right sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:max-w-none sm:rounded-none sm:rounded-l-3xl sm:border-y-0 sm:border-r-0'

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={overlayLabel}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40 backdrop-blur-[2px]"
      />
      <section
        ref={painel}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`${painelClasses} ${className}`}
      >
        <header className="flex items-start gap-3 border-b border-ink-100 px-4 py-4 sm:px-5">
          {icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-base font-bold leading-tight text-ink-900">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="qb-icon-btn -mr-1 -mt-1 shrink-0"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="qb-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer ? <footer className="qb-safe-bottom border-t border-ink-100 px-4 pt-3 sm:px-5">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}
