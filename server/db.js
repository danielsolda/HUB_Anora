import pg from 'pg'

/**
 * Persistência das movimentações do Kanban.
 * Usa PostgreSQL quando DATABASE_URL está definida; caso contrário, cai para um
 * armazenamento em memória (não persiste entre reinícios) — útil em
 * desenvolvimento e para o primeiro boot antes de configurar o banco.
 */

let pool = null
const memory = new Map()

export const dbMode = process.env.DATABASE_URL ? 'pg' : 'memory'

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL ausente — usando memória (movimentações não persistem).')
    return
  }

  const url = process.env.DATABASE_URL
  const isLocal = /localhost|127\.0\.0\.1/.test(url) || /sslmode=disable/.test(url)
  pool = new pg.Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_stages (
      candidate_id text PRIMARY KEY,
      stage        text NOT NULL,
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `)
  console.log('[db] PostgreSQL conectado.')
}

/** Retorna um mapa { candidate_id: stage } com as etapas salvas. */
export async function getStages() {
  if (!pool) return Object.fromEntries(memory)
  const { rows } = await pool.query('SELECT candidate_id, stage FROM candidate_stages')
  return Object.fromEntries(rows.map((r) => [r.candidate_id, r.stage]))
}

/** Salva (upsert) a etapa de um candidato. */
export async function setStage(id, stage) {
  if (!pool) {
    memory.set(id, stage)
    return
  }
  await pool.query(
    `INSERT INTO candidate_stages (candidate_id, stage, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (candidate_id)
     DO UPDATE SET stage = EXCLUDED.stage, updated_at = now()`,
    [id, stage],
  )
}
