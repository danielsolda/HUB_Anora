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
const memReg = new Map()
let memRegSeq = 1

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
  // Registros da ficha (advertências, suspensões, férias, avaliações, …),
  // genéricos por "tipo" para crescer sem novas tabelas.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS colaborador_registros (
      id             serial PRIMARY KEY,
      colaborador_id int NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
      tipo           text NOT NULL,
      data           date,
      data_fim       date,
      dias           int,
      categoria      text NOT NULL DEFAULT '',
      titulo         text NOT NULL DEFAULT '',
      descricao      text NOT NULL DEFAULT '',
      link           text NOT NULL DEFAULT '',
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `)
  // Campo de link para áreas baseadas em arquivo (holerites, contrato, documentos…).
  await pool.query("ALTER TABLE colaborador_registros ADD COLUMN IF NOT EXISTS link text NOT NULL DEFAULT ''")
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_registros_colab ON colaborador_registros (colaborador_id, tipo)',
  )
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
    for (const [rid, r] of memReg) if (r.colaborador_id === Number(id)) memReg.delete(rid)
    return
  }
  await pool.query('DELETE FROM colaboradores WHERE id = $1', [id])
}

// ── Registros da ficha (advertências, suspensões, férias, avaliações, …) ──
const REG_FIELDS = ['tipo', 'data', 'data_fim', 'dias', 'categoria', 'titulo', 'descricao', 'link']

function sanitizeRegistro(input, { partial } = {}) {
  const out = {}
  for (const f of REG_FIELDS) {
    if (partial && input[f] === undefined) continue
    if (f === 'data' || f === 'data_fim') {
      const v = clean(input[f])
      out[f] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
    } else if (f === 'dias') {
      const n = parseInt(input[f], 10)
      out[f] = Number.isFinite(n) ? n : null
    } else {
      out[f] = clean(input[f])
    }
  }
  return out
}

const REG_SELECT = `
  SELECT id, colaborador_id, tipo,
         to_char(data, 'YYYY-MM-DD') AS data,
         to_char(data_fim, 'YYYY-MM-DD') AS data_fim,
         dias, categoria, titulo, descricao, link, created_at
  FROM colaborador_registros
`

export async function listRegistros(colaboradorId, tipo) {
  const cid = Number(colaboradorId)
  const pool = getPool()
  if (!pool) {
    return [...memReg.values()]
      .filter((r) => r.colaborador_id === cid && (!tipo || r.tipo === tipo))
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id - a.id)
  }
  const params = [cid]
  let where = 'WHERE colaborador_id = $1'
  if (tipo) {
    params.push(tipo)
    where += ' AND tipo = $2'
  }
  const { rows } = await pool.query(`${REG_SELECT} ${where} ORDER BY data DESC NULLS LAST, id DESC`, params)
  return rows
}

export async function createRegistro(colaboradorId, input) {
  const cid = Number(colaboradorId)
  const data = sanitizeRegistro(input)
  if (!data.tipo) throw new Error('missing_tipo')
  const pool = getPool()
  if (!pool) {
    const row = { id: memRegSeq++, colaborador_id: cid, ...data, created_at: new Date().toISOString() }
    memReg.set(row.id, row)
    return row
  }
  const { rows } = await pool.query(
    `INSERT INTO colaborador_registros (colaborador_id, tipo, data, data_fim, dias, categoria, titulo, descricao, link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [cid, data.tipo, data.data, data.data_fim, data.dias, data.categoria, data.titulo, data.descricao, data.link || ''],
  )
  return getRegistro(rows[0].id)
}

export async function getRegistro(id) {
  const pool = getPool()
  if (!pool) return memReg.get(Number(id)) || null
  const { rows } = await pool.query(`${REG_SELECT} WHERE id = $1`, [id])
  return rows[0] || null
}

export async function updateRegistro(id, input) {
  const data = sanitizeRegistro(input, { partial: true })
  delete data.tipo // tipo não muda
  const keys = Object.keys(data)
  if (keys.length === 0) return getRegistro(id)
  const pool = getPool()
  if (!pool) {
    const row = memReg.get(Number(id))
    if (row) Object.assign(row, data)
    return row || null
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`)
  const values = keys.map((k) => data[k])
  values.push(id)
  await pool.query(
    `UPDATE colaborador_registros SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
    values,
  )
  return getRegistro(id)
}

export async function deleteRegistro(id) {
  const pool = getPool()
  if (!pool) {
    memReg.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM colaborador_registros WHERE id = $1', [id])
}
