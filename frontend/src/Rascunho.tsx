import { useEffect, useState } from 'react'

export default function Rascunho({ questaoId, compact = false }: { questaoId: number; compact?: boolean }) {
  const chave = `qb_rascunho:${questaoId}`
  const [texto, setTexto] = useState('')

  useEffect(() => {
    setTexto(localStorage.getItem(chave) ?? '')
  }, [chave])

  function salvar(valor: string) {
    setTexto(valor)
    localStorage.setItem(chave, valor)
  }

  return (
    <label className={compact ? 'block' : 'mt-4 block'}>
      <span className="text-xs font-semibold text-ink-600">Rascunho / resolução no tablet</span>
      <textarea
        value={texto}
        onChange={(e) => salvar(e.target.value)}
        placeholder="Escreva aqui seu raciocínio, cálculos ou lembretes..."
        className={`mt-1 w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 ${
          compact ? 'min-h-24' : 'min-h-28'
        }`}
        spellCheck
      />
      <span className="mt-1 block text-right text-[10px] text-ink-400">Salvo neste aparelho</span>
    </label>
  )
}
