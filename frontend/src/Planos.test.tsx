import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Planos from './Planos'
import type { AssinaturaAtual, Plano } from './api'
import { concursos, jsonResponse, mockFetch } from './test/fixtures'

const planoFree: Plano = {
  id: 1,
  codigo: 'FREE',
  nome: 'Gratuito',
  valorCentavos: 0,
  ciclo: null,
  limiteDiarioQuestoes: 20,
  ilimitado: false,
  pago: false,
  certamesMaximos: 0,
  tutorIa: false,
  cotaTutorDiaria: 0,
}

const planoBasico: Plano = {
  id: 2,
  codigo: 'BASICO',
  nome: 'Básico',
  valorCentavos: 2990,
  ciclo: 'MENSAL',
  limiteDiarioQuestoes: -1,
  ilimitado: true,
  pago: true,
  certamesMaximos: 1,
  tutorIa: false,
  cotaTutorDiaria: 0,
}

const planoPlus: Plano = {
  id: 3,
  codigo: 'PLUS',
  nome: 'Plus',
  valorCentavos: 4990,
  ciclo: 'MENSAL',
  limiteDiarioQuestoes: -1,
  ilimitado: true,
  pago: true,
  certamesMaximos: 3,
  tutorIa: true,
  cotaTutorDiaria: 20,
}

const assinaturaFree: AssinaturaAtual = {
  status: 'SEM_ASSINATURA',
  plano: planoFree,
  periodoFim: null,
  cancelaNoFim: false,
  carenciaFim: null,
  liberaPro: false,
  pagamentoConfigurado: true,
  certames: [],
  tutorIa: false,
  tutorUso: { usado: 0, cota: 0 },
  podeTrocarCertame: false,
}

const usoFree = {
  plano: planoFree,
  limiteDiarioQuestoes: 20,
  ilimitado: false,
  respondidasHoje: 3,
}

function rotear(onCheckout?: (init?: RequestInit) => void) {
  return mockFetch((url, init) => {
    if (url === '/api/planos') return jsonResponse([planoFree, planoBasico, planoPlus])
    if (url === '/api/assinatura') return jsonResponse(assinaturaFree)
    if (url === '/api/assinatura/uso') return jsonResponse(usoFree)
    if (url === '/api/concursos?catalogo=true') return jsonResponse(concursos)
    if (url === '/api/assinatura/checkout') {
      onCheckout?.(init)
      return jsonResponse({ url: 'https://mp.exemplo/checkout' })
    }
    throw new Error(`rota não mockada: ${url}`)
  })
}

beforeEach(() => {
  localStorage.setItem('qb_token', 'token-teste')
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Planos — Básico × Plus', () => {
  it('limita o Básico a exatamente 1 certame e mostra a prévia', async () => {
    const user = userEvent.setup()
    rotear()
    render(<Planos />)

    expect(await screen.findByRole('heading', { name: 'Básico × Plus' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Escolher Básico' }))

    const pm = await screen.findByRole('checkbox', { name: /PM-AM/ })
    const pc = screen.getByRole('checkbox', { name: /PC-AM/ })
    const crea = screen.getByRole('checkbox', { name: /CREA-AM/ })

    expect(screen.getByRole('button', { name: 'Assinar' })).toBeDisabled()

    await user.click(pm)

    expect(pm).toBeChecked()
    expect(pc).toBeDisabled()
    expect(crea).toBeDisabled()
    expect(screen.getByText('1 de 1 selecionado')).toBeInTheDocument()

    const previa = screen.getByRole('list', { name: 'Certames selecionados' })
    expect(within(previa).getByText(/PM-AM/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assinar' })).toBeEnabled()
  })

  it('envia plano e certames no checkout do Plus', async () => {
    const user = userEvent.setup()
    const fetchMock = rotear()
    const onCheckoutUrl = vi.fn()
    render(<Planos onCheckoutUrl={onCheckoutUrl} />)

    await screen.findByRole('heading', { name: 'Básico × Plus' })
    await user.click(screen.getByRole('button', { name: 'Escolher Plus' }))

    await user.click(await screen.findByRole('checkbox', { name: /PM-AM/ }))
    await user.click(screen.getByRole('checkbox', { name: /PC-AM/ }))

    expect(screen.getByText('2 de 3 selecionados')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /CREA-AM/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Assinar' }))

    await waitFor(() => expect(onCheckoutUrl).toHaveBeenCalledWith('https://mp.exemplo/checkout'))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/assinatura/checkout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ plano: 'PLUS', certames: ['PM-AM', 'PC-AM'], metodo: 'CARTAO', cpfCnpj: '', telefone: '', cep: '', endereco: '', numero: '', bairro: '' }),
      }),
    )
  })

  it('permite selecionar até 3 certames no Plus', async () => {
    const user = userEvent.setup()
    rotear()
    render(<Planos />)

    await screen.findByRole('heading', { name: 'Básico × Plus' })
    await user.click(screen.getByRole('button', { name: 'Escolher Plus' }))

    await user.click(await screen.findByRole('checkbox', { name: /PM-AM/ }))
    await user.click(screen.getByRole('checkbox', { name: /PC-AM/ }))
    await user.click(screen.getByRole('checkbox', { name: /CREA-AM/ }))

    expect(screen.getByText('3 de 3 selecionados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assinar' })).toBeEnabled()
  })
})
