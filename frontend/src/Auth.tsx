import { useEffect, useState } from 'react'
import GoogleBotao from './GoogleBotao'
import { api, type Auth } from './api'
import Logo from './Logo'

/**
 * Tela de entrada. Duas opções claras — Google ou conta — e o formulário de e-mail abaixo.
 * Mantém também os fluxos de verificação, recuperação e alteração de e-mail por link.
 */
export default function Auth({ onAutenticado }: { onAutenticado: (auth: Auth) => void }) {
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

  const titulo = resetToken ? 'Definir nova senha' : esqueciSenha ? 'Recuperar acesso' : modo === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'
  const subtitulo = resetToken
    ? 'Escolha uma senha nova para a sua conta.'
    : esqueciSenha
      ? 'Informe o e-mail cadastrado para receber o link.'
      : modo === 'login'
        ? 'Continue estudando de onde parou.'
        : 'Leva menos de um minuto — e o plano gratuito já começa com 20 questões por dia.'

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-brand-900 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div>
              <p className="text-lg font-bold leading-tight">QB Concurso</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Quebrando a Banca</p>
            </div>
          </div>

          <h2 className="mt-16 max-w-sm text-[28px] font-bold leading-tight">
            A banca não é o obstáculo. É o seu treino.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Questões comentadas, simulado no formato da banca e evolução por banca e certame até o
            dia da prova.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-white/80">
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

        <p className="relative text-[11px] text-white/40">
          Feito para quem estuda com método — e quer passar na primeira.
        </p>
      </aside>

      {/* formulário */}
      <main className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo className="h-11 w-11" />
            <div>
              <p className="text-lg font-bold text-ink-900">QB Concurso</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Quebrando a Banca</p>
            </div>
          </div>

          <div className="rounded-3xl border border-ink-200 bg-surface p-6 shadow-pop sm:p-8">
            <header>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">
                {modo === 'cadastro' && !resetToken && !esqueciSenha ? 'Comece agora' : 'Acesso à plataforma'}
              </p>
              <h1 className="mt-2 text-[22px] font-bold leading-tight text-ink-900">{titulo}</h1>
              <p className="mt-1 text-sm text-ink-500">{subtitulo}</p>
            </header>

            {/* as duas opções principais */}
            <div className="mt-6 space-y-3">
              <GoogleBotao onCredencial={(credential) => void entrarComGoogle(credential)} />
              <button
                type="button"
                onClick={trocarModo}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
              >
                {modo === 'login' ? 'Criar conta grátis' : 'Já tenho conta — entrar'}
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">ou com e-mail</span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>

            <div className="mt-5 space-y-3">
              {modo === 'cadastro' && !esqueciSenha && !resetToken ? (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700">Nome</span>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15"
                    placeholder="Seu nome"
                  />
                </label>
              ) : null}
              {!resetToken ? (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700">E-mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15"
                    placeholder="voce@email.com"
                  />
                </label>
              ) : null}
              {!esqueciSenha || resetToken ? (
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700">Senha</span>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void enviar()
                    }}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15"
                    placeholder={modo === 'cadastro' || resetToken
                      ? 'Mínimo 10 caracteres, com maiúscula, minúscula e número'
                      : 'Sua senha'}
                  />
                </label>
              ) : null}
            </div>

            {modo === 'cadastro' ? (
              <div className="mt-4 space-y-2">
                <label className="flex items-start gap-2 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={aceitouTermos}
                    onChange={(e) => setAceitouTermos(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Li e aceito os termos de uso da plataforma.</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={aceitouPrivacidade}
                    onChange={(e) => setAceitouPrivacidade(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Li e autorizo o tratamento dos meus dados conforme a Política de Privacidade.</span>
                </label>
              </div>
            ) : null}

            {erro ? (
              <p className="mt-4 rounded-xl bg-err-50 px-3 py-2 text-sm font-medium text-err-700">
                {erro}
              </p>
            ) : null}

            {mensagem ? (
              <p className="mt-4 rounded-xl bg-ok-50 px-3 py-2 text-sm font-medium text-ok-700">
                {mensagem}
              </p>
            ) : null}

            {registroConcluido ? (
              <button
                onClick={() => void reenviarVerificacao()}
                disabled={carregando}
                className="mt-3 text-xs font-semibold text-brand-700 disabled:opacity-50"
              >
                Reenviar e-mail de verificação
              </button>
            ) : null}

            <button
              onClick={() => void enviar()}
              disabled={
                carregando
                || (esqueciSenha ? !email.trim() : !email.trim() && !resetToken)
                || (resetToken ? !senha.trim() : esqueciSenha ? false : !senha.trim())
                || (modo === 'cadastro' && (!nome.trim() || !aceitouTermos || !aceitouPrivacidade))
              }
              className="mt-5 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-50"
            >
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

            {modo === 'login' && !resetToken ? (
              <button
                onClick={() => {
                  setEsqueciSenha((valor) => !valor)
                  setErro(null)
                  setMensagem(null)
                }}
                className="mt-3 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                {esqueciSenha ? 'Voltar para entrar' : 'Esqueci minha senha'}
              </button>
            ) : null}
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-ink-400">
            Seus dados ficam protegidos. Sem cartão de crédito para começar.
          </p>
        </div>
      </main>
    </div>
  )
}
