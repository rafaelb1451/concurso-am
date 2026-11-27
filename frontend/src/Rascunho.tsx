import { useEffect, useRef, useState } from 'react'
import { Eraser, PencilLine } from 'lucide-react'
import Sheet from './Sheet'

/**
 * Rascunho da questão: folha inferior no celular e painel lateral no desktop.
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

  function salvar(valor: string) {
    setTexto(valor)
    localStorage.setItem(chave, valor)
  }

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rascunho"
      description="Salvo automaticamente neste aparelho."
      icon={<PencilLine className="h-4 w-4" aria-hidden="true" />}
      overlayLabel="Fechar rascunho"
      initialFocus={area}
      footer={
        <button type="button" onClick={onClose} className="qb-btn w-full">
          Concluir rascunho
        </button>
      }
    >
      <div className="flex min-h-full flex-col gap-3 p-4 sm:p-5">
        <label htmlFor="rascunho-texto" className="sr-only">
          Rascunho da questão
        </label>
        <textarea
          id="rascunho-texto"
          ref={area}
          value={texto}
          onChange={(e) => salvar(e.target.value)}
          placeholder="Escreva seu raciocínio, cálculos ou lembretes…"
          spellCheck
          className="qb-textarea min-h-[180px] flex-1 bg-ink-50/60 leading-relaxed focus:bg-white"
        />
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
          <span>
            {palavras} {palavras === 1 ? 'palavra' : 'palavras'} · {texto.length} caracteres
          </span>
          <button
            type="button"
            onClick={() => salvar('')}
            disabled={!texto}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-ink-600 transition hover:bg-ink-100 disabled:opacity-40"
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>
    </Sheet>
  )
}
