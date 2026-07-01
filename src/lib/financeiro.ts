import { apiFetch } from '../auth/api'

export type LancamentoTipo = 'pagar' | 'receber'
export type LancamentoStatus = 'pendente' | 'pago' | 'cancelado'

export type Lancamento = {
  id: number
  tipo: LancamentoTipo
  descricao: string
  /** Valor em reais. */
  valor: number
  vencimento: string | null
  status: LancamentoStatus
  categoria: string
  contraparte: string
  pago_em: string | null
  forma: string
  observacoes: string
  /** Parcelamento: lançamentos do mesmo grupo, nº da parcela (0 = entrada) e total. */
  grupo: string | null
  parcela: number | null
  parcelas_total: number | null
  created_at?: string
}

export type LancamentoInput = {
  tipo?: LancamentoTipo
  descricao?: string
  valor?: number
  vencimento?: string | null
  status?: LancamentoStatus
  categoria?: string
  contraparte?: string
  pago_em?: string | null
  forma?: string
  observacoes?: string
  /** Parcelamento (só na criação): nº de parcelas, entrada (R$) e se já foi paga. */
  parcelas?: number
  entrada?: number
  entradaPaga?: boolean
}

async function json<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function listLancamentos(tipo: LancamentoTipo): Promise<Lancamento[]> {
  return (await json<{ lancamentos: Lancamento[] }>(`/api/financeiro/lancamentos?tipo=${tipo}`)).lancamentos
}

/** Todos os lançamentos (pagar + receber) — usado nos relatórios. */
export async function listAllLancamentos(): Promise<Lancamento[]> {
  return (await json<{ lancamentos: Lancamento[] }>('/api/financeiro/lancamentos')).lancamentos
}

export async function createLancamento(input: LancamentoInput): Promise<Lancamento> {
  return (
    await json<{ lancamento: Lancamento }>('/api/financeiro/lancamentos', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  ).lancamento
}

export async function updateLancamento(id: number, patch: LancamentoInput): Promise<Lancamento> {
  return (
    await json<{ lancamento: Lancamento }>(`/api/financeiro/lancamentos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  ).lancamento
}

export async function deleteLancamento(id: number): Promise<void> {
  await json(`/api/financeiro/lancamentos/${id}`, { method: 'DELETE' })
}

export type FluxoMes = { mes: string; entradas: number; saidas: number; saldo: number }
export type Fluxo = { realizado: FluxoMes[]; previsto: FluxoMes[] }

export async function fetchFluxo(): Promise<Fluxo> {
  return json<Fluxo>('/api/financeiro/fluxo')
}

// ── Documentos (notas fiscais, contratos, contábeis) ──
export type DocumentoTipo = 'nota_fiscal' | 'contrato_fornecedor' | 'documento_contabil'

/** Metadados de um arquivo enviado, com URLs assinadas (preview + download). */
export type ArquivoMeta = {
  id: number
  nome: string
  mime: string
  tamanho: number
  url: string
  download: string
}

export type Documento = {
  id: number
  tipo: DocumentoTipo
  titulo: string
  link: string
  data: string | null
  categoria: string
  contraparte: string
  observacoes: string
  pasta_id: number | null
  arquivo: ArquivoMeta | null
  created_at?: string
}

export type DocumentoInput = {
  tipo?: DocumentoTipo
  titulo?: string
  link?: string
  data?: string | null
  categoria?: string
  contraparte?: string
  observacoes?: string
  pasta_id?: number | null
  arquivo_id?: number | null
}

/** Pasta de documentos (árvore, por tipo). parent_id null = raiz. */
export type Pasta = {
  id: number
  tipo: DocumentoTipo
  nome: string
  parent_id: number | null
  created_at?: string
}

export async function listDocumentos(tipo: DocumentoTipo): Promise<Documento[]> {
  return (await json<{ documentos: Documento[] }>(`/api/financeiro/documentos?tipo=${tipo}`)).documentos
}

export async function createDocumento(input: DocumentoInput): Promise<Documento> {
  return (await json<{ documento: Documento }>('/api/financeiro/documentos', { method: 'POST', body: JSON.stringify(input) })).documento
}

export async function updateDocumento(id: number, patch: DocumentoInput): Promise<Documento> {
  return (await json<{ documento: Documento }>(`/api/financeiro/documentos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })).documento
}

export async function deleteDocumento(id: number): Promise<void> {
  await json(`/api/financeiro/documentos/${id}`, { method: 'DELETE' })
}

// ── Pastas ──
export async function listPastas(tipo: DocumentoTipo): Promise<Pasta[]> {
  return (await json<{ pastas: Pasta[] }>(`/api/financeiro/pastas?tipo=${tipo}`)).pastas
}

export async function createPasta(input: { tipo: DocumentoTipo; nome: string; parent_id: number | null }): Promise<Pasta> {
  return (await json<{ pasta: Pasta }>('/api/financeiro/pastas', { method: 'POST', body: JSON.stringify(input) })).pasta
}

export async function renamePasta(id: number, nome: string): Promise<Pasta> {
  return (await json<{ pasta: Pasta }>(`/api/financeiro/pastas/${id}`, { method: 'PATCH', body: JSON.stringify({ nome }) })).pasta
}

export async function deletePasta(id: number): Promise<void> {
  const res = await apiFetch(`/api/financeiro/pastas/${id}`, { method: 'DELETE' })
  if (res.status === 409) throw new Error('not_empty')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ── Upload de arquivo ──
/** Envia os bytes crus do arquivo; devolve os metadados (com URLs assinadas). */
export async function uploadArquivo(file: File): Promise<ArquivoMeta> {
  const buf = await file.arrayBuffer()
  const qs = `?nome=${encodeURIComponent(file.name)}&mime=${encodeURIComponent(file.type || 'application/octet-stream')}`
  const res = await apiFetch(`/api/financeiro/arquivos${qs}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buf,
  })
  if (!res.ok) throw new Error(`upload_failed_${res.status}`)
  return (await res.json()).arquivo as ArquivoMeta
}

/** Tamanho legível: 1536 → "1,5 KB". */
export function formatBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const v = n / Math.pow(1024, i)
  return `${i ? v.toFixed(1).replace('.', ',') : v} ${units[i]}`
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
/** 'YYYY-MM' → 'Ago/26'. */
export function formatMes(mes: string): string {
  const [y, m] = mes.split('-')
  return `${MESES[Number(m) - 1] ?? m}/${y.slice(2)}`
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatBRL(value: number): string {
  return BRL.format(value || 0)
}

export function formatDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

/** Hoje em 'YYYY-MM-DD' (local). */
export function today(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Status visível, derivando "vencido" de pendente com vencimento no passado. */
export function effectiveStatus(l: Lancamento): LancamentoStatus | 'vencido' {
  if (l.status === 'pendente' && l.vencimento && l.vencimento < today()) return 'vencido'
  return l.status
}
