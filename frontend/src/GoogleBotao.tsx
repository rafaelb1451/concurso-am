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

/** Client ID configurado no build (Vite). */
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

  useEffect(() => {
    if (!googleConfigurado()) return
    let cancelado = false

    const desenhar = () => {
      if (cancelado || !alvo.current || !window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resposta) => {
          if (resposta?.credential) callback.current(resposta.credential)
        },
      })
      window.google.accounts.id.renderButton(alvo.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        locale: 'pt-BR',
        width: 320,
      })
    }

    if (window.google?.accounts?.id) {
      desenhar()
      return
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', desenhar)
    return () => {
      cancelado = true
      script?.removeEventListener('load', desenhar)
    }
  }, [])

  if (!googleConfigurado()) return null
  return <div ref={alvo} className="mt-5 flex justify-center" />
}
