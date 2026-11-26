import { useEffect, useState } from 'react'
import GoogleBotao from './GoogleBotao'
import { api, type Auth } from './api'
import Logo from './Logo'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-[16px] border border-ink-200 bg-surface p-6 shadow-pop">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-bold text-ink-900">QB Concurso</h1>
            <p className="text-xs text-ink-500">Quebrando a Banca</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-ink-100 p-1">
          {(['login', 'cadastro'] as const).map((opcao) => (
            <button
              key={opcao}
              onClick={() => {
                setModo(opcao)
                setErro(null)
                setRegistroConcluido(false)
              }}
              className={
                modo === opcao
                  ? 'rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-800 shadow-sm'
                  : 'px-3 py-2 text-sm font-semibold text-ink-500'
              }
            >
              {opcao === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <GoogleBotao onCredencial={(credential) => void entrarComGoogle(credential)} />

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-xs font-semibold text-ink-400">ou use seu e-mail</span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>

        <div className="mt-5 space-y-3">
          {modo === 'cadastro' && !esqueciSenha && !resetToken ? (
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
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
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
              placeholder="voce@email.com"
            />
          </label>
          ) : null}
          {(!esqueciSenha || resetToken) ? (
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void enviar()
              }}
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm"
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

        {modo === 'login' && !resetToken ? (
          <button
            onClick={() => {
              setEsqueciSenha((valor) => !valor)
              setErro(null)
              setMensagem(null)
            }}
            className="mt-3 text-xs font-semibold text-brand-700"
          >
            {esqueciSenha ? 'Voltar para Entrar' : 'Esqueci minha senha'}
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
          className="mt-5 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          {carregando
            ? 'Aguarde…'
            : resetToken
              ? 'Salvar nova senha'
              : esqueciSenha
                ? 'Enviar link de recuperação'
                : modo === 'login'
                  ? 'Entrar'
                  : 'Criar minha conta'}
        </button>
      </div>
    </div>
  )
}
