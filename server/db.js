import pg from 'pg'

/**
 * Persistência das movimentações do Kanban.
 * Usa PostgreSQL quando DATABASE_URL está definida; caso contrário, cai para um
 * armazenamento em memória (não persiste entre reinícios) — útil em
 * desenvolvimento e para o primeiro boot antes de configurar o banco.
 */

let pool = null
let ready = false
const memory = new Map()
const seenMem = new Map() // userId -> Set<candidateId> (fallback em memória)

export const dbMode = process.env.DATABASE_URL ? 'pg' : 'memory'
export const dbReady = () => ready

/** Pool do PostgreSQL (ou null em modo memória). Usado por users.js. */
export const getPool = () => pool

/**
 * Decide o SSL da conexão.
 *   - PGSSL=disable|require força o comportamento.
 *   - Conexões locais e da rede interna do Railway (`*.railway.internal`) não
 *     usam SSL; as públicas (proxy) usam, sem validar o certificado.
 */
function sslConfig(url) {
  const mode = (process.env.PGSSL || '').toLowerCase()
  if (mode === 'disable' || mode === 'false') return false
  if (mode === 'require' || mode === 'true') return { rejectUnauthorized: false }
  if (/localhost|127\.0\.0\.1|::1|\.railway\.internal|\.internal|sslmode=disable/.test(url)) {
    return false
  }
  return { rejectUnauthorized: false }
}

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL ausente — usando memória (movimentações não persistem).')
    return
  }

  const url = process.env.DATABASE_URL
  pool = new pg.Pool({ connectionString: url, ssl: sslConfig(url) })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_stages (
      candidate_id text PRIMARY KEY,
      stage        text NOT NULL,
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `)
  // Cards de recrutamento já vistos, por usuário (selo "Novo").
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_views (
      user_id      int NOT NULL,
      candidate_id text NOT NULL,
      seen_at      timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, candidate_id)
    )
  `)
  ready = true
  console.log('[db] PostgreSQL conectado.')
}

/**
 * Retorna um mapa { candidate_id: stage } com as etapas salvas.
 * Em caso de erro de leitura, devolve vazio para não quebrar o quadro — os
 * candidatos seguem aparecendo com a etapa padrão.
 */
export async function getStages() {
  if (!pool) return Object.fromEntries(memory)
  try {
    const { rows } = await pool.query('SELECT candidate_id, stage FROM candidate_stages')
    return Object.fromEntries(rows.map((r) => [r.candidate_id, r.stage]))
  } catch (error) {
    console.error('[db] erro ao ler etapas (seguindo sem elas):', error.message)
    return {}
  }
}

/** Salva (upsert) a etapa de um candidato. Lança erro para o chamador tratar. */
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

/** Ids dos candidatos que ESTE usuário já abriu (para o selo "Novo"). */
export async function getSeenCandidates(userId) {
  if (!pool) return [...(seenMem.get(Number(userId)) || [])]
  try {
    const { rows } = await pool.query(
      'SELECT candidate_id FROM candidate_views WHERE user_id = $1',
      [userId],
    )
    return rows.map((r) => r.candidate_id)
  } catch (error) {
    console.error('[db] erro ao ler vistos (seguindo sem eles):', error.message)
    return []
  }
}

/** Marca um candidato como visto por um usuário (idempotente). */
export async function markCandidateSeen(userId, candidateId) {
  if (!pool) {
    let set = seenMem.get(Number(userId))
    if (!set) {
      set = new Set()
      seenMem.set(Number(userId), set)
    }
    set.add(candidateId)
    return
  }
  await pool.query(
    `INSERT INTO candidate_views (user_id, candidate_id)
     VALUES ($1, $2) ON CONFLICT (user_id, candidate_id) DO NOTHING`,
    [userId, candidateId],
  )
}
