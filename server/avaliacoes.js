import { getPool } from './db.js'

/**
 * Avaliações de desempenho (RH & Desenvolvimento).
 * Cada avaliação pertence a um colaborador e a um "modelo" (por função). As
 * respostas (nota 0–5 por pergunta) e as assinaturas ficam em JSONB — as
 * perguntas de cada modelo vivem no frontend, então o modelo pode crescer sem
 * mexer no banco. Usa PostgreSQL quando disponível; senão, memória (dev).
 */

const mem = new Map()
let memSeq = 1

function clean(v) {
  return v === undefined || v === null ? '' : String(v).trim()
}
function dateOrNull(v) {
  const s = clean(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}
function asObject(v) {
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'object') return v
  try {
    return JSON.parse(v)
  } catch {
    return null
  }
}

export async function initAvaliacoes() {
  const pool = getPool()
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id                     serial PRIMARY KEY,
      colaborador_id         int NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
      modelo                 text NOT NULL DEFAULT '',
      data_admissao          date,
      data_avaliacao         date,
      respostas              jsonb NOT NULL DEFAULT '{}'::jsonb,
      assinatura_colaborador jsonb,
      assinatura_gestor      jsonb,
      observacoes            text NOT NULL DEFAULT '',
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_aval_colab ON avaliacoes (colaborador_id)')
}

const COLS = `id, colaborador_id, modelo,
  to_char(data_admissao, 'YYYY-MM-DD') AS data_admissao,
  to_char(data_avaliacao, 'YYYY-MM-DD') AS data_avaliacao,
  respostas, assinatura_colaborador, assinatura_gestor, observacoes, created_at`

function sanitize(input, { partial } = {}) {
  const out = {}
  const set = (k, v) => {
    if (partial && input[k] === undefined) return
    out[k] = v
  }
  set('modelo', clean(input.modelo))
  set('data_admissao', dateOrNull(input.data_admissao))
  set('data_avaliacao', dateOrNull(input.data_avaliacao))
  if (!(partial && input.respostas === undefined)) out.respostas = asObject(input.respostas) ?? {}
  set('assinatura_colaborador', asObject(input.assinatura_colaborador))
  set('assinatura_gestor', asObject(input.assinatura_gestor))
  set('observacoes', clean(input.observacoes))
  return out
}

/** Todas as avaliações, com nome/cargo da pessoa (visão macro do RH). */
export async function listAvaliacoes() {
  const pool = getPool()
  if (!pool) {
    return [...mem.values()].sort((a, b) => (b.data_avaliacao || '').localeCompare(a.data_avaliacao || '') || b.id - a.id)
  }
  const { rows } = await pool.query(
    `SELECT a.id, a.colaborador_id, a.modelo,
            to_char(a.data_admissao, 'YYYY-MM-DD') AS data_admissao,
            to_char(a.data_avaliacao, 'YYYY-MM-DD') AS data_avaliacao,
            a.respostas, a.assinatura_colaborador, a.assinatura_gestor, a.observacoes, a.created_at,
            c.nome AS colaborador_nome, c.cargo AS colaborador_cargo, c.setor AS colaborador_setor
     FROM avaliacoes a JOIN colaboradores c ON c.id = a.colaborador_id
     ORDER BY a.data_avaliacao DESC NULLS LAST, a.id DESC`,
  )
  return rows
}

export async function listAvaliacoesByColaborador(colaboradorId) {
  const cid = Number(colaboradorId)
  const pool = getPool()
  if (!pool) {
    return [...mem.values()]
      .filter((a) => a.colaborador_id === cid)
      .sort((a, b) => (b.data_avaliacao || '').localeCompare(a.data_avaliacao || '') || b.id - a.id)
  }
  const { rows } = await pool.query(`SELECT ${COLS} FROM avaliacoes WHERE colaborador_id = $1 ORDER BY data_avaliacao DESC NULLS LAST, id DESC`, [cid])
  return rows
}

export async function getAvaliacao(id) {
  const pool = getPool()
  if (!pool) return mem.get(Number(id)) || null
  const { rows } = await pool.query(`SELECT ${COLS} FROM avaliacoes WHERE id = $1`, [id])
  return rows[0] || null
}

export async function createAvaliacao(colaboradorId, input) {
  const cid = Number(colaboradorId)
  const data = sanitize(input)
  const pool = getPool()
  if (!pool) {
    const row = { id: memSeq++, colaborador_id: cid, ...data, created_at: new Date().toISOString() }
    mem.set(row.id, row)
    return row
  }
  const { rows } = await pool.query(
    `INSERT INTO avaliacoes (colaborador_id, modelo, data_admissao, data_avaliacao, respostas, assinatura_colaborador, assinatura_gestor, observacoes)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8) RETURNING id`,
    [
      cid,
      data.modelo || '',
      data.data_admissao ?? null,
      data.data_avaliacao ?? null,
      JSON.stringify(data.respostas ?? {}),
      data.assinatura_colaborador ? JSON.stringify(data.assinatura_colaborador) : null,
      data.assinatura_gestor ? JSON.stringify(data.assinatura_gestor) : null,
      data.observacoes || '',
    ],
  )
  return getAvaliacao(rows[0].id)
}

const JSON_FIELDS = new Set(['respostas', 'assinatura_colaborador', 'assinatura_gestor'])

export async function updateAvaliacao(id, input) {
  const data = sanitize(input, { partial: true })
  const keys = Object.keys(data)
  if (keys.length === 0) return getAvaliacao(id)
  const pool = getPool()
  if (!pool) {
    const row = mem.get(Number(id))
    if (row) Object.assign(row, data)
    return row || null
  }
  const sets = keys.map((k, i) => (JSON_FIELDS.has(k) ? `${k} = $${i + 1}::jsonb` : `${k} = $${i + 1}`))
  const values = keys.map((k) => (JSON_FIELDS.has(k) ? (data[k] == null ? null : JSON.stringify(data[k])) : data[k]))
  values.push(id)
  await pool.query(`UPDATE avaliacoes SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`, values)
  return getAvaliacao(id)
}

export async function deleteAvaliacao(id) {
  const pool = getPool()
  if (!pool) {
    mem.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM avaliacoes WHERE id = $1', [id])
}
