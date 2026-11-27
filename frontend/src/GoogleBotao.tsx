import { useEffect, useRef } from 'react'

/**
 * Botão "Entrar com Google" usando o Google Identity Services.
 *
 * O Google devolve um **ID token** (JWT assinado) direto para a página; quem valida é o backend
 * (`POST /api/google`), conferindo assinatura, emissor, audience e e-mail verificado. Assim não
 * existe client secret no frontend nem troca de código OAuth.
 *
 * Sem `VITE_GOOGLE_CLIENT_ID` o componente não renderiza nada — o login por e-mail/senha continua.
 */

interface GoogleCredentialResponse {
  credential?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (resposta: GoogleCredentialResponse) => void
            auto_select?: boolean
          }) => void
          renderButton: (elemento: HTMLElement, opcoes: Record<string, unknown>) => void
        }
      }
    }
  }
}

const SRC = 'https://accounts.google.com/gsi/client'

/** Client ID público configurado no build (Vite). Não é segredo. */
export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

export const googleConfigurado = (): boolean => googleClientId.trim().length > 0

export default function GoogleBotao({
  onCredencial,
}: {
  onCredencial: (credential: string) => void
}) {
  const alvo = useRef<HTMLDivElement>(null)
  // guarda o callback em ref para não reinicializar o SDK a cada render
  const callback = useRef(onCredencial)
  callback.current = onCredencial
  const ultimaLargura = useRef(0)

  useEffect(() => {
    if (!googleConfigurado()) return
    let cancelado = false
    let observador: ResizeObserver | null = null

    const desenhar = () => {
      const caixa = alvo.current
      if (cancelado || !caixa || !window.google?.accounts?.id) return

      // O botão do Google tem largura fixa; medir a caixa evita overflow em telas de 360px.
      const largura = Math.min(400, Math.max(200, Math.floor(caixa.clientWidth || 320)))
      if (ultimaLargura.current && Math.abs(largura - ultimaLargura.current) < 16) return
      ultimaLargura.current = largura

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resposta) => {
          if (resposta?.credential) callback.current(resposta.credential)
        },
      })
      // remove apenas os nós renderizados anteriormente (sem innerHTML)
      caixa.replaceChildren()
      window.google.accounts.id.renderButton(caixa, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        locale: 'pt-BR',
        width: largura,
      })
    }

    if (window.google?.accounts?.id) {
      desenhar()
    } else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = SRC
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', desenhar)
      // o script pode ter carregado antes do listener ser anexado
      if (window.google?.accounts?.id) desenhar()
    }

    if (typeof ResizeObserver !== 'undefined' && alvo.current) {
      observador = new ResizeObserver(() => desenhar())
      observador.observe(alvo.current)
    }

    return () => {
      cancelado = true
      observador?.disconnect()
      document
        .querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
        ?.removeEventListener('load', desenhar)
    }
  }, [])

  if (!googleConfigurado()) return null
  return (
    <div
      ref={alvo}
      className="flex min-h-11 w-full items-center justify-center overflow-hidden"
      data-testid="google-botao"
    />
  )
}
