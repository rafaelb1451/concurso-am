import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ContaSeguranca from './ContaSeguranca'
import type { AssinaturaAtual, Usuario } from './api'
import { concursos, jsonResponse, mockFetch } from './test/fixtures'

const usuario: Usuario = {
  id: 1,
  nome: 'Aluno Teste',
  email: 'teste@qb.local',
  admin: false,
  emailVerificado: true,
  temSenha: true,
}

const planoBasico = {
  codigo: 'BASICO',
  nome: 'Básico',
  valorCentavos: 2990,
  ciclo: 'MENSAL',
  limiteDiarioQuestoes: -1,
  certamesMaximos: 1,
  tutorIa: false,
}

const assinatura: AssinaturaAtual = {
  status: 'ATIVA',
  plano: planoBasico,
  periodoFim: null,
  certames: ['PM-AM'],
  tutorIa: false,
  tutorUso: { usado: 0, cota: 0 },
  podeTrocarCertame: true,
}

const atualizada: AssinaturaAtual = {
  ...assinatura,
  certames: ['CREA-AM'],
  podeTrocarCertame: false,
}

beforeEach(() => {
  localStorage.setItem('qb_token', 'token-teste')
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('ContaSeguranca — troca de certames', () => {
  it('troca os certames uma vez e atualiza o resumo', async () => {
    const user = userEvent.setup()
    const onAssinaturaAtualizada = vi.fn()
    const fetchMock = mockFetch((url) => {
      if (url === '/api/concursos?catalogo=true') return jsonResponse(concursos)
      if (url === '/api/assinatura/certames') return jsonResponse({ ok: true })
      if (url === '/api/assinatura') return jsonResponse(atualizada)
      throw new Error(`rota não mockada: ${url}`)
    })

    render(
      <ContaSeguranca
        usuario={usuario}
        onSair={vi.fn()}
        assinatura={assinatura}
        onAssinaturaAtualizada={onAssinaturaAtualizada}
      />,
    )

    expect(screen.getByText('1 certame ativo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trocar certames' }))

    const pm = await screen.findByRole('checkbox', { name: /PM-AM/ })
    expect(pm).toBeChecked()

    await user.click(pm)
    await user.click(screen.getByRole('checkbox', { name: /CREA-AM/ }))
    expect(screen.getByText('1 de 1 selecionado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar troca' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/assinatura/certames',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ certames: ['CREA-AM'] }),
        }),
      ),
    )
    expect(
      await screen.findByText(
        'Certames atualizados. A troca deste ciclo foi registrada na auditoria.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => expect(onAssinaturaAtualizada).toHaveBeenCalledWith(atualizada))
    expect(screen.getAllByText('CREA-AM').length).toBeGreaterThan(0)
  })

  it('explica quando a troca do ciclo já foi usada', () => {
    render(
      <ContaSeguranca
        usuario={usuario}
        onSair={vi.fn()}
        assinatura={{ ...assinatura, podeTrocarCertame: false }}
      />,
    )

    expect(
      screen.getByText(/A troca de certames deste ciclo já foi utilizada/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trocar certames' })).not.toBeInTheDocument()
  })
})
