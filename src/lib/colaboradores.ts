import { apiFetch } from '../auth/api'

export type ColaboradorStatus = 'experiencia' | 'ativo' | 'desligado'

export type Colaborador = {
  id: number
  nome: string
  cargo: string
  setor: string
  email: string
  telefone: string
  admissao: string | null
  status: ColaboradorStatus
  observacoes: string
  created_at?: string
}

export type ColaboradorInput = {
  nome: string
  cargo?: string
  setor?: string
  email?: string
  telefone?: string
  admissao?: string | null
  status?: ColaboradorStatus
  observacoes?: string
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function listColaboradores(): Promise<Colaborador[]> {
  return (await json<{ colaboradores: Colaborador[] }>('/api/colaboradores')).colaboradores
}

export async function createColaborador(input: ColaboradorInput): Promise<Colaborador> {
  return (
    await json<{ colaborador: Colaborador }>('/api/colaboradores', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).colaborador
}

export async function updateColaborador(
  id: number,
  patch: Partial<ColaboradorInput>,
): Promise<Colaborador> {
  return (
    await json<{ colaborador: Colaborador }>(`/api/colaboradores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  ).colaborador
}

export async function deleteColaborador(id: number): Promise<void> {
  await json(`/api/colaboradores/${id}`, { method: 'DELETE' })
}

export const STATUS_LABELS: Record<ColaboradorStatus, string> = {
  experiencia: 'Experiência',
  ativo: 'Ativo',
  desligado: 'Desligado',
}
