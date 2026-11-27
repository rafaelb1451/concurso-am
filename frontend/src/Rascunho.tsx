import { useEffect, useRef, useState } from 'react'
import { Eraser, PencilLine, X } from 'lucide-react'

/**
 * Rascunho da questão: gaveta lateral no desktop e folha deslizante no celular.
 *
 * O texto é salvo por questão no próprio aparelho (localStorage), sem enviar nada ao servidor.
 */
export default function Rascunho({
  questaoId,
  open,
  onClose,
}: {
  questaoId: number
  open: boolean
  onClose: () => void
}) {
  const chave = `qb_rascunho:${questaoId}`
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTexto(localStorage.getItem(chave) ?? '')
  }, [chave])

  useEffect(() => {
    if (!open) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', aoTeclar)
    const t = window.setTimeout(() => area.current?.focus(), 60)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      window.clearTimeout(t)
    }
  }, [open, onClose])

  function salvar(valor: string) {
    setTexto(valor)
    localStorage.setItem(chave, valor)
  }

  if (!open) return null

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Rascunho da questão">
      <button
        aria-label="Fechar rascunho"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px]"
      />

      <section
        className="absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col rounded-t-3xl border border-ink-200 bg-surface shadow-pop sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-3xl sm:border-y-0 sm:border-r-0"
        style={{ animation: 'qb-sheet-in .22s ease-out' }}
      >
        <header className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <PencilLine className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink-900">Rascunho</h2>
            <p className="text-[11px] text-ink-400">Salvo automaticamente neste aparelho</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
          <textarea
            ref={area}
            value={texto}
            onChange={(e) => salvar(e.target.value)}
            placeholder="Escreva seu raciocínio, cálculos ou lembretes…"
            spellCheck
            className="min-h-[160px] w-full flex-1 resize-none rounded-2xl border border-ink-200 bg-ink-50/60 p-4 text-sm leading-relaxed text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-400/15"
          />
          <div className="flex items-center justify-between text-[11px] text-ink-400">
            <span>{palavras} {palavras === 1 ? 'palavra' : 'palavras'} · {texto.length} caracteres</span>
            <button
              onClick={() => salvar('')}
              disabled={!texto}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-ink-500 transition hover:bg-ink-100 disabled:opacity-40"
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        </div>

        <footer className="border-t border-ink-100 px-5 py-3">
          <button onClick={onClose} className="qb-btn w-full py-2.5 text-sm">
            Concluir rascunho
          </button>
        </footer>
      </section>
    </div>
  )
}
