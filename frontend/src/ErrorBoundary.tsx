import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Última barreira da UI: um erro inesperado de renderização vira uma tela de
 * recuperação em vez de página branca. Nenhum detalhe técnico é exibido ao
 * usuário (e nada sensível vai para o console em produção).
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { comErro: boolean }
> {
  state = { comErro: false }

  static getDerivedStateFromError() {
    return { comErro: true }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Erro de renderização:', erro, info.componentStack)
    }
  }

  render() {
    if (!this.state.comErro) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
        <div className="qb-card w-full max-w-md p-6 text-center sm:p-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-err-50 text-err-600">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink-900">Algo deu errado por aqui</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A página encontrou um problema inesperado. Seus dados de estudo continuam salvos.
            Recarregue para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="qb-btn mt-5 w-full"
          >
            Recarregar a página
          </button>
        </div>
      </div>
    )
  }
}
