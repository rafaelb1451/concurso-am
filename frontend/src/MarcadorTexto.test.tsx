import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import MarcadorTexto from './MarcadorTexto'

afterEach(() => localStorage.clear())

describe('MarcadorTexto', () => {
  it('restaura as marcações salvas para a questão', () => {
    localStorage.setItem('qb_marcacao:7', JSON.stringify([{ inicio: 0, fim: 5 }]))

    const { container } = render(<MarcadorTexto texto="Texto do enunciado" questaoId={7} ativo={false} />)

    const marcado = container.querySelector('mark')
    expect(marcado).not.toBeNull()
    expect(marcado?.textContent).toBe('Texto')
  })

  it('limpa as marcações ao clicar em Limpar', async () => {
    const user = userEvent.setup()
    localStorage.setItem('qb_marcacao:7', JSON.stringify([{ inicio: 0, fim: 5 }]))

    render(<MarcadorTexto texto="Texto do enunciado" questaoId={7} ativo={false} />)
    await user.click(screen.getByRole('button', { name: /Limpar marcações/ }))

    expect(localStorage.getItem('qb_marcacao:7')).toBe('[]')
    expect(screen.queryByRole('button', { name: /Limpar marcações/ })).not.toBeInTheDocument()
  })
})
