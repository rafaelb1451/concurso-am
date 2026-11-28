import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PlanoBadge from './PlanoBadge'
import type { AssinaturaAtual } from './api'

const plus: AssinaturaAtual = {
  status: 'ATIVA',
  plano: {
    codigo: 'PLUS',
    nome: 'Plus',
    valorCentavos: 4990,
    ciclo: 'MENSAL',
    limiteDiarioQuestoes: -1,
    certamesMaximos: 3,
    tutorIa: true,
  },
  periodoFim: null,
  certames: ['PM-AM', 'PC-AM'],
  tutorIa: true,
  tutorUso: { usado: 2, cota: 20 },
  podeTrocarCertame: true,
}

describe('PlanoBadge', () => {
  it('renderiza o nome do plano e a quantidade de certames ativos', () => {
    render(<PlanoBadge assinatura={plus} />)

    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('2 certames ativos')).toBeInTheDocument()
    expect(screen.getByLabelText('Plano Plus: 2 certames ativos')).toBeInTheDocument()
  })

  it('mostra o plano gratuito sem certames', () => {
    render(
      <PlanoBadge
        assinatura={{
          status: 'SEM_ASSINATURA',
          plano: {
            codigo: 'FREE',
            nome: 'Gratuito',
            valorCentavos: 0,
            ciclo: null,
            limiteDiarioQuestoes: 20,
          },
          periodoFim: null,
          certames: [],
          tutorIa: false,
        }}
      />,
    )

    expect(screen.getByText('Gratuito')).toBeInTheDocument()
    expect(screen.getByText('sem certame')).toBeInTheDocument()
  })
})
