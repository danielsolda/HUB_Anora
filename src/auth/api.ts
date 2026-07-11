/**
 * Cliente HTTP com autenticação por token (JWT em localStorage) e funções da API
 * de auth/usuários.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'anora_token'

export type Role =
  | 'admin'
  | 'gerente_comercial'
  | 'gerente_operacoes'
  | 'financeiro'
  | 'contabilidade'
  | 'juridico'
  | 'biomedica'
  | 'assistente_comercial'
  | 'recepcionista'
  | 'estoque'

export type User = {
  id: number
  email: string
  name: string
  role: Role
  active: boolean
  created_at?: string
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

/** fetch com Authorization automático. Em 401, limpa o token e avisa o app. */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('anora-unauthorized'))
  }
  return res
}

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, body.error || `http_${res.status}`)
  }
  return (await res.json()) as T
}

// ── Auth ──
export async function login(email: string, password: string): Promise<User> {
  const data = await apiJson<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function fetchMe(): Promise<User> {
  const data = await apiJson<{ user: User }>('/api/auth/me')
  return data.user
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiJson('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// ── Usuários (Administrador) ──
export async function listUsers(): Promise<User[]> {
  return (await apiJson<{ users: User[] }>('/api/users')).users
}

export async function createUser(input: {
  email: string
  name: string
  role: Role
  password?: string
}): Promise<{ user: User; generatedPassword?: string }> {
  return apiJson('/api/users', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateUser(
  id: number,
  input: { name?: string; role?: Role; active?: boolean },
): Promise<{ user: User }> {
  return apiJson(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export async function resetUserPassword(
  id: number,
  newPassword?: string,
): Promise<{ generatedPassword?: string }> {
  return apiJson(`/api/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  })
}

export async function deleteUser(id: number): Promise<void> {
  await apiJson(`/api/users/${id}`, { method: 'DELETE' })
}
