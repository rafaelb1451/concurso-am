import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Rascunho from './Rascunho'

afterEach(() => localStorage.clear())

describe('Rascunho', () => {
  it('abre, salva, fecha, reabre e mantém o texto por questão', async () => {
    const user = userEvent.setup()
    const semFechar = () => {}
    const { rerender } = render(<Rascunho questaoId={42} open onClose={semFechar} />)

    await user.type(screen.getByPlaceholderText(/Escreva seu raciocínio/), 'Meu raciocínio')
    expect(localStorage.getItem('qb_rascunho:42')).toBe('Meu raciocínio')

    rerender(<Rascunho questaoId={42} open={false} onClose={semFechar} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<Rascunho questaoId={42} open onClose={semFechar} />)
    expect(screen.getByDisplayValue('Meu raciocínio')).toBeInTheDocument()

    // outra questão não herda o rascunho
    rerender(<Rascunho questaoId={43} open onClose={semFechar} />)
    expect(screen.queryByDisplayValue('Meu raciocínio')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Escreva seu raciocínio/)).toHaveValue('')

    // voltar restaura o texto da questão original
    rerender(<Rascunho questaoId={42} open onClose={semFechar} />)
    expect(screen.getByDisplayValue('Meu raciocínio')).toBeInTheDocument()
  })

  it('fecha com ESC e pelos botões de fechar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Rascunho questaoId={7} open onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Fechar rascunho' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(3)

    await user.click(screen.getByRole('button', { name: 'Concluir rascunho' }))
    expect(onClose).toHaveBeenCalledTimes(4)
  })
})
