/**
 * Cliente da API do Kanban de Contratação.
 *
 * Os candidatos e as movimentações agora vêm do backend (`server/`), que lê a
 * planilha (privada) com uma conta de serviço e guarda as etapas no PostgreSQL.
 * O frontend apenas consome a API — sem ler a planilha nem usar localStorage.
 */

// Base da API: vazio = mesma origem (servidor único). Em deploy separado,
// defina VITE_API_URL com a URL do backend.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ── Links auxiliares (usados nos botões e no card de Contratação) ──
export const SHEET_ID = '1U6_a-W2dZAgWRzwXCNr3KRLbl7ygJrE21S-8LiMncD0'
export const FORM_URL =
  'https://kommo-dashboard-vagas-clinicaanora.lvvvr0.easypanel.host/'
export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
export const SHEET_PREVIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/preview`

// ── Etapas do Kanban ──
export type StageId = 'novo' | 'entrevista' | 'entrevistado' | 'experiencia'

export type Stage = { id: StageId; label: string }

export const STAGES: Stage[] = [
  { id: 'novo', label: 'Novo Candidato' },
  { id: 'entrevista', label: 'Marcando entrevista' },
  { id: 'entrevistado', label: 'Entrevistado' },
  { id: 'experiencia', label: 'Experiência 90 dias' },
]

export type Candidate = {
  id: string
  name: string
  stage: StageId
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
  const res = await fetch(`${API_BASE}/api/candidates`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as CandidatesResult
}

/** Salva a movimentação de um candidato (etapa) no backend. */
export async function saveStage(id: string, stage: StageId): Promise<void> {
  const res = await fetch(`${API_BASE}/api/candidates/${encodeURIComponent(id)}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
