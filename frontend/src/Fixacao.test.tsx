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

  it('bloqueia o tutor quando tutorIa=false e oferece o CTA do Plus', async () => {
    const user = userEvent.setup()
    const onConhecerPlus = vi.fn()
    mockFetch((url) => {
      if (url === '/api/topicos?concurso=PM-AM') return jsonResponse(topicos)
      throw new Error(`rota não mockada: ${url}`)
    })

    render(<Fixacao concurso="PM-AM" tutorIa={false} onConhecerPlus={onConhecerPlus} />)

    expect(await screen.findByText('Tutor de IA exclusivo do Plus')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar pergunta' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Disponível no Plus')).toBeDisabled()
    expect(screen.queryByPlaceholderText('sk-...')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conheça o Plus' }))
    expect(onConhecerPlus).toHaveBeenCalledTimes(1)
  })
})
