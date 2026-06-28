import crypto from 'node:crypto'
import { getPool } from './db.js'

/**
 * Lançamentos financeiros: contas a pagar e a receber (módulo Financeiro).
 * Um lançamento tem um `tipo` ('pagar' | 'receber'); o resto é igual, então
 * Fluxo de caixa e Relatórios podem somar os dois depois.
 * Valores são guardados em CENTAVOS (inteiro) para evitar erro de ponto
 * flutuante; a API troca para reais (número) na entrada e na saída.
 */

export const TIPOS = new Set(['pagar', 'receber'])
export const STATUSES = new Set(['pendente', 'pago', 'cancelado'])

const TEXT_FIELDS = ['descricao', 'categoria', 'contraparte', 'forma', 'observacoes']

const mem = new Map()
let memSeq = 1

function clean(v) {
  return v === undefined || v === null ? '' : String(v).trim()
}

function toCents(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

function dateOrNull(v) {
  const s = clean(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function serverToday() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Soma n meses a uma data 'YYYY-MM-DD', ajustando o dia ao fim do mês. */
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = (m - 1) + n
  const ty = y + Math.floor(target / 12)
  const tm = ((target % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return `${ty}-${pad2(tm + 1)}-${pad2(Math.min(d, lastDay))}`
}

function sanitize(input, { partial } = {}) {
  const out = {}
  const set = (k, val) => {
    if (partial && input[k] === undefined) return
    out[k] = val
  }
  if (!partial || input.tipo !== undefined) {
    const t = clean(input.tipo)
    out.tipo = TIPOS.has(t) ? t : 'pagar'
  }
  set('valor_centavos', toCents(input.valor))
  set('vencimento', dateOrNull(input.vencimento))
  set('pago_em', dateOrNull(input.pago_em))
  if (!partial || input.status !== undefined) {
    const s = clean(input.status) || 'pendente'
    out.status = STATUSES.has(s) ? s : 'pendente'
  }
  for (const f of TEXT_FIELDS) set(f, clean(input[f]))
  return out
}

function shape(row) {
  if (!row) return null
  const { valor_centavos, ...rest } = row
  return { ...rest, valor: (valor_centavos || 0) / 100 }
}

export async function initFinanceiro() {
  const pool = getPool()
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
      id             serial PRIMARY KEY,
      tipo           text NOT NULL,
      descricao      text NOT NULL DEFAULT '',
      valor_centavos integer NOT NULL DEFAULT 0,
      vencimento     date,
      status         text NOT NULL DEFAULT 'pendente',
      categoria      text NOT NULL DEFAULT '',
      contraparte    text NOT NULL DEFAULT '',
      pago_em        date,
      forma          text NOT NULL DEFAULT '',
      observacoes    text NOT NULL DEFAULT '',
      grupo          text,
      parcela        integer,
      parcelas_total integer,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `)
  // Colunas de parcelamento (para tabelas criadas antes desta versão).
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS grupo text')
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela integer')
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcelas_total integer')
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_fin_tipo ON financeiro_lancamentos (tipo, vencimento)',
  )
}

const SELECT = `
  SELECT id, tipo, descricao, valor_centavos,
         to_char(vencimento, 'YYYY-MM-DD') AS vencimento,
         status, categoria, contraparte,
         to_char(pago_em, 'YYYY-MM-DD') AS pago_em,
         forma, observacoes, grupo, parcela, parcelas_total, created_at
  FROM financeiro_lancamentos
`

export async function listLancamentos(tipo) {
  const pool = getPool()
  if (!pool) {
    return [...mem.values()]
      .filter((r) => !tipo || r.tipo === tipo)
      .sort((a, b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999') || b.id - a.id)
      .map(shape)
  }
  const params = []
  let where = ''
  if (tipo && TIPOS.has(tipo)) {
    params.push(tipo)
    where = 'WHERE tipo = $1'
  }
  const { rows } = await pool.query(`${SELECT} ${where} ORDER BY vencimento ASC NULLS LAST, id DESC`, params)
  return rows.map(shape)
}

export async function getLancamento(id) {
  const pool = getPool()
  if (!pool) return shape(mem.get(Number(id)) || null)
  const { rows } = await pool.query(`${SELECT} WHERE id = $1`, [id])
  return shape(rows[0] || null)
}

async function insertOne(data) {
  const row = {
    tipo: data.tipo || 'pagar',
    descricao: data.descricao || '',
    valor_centavos: data.valor_centavos || 0,
    vencimento: data.vencimento ?? null,
    status: data.status || 'pendente',
    categoria: data.categoria || '',
    contraparte: data.contraparte || '',
    pago_em: data.pago_em ?? null,
    forma: data.forma || '',
    observacoes: data.observacoes || '',
    grupo: data.grupo ?? null,
    parcela: data.parcela ?? null,
    parcelas_total: data.parcelas_total ?? null,
  }
  const pool = getPool()
  if (!pool) {
    const stored = { id: memSeq++, ...row, created_at: new Date().toISOString() }
    mem.set(stored.id, stored)
    return shape(stored)
  }
  const { rows } = await pool.query(
    `INSERT INTO financeiro_lancamentos
       (tipo, descricao, valor_centavos, vencimento, status, categoria, contraparte, pago_em, forma, observacoes, grupo, parcela, parcelas_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      row.tipo, row.descricao, row.valor_centavos, row.vencimento, row.status, row.categoria,
      row.contraparte, row.pago_em, row.forma, row.observacoes, row.grupo, row.parcela, row.parcelas_total,
    ],
  )
  return getLancamento(rows[0].id)
}

/**
 * Cria um lançamento. Se vier `parcelas > 1` ou `entrada > 0`, gera o
 * parcelamento: uma entrada (opcional) + N parcelas mensais, ligadas por um
 * `grupo`. Cada parcela é um lançamento independente (pode ser paga sozinha).
 */
export async function createLancamento(input) {
  const base = sanitize(input)
  const parcelasN = Math.max(1, parseInt(input.parcelas, 10) || 1)
  const entradaCents = toCents(input.entrada)
  const parcelado = parcelasN > 1 || entradaCents > 0
  if (!parcelado) return insertOne(base)

  const totalCents = base.valor_centavos || 0
  const firstVenc = base.vencimento || serverToday()
  const grupo = crypto.randomUUID()
  const common = {
    tipo: base.tipo,
    descricao: base.descricao,
    categoria: base.categoria,
    contraparte: base.contraparte,
    forma: base.forma,
    observacoes: base.observacoes,
    grupo,
    parcelas_total: parcelasN,
  }

  let first = null
  let monthOffset = 0
  if (entradaCents > 0) {
    first = await insertOne({
      ...common,
      valor_centavos: Math.min(entradaCents, totalCents || entradaCents),
      vencimento: firstVenc,
      parcela: 0,
      status: input.entradaPaga ? 'pago' : 'pendente',
      pago_em: input.entradaPaga ? serverToday() : null,
    })
    monthOffset = 1 // parcelas começam no mês seguinte à entrada
  }

  const remaining = Math.max(0, totalCents - entradaCents)
  if (remaining > 0 || entradaCents === 0) {
    const baseParcela = Math.floor(remaining / parcelasN)
    for (let i = 1; i <= parcelasN; i++) {
      const cents = i === parcelasN ? remaining - baseParcela * (parcelasN - 1) : baseParcela
      const r = await insertOne({
        ...common,
        valor_centavos: cents,
        vencimento: addMonths(firstVenc, monthOffset + (i - 1)),
        parcela: i,
        status: 'pendente',
        pago_em: null,
      })
      first = first || r
    }
  }
  return first
}

export async function updateLancamento(id, input) {
  const data = sanitize(input, { partial: true })
  delete data.tipo // o tipo não muda
  const keys = Object.keys(data)
  if (keys.length === 0) return getLancamento(id)
  const pool = getPool()
  if (!pool) {
    const row = mem.get(Number(id))
    if (row) Object.assign(row, data)
    return shape(row || null)
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`)
  const values = keys.map((k) => data[k])
  values.push(id)
  await pool.query(
    `UPDATE financeiro_lancamentos SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
    values,
  )
  return getLancamento(id)
}

export async function deleteLancamento(id) {
  const pool = getPool()
  if (!pool) {
    mem.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM financeiro_lancamentos WHERE id = $1', [id])
}
