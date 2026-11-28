import {
  ChevronRight,
  CreditCard,
  Dumbbell,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Timer,
  TrendingUp,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import Logo from './Logo'
import PlanoBadge from './PlanoBadge'
import Sheet from './Sheet'
import type { AssinaturaAtual, Desempenho, Usuario } from './api'

export type Aba =
  | 'treino'
  | 'fixacao'
  | 'simulado'
  | 'evolucao'
  | 'certames'
  | 'planos'
  | 'conta'
  | 'admin'

export interface AbaInfo {
  id: Aba
  rotulo: string
  rotuloCurto: string
  descricao: string
  Icon: LucideIcon
  primaria: boolean
}

export const ABAS: AbaInfo[] = [
  {
    id: 'treino',
    rotulo: 'Questões',
    rotuloCurto: 'Questões',
    descricao: 'Monte uma sessão por banca, certame, matéria e assunto.',
    Icon: ListChecks,
    primaria: true,
  },
  {
    id: 'fixacao',
    rotulo: 'Fixação',
    rotuloCurto: 'Fixação',
    descricao: 'Treino focado na matéria com o tutor de IA ao lado.',
    Icon: Dumbbell,
    primaria: true,
  },
  {
    id: 'simulado',
    rotulo: 'Simulado',
    rotuloCurto: 'Simulado',
    descricao: 'Prova cronometrada no formato do caderno da banca.',
    Icon: Timer,
    primaria: true,
  },
  {
    id: 'evolucao',
    rotulo: 'Evolução',
    rotuloCurto: 'Evolução',
    descricao: 'Seu aproveitamento e tempo estudado ao longo do tempo.',
    Icon: TrendingUp,
    primaria: true,
  },
  {
    id: 'certames',
    rotulo: 'Certames',
    rotuloCurto: 'Certames',
    descricao: 'Material do edital e questões por concurso-alvo.',
    Icon: Trophy,
    primaria: false,
  },
  {
    id: 'planos',
    rotulo: 'Planos',
    rotuloCurto: 'Planos',
    descricao: 'Assinatura, limites do plano e liberação do PRO.',
    Icon: CreditCard,
    primaria: false,
  },
  {
    id: 'conta',
    rotulo: 'Conta',
    rotuloCurto: 'Conta',
    descricao: 'E-mail, privacidade, exportação de dados e exclusão.',
    Icon: UserRound,
    primaria: false,
  },
  {
    id: 'admin',
    rotulo: 'Admin',
    rotuloCurto: 'Admin',
    descricao: 'Conceder e revogar acesso PRO com auditoria.',
    Icon: ShieldCheck,
    primaria: false,
  },
]

const PRIMARIAS = ABAS.filter((aba) => aba.primaria)

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'QB'
  const primeira = partes[0][0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? '') : ''
  return `${primeira}${ultima}`.toUpperCase()
}

