import { apiFetch } from '../auth/api'

/** Planilha de Auditoria de Leads. */
export const AUDIT_SHEET_ID = '1JHIF4-epoArSNfgTpdvdy6VeelXHPIdGvGnbI3-XdEs'
export const AUDIT_GID = '1358253473'
export const AUDIT_EMBED_URL = `https://docs.google.com/spreadsheets/d/${AUDIT_SHEET_ID}/preview?gid=${AUDIT_GID}`

export type AuditData = {
  headers: string[]
  rows: Record<string, string>[]
  source: 'live' | 'sample'
}

/** Busca os dados da planilha de auditoria (lidos no servidor). */
export async function fetchAudit(): Promise<AuditData> {
  const res = await apiFetch('/api/audit')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as AuditData
}
