import { useState } from 'react'
import { AnoraMark } from './AnoraLogo'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../auth/api'

export function LoginScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials') {
        setError('E-mail ou senha incorretos.')
      } else {
        setError('Não foi possível entrar. Tente novamente em instantes.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-anora px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <AnoraMark className="h-14 w-14 text-terracotta" title="Clínica Anora" />
          <h1 className="mt-6 text-2xl font-medium tracking-[0.28em] text-ink">ANORA</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-ink/45">HUB de Serviços</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-xl2 border border-ink/10 bg-cream/70 p-6 shadow-card"
        >
          <h2 className="text-lg font-semibold text-ink">Entrar</h2>
          <p className="mt-1 text-sm text-ink/55">Acesse com seu e-mail e senha.</p>

          <label className="mt-6 block text-sm font-medium text-ink/70">
            E-mail
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-terracotta/50"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-ink/70">
            Senha
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-terracotta/50"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-ink py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="mt-4 block w-full text-center text-sm text-ink/50 transition-colors hover:text-terracotta"
          >
            Esqueci minha senha
          </button>
          {showHelp ? (
            <p className="mt-2 text-center text-xs leading-relaxed text-ink/50">
              Peça ao responsável (Dono) para redefinir sua senha na aba Usuários. Você
              recebe uma senha nova e troca depois de entrar.
            </p>
          ) : null}
        </form>

        <p className="mt-6 text-center text-xs text-ink/40">Uso interno · Clínica Anora</p>
      </div>
    </div>
  )
}
