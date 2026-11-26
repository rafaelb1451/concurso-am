import Logo from './Logo'

export type PaginaPublica = 'inicio' | 'pratica' | 'planos'

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
  const itens: { id: PaginaPublica; rotulo: string }[] = [
    { id: 'inicio', rotulo: 'Início' },
    { id: 'pratica', rotulo: 'Praticar grátis' },
    { id: 'planos', rotulo: 'Planos' },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <button
          onClick={() => onNavegar('inicio')}
          className="flex items-center gap-3 text-left"
          aria-label="QB Concurso — início"
        >
          <Logo className="h-10 w-10 shrink-0" />
          <span>
            <span className="block text-[17px] font-bold leading-tight tracking-tight text-ink-900">
              QB Concurso
            </span>
            <span className="block text-[11.5px] font-medium text-ink-500">
              Quebrando a Banca · PM-AM e PC-AM
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {itens.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavegar(item.id)}
              className={
                atual === item.id
                  ? 'rounded-lg bg-brand-50 px-3 py-2 text-[13px] font-semibold text-brand-800'
                  : 'rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-500 transition hover:bg-ink-100 hover:text-ink-800'
              }
            >
              {item.rotulo}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={onEntrar} className="qb-btn-ghost px-3 py-2 text-[13px]">
            Entrar
          </button>
          <button onClick={onCriarConta} className="qb-btn px-3.5 py-2 text-[13px]">
            Criar conta grátis
          </button>
        </div>
      </div>

      {/* navegação compacta no celular */}
      <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-4 py-2 md:hidden">
        {itens.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavegar(item.id)}
            className={
              atual === item.id
                ? 'shrink-0 rounded-lg bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-800'
                : 'shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-ink-500'
            }
          >
            {item.rotulo}
          </button>
        ))}
      </nav>
    </header>
  )
}
