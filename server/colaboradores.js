import { getPool } from './db.js'

/**
 * Cadastro de colaboradores (RH & Desenvolvimento).
 * Usa PostgreSQL quando disponível; senão, memória (dev/sem banco).
 * As demais áreas da ficha (contrato, holerites, advertências, férias, etc.)
 * serão ligadas uma a uma; aqui ficam os dados centrais de cada pessoa.
 */

export const STATUSES = new Set(['experiencia', 'ativo', 'desligado'])

const FIELDS = ['nome', 'cargo', 'setor', 'email', 'telefone', 'admissao', 'status', 'observacoes']

// ── Memória (fallback) ──
const mem = new Map()
let memSeq = 1

function clean(value) {
  return value === undefined || value === null ? '' : String(value).trim()
}

/** Normaliza um payload de entrada para os campos conhecidos. */
function sanitize(input, { partial } = {}) {
  const out = {}
  for (const f of FIELDS) {
    if (partial && input[f] === undefined) continue
    if (f === 'admissao') {
      const v = clean(input[f])
      out[f] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
    } else if (f === 'status') {
      const v = clean(input[f]) || 'experiencia'
      out[f] = STATUSES.has(v) ? v : 'experiencia'
    } else {
      out[f] = clean(input[f])
    }
  }
  return out
}

export async function initColaboradores() {
  const pool = getPool()
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id           serial PRIMARY KEY,
      nome         text NOT NULL,
      cargo        text NOT NULL DEFAULT '',
      setor        text NOT NULL DEFAULT '',
      email        text NOT NULL DEFAULT '',
      telefone     text NOT NULL DEFAULT '',
      admissao     date,
      status       text NOT NULL DEFAULT 'experiencia',
      observacoes  text NOT NULL DEFAULT '',
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `)
}

const SELECT = `
  SELECT id, nome, cargo, setor, email, telefone,
         to_char(admissao, 'YYYY-MM-DD') AS admissao,
         status, observacoes, created_at
  FROM colaboradores
`

export async function listColaboradores() {
  const pool = getPool()
  if (!pool) {
    return [...mem.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  }
  const { rows } = await pool.query(`${SELECT} ORDER BY nome ASC`)
  return rows
}

export async function getColaborador(id) {
  const pool = getPool()
  if (!pool) return mem.get(Number(id)) || null
  const { rows } = await pool.query(`${SELECT} WHERE id = $1`, [id])
  return rows[0] || null
}

export async function createColaborador(input) {
  const data = sanitize(input)
  const pool = getPool()
  if (!pool) {
    const row = {
      id: memSeq++,
      ...data,
      created_at: new Date().toISOString(),
    }
    mem.set(row.id, row)
    return row
  }
  const { rows } = await pool.query(
    `INSERT INTO colaboradores (nome, cargo, setor, email, telefone, admissao, status, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [data.nome, data.cargo, data.setor, data.email, data.telefone, data.admissao, data.status, data.observacoes],
  )
  return getColaborador(rows[0].id)
}

export async function updateColaborador(id, input) {
  const data = sanitize(input, { partial: true })
  const keys = Object.keys(data)
  if (keys.length === 0) return getColaborador(id)
  const pool = getPool()
  if (!pool) {
    const row = mem.get(Number(id))
    if (row) Object.assign(row, data)
    return row || null
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`)
  const values = keys.map((k) => data[k])
  values.push(id)
  await pool.query(
    `UPDATE colaboradores SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
    values,
  )
  return getColaborador(id)
}

export async function deleteColaborador(id) {
  const pool = getPool()
  if (!pool) {
    mem.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM colaboradores WHERE id = $1', [id])
}
