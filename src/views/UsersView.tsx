import { useEffect, useState } from 'react'
import { KeyIcon, RefreshIcon, XIcon } from '../lib/icons'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS, ROLE_OPTIONS } from '../auth/access'
import {
  ApiError,
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser,
  type Role,
  type User,
} from '../auth/api'

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: 'Já existe um usuário com esse e-mail.',
  last_owner: 'Não é possível: precisa haver ao menos um Administrador ativo.',
  cannot_delete_self: 'Você não pode remover o próprio usuário.',
  invalid_data: 'Preencha e-mail e papel corretamente.',
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError && ERROR_MESSAGES[err.code]) return ERROR_MESSAGES[err.code]
  return 'Algo deu errado. Tente novamente.'
}

export function UsersView() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<{ email: string; name: string; role: Role; password: string }>({
    email: '',
    name: '',
    role: 'assistente_comercial',
    password: '',
  })

  async function load() {
    setLoading(true)
    try {
      setUsers(await listUsers())
      setError(null)
    } catch {
      setError('Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { user, generatedPassword } = await createUser({
        email: form.email.trim(),
        name: form.name.trim(),
        role: form.role,
        password: form.password || undefined,
      })
      if (generatedPassword) setCredential({ email: user.email, password: generatedPassword })
      setForm({ email: '', name: '', role: 'assistente_comercial', password: '' })
      setShowCreate(false)
      load()
    } catch (err) {
      setError(messageFor(err))
    }
  }

  async function onReset(u: User) {
    setError(null)
    try {
      const { generatedPassword } = await resetUserPassword(u.id)
      if (generatedPassword) setCredential({ email: u.email, password: generatedPassword })
    } catch (err) {
      setError(messageFor(err))
    }
  }

  async function onChange(u: User, patch: { role?: Role; active?: boolean }) {
    setError(null)
    try {
      await updateUser(u.id, patch)
      load()
    } catch (err) {
      setError(messageFor(err))
    }
  }

  async function onDelete(u: User) {
    if (!window.confirm(`Remover o usuário ${u.email}?`)) return
    setError(null)
    try {
      await deleteUser(u.id)
      load()
    } catch (err) {
      setError(messageFor(err))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">
            Acessos
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink">Usuários</h1>
          <p className="mt-2 text-sm text-ink/55">
            Quem pode entrar no HUB e o que cada um enxerga.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
        >
          {showCreate ? 'Cancelar' : 'Novo usuário'}
        </button>
      </header>

      {/* Credencial gerada */}
      {credential ? (
        <div className="mt-6 flex items-start justify-between gap-3 rounded-xl2 border border-olive/25 bg-olive/5 px-4 py-3">
          <div className="text-sm text-ink">
            <p className="font-medium">Senha gerada para {credential.email}</p>
            <p className="mt-1">
              Senha: <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono">{credential.password}</code>{' '}
              <span className="text-ink/55">— copie e envie. Não será mostrada de novo.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCredential(null)}
            aria-label="Fechar"
            className="rounded-full p-1 text-ink/50 hover:bg-ink/5 hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-lg bg-terracotta/10 px-4 py-2.5 text-sm text-terracotta">
          {error}
        </p>
      ) : null}

      {/* Formulário de criação */}
      {showCreate ? (
        <form
          onSubmit={onCreate}
          className="mt-6 grid gap-4 rounded-xl2 border border-ink/10 bg-cream/60 p-5 sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-ink/70">
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50"
            />
          </label>
          <label className="text-sm font-medium text-ink/70">
            Nome
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50"
            />
          </label>
          <label className="text-sm font-medium text-ink/70">
            Papel
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-ink/70">
            Senha (opcional)
            <input
              type="text"
              placeholder="deixe vazio para gerar automática"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
            >
              Criar usuário
            </button>
          </div>
        </form>
      ) : null}

      {/* Lista */}
      <div className="mt-8 overflow-hidden rounded-xl2 border border-ink/10">
        <div className="hidden grid-cols-[1.5fr_1fr_auto] gap-4 border-b border-ink/10 bg-cream/60 px-5 py-3 text-xs uppercase tracking-wide text-ink/45 sm:grid">
          <span>Usuário</span>
          <span>Papel</span>
          <span className="text-right">Ações</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-ink/45">Carregando…</div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id
              return (
                <li
                  key={u.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1.5fr_1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {u.name || u.email}
                      {isSelf ? <span className="ml-2 text-xs text-ink/40">(você)</span> : null}
                    </p>
                    <p className="truncate text-sm text-ink/50">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => onChange(u, { role: e.target.value as Role })}
                      disabled={isSelf}
                      className="rounded-lg border border-ink/15 bg-cream px-2.5 py-1.5 text-sm text-ink outline-none focus:border-terracotta/50 disabled:opacity-60"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {!u.active ? (
                      <span className="rounded-full bg-sand/30 px-2 py-0.5 text-xs text-mauve">
                        Inativo
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReset(u)}
                      title="Redefinir senha"
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink"
                    >
                      <KeyIcon className="h-3.5 w-3.5" />
                      Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(u, { active: !u.active })}
                      disabled={isSelf}
                      className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:border-ink/30 disabled:opacity-40"
                    >
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(u)}
                      disabled={isSelf}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-ink/40">
        <RefreshIcon className="h-3.5 w-3.5" />
        Administrador vê tudo · Gerentes veem seu módulo + Documentos · Colaboradores
        veem apenas os Documentos liberados.
      </p>
    </div>
  )
}
