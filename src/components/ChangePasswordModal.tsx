import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from '../lib/icons'
import { changePassword, ApiError } from '../auth/api'

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (next.length < 6) return setError('A nova senha precisa ter ao menos 6 caracteres.')
    if (next !== confirm) return setError('As senhas não conferem.')
    setLoading(true)
    try {
      await changePassword(current, next)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'wrong_current') {
        setError('A senha atual está incorreta.')
      } else {
        setError('Não foi possível alterar a senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm [animation:fade-in_0.2s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Trocar senha"
        className="relative w-full max-w-sm overflow-hidden rounded-xl2 bg-cream shadow-card-hover [animation:modal-in_0.25s_ease-out]"
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Trocar senha</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        {done ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-ink">Senha alterada com sucesso.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-5 py-5">
            {[
              { label: 'Senha atual', value: current, set: setCurrent, ac: 'current-password' },
              { label: 'Nova senha', value: next, set: setNext, ac: 'new-password' },
              { label: 'Confirmar nova senha', value: confirm, set: setConfirm, ac: 'new-password' },
            ].map((f) => (
              <label key={f.label} className="mb-3 block text-sm font-medium text-ink/70">
                {f.label}
                <input
                  type="password"
                  autoComplete={f.ac}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-terracotta/50"
                />
              </label>
            ))}

            {error ? (
              <p className="mb-3 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-ink py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-60"
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
