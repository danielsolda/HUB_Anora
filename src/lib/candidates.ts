/**
 * Cliente da API do Kanban de Contratação.
 *
 * Os candidatos e as movimentações agora vêm do backend (`server/`), que lê a
 * planilha (privada) com uma conta de serviço e guarda as etapas no PostgreSQL.
 * O frontend apenas consome a API — sem ler a planilha nem usar localStorage.
 */

import { apiFetch } from '../auth/api'

// ── Links auxiliares (usados nos botões e no card de Contratação) ──
export const SHEET_ID = '1U6_a-W2dZAgWRzwXCNr3KRLbl7ygJrE21S-8LiMncD0'
export const FORM_URL =
  'https://kommo-dashboard-vagas-clinicaanora.lvvvr0.easypanel.host/'
export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
export const SHEET_PREVIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/preview`

// ── Etapas do Kanban (configuráveis pelo backend) ──
export type StageId = string

export type Stage = { id: StageId; label: string; position?: number }

/** Padrão usado como fallback até o backend responder. */
export const DEFAULT_STAGES: Stage[] = [
  { id: 'novo', label: 'Novo Candidato' },
  { id: 'entrevista', label: 'Marcando entrevista' },
  { id: 'entrevistado', label: 'Entrevistado' },
  { id: 'experiencia', label: 'Experiência 90 dias' },
]

export type Candidate = {
  id: string
  name: string
  stage: StageId
  /** Vaga a que a pessoa se candidatou (aba de origem na planilha). */
  vaga?: string
  /** Data/hora de chegada (carimbo do formulário), se houver. */
  timestamp?: string
  /** Todos os campos preenchidos: rótulo da coluna → valor. */
  fields: Record<string, string>
}

export type CandidatesResult = {
  candidates: Candidate[]
  /** 'live' = lendo a planilha; 'sample' = exemplos (servidor sem credencial). */
  source: 'live' | 'sample'
}

/** Busca os candidatos no backend. Lança erro se o servidor não responder. */
export async function fetchCandidates(): Promise<CandidatesResult> {
  const res = await apiFetch('/api/candidates')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as CandidatesResult
}

/** Ids dos candidatos que o usuário logado já abriu (selo "Novo"). */
export async function fetchSeenCandidates(): Promise<string[]> {
  const res = await apiFetch('/api/candidates/seen')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return ((await res.json()) as { seen: string[] }).seen
}

/** Marca um candidato como visto pelo usuário logado. */
export async function markCandidateSeen(id: string): Promise<void> {
  const res = await apiFetch(`/api/candidates/${encodeURIComponent(id)}/seen`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

/** Salva a movimentação de um candidato (etapa) no backend. */
export async function saveStage(id: string, stage: StageId): Promise<void> {
  const res = await apiFetch(`/api/candidates/${encodeURIComponent(id)}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ── Configuração das etapas ──
export async function fetchStages(): Promise<Stage[]> {
  const res = await apiFetch('/api/stages')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return ((await res.json()) as { stages: Stage[] }).stages
}

export async function createStage(label: string): Promise<void> {
  const res = await apiFetch('/api/stages', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function updateStage(id: string, label: string): Promise<void> {
  const res = await apiFetch(`/api/stages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function deleteStage(id: string): Promise<void> {
  const res = await apiFetch(`/api/stages/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

export async function reorderStages(order: string[]): Promise<void> {
  const res = await apiFetch('/api/stages/order', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
