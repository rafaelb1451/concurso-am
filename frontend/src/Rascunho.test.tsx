import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import Rascunho from './Rascunho'

afterEach(() => localStorage.clear())

describe('Rascunho', () => {
  it('salva e restaura a resolução pelo identificador da questão', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Rascunho questaoId={42} />)

    await user.type(screen.getByPlaceholderText(/Escreva aqui/), 'Meu raciocínio')
    expect(localStorage.getItem('qb_rascunho:42')).toBe('Meu raciocínio')

    unmount()
    render(<Rascunho questaoId={42} />)
    expect(screen.getByDisplayValue('Meu raciocínio')).toBeInTheDocument()
  })
})
