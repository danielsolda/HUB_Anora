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
