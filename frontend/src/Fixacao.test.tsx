import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Fixacao from './Fixacao'
import { jsonResponse, mockFetch, topicos } from './test/fixtures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Fixacao', () => {
  it('pede a chave quando o servidor não tem uma e salva pela API', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch((url, init) => {
      if (url === '/api/topicos?concurso=PM-AM') return jsonResponse(topicos)
      if (url === '/api/config/deepseek') {
        return jsonResponse({
          configurado: init?.method === 'POST',
          modelo: 'deepseek-chat',
        })
      }
      throw new Error(`rota não mockada: ${url}`)
    })

    render(<Fixacao concurso="PM-AM" />)

    const campo = await screen.findByPlaceholderText('sk-...')
    await user.type(campo, 'sk-teste')
    await user.click(screen.getByRole('button', { name: 'Salvar chave' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/config/deepseek',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ apiKey: 'sk-teste' }),
      }),
    )
    expect(await screen.findByText(/Comece uma fixação/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('sk-...')).not.toBeInTheDocument()
  })
})
