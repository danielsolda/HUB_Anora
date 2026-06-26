import { getPool } from './db.js'

/**
 * Etapas do Kanban de Contratação — agora configuráveis e guardadas no banco
 * (com fallback em memória). Começam com as quatro padrão e podem ser
 * criadas/renomeadas/removidas/reordenadas pela engrenagem do quadro.
 */

export const DEFAULT_STAGES = [
  { id: 'novo', label: 'Novo Candidato' },
  { id: 'entrevista', label: 'Marcando entrevista' },
  { id: 'entrevistado', label: 'Entrevistado' },
  { id: 'experiencia', label: 'Experiência 90 dias' },
]

const memStages = []

function slugify(label) {
  const base = String(label)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || 'etapa'
}

export async function initStages() {
  const pool = getPool()
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kanban_stages (
        id         text PRIMARY KEY,
        label      text NOT NULL,
        position   int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM kanban_stages')
    if (rows[0].n === 0) {
      for (let i = 0; i < DEFAULT_STAGES.length; i++) {
        const s = DEFAULT_STAGES[i]
        await pool.query(
          'INSERT INTO kanban_stages (id, label, position) VALUES ($1, $2, $3)',
          [s.id, s.label, i],
        )
      }
    }
    return
  }
  if (memStages.length === 0) {
    DEFAULT_STAGES.forEach((s, i) => memStages.push({ ...s, position: i }))
  }
}

export async function listStages() {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query(
      'SELECT id, label, position FROM kanban_stages ORDER BY position ASC, created_at ASC',
    )
    return rows
  }
  return [...memStages]
    .sort((a, b) => a.position - b.position)
    .map(({ id, label, position }) => ({ id, label, position }))
}

export async function createStage(label) {
  const stages = await listStages()
  const existing = new Set(stages.map((s) => s.id))
  let id = slugify(label)
  if (existing.has(id)) {
    let n = 2
    while (existing.has(`${id}-${n}`)) n++
    id = `${id}-${n}`
  }
  const position = stages.length
  const pool = getPool()
  if (pool) {
    await pool.query('INSERT INTO kanban_stages (id, label, position) VALUES ($1, $2, $3)', [
      id,
      label,
      position,
    ])
  } else {
    memStages.push({ id, label, position })
  }
  return { id, label, position }
}

export async function updateStage(id, { label, position }) {
  const pool = getPool()
  if (pool) {
    const fields = []
    const values = []
    let i = 1
    if (label !== undefined) {
      fields.push(`label = $${i++}`)
      values.push(label)
    }
    if (position !== undefined) {
      fields.push(`position = $${i++}`)
      values.push(position)
    }
    if (!fields.length) return
    values.push(id)
    await pool.query(`UPDATE kanban_stages SET ${fields.join(', ')} WHERE id = $${i}`, values)
    return
  }
  const s = memStages.find((s) => s.id === id)
  if (s) {
    if (label !== undefined) s.label = label
    if (position !== undefined) s.position = position
  }
}

export async function deleteStage(id) {
  const pool = getPool()
  if (pool) {
    await pool.query('DELETE FROM kanban_stages WHERE id = $1', [id])
    return
  }
  const idx = memStages.findIndex((s) => s.id === id)
  if (idx >= 0) memStages.splice(idx, 1)
}

/** Reordena pelas posições do array de ids informado. */
export async function reorderStages(order) {
  for (let i = 0; i < order.length; i++) {
    await updateStage(order[i], { position: i })
  }
}

export async function stageIds() {
  return new Set((await listStages()).map((s) => s.id))
}
