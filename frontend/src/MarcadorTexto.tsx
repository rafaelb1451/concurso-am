import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Marcacao {
  inicio: number
  fim: number
}

/**
 * Texto do enunciado com marcação a caneta (marcador de texto). O usuário ativa o modo
 * de marcação, seleciona um trecho e ele fica destacado. As marcações ficam salvas por
 * questão neste aparelho.
 */
export default function MarcadorTexto({
  texto,
  questaoId,
  ativo,
}: {
  texto: string
  questaoId: number
  ativo: boolean
}) {
  const chave = `qb_marcacao:${questaoId}`
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>(() => lerMarcacoes(chave))
  const ref = useRef<HTMLParagraphElement>(null)

  // A mesma instância é reutilizada ao avançar de questão: recarrega as marcações da nova.
  useEffect(() => {
    setMarcacoes(lerMarcacoes(chave))
  }, [chave])

  function aoSoltar() {
    if (!ativo) return
    const selecao = window.getSelection()
    if (!selecao || selecao.isCollapsed) return
    const range = selecao.getRangeAt(0)
    const container = ref.current
    if (!container || !container.contains(range.startContainer)) return

    const prefixo = range.cloneRange()
    prefixo.selectNodeContents(container)
    prefixo.setEnd(range.startContainer, range.startOffset)
    const inicio = prefixo.toString().length
    const fim = inicio + range.toString().length
    if (fim <= inicio) return

    setMarcacoes((prev) => {
      const proximo = [...prev, { inicio, fim }]
      localStorage.setItem(chave, JSON.stringify(proximo))
      return proximo
    })
    selecao.removeAllRanges()
  }

  function limpar() {
    setMarcacoes([])
    localStorage.setItem(chave, '[]')
  }

  return (
    <div>
      <p
        ref={ref}
        onMouseUp={aoSoltar}
        onTouchEnd={aoSoltar}
        className={`whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-900 ${
          ativo ? 'cursor-text select-text' : ''
        }`}
      >
        {renderizar(texto, marcacoes)}
      </p>
      {marcacoes.length > 0 ? (
        <button
          onClick={limpar}
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
        >
          Limpar marcações ({marcacoes.length})
        </button>
      ) : null}
    </div>
  )
}

function lerMarcacoes(chave: string): Marcacao[] {
  try {
    const salvo: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]')
    if (!Array.isArray(salvo)) return []
    return salvo.filter(
      (item): item is Marcacao =>
        typeof item === 'object' &&
        item !== null &&
        Number.isInteger((item as Marcacao).inicio) &&
        Number.isInteger((item as Marcacao).fim) &&
        (item as Marcacao).fim > (item as Marcacao).inicio,
    )
  } catch {
    return []
  }
}

function renderizar(texto: string, marcacoes: Marcacao[]): ReactNode[] {
  const validas = marcacoes
    .filter((m) => m.fim > m.inicio)
    .sort((a, b) => a.inicio - b.inicio)

  const mescladas: Marcacao[] = []
  for (const m of validas) {
    const ultima = mescladas[mescladas.length - 1]
    if (ultima && m.inicio <= ultima.fim) {
      ultima.fim = Math.max(ultima.fim, m.fim)
    } else {
      mescladas.push({ inicio: m.inicio, fim: m.fim })
    }
  }

  const partes: ReactNode[] = []
  let cursor = 0
  mescladas.forEach((m, idx) => {
    if (m.inicio > cursor) partes.push(texto.slice(cursor, m.inicio))
    partes.push(
      <mark key={idx} className="rounded-sm bg-accent-200 px-0.5 text-ink-900">
        {texto.slice(m.inicio, m.fim)}
      </mark>,
    )
    cursor = m.fim
  })
  if (cursor < texto.length) partes.push(texto.slice(cursor))
  return partes
}
