import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Download,
  FileText,
  LibraryBig,
  LoaderCircle,
  Network,
  Trophy,
} from 'lucide-react'
import {
  api,
  ApiError,
  type Concurso,
  type MapaMental,
  type Material,
  type MaterialResumo,
} from './api'
import Sheet from './Sheet'
import { Card, EmptyState, ErrorBanner, LoadingState, PageHeader } from './ui'

const CATEGORIA: Record<string, string> = {
  LEI: 'Lei',
  REGIMENTO: 'Regimento',
  RESOLUCAO: 'Resolução',
  EDITAL: 'Edital',
  OUTRO: 'Outro',
}

const CATEGORIA_COR: Record<string, string> = {
  LEI: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  REGIMENTO: 'bg-accent-50 text-accent-800 ring-1 ring-inset ring-accent-200',
  RESOLUCAO: 'bg-ink-100 text-ink-700',
  EDITAL: 'bg-ok-50 text-ok-700 ring-1 ring-inset ring-ok-200',
  OUTRO: 'bg-ink-100 text-ink-600',
}

function rotuloCategoria(categoria: string): string {
  return CATEGORIA[categoria] ?? categoria
}

function corCategoria(categoria: string): string {
  return CATEGORIA_COR[categoria] ?? CATEGORIA_COR.OUTRO
}

function paragrafosDe(conteudo: string): string[] {
  return conteudo
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((paragrafo) => paragrafo.trim())
    .filter((paragrafo) => paragrafo.length > 0)
}

/**
 * Conteúdo do mapa mental em texto puro: um cartão central para o tema e uma
 * lista hierárquica de ramos conectada por linhas (sem imagens externas).
 */
