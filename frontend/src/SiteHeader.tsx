import { useState } from 'react'
import { ArrowRight, Mail, Menu, UserRound } from 'lucide-react'
import Logo from './Logo'
import Sheet from './Sheet'

export type PaginaPublica = 'inicio' | 'pratica' | 'planos'

const ITENS: { id: PaginaPublica; rotulo: string }[] = [
  { id: 'inicio', rotulo: 'Início' },
  { id: 'pratica', rotulo: 'Praticar grátis' },
  { id: 'planos', rotulo: 'Planos' },
]

/** Cabeçalho do site aberto (visitante ainda não autenticado). */
export default function SiteHeader({
  atual,
  onNavegar,
  onEntrar,
  onCriarConta,
}: {
  atual: PaginaPublica
  onNavegar: (pagina: PaginaPublica) => void
  onEntrar: () => void
  onCriarConta: () => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)

  function irPara(pagina: PaginaPublica) {
    setMenuAberto(false)
    onNavegar(pagina)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/90 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => irPara('inicio')}
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl pr-1 text-left"
          aria-label="QB Concurso — início"
        >
          <Logo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[17px]">
              QB Concurso
            </span>
            <span className="hidden truncate text-[11px] font-medium text-ink-500 lg:block">
              Quebrando a Banca · estudo por banca e certame
            </span>
          </span>
        </button>

        <nav aria-label="Seções do site" className="ml-auto hidden items-center gap-1 md:flex">
          {ITENS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavegar(item.id)}
              aria-current={atual === item.id ? 'page' : undefined}
              className={
                atual === item.id
                  ? 'min-h-11 whitespace-nowrap rounded-lg bg-brand-50 px-3 text-[13px] font-semibold text-brand-800'
                  : 'min-h-11 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900'
              }
            >
              {item.rotulo}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:ml-3">
          <button
            type="button"
            onClick={onEntrar}
            className="qb-btn-ghost min-h-11 px-3 text-[13px]"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={onCriarConta}
            className="qb-btn hidden whitespace-nowrap px-3.5 text-[13px] sm:inline-flex md:hidden lg:inline-flex"
          >
            Criar conta grátis
          </button>
          <button
            type="button"
            onClick={() => setMenuAberto((valor) => !valor)}
            aria-expanded={menuAberto}
            aria-controls="menu-publico"
            aria-haspopup="dialog"
            aria-label={menuAberto ? 'Fechar menu do site' : 'Abrir menu do site'}
            className="qb-icon-btn md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* navegação compacta no celular: mantém o estado ativo visível */}
      <nav
        aria-label="Seções do site"
        className="qb-tab-scroll flex gap-1 overflow-x-auto border-t border-ink-100 px-4 py-1.5 md:hidden"
      >
        {ITENS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavegar(item.id)}
            aria-current={atual === item.id ? 'page' : undefined}
            className={
              atual === item.id
                ? 'min-h-11 shrink-0 snap-start whitespace-nowrap rounded-lg bg-brand-50 px-3 text-[12px] font-semibold text-brand-800'
                : 'min-h-11 shrink-0 snap-start whitespace-nowrap rounded-lg px-3 text-[12px] font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-900'
            }
          >
            {item.rotulo}
          </button>
        ))}
      </nav>

      <Sheet
        open={menuAberto}
        onClose={() => setMenuAberto(false)}
        title="Navegar no site"
        description="Conheça a plataforma antes de criar sua conta."
        icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        side="bottom"
        overlayLabel="Fechar menu do site"
        panelId="menu-publico"
        footer={
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false)
                onCriarConta()
              }}
              className="qb-btn w-full"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false)
                onEntrar()
              }}
              className="qb-btn-ghost w-full"
            >
              Já tenho conta — entrar
            </button>
          </div>
        }
      >
        <ul className="space-y-1 p-3">
          {ITENS.map((item) => {
            const ativo = atual === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => irPara(item.id)}
                  aria-current={ativo ? 'page' : undefined}
                  className={`flex min-h-[56px] w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition-colors ${
                    ativo ? 'bg-brand-50 text-brand-900' : 'text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  {item.rotulo}
                  {ativo ? <span className="qb-chip bg-brand-700 text-white">atual</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-200 bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-[12px] text-ink-500 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-ink-700">QB Concurso — Quebrando a Banca</span>
          <span>Questões comentadas, simulados e tutor com IA</span>
        </div>
        <a
          href="mailto:contato@qbconcurso.online"
          aria-label="Enviar e-mail para o suporte: contato@qbconcurso.online"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-[12px] font-semibold text-ink-600 transition hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden="true" />
          <span className="truncate">Contato: contato@qbconcurso.online</span>
        </a>
      </div>
    </footer>
  )
}
