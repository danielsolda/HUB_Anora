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
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_fin_tipo ON financeiro_lancamentos (tipo, vencimento)',
  )
}

const SELECT = `
  SELECT id, tipo, descricao, valor_centavos,
         to_char(vencimento, 'YYYY-MM-DD') AS vencimento,
         status, categoria, contraparte,
         to_char(pago_em, 'YYYY-MM-DD') AS pago_em,
         forma, observacoes, created_at
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

export async function createLancamento(input) {
  const data = sanitize(input)
  const pool = getPool()
  if (!pool) {
    const row = {
      id: memSeq++,
      tipo: data.tipo,
      descricao: data.descricao || '',
      valor_centavos: data.valor_centavos || 0,
      vencimento: data.vencimento ?? null,
      status: data.status || 'pendente',
      categoria: data.categoria || '',
      contraparte: data.contraparte || '',
      pago_em: data.pago_em ?? null,
      forma: data.forma || '',
      observacoes: data.observacoes || '',
      created_at: new Date().toISOString(),
    }
    mem.set(row.id, row)
    return shape(row)
  }
  const { rows } = await pool.query(
    `INSERT INTO financeiro_lancamentos
       (tipo, descricao, valor_centavos, vencimento, status, categoria, contraparte, pago_em, forma, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      data.tipo,
      data.descricao || '',
      data.valor_centavos || 0,
      data.vencimento ?? null,
      data.status || 'pendente',
      data.categoria || '',
      data.contraparte || '',
      data.pago_em ?? null,
      data.forma || '',
      data.observacoes || '',
    ],
  )
  return getLancamento(rows[0].id)
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
