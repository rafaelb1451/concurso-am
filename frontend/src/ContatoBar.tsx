import { Mail } from 'lucide-react'

/**
 * Barra de contato no topo do site/app: e-mail de atendimento com link mailto.
 * Não é fixa: ao rolar, o cabeçalho (sticky) assume o topo.
 */
export default function ContatoBar() {
  return (
    <div className="bg-brand-900 text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 py-1.5 sm:px-6">
        <a
          href="mailto:contato@qbconcurso.online"
          aria-label="Enviar e-mail para o suporte: contato@qbconcurso.online"
          className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-[12px] font-semibold text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-accent-300" aria-hidden="true" />
          <span className="truncate">Contato: contato@qbconcurso.online</span>
        </a>
      </div>
    </div>
  )
}
