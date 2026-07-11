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

// ── Registros da ficha (advertências, suspensões, férias, avaliações…) ──
export type Registro = {
  id: number
  colaborador_id: number
  tipo: string
  data: string | null
  data_fim: string | null
  dias: number | null
  categoria: string
  titulo: string
  descricao: string
  link: string
  created_at?: string
}

export type RegistroInput = {
  tipo: string
  data?: string | null
  data_fim?: string | null
  dias?: number | null
  categoria?: string
  titulo?: string
  descricao?: string
  link?: string
}

export async function listRegistros(colaboradorId: number, tipo: string): Promise<Registro[]> {
  return (
    await json<{ registros: Registro[] }>(`/api/colaboradores/${colaboradorId}/registros?tipo=${encodeURIComponent(tipo)}`)
  ).registros
}

/** Registro com os dados da pessoa (visões macro de RH). */
export type RegistroComPessoa = Registro & {
  colaborador_nome: string
  colaborador_cargo: string
  colaborador_setor: string
}

/** Todos os registros dos tipos informados, de todos os colaboradores. */
export async function listAllRegistros(tipos: string[]): Promise<RegistroComPessoa[]> {
  return (
    await json<{ registros: RegistroComPessoa[] }>(`/api/rh/registros?tipos=${encodeURIComponent(tipos.join(','))}`)
  ).registros
}

export async function createRegistro(colaboradorId: number, input: RegistroInput): Promise<Registro> {
  return (
    await json<{ registro: Registro }>(`/api/colaboradores/${colaboradorId}/registros`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).registro
}

export async function updateRegistro(
  colaboradorId: number,
  registroId: number,
  patch: Partial<RegistroInput>,
): Promise<Registro> {
  return (
    await json<{ registro: Registro }>(`/api/colaboradores/${colaboradorId}/registros/${registroId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  ).registro
}

export async function deleteRegistro(colaboradorId: number, registroId: number): Promise<void> {
  await json(`/api/colaboradores/${colaboradorId}/registros/${registroId}`, { method: 'DELETE' })
}
