import type { AssinaturaAtual, Plano } from './api'

/* =========================================================================
   Regras de plano compartilhadas entre Planos, Conta, header e bloqueios.
   O backend é a fonte da verdade; aqui só derivamos defaults para a UI não
   quebrar enquanto os campos novos de escopo por certame não chegam.
   ========================================================================= */

const CODIGOS_BASICO = ['BASICO', 'PRO_MENSAL']
const CODIGOS_PLUS = ['PLUS', 'PRO_ANUAL']

export function ehPlanoBasico(codigo: string | null | undefined): boolean {
  return Boolean(codigo && CODIGOS_BASICO.includes(codigo))
}

export function ehPlanoPlus(codigo: string | null | undefined): boolean {
  return Boolean(codigo && CODIGOS_PLUS.includes(codigo))
}

export function ehPlanoPago(codigo: string | null | undefined): boolean {
  return Boolean(codigo && codigo !== 'FREE')
}

/** Nome exibido: respeita o nome do backend e cai no rótulo do código. */
export function nomeDoPlano(plano: Plano | null | undefined): string {
  if (!plano) return 'Gratuito'
  const nome = plano.nome?.trim()
  if (nome) return nome
  switch (plano.codigo) {
    case 'FREE':
      return 'Gratuito'
    case 'BASICO':
    case 'PRO_MENSAL':
      return 'Básico'
    case 'PLUS':
    case 'PRO_ANUAL':
      return 'Plus'
    default:
      return plano.codigo
  }
}

/** Limite de certames do plano; `tipo` ajuda quando o backend ainda não manda o campo. */
export function certamesMaximosDoPlano(
  plano: Plano | null | undefined,
  tipo?: 'BASICO' | 'PLUS',
): number {
  if (plano && typeof plano.certamesMaximos === 'number' && plano.certamesMaximos >= 0) {
    return plano.certamesMaximos
  }
  if (ehPlanoBasico(plano?.codigo)) return 1
  if (ehPlanoPlus(plano?.codigo)) return 3
  if (tipo === 'BASICO') return 1
  if (tipo === 'PLUS') return 3
  return 0
}

export function tutorIaDoPlano(plano: Plano | null | undefined): boolean {
  if (plano && typeof plano.tutorIa === 'boolean') return plano.tutorIa
  return ehPlanoPlus(plano?.codigo)
}

/**
 * Limite efetivo da UI. O backend continua validando: aqui aplicamos também a
 * regra de produto (Básico = 1, Plus = até 3) para o caso de catálogo legado.
 */
export function limiteCertamesDoPlano(plano: Plano | null | undefined): number {
  if (ehPlanoBasico(plano?.codigo)) return 1
  if (ehPlanoPlus(plano?.codigo)) {
    const doBackend = certamesMaximosDoPlano(plano)
    return Math.max(1, Math.min(3, doBackend))
  }
  return certamesMaximosDoPlano(plano)
}

/** `assinatura.tutorIa` é a decisão final; ausente = deriva do plano (legado). */
export function tutorIaDaAssinatura(assinatura: AssinaturaAtual | null | undefined): boolean {
  if (!assinatura) return false
  if (typeof assinatura.tutorIa === 'boolean') return assinatura.tutorIa
  return tutorIaDoPlano(assinatura.plano)
}

/** Vazio = sem escopo (FREE), preservando o comportamento anterior. */
export function certamesDaAssinatura(
  assinatura: AssinaturaAtual | null | undefined,
): string[] {
  return Array.isArray(assinatura?.certames) ? assinatura.certames : []
}

export function planoAtualEhPago(assinatura: AssinaturaAtual | null | undefined): boolean {
  return ehPlanoPago(assinatura?.plano?.codigo)
}

export function rotuloCertames(total: number): string {
  return `${total} ${total === 1 ? 'certame' : 'certames'}`
}

export function rotuloCertamesAtivos(total: number): string {
  return total === 0 ? 'sem certame' : `${rotuloCertames(total)} ${total === 1 ? 'ativo' : 'ativos'}`
}

export function rotuloQuestoes(total: number): string {
  return `${total} ${total === 1 ? 'questão' : 'questões'}`
}

/** Normaliza a lista para a busca (sigla + código), sem depender de locale. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