function MapaMentalConteudo({ mapa }: { mapa: MapaMental }) {
  return (
    <div>
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-b from-brand-50 to-surface p-4">
        <p className="qb-eyebrow">Tema central</p>
        <p className="mt-1 break-words text-[15px] font-bold leading-snug text-ink-900">
          {mapa.tema}
        </p>
        <p className="mt-1 break-words text-[11px] font-medium text-ink-500">{mapa.titulo}</p>
      </div>

      {mapa.ramos.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-ink-300 bg-surface px-4 py-6 text-center text-sm text-ink-500">
          Os ramos deste mapa mental ainda não foram publicados.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className="ml-5 h-5 w-px bg-brand-300 sm:ml-6" />
          <ol
            aria-label="Ramos do mapa mental"
            className="space-y-3 border-l border-brand-300 pl-4 sm:pl-6"
          >
            {mapa.ramos.map((ramo, indice) => (
              <li key={`${indice}-${ramo.titulo}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-4 top-6 h-px w-4 bg-brand-300 sm:-left-6 sm:w-6"
                />
                <section className="rounded-xl border border-ink-200 bg-surface p-3.5 shadow-sm sm:p-4">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white"
                    >
                      {indice + 1}
                    </span>
                    <h3 className="min-w-0 break-words text-sm font-bold leading-snug text-ink-900">
                      {ramo.titulo}
                    </h3>
                  </div>
                  {ramo.itens.length ? (
                    <ul className="mt-2.5 space-y-1.5 pl-1">
                      {ramo.itens.map((item, itemIndice) => (
                        <li
                          key={itemIndice}
                          className="flex gap-2 text-[13px] leading-relaxed text-ink-700"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400"
                          />
                          <span className="min-w-0 break-words">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 pl-1 text-xs text-ink-500">Sem detalhes neste ramo.</p>
                  )}
                </section>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

/**
 * Certames: visão por concurso-alvo.
 * Os cards mostram o volume de questões e de materiais; ao abrir, o aluno lê o
 * material (texto puro, sem HTML) ou parte direto para as questões do certame.
 */
export default function Certames({
  concursos,
  carregandoConcursos = false,
  concursosIndisponiveis = false,
  onEstudar,
  onSimular,
}: {
  concursos: Concurso[]
  carregandoConcursos?: boolean
  concursosIndisponiveis?: boolean
  onEstudar: (concurso: string, extra?: { materia?: string; assunto?: string }) => void
  onSimular?: (concurso: string) => void
}) {
  const [contagens, setContagens] = useState<Record<string, number>>({})
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [materiais, setMateriais] = useState<MaterialResumo[]>([])
  const [carregandoMateriais, setCarregandoMateriais] = useState(false)
  const [materiaisIndisponiveis, setMateriaisIndisponiveis] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [material, setMaterial] = useState<Material | null>(null)
  const [carregandoMaterial, setCarregandoMaterial] = useState(false)
  const [materialErro, setMaterialErro] = useState<string | null>(null)

  // Recursos opcionais do leitor: mapa mental e PDF, ambos buscados sob demanda.
  const [mapaAberto, setMapaAberto] = useState(false)
  const [mapa, setMapa] = useState<MapaMental | null>(null)
  const [carregandoMapa, setCarregandoMapa] = useState(false)
  const [mapaErro, setMapaErro] = useState<string | null>(null)
  const [pdfGerando, setPdfGerando] = useState(false)
  const [pdfErro, setPdfErro] = useState<string | null>(null)
  // Descarta respostas atrasadas ao trocar de material com o mapa ainda aberto.
  const mapaPedido = useRef(0)

  const certames = useMemo(
    () => concursos.filter((concurso) => concurso.id !== 'TODOS'),
    [concursos],
  )

  // Conta os materiais de cada certame em paralelo; 404 = "ainda sem materiais".
  useEffect(() => {
    let ativo = true
    if (certames.length === 0) {
      setContagens({})
      return () => {
        ativo = false
      }
    }
    void Promise.all(
      certames.map(async (concurso) => {
        try {
          const lista = await api.materiais(concurso.id)
          return [concurso.id, lista.length] as const
        } catch {
          return [concurso.id, 0] as const
        }
      }),
    ).then((pares) => {
      if (ativo) setContagens(Object.fromEntries(pares))
    })
    return () => {
      ativo = false
    }
  }, [certames])

  async function abrirCertame(id: string) {
    setSelecionado(id)
    setMateriais([])
    setMateriaisIndisponiveis(false)
    setErro(null)
    setMaterial(null)
    setMaterialErro(null)
    setCarregandoMateriais(true)
    try {
      const lista = await api.materiais(id)
      setMateriais([...lista].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setMateriaisIndisponiveis(true)
      } else {
        setErro(e instanceof Error ? e.message : 'Não foi possível carregar os materiais.')
      }
    } finally {
      setCarregandoMateriais(false)
    }
  }

  function limparRecursosExtras() {
    mapaPedido.current += 1
    setMapaAberto(false)
    setMapa(null)
    setMapaErro(null)
    setCarregandoMapa(false)
    setPdfGerando(false)
    setPdfErro(null)
  }

  async function abrirMaterial(slug: string) {
    limparRecursosExtras()
    setCarregandoMaterial(true)
    setMaterialErro(null)
    setMaterial(null)
    try {
      setMaterial(await api.material(slug))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setMaterialErro('Este material não está disponível no momento.')
      } else {
        setMaterialErro(e instanceof Error ? e.message : 'Não foi possível abrir o material.')
      }
    } finally {
      setCarregandoMaterial(false)
    }
  }

  async function abrirMapaMental() {
    if (!material) return
    const pedido = ++mapaPedido.current
    setMapaAberto(true)
    setMapa(null)
    setMapaErro(null)
    setCarregandoMapa(true)
    try {
      const dados = await api.mapaMental(material.slug)
      if (pedido === mapaPedido.current) setMapa(dados)
    } catch (e) {
      if (pedido !== mapaPedido.current) return
      if (e instanceof ApiError && e.status === 404) {
        setMapaErro('Este material ainda não tem mapa mental publicado.')
      } else {
        setMapaErro(e instanceof Error ? e.message : 'Não foi possível montar o mapa mental.')
      }
    } finally {
      if (pedido === mapaPedido.current) setCarregandoMapa(false)
    }
  }

  async function baixarPdf() {
    if (!material || pdfGerando) return
    setPdfGerando(true)
    setPdfErro(null)
    let url: string | null = null
    try {
      const blob = await api.materialPdf(material.slug)
      url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${material.slug}.pdf`
      link.rel = 'noopener'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setPdfErro('O PDF deste material ainda não está disponível. Tente novamente mais tarde.')
      } else {
        setPdfErro(e instanceof Error ? e.message : 'Não foi possível gerar o PDF deste material.')
      }
    } finally {
      setPdfGerando(false)
      const criada = url
      if (criada) {
        // Deixa o navegador iniciar o download antes de liberar o objeto.
        window.setTimeout(() => URL.revokeObjectURL(criada), 0)
      }
    }
  }

  function voltarAosMateriais() {
    limparRecursosExtras()
    setMaterial(null)
    setMaterialErro(null)
  }

  // ----------------------------------------------------------- leitor
  if (material || carregandoMaterial || materialErro) {
    const paragrafos = material ? paragrafosDe(material.conteudo) : []
    const concursoDoMaterial = selecionado
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          type="button"
          onClick={voltarAosMateriais}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[12px] font-semibold text-ink-600 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar aos materiais
        </button>

        {carregandoMaterial ? <LoadingState label="Abrindo material…" lines={5} /> : null}

        {materialErro ? (
          <Card className="p-6 text-center sm:p-8">
            <p className="text-sm font-semibold text-ink-800">{materialErro}</p>
            <p className="mt-1 text-sm text-ink-500">
              O conteúdo pode ter sido movido. Volte à lista do certame e tente outro material.
            </p>
            <button type="button" onClick={voltarAosMateriais} className="qb-btn-ghost mt-4">
              Ver todos os materiais
            </button>
          </Card>
        ) : null}

        {material ? (
          <article className="qb-card overflow-hidden">
            <header className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-surface px-4 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`qb-chip ${corCategoria(material.categoria)}`}>
                  {rotuloCategoria(material.categoria)}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Material de estudo · {concursoDoMaterial}
                </span>
              </div>
              <h1 className="mt-3 break-words text-xl font-bold leading-tight text-ink-900 sm:text-2xl">
                {material.titulo}
              </h1>
              <p className="mt-2 break-words text-[12.5px] font-medium text-ink-600">
                Fonte oficial: <span className="text-ink-800">{material.fonte}</span>
              </p>
              {material.resumo ? (
                <p className="mt-4 rounded-xl border border-accent-200 bg-accent-50/70 px-4 py-3 text-sm leading-relaxed text-ink-700">
                  {material.resumo}
                </p>
              ) : null}
              <div
                role="group"
                aria-label="Ações do material"
                className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <button
                  type="button"
                  onClick={() =>
                    onEstudar(concursoDoMaterial ?? '', {
                      materia: material.materia ?? undefined,
                      assunto: material.assunto ?? undefined,
                    })
                  }
                  className="qb-btn w-full sm:w-auto sm:px-5"
                >
                  Ir para as questões deste material
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void abrirMapaMental()}
                  className="qb-btn-ghost w-full sm:w-auto"
                  aria-label="Mapa mental"
                  aria-haspopup="dialog"
                  aria-expanded={mapaAberto}
                  aria-controls={mapaAberto ? 'mapa-mental-panel' : undefined}
                >
                  <Network className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Mapa mental
                </button>
                <button
                  type="button"
                  onClick={() => void baixarPdf()}
                  disabled={pdfGerando}
                  aria-label="Baixar PDF"
                  aria-busy={pdfGerando}
                  className="qb-btn-ghost w-full sm:w-auto"
                >
                  {pdfGerando ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  )}
                  {pdfGerando ? 'Gerando…' : 'Baixar PDF'}
                </button>
                <span className="sr-only" role="status">
                  {pdfGerando ? 'Gerando o PDF do material…' : ''}
                </span>
              </div>
              {pdfErro ? <ErrorBanner className="mt-3">{pdfErro}</ErrorBanner> : null}
            </header>

            <div className="px-4 py-5 sm:px-7 sm:py-8">
              {paragrafos.length ? (
                <div className="space-y-4 font-serif text-[15.5px] leading-[1.8] text-ink-800">
                  {paragrafos.map((paragrafo, indice) => (
                    <p key={indice} className="whitespace-pre-line break-words">
                      {paragrafo}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  O texto deste material ainda não foi publicado. Consulte a fonte oficial indicada
                  acima.
                </p>
              )}

              <div className="mt-8 flex flex-col gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() =>
                    onEstudar(concursoDoMaterial ?? '', {
                      materia: material.materia ?? undefined,
                      assunto: material.assunto ?? undefined,
                    })
                  }
                  className="qb-btn w-full sm:w-auto sm:px-5"
                >
                  Ir para as questões deste material
                </button>
                <button type="button" onClick={voltarAosMateriais} className="qb-btn-ghost w-full sm:w-auto">
                  Voltar aos materiais
                </button>
              </div>
            </div>
          </article>
        ) : null}

        {material ? (
          <Sheet
            open={mapaAberto}
            onClose={() => setMapaAberto(false)}
            title="Mapa mental"
            description={material.titulo}
            icon={<Network className="h-5 w-5" aria-hidden="true" />}
            panelId="mapa-mental-panel"
            overlayLabel="Fechar mapa mental"
            footer={
              <button
                type="button"
                onClick={() => setMapaAberto(false)}
                className="qb-btn-ghost w-full"
              >
                Fechar mapa mental
              </button>
            }
          >
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {carregandoMapa ? (
                <LoadingState label="Montando o mapa mental…" lines={4} />
              ) : null}

              {!carregandoMapa && mapaErro ? (
                <ErrorBanner onRetry={() => void abrirMapaMental()}>{mapaErro}</ErrorBanner>
              ) : null}

              {!carregandoMapa && !mapaErro && mapa ? (
                <MapaMentalConteudo mapa={mapa} />
              ) : null}
            </div>
          </Sheet>
        ) : null}
      </div>
    )
  }

  // ----------------------------------------------------------- detalhe do certame
  if (selecionado) {
    const dados = certames.find((concurso) => concurso.id === selecionado)
    const quantidade = contagens[selecionado]
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setSelecionado(null)
            setErro(null)
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-[12px] font-semibold text-ink-600 transition hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Todos os certames
        </button>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-b from-brand-50/70 to-surface px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">Certame</p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink-900">
                  {selecionado}
                </h1>
                <p className="mt-1 text-sm text-ink-500">
                  {dados?.total ?? 0} questões no banco
                  {quantidade === undefined
                    ? ' · carregando materiais…'
                    : quantidade === 0
                      ? ' · sem materiais publicados'
                      : ` · ${quantidade} ${quantidade === 1 ? 'material' : 'materiais'} de estudo`}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button type="button" onClick={() => onEstudar(selecionado)} className="qb-btn w-full sm:w-auto">
                  Estudar este certame
                </button>
                {onSimular ? (
                  <button
                    type="button"
                    onClick={() => onSimular(selecionado)}
                    className="qb-btn-ghost w-full sm:w-auto"
                  >
                    Fazer simulado
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t border-ink-100 px-4 py-5 sm:px-6">
            <h2 className="text-sm font-bold text-ink-900">Materiais de estudo</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Leitura objetiva da legislação e das normas do edital, com a fonte oficial.
            </p>

            {erro ? <ErrorBanner className="mt-4">{erro}</ErrorBanner> : null}

            {carregandoMateriais ? <LoadingState label="Carregando materiais…" lines={3} className="mt-4" /> : null}

            {!carregandoMateriais && materiaisIndisponiveis ? (
              <EmptyState
                className="mt-4"
                icon={LibraryBig}
                title="Materiais ainda não disponíveis para este certame."
                description="Você já pode estudar as questões. Os materiais aparecem aqui assim que forem publicados."
                action={
                  <button type="button" onClick={() => onEstudar(selecionado)} className="qb-btn">
                    Estudar questões
                  </button>
                }
              />
            ) : null}

            {!carregandoMateriais && !materiaisIndisponiveis && materiais.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={FileText}
                title="Sem materiais de estudo publicados."
                description="Use as questões deste certame para treinar enquanto o material é preparado."
              />
            ) : null}

            {!carregandoMateriais && materiais.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {materiais.map((item) => (
                  <li key={item.slug}>
                    <button
                      type="button"
                      onClick={() => void abrirMaterial(item.slug)}
                      className="group flex w-full min-h-11 flex-col gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`qb-chip ${corCategoria(item.categoria)}`}>
                            {rotuloCategoria(item.categoria)}
                          </span>
                          <span className="break-words text-[11px] font-medium text-ink-500">{item.fonte}</span>
                        </span>
                        <span className="mt-1 block break-words text-sm font-semibold text-ink-900 group-hover:text-brand-800">
                          {item.titulo}
                        </span>
                        {item.resumo ? (
                          <span className="mt-0.5 block break-words text-xs leading-relaxed text-ink-500">
                            {item.resumo}
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700">
                        Ler material <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      </div>
    )
  }

  // ----------------------------------------------------------- lista de certames
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Concurso-alvo"
        title="Certames"
        description="Escolha o concurso-alvo, leia o material do edital e vá direto para as questões."
        actions={
          <span className="qb-chip bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {certames.length} {certames.length === 1 ? 'certame' : 'certames'}
          </span>
        }
      />

      {carregandoConcursos ? <LoadingState label="Carregando certames…" /> : null}

      {!carregandoConcursos && concursosIndisponiveis ? (
        <EmptyState
          icon={BookOpenText}
          title="A lista de certames não está disponível no momento."
          description="Você ainda pode estudar todas as questões pela aba Questões."
        />
      ) : null}

      {!carregandoConcursos && !concursosIndisponiveis && certames.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title="Nenhum certame cadastrado ainda."
          description="Assim que um novo concurso entrar no banco, ele aparece aqui automaticamente."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {certames.map((concurso) => {
          const quantidade = contagens[concurso.id]
          return (
            <button
              key={concurso.id}
              type="button"
              onClick={() => void abrirCertame(concurso.id)}
              className="qb-card-interactive group flex min-h-11 flex-col p-5 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">Certame</p>
                  <h2 className="mt-1 break-words text-lg font-bold tracking-tight text-ink-900 group-hover:text-brand-800">
                    {concurso.id}
                  </h2>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  {concurso.id.slice(0, 2)}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold leading-none text-ink-900">{concurso.total}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                    questões
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold leading-none text-accent-800">
                    {quantidade === undefined ? '…' : quantidade === 0 ? '—' : quantidade}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-500">
                    {quantidade === 1 ? 'material' : 'materiais'}
                  </p>
                </div>
              </div>

              <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                Abrir certame <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
