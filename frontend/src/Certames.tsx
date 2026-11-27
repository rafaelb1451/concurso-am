import { useEffect, useMemo, useState } from 'react'
import {
  api,
  ApiError,
  type Concurso,
  type Material,
  type MaterialResumo,
} from './api'

const CATEGORIA: Record<string, string> = {
  LEI: 'Lei',
  REGIMENTO: 'Regimento',
  RESOLUCAO: 'Resolução',
  EDITAL: 'Edital',
  OUTRO: 'Outro',
}

const CATEGORIA_COR: Record<string, string> = {
  LEI: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  REGIMENTO: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200',
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
 * Certames: visão por concurso-alvo.
 * Os cards mostram o volume de questões e de materiais; ao abrir, o aluno lê o
 * material (texto puro, sem HTML) ou parte direto para as questões do certame.
 */
export default function Certames({
  concursos,
  carregandoConcursos = false,
  concursosIndisponiveis = false,
  onEstudar,
}: {
  concursos: Concurso[]
  carregandoConcursos?: boolean
  concursosIndisponiveis?: boolean
  onEstudar: (concurso: string, extra?: { materia?: string; assunto?: string }) => void
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

  async function abrirMaterial(slug: string) {
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

  function voltarAosMateriais() {
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
          onClick={voltarAosMateriais}
          className="text-[12px] font-semibold text-ink-500 transition hover:text-brand-700"
        >
          ← Voltar aos materiais
        </button>

        {carregandoMaterial ? (
          <div className="qb-card p-10 text-center text-sm text-ink-500">Abrindo material…</div>
        ) : null}

        {materialErro ? (
          <div className="qb-card p-8 text-center">
            <p className="text-sm font-semibold text-ink-800">{materialErro}</p>
            <p className="mt-1 text-sm text-ink-500">
              O conteúdo pode ter sido movido. Volte à lista do certame e tente outro material.
            </p>
            <button onClick={voltarAosMateriais} className="qb-btn-ghost mt-4">
              Ver todos os materiais
            </button>
          </div>
        ) : null}

        {material ? (
          <article className="qb-card overflow-hidden">
            <header className="border-b border-ink-100 bg-gradient-to-b from-brand-50/70 to-surface px-6 py-6 sm:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`qb-chip ${corCategoria(material.categoria)}`}>
                  {rotuloCategoria(material.categoria)}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                  Material de estudo · {concursoDoMaterial}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-ink-900">{material.titulo}</h1>
              <p className="mt-2 text-[12.5px] font-medium text-ink-500">
                Fonte oficial: <span className="text-ink-700">{material.fonte}</span>
              </p>
              {material.resumo ? (
                <p className="mt-4 rounded-xl border border-accent-200 bg-accent-50/70 px-4 py-3 text-sm leading-relaxed text-ink-700">
                  {material.resumo}
                </p>
              ) : null}
              <button
                onClick={() =>
                  onEstudar(concursoDoMaterial ?? '', {
                    materia: material.materia ?? undefined,
                    assunto: material.assunto ?? undefined,
                  })
                }
                className="qb-btn mt-5"
              >
                Ir para as questões deste material
              </button>
            </header>

            <div className="px-6 py-6 sm:px-8 sm:py-8">
              {paragrafos.length ? (
                <div className="space-y-4 font-serif text-[15.5px] leading-[1.8] text-ink-800">
                  {paragrafos.map((paragrafo, indice) => (
                    <p key={indice} className="whitespace-pre-line">
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

              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-5">
                <button
                  onClick={() =>
                    onEstudar(concursoDoMaterial ?? '', {
                      materia: material.materia ?? undefined,
                      assunto: material.assunto ?? undefined,
                    })
                  }
                  className="qb-btn"
                >
                  Ir para as questões deste material
                </button>
                <button onClick={voltarAosMateriais} className="qb-btn-ghost">
                  Voltar aos materiais
                </button>
              </div>
            </div>
          </article>
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
          onClick={() => {
            setSelecionado(null)
            setErro(null)
          }}
          className="text-[12px] font-semibold text-ink-500 transition hover:text-brand-700"
        >
          ← Todos os certames
        </button>

        <div className="qb-card overflow-hidden">
          <div className="bg-gradient-to-b from-brand-50/70 to-surface px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                  Certame
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{selecionado}</h1>
                <p className="mt-1 text-sm text-ink-500">
                  {dados?.total ?? 0} questões no banco
                  {quantidade === undefined
                    ? ' · carregando materiais…'
                    : quantidade === 0
                      ? ' · sem materiais publicados'
                      : ` · ${quantidade} ${quantidade === 1 ? 'material' : 'materiais'} de estudo`}
                </p>
              </div>
              <button onClick={() => onEstudar(selecionado)} className="qb-btn">
                Estudar este certame
              </button>
            </div>
          </div>

          <div className="border-t border-ink-100 px-6 py-5">
            <h2 className="text-sm font-bold text-ink-900">Materiais de estudo</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Leitura objetiva da legislação e das normas do edital, com a fonte oficial.
            </p>

            {erro ? (
              <p className="mt-4 rounded-xl bg-err-50 px-4 py-3 text-sm font-medium text-err-700">
                {erro}
              </p>
            ) : null}

            {carregandoMateriais ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink-200 py-10 text-center text-sm text-ink-500">
                Carregando materiais…
              </p>
            ) : null}

            {!carregandoMateriais && materiaisIndisponiveis ? (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200 py-10 px-4 text-center">
                <p className="text-sm font-semibold text-ink-700">
                  Materiais ainda não disponíveis para este certame.
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  Você já pode estudar as questões. Os materiais aparecem aqui assim que forem
                  publicados.
                </p>
              </div>
            ) : null}

            {!carregandoMateriais && !materiaisIndisponiveis && materiais.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200 py-10 px-4 text-center">
                <p className="text-sm font-semibold text-ink-700">
                  Sem materiais de estudo publicados.
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  Use as questões deste certame para treinar enquanto o material é preparado.
                </p>
              </div>
            ) : null}

            {!carregandoMateriais && materiais.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {materiais.map((item) => (
                  <li key={item.slug}>
                    <button
                      onClick={() => void abrirMaterial(item.slug)}
                      className="group flex w-full flex-col gap-2 rounded-xl border border-ink-200 bg-surface px-4 py-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`qb-chip ${corCategoria(item.categoria)}`}>
                            {rotuloCategoria(item.categoria)}
                          </span>
                          <span className="text-[11px] font-medium text-ink-400">{item.fonte}</span>
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-ink-900 group-hover:text-brand-800">
                          {item.titulo}
                        </span>
                        {item.resumo ? (
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                            {item.resumo}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-brand-700">
                        Ler material →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------- lista de certames
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-ink-900">Certames</h1>
        <p className="mt-1 text-sm text-ink-500">
          Escolha o concurso-alvo, leia o material do edital e vá direto para as questões.
        </p>
      </div>

      {carregandoConcursos ? (
        <div className="qb-card p-10 text-center text-sm text-ink-500">Carregando certames…</div>
      ) : null}

      {!carregandoConcursos && concursosIndisponiveis ? (
        <div className="qb-card p-8 text-center">
          <p className="text-sm font-semibold text-ink-800">
            A lista de certames não está disponível no momento.
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Você ainda pode estudar todas as questões pela aba Questões.
          </p>
        </div>
      ) : null}

      {!carregandoConcursos && !concursosIndisponiveis && certames.length === 0 ? (
        <div className="qb-card p-8 text-center">
          <p className="text-sm font-semibold text-ink-800">Nenhum certame cadastrado ainda.</p>
          <p className="mt-1 text-sm text-ink-500">
            Assim que um novo concurso entrar no banco, ele aparece aqui automaticamente.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {certames.map((concurso) => {
          const quantidade = contagens[concurso.id]
          return (
            <button
              key={concurso.id}
              onClick={() => void abrirCertame(concurso.id)}
              className="qb-card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                    Certame
                  </p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight text-ink-900 group-hover:text-brand-800">
                    {concurso.id}
                  </h2>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  {concurso.id.slice(0, 2)}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold leading-none text-ink-900">{concurso.total}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    questões
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold leading-none text-accent-700">
                    {quantidade === undefined
                      ? '…'
                      : quantidade === 0
                        ? '—'
                        : quantidade}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    {quantidade === 1 ? 'material' : 'materiais'}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold text-brand-700">
                Abrir certame <span aria-hidden="true">→</span>
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
