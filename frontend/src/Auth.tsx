import { useEffect, useState } from 'react'
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import GoogleBotao from './GoogleBotao'
import { api, type Auth } from './api'
import Logo from './Logo'
import { ErrorBanner, SuccessBanner } from './ui'

/**
 * Tela de entrada em tela cheia. Duas opções claras — Google ou conta — e o formulário de
 * e-mail abaixo. Mantém também os fluxos de verificação, recuperação e alteração de e-mail
 * por link.
 */
export default function Auth({
  onAutenticado,
  onVoltar,
}: {
  onAutenticado: (auth: Auth) => void
  onVoltar?: () => void
}) {
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [esqueciSenha, setEsqueciSenha] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [registroConcluido, setRegistroConcluido] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verificacao = params.get('verificar-email')
    const reset = params.get('redefinir-senha')
    const alteracao = params.get('alterar-email')
    setResetToken(reset ?? '')
    if (verificacao) {
      api.verificarEmail(verificacao)
        .then(() => setMensagem('E-mail confirmado! Agora você já pode entrar.'))
        .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível confirmar o e-mail.'))
    }
    if (reset) setMensagem('Escolha uma nova senha para concluir a recuperação.')
    if (alteracao) {
      api.confirmarAlteracaoEmail(alteracao)
        .then(() => setMensagem('Novo e-mail confirmado.'))
        .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível confirmar o e-mail.'))
    }
    // tokens de verificação não devem permanecer na barra de endereço/histórico
    if (verificacao || reset || alteracao) {
      const url = new URL(window.location.href)
      url.searchParams.delete('verificar-email')
      url.searchParams.delete('redefinir-senha')
      url.searchParams.delete('alterar-email')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
  }, [])

  async function entrarComGoogle(credential: string) {
    setErro(null)
    setCarregando(true)
    try {
      const auth = await api.entrarComGoogle(credential)
      onAutenticado(auth)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar com o Google.')
    } finally {
      setCarregando(false)
    }
  }

  async function enviar() {
    setCarregando(true)
    setErro(null)
    setMensagem(null)
    setRegistroConcluido(false)
    try {
      if (resetToken) {
        await api.resetarSenha(resetToken, senha)
        setMensagem('Senha alterada! Entre com a nova senha.')
        setResetToken('')
        setModo('login')
        setSenha('')
        return
      }
      if (esqueciSenha) {
        await api.solicitarReset(email)
        setMensagem('Se o e-mail estiver cadastrado, enviaremos o link de recuperação.')
        setEsqueciSenha(false)
        return
      }
      const auth =
        modo === 'cadastro'
          ? await api.cadastro(nome, email, senha, aceitouTermos, aceitouPrivacidade)
          : await api.login(email, senha)
      if (auth.token) {
        localStorage.setItem('qb_token', auth.token)
        onAutenticado(auth)
      } else {
        setMensagem('Conta criada! Confira seu e-mail e confirme o cadastro antes de entrar.')
        setRegistroConcluido(true)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally {
      setCarregando(false)
    }
  }

  async function reenviarVerificacao() {
    setCarregando(true)
    setErro(null)
    try {
      await api.reenviarVerificacao(email)
      setMensagem('E-mail de verificação reenviado. Confira sua caixa de entrada.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível reenviar o e-mail.')
    } finally {
      setCarregando(false)
    }
  }

  function trocarModo() {
    setModo((atual) => (atual === 'login' ? 'cadastro' : 'login'))
    setErro(null)
    setMensagem(null)
    setRegistroConcluido(false)
  }

  const titulo = resetToken
    ? 'Definir nova senha'
    : esqueciSenha
      ? 'Recuperar acesso'
      : modo === 'login'
        ? 'Entrar na sua conta'
        : 'Criar sua conta'
  const subtitulo = resetToken
    ? 'Escolha uma senha nova para a sua conta.'
    : esqueciSenha
      ? 'Informe o e-mail cadastrado para receber o link.'
      : modo === 'login'
        ? 'Continue estudando de onde parou.'
        : 'Leva menos de um minuto — e o plano gratuito já começa com 20 questões por dia.'

  const podeEnviar =
    !carregando &&
    (esqueciSenha ? Boolean(email.trim()) : Boolean(email.trim()) || Boolean(resetToken)) &&
    (resetToken ? Boolean(senha.trim()) : esqueciSenha ? true : Boolean(senha.trim())) &&
    (modo !== 'cadastro' || Boolean(nome.trim() && aceitouTermos && aceitouPrivacidade))

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-brand-900 px-10 py-12 text-white lg:flex lg:min-h-dvh lg:flex-col lg:justify-between xl:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-accent-500/15 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div>
              <p className="text-lg font-bold leading-tight">QB Concurso</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Quebrando a Banca</p>
            </div>
          </div>

          <h2 className="mt-14 max-w-sm text-[28px] font-bold leading-tight">
            A banca não é o obstáculo. É o seu treino.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Questões comentadas, simulado no formato da banca e evolução por banca e certame até o
            dia da prova.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-white/85">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400 text-[11px] font-bold text-brand-900">1</span>
              1.004 questões, de prova e autorais, com procedência declarada
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400 text-[11px] font-bold text-brand-900">2</span>
              Filtros por banca e certame, com material de estudo do edital
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-400 text-[11px] font-bold text-brand-900">3</span>
              Tutor de IA para fixar o conteúdo depois da correção
            </li>
          </ul>
        </div>

        <p className="relative text-[11px] text-white/50">
          Feito para quem estuda com método — e quer passar na primeira.
        </p>
      </aside>

      {/* formulário */}
      <main className="grid min-h-dvh place-items-center px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <Logo className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-ink-900">QB Concurso</p>
                <p className="hidden text-[10px] uppercase tracking-[0.2em] text-ink-500 sm:block">Quebrando a Banca</p>
              </div>
            </div>
            {onVoltar ? (
              <button
                type="button"
                onClick={onVoltar}
                className="qb-btn-ghost ml-auto min-h-11 shrink-0 px-3 text-xs"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar ao site
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-ink-200 bg-surface p-5 shadow-pop sm:rounded-3xl sm:p-7">
            <header>
              <p className="qb-eyebrow">
                {modo === 'cadastro' && !resetToken && !esqueciSenha ? 'Comece agora' : 'Acesso à plataforma'}
              </p>
              <h1 className="mt-2 text-[22px] font-bold leading-tight text-ink-900 sm:text-2xl">{titulo}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{subtitulo}</p>
            </header>

            {/* as duas opções principais */}
            <div className="mt-5 space-y-2.5">
              <GoogleBotao onCredencial={(credential) => void entrarComGoogle(credential)} />
              <button
                type="button"
                onClick={trocarModo}
                className="qb-btn-ghost w-full"
              >
                {modo === 'login' ? 'Criar conta grátis' : 'Já tenho conta — entrar'}
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-500">
                ou com e-mail
              </span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={(evento) => {
                evento.preventDefault()
                if (podeEnviar) void enviar()
              }}
            >
              {modo === 'cadastro' && !esqueciSenha && !resetToken ? (
                <div>
                  <label htmlFor="auth-nome" className="qb-label">
                    Nome
                  </label>
                  <input
                    id="auth-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="qb-input"
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>
              ) : null}

              {!resetToken ? (
                <div>
                  <label htmlFor="auth-email" className="qb-label">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-email"
                      type="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="qb-input pl-9"
                      placeholder="voce@email.com"
                    />
                  </div>
                </div>
              ) : null}

              {!esqueciSenha || resetToken ? (
                <div>
                  <label htmlFor="auth-senha" className="qb-label">
                    Senha
                  </label>
                  <div className="relative">
                    <LockKeyhole
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-senha"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="qb-input pl-9"
                      placeholder={
                        modo === 'cadastro' || resetToken
                          ? 'Mínimo 10 caracteres, com maiúscula, minúscula e número'
                          : 'Sua senha'
                      }
                      autoComplete={modo === 'cadastro' || resetToken ? 'new-password' : 'current-password'}
                    />
                  </div>
                </div>
              ) : null}

              {modo === 'cadastro' && !resetToken && !esqueciSenha ? (
                <div className="space-y-1">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg py-1.5 text-xs leading-relaxed text-ink-600">
                    <input
                      type="checkbox"
                      checked={aceitouTermos}
                      onChange={(e) => setAceitouTermos(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-700"
                    />
                    <span>Li e aceito os termos de uso da plataforma.</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg py-1.5 text-xs leading-relaxed text-ink-600">
                    <input
                      type="checkbox"
                      checked={aceitouPrivacidade}
                      onChange={(e) => setAceitouPrivacidade(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-700"
                    />
                    <span>Li e autorizo o tratamento dos meus dados conforme a Política de Privacidade.</span>
                  </label>
                </div>
              ) : null}

              {erro ? <ErrorBanner className="mt-1">{erro}</ErrorBanner> : null}
              {mensagem ? <SuccessBanner className="mt-1">{mensagem}</SuccessBanner> : null}

              {registroConcluido ? (
                <button
                  type="button"
                  onClick={() => void reenviarVerificacao()}
                  disabled={carregando}
                  className="qb-link inline-flex min-h-11 items-center text-xs disabled:opacity-50"
                >
                  Reenviar e-mail de verificação
                </button>
              ) : null}

              <button type="submit" disabled={!podeEnviar} className="qb-btn min-h-12 w-full text-sm font-bold">
                {carregando
                  ? 'Aguarde…'
                  : resetToken
                    ? 'Salvar nova senha'
                    : esqueciSenha
                      ? 'Enviar link de recuperação'
                      : modo === 'login'
                        ? 'Entrar com e-mail'
                        : 'Criar minha conta'}
              </button>
            </form>

            {modo === 'login' && !resetToken ? (
              <button
                type="button"
                onClick={() => {
                  setEsqueciSenha((valor) => !valor)
                  setErro(null)
                  setMensagem(null)
                }}
                className="qb-link mt-2 inline-flex min-h-11 items-center text-xs"
              >
                {esqueciSenha ? 'Voltar para entrar' : 'Esqueci minha senha'}
              </button>
            ) : null}
          </div>

          <p className="mt-5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-relaxed text-ink-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Seus dados ficam protegidos. Sem cartão de crédito para começar.
          </p>
        </div>
      </main>
    </div>
  )
}