export function AppHeader({
  usuario,
  desempenho,
  assinatura = null,
  aba,
  onAba,
  onSair,
}: {
  usuario: Usuario
  desempenho: Desempenho | null
  assinatura?: AssinaturaAtual | null
  aba: Aba
  onAba: (aba: Aba) => void
  onSair: () => void
}) {
  const abas = ABAS.filter((item) => item.id !== 'admin' || usuario.admin)

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/90 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => onAba('treino')}
          aria-label="QB Concurso — ir para Questões"
          className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl pr-1 text-left transition hover:opacity-90"
        >
          <Logo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold leading-tight tracking-tight text-ink-900 sm:text-[17px]">
              QB Concurso
            </span>
            <span className="hidden truncate text-[11px] font-medium text-ink-500 sm:block">
              Quebrando a Banca · estudo por banca e certame
            </span>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          {desempenho ? (
            <div className="hidden items-center gap-5 lg:flex" aria-label="Seu desempenho">
              <Metrica valor={String(desempenho.respondidas)} rotulo="respondidas" />
              <Metrica valor={String(desempenho.acertos)} rotulo="acertos" />
              <Metrica valor={`${desempenho.percentual}%`} rotulo="aproveitamento" destaque />
            </div>
          ) : null}

          {desempenho ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800 ring-1 ring-inset ring-brand-100 lg:hidden"
              aria-label={`Aproveitamento ${desempenho.percentual}%`}
            >
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              {desempenho.percentual}%
            </span>
          ) : null}

          <PlanoBadge assinatura={assinatura} className="hidden sm:inline-flex" />

          <div className="hidden text-right sm:block">
            <p className="max-w-[13rem] truncate text-xs font-bold text-ink-800">{usuario.nome}</p>
            <button
              type="button"
              onClick={onSair}
              className="inline-flex min-h-6 items-center text-[11px] font-semibold text-ink-500 transition hover:text-brand-700"
            >
              Sair
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAba('conta')}
            aria-label={`Conta de ${usuario.nome}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[12px] font-bold text-white transition hover:bg-brand-800"
          >
            {iniciais(usuario.nome)}
          </button>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-6xl px-4 sm:px-6 md:block">
        <nav aria-label="Seções do app" className="qb-tab-scroll -mb-px flex overflow-x-auto">
          {abas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAba(item.id)}
              aria-current={aba === item.id ? 'page' : undefined}
              className="qb-nav-tab"
            >
              <item.Icon className="hidden h-4 w-4 lg:block" aria-hidden="true" />
              {item.rotulo}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}

export function MobileTabBar({
  aba,
  onAba,
  onMais,
  maisAberto,
}: {
  aba: Aba
  onAba: (aba: Aba) => void
  onMais: () => void
  maisAberto: boolean
}) {
  const maisAtivo = !PRIMARIAS.some((item) => item.id === aba)

  return (
    <nav aria-label="Navegação principal" className="qb-bottom-nav md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {PRIMARIAS.map((item) => {
          const ativo = aba === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onAba(item.id)}
                aria-current={ativo ? 'page' : undefined}
                className={`relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 pb-1 pt-1.5 text-[10.5px] font-semibold transition-colors ${
                  ativo ? 'text-brand-800' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                {ativo ? (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-700"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                    ativo ? 'bg-brand-50' : ''
                  }`}
                >
                  <item.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="truncate">{item.rotuloCurto}</span>
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={onMais}
            aria-expanded={maisAberto}
            aria-controls="menu-mais"
            aria-haspopup="dialog"
            aria-current={maisAtivo ? 'page' : undefined}
            className={`relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 pb-1 pt-1.5 text-[10.5px] font-semibold transition-colors ${
              maisAtivo ? 'text-brand-800' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {maisAtivo ? (
              <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-700" aria-hidden="true" />
            ) : null}
            <span
              className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${
                maisAtivo ? 'bg-brand-50' : ''
              }`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

export function MaisSheet({
  aberto,
  onClose,
  usuario,
  assinatura = null,
  aba,
  onAba,
  onSair,
}: {
  aberto: boolean
  onClose: () => void
  usuario: Usuario
  assinatura?: AssinaturaAtual | null
  aba: Aba
  onAba: (aba: Aba) => void
  onSair: () => void
}) {
  const abas = ABAS.filter((item) => item.id !== 'admin' || usuario.admin)

  return (
    <Sheet
      open={aberto}
      onClose={onClose}
      title="Mais seções"
      description="Acesso rápido a toda a plataforma."
      icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
      side="bottom"
      overlayLabel="Fechar menu de seções"
      panelId="menu-mais"
      footer={
        <button
          type="button"
          onClick={() => {
            onClose()
            onSair()
          }}
          className="qb-btn-ghost w-full text-err-700 hover:bg-err-50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </button>
      }
    >
      <div className="border-b border-ink-100 px-4 py-3">
        <p className="text-sm font-bold text-ink-900">{usuario.nome}</p>
        <p className="break-all text-xs text-ink-500">{usuario.email}</p>
        <PlanoBadge assinatura={assinatura} className="mt-2" />
      </div>

      <ul className="space-y-1 p-3">
        {abas.map((item) => {
          const ativo = aba === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAba(item.id)
                }}
                aria-current={ativo ? 'page' : undefined}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  ativo ? 'bg-brand-50 text-brand-900' : 'text-ink-800 hover:bg-ink-50'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    ativo ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-600'
                  }`}
                >
                  <item.Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.rotulo}
                    {ativo ? <span className="qb-chip bg-brand-700 text-white">atual</span> : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-500">{item.descricao}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

function Metrica({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className="text-right">
      <p
        className={
          destaque
            ? 'text-[15px] font-bold leading-none text-accent-700'
            : 'text-[15px] font-bold leading-none text-ink-900'
        }
      >
        {valor}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-500">{rotulo}</p>
    </div>
  )
}
