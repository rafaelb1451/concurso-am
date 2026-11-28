import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Certames from './Certames'
import type { MapaMental } from './api'
import { concursos, jsonResponse, material, materiais, mockFetch } from './test/fixtures'

const mapaMental: MapaMental = {
  titulo: 'Lei nº 5.194/1966',
  tema: 'Exercício profissional de engenharia',
  ramos: [
    {
      titulo: 'Registro no CREA',
      itens: ['Registro prévio para exercer a profissão', 'Validade em todo o território nacional'],
    },
    {
      titulo: 'Fiscalização',
      itens: ['Competência do CONFEA e dos CREAs'],
    },
    {
      titulo: 'Infrações',
      itens: ['Sanções por exercício irregular'],
    },
  ],
}

const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' })

type Resposta = {
  ok?: boolean
  status?: number
  contentType?: string
  body?: Blob | Promise<Blob>
  erro?: unknown
}

function respostaBinaria({
  ok = true,
  status = 200,
  contentType = 'application/pdf',
  body = pdf,
  erro = null,
}: Resposta = {}): Response {
  return {
    ok,
    status,
    headers: { get: () => contentType },
    blob: async () => body,
    json: async () => erro,
  } as unknown as Response
}

function rotear(extra: (url: string) => Response | null = () => null) {
  return mockFetch((url) => {
    const especial = extra(url)
    if (especial) return especial
    if (url.startsWith('/api/materiais?')) return jsonResponse(materiais)
    if (url === `/api/materiais/${material.slug}`) return jsonResponse(material)
    if (url === `/api/materiais/${material.slug}/mapa-mental`) return jsonResponse(mapaMental)
    if (url === `/api/materiais/${material.slug}/pdf`) return respostaBinaria()
    throw new Error(`rota não mockada: ${url}`)
  })
}

async function abrirLeitor(extra?: (url: string) => Response | null) {
  const user = userEvent.setup()
  const fetchMock = rotear(extra)
  render(<Certames concursos={concursos} onEstudar={vi.fn()} />)

  await user.click(await screen.findByRole('button', { name: /CREA-AM/ }))
  await user.click(await screen.findByRole('button', { name: /Lei nº 5.194\/1966/ }))
  await screen.findByRole('heading', { name: 'Lei nº 5.194/1966' })

  return { user, fetchMock }
}

let createObjectURL: ReturnType<typeof vi.fn>
let revokeObjectURL: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.setItem('qb_token', 'token-teste')
  createObjectURL = vi.fn(() => 'blob:qb-teste')
  revokeObjectURL = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectURL,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectURL,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Certames — mapa mental e PDF', () => {
  it('baixa o PDF do material com o nome do slug e revoga a URL', async () => {
    const { user, fetchMock } = await abrirLeitor()

    let baixado: { download: string; href: string } | null = null
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        baixado = { download: this.download, href: this.href }
      })

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
    expect(createObjectURL.mock.calls[0][0]).toBe(pdf)
    await waitFor(() => expect(clique).toHaveBeenCalledTimes(1))

    expect(baixado).toEqual({ download: 'lei-5194-1966.pdf', href: 'blob:qb-teste' })
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/materiais/${material.slug}/pdf`,
      expect.objectContaining({ headers: { Authorization: 'Bearer token-teste' } }),
    )
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:qb-teste'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra "Gerando…" enquanto o PDF não chega', async () => {
    let liberar!: (valor: Blob) => void
    const pendente = new Promise<Blob>((resolver) => {
      liberar = resolver
    })
    const { user } = await abrirLeitor((url) =>
      url === `/api/materiais/${material.slug}/pdf`
        ? respostaBinaria({ body: pendente })
        : null,
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText('Gerando…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeDisabled()

    liberar(pdf)
    await waitFor(() => expect(screen.queryByText('Gerando…')).not.toBeInTheDocument())
  })

  it('exibe mensagem amigável quando o PDF responde 404', async () => {
    const { user } = await abrirLeitor((url) =>
      url === `/api/materiais/${material.slug}/pdf`
        ? respostaBinaria({
            ok: false,
            status: 404,
            contentType: 'application/json',
            erro: { message: 'ainda não gerado' },
          })
        : null,
    )

    await user.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(
      await screen.findByText(
        'O PDF deste material ainda não está disponível. Tente novamente mais tarde.',
      ),
    ).toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('abre o mapa mental em um diálogo e lista tema e ramos', async () => {
    const { user } = await abrirLeitor()

    await user.click(screen.getByRole('button', { name: 'Mapa mental' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Mapa mental' })
    expect(within(dialogo).getByText('Tema central')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Exercício profissional de engenharia'),
    ).toBeInTheDocument()
    expect(
      within(dialogo).getAllByText('Lei nº 5.194/1966').length,
    ).toBeGreaterThan(0)

    const ramos = within(dialogo).getByRole('list', { name: 'Ramos do mapa mental' })
    expect(within(ramos).getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(within(ramos).getByText('Registro no CREA')).toBeInTheDocument()
    expect(within(ramos).getByText('Fiscalização')).toBeInTheDocument()
    expect(within(ramos).getByText('Infrações')).toBeInTheDocument()
    expect(
      within(ramos).getByText('Registro prévio para exercer a profissão'),
    ).toBeInTheDocument()
    expect(within(ramos).getByText('Competência do CONFEA e dos CREAs')).toBeInTheDocument()
  })

  it('mostra o erro do mapa mental com opção de tentar de novo', async () => {
    const { user } = await abrirLeitor((url) =>
      url === `/api/materiais/${material.slug}/mapa-mental`
        ? jsonResponse({ message: 'mapa não encontrado' }, false, 404)
        : null,
    )

    await user.click(screen.getByRole('button', { name: 'Mapa mental' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Mapa mental' })
    expect(
      await within(dialogo).findByText('Este material ainda não tem mapa mental publicado.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('fecha o mapa mental com Escape e devolve o foco ao botão', async () => {
    const { user } = await abrirLeitor()

    const abrir = screen.getByRole('button', { name: 'Mapa mental' })
    await user.click(abrir)
    const dialogo = await screen.findByRole('dialog', { name: 'Mapa mental' })
    expect(dialogo).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(abrir).toHaveFocus())
  })

  it('exibe estado vazio quando o mapa não tem ramos', async () => {
    const { user } = await abrirLeitor((url) =>
      url === `/api/materiais/${material.slug}/mapa-mental`
        ? jsonResponse({ ...mapaMental, ramos: [] })
        : null,
    )

    await user.click(screen.getByRole('button', { name: 'Mapa mental' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Mapa mental' })
    expect(
      await within(dialogo).findByText('Os ramos deste mapa mental ainda não foram publicados.'),
    ).toBeInTheDocument()
  })
})
