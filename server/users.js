import { getPool } from './db.js'
import { hashPassword, randomPassword } from './auth.js'

/**
 * Usuários e papéis (dono, gestor, vendedor).
 * Usa PostgreSQL quando disponível; caso contrário, um armazenamento em memória
 * (para desenvolvimento sem banco). O usuário "dono" é criado no primeiro boot.
 */

export const ROLES = new Set(['dono', 'gestor', 'vendedor'])

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'contatodanielsolda@gmail.com').toLowerCase()
const OWNER_NAME = process.env.OWNER_NAME || 'Daniel Solda'

// ── Armazenamento em memória (fallback) ──
const memUsers = new Map()
let memSeq = 1

function publicUser(user) {
  if (!user) return null
  const { password_hash, ...rest } = user
  return rest
}

export async function initUsers() {
  const pool = getPool()
  if (pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            serial PRIMARY KEY,
        email         text UNIQUE NOT NULL,
        name          text NOT NULL DEFAULT '',
        password_hash text NOT NULL,
        role          text NOT NULL DEFAULT 'vendedor',
        active        boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `)
  }
  await seedOwner()
}

async function seedOwner() {
  const existing = await getUserByEmail(OWNER_EMAIL)
  if (existing) return

  const password = process.env.OWNER_PASSWORD || randomPassword(14)
  await insertUser({
    email: OWNER_EMAIL,
    name: OWNER_NAME,
    role: 'dono',
    password_hash: await hashPassword(password),
    active: true,
  })

  console.log('\n================= USUÁRIO DONO CRIADO =================')
  console.log(`  email: ${OWNER_EMAIL}`)
  if (process.env.OWNER_PASSWORD) {
    console.log('  senha: (definida via OWNER_PASSWORD)')
  } else {
    console.log(`  senha temporária: ${password}`)
    console.log('  ⚠ troque a senha após o primeiro login.')
  }
  console.log('======================================================\n')
}

// ── Operações ──
async function insertUser({ email, name, role, password_hash, active }) {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, role, password_hash, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, name, role, password_hash, active],
    )
    return rows[0]
  }
  const user = {
    id: memSeq++,
    email,
    name,
    role,
    password_hash,
    active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  memUsers.set(user.id, user)
  return user
}

export async function getUserByEmail(email) {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email])
    return rows[0] || null
  }
  return [...memUsers.values()].find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
}

export async function getUserById(id) {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
    return rows[0] || null
  }
  return memUsers.get(Number(id)) || null
}

export async function getUserByIdPublic(id) {
  return publicUser(await getUserById(id))
}

export async function listUsers() {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query(
      'SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at ASC, id ASC',
    )
    return rows
  }
  return [...memUsers.values()]
    .sort((a, b) => a.id - b.id)
    .map((u) => publicUser(u))
}

export async function createUser({ email, name, role, password }) {
  const user = await insertUser({
    email,
    name: name || '',
    role,
    password_hash: await hashPassword(password),
    active: true,
  })
  return publicUser(user)
}

export async function updatePassword(id, newPassword) {
  const hash = await hashPassword(newPassword)
  const pool = getPool()
  if (pool) {
    await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
      hash,
      id,
    ])
    return
  }
  const user = memUsers.get(Number(id))
  if (user) {
    user.password_hash = hash
    user.updated_at = new Date().toISOString()
  }
}

export async function updateUser(id, { name, role, active }) {
  const pool = getPool()
  if (pool) {
    const fields = []
    const values = []
    let i = 1
    if (name !== undefined) {
      fields.push(`name = $${i++}`)
      values.push(name)
    }
    if (role !== undefined) {
      fields.push(`role = $${i++}`)
      values.push(role)
    }
    if (active !== undefined) {
      fields.push(`active = $${i++}`)
      values.push(active)
    }
    if (fields.length === 0) return
    values.push(id)
    await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = now() WHERE id = $${i}`,
      values,
    )
    return
  }
  const user = memUsers.get(Number(id))
  if (user) {
    if (name !== undefined) user.name = name
    if (role !== undefined) user.role = role
    if (active !== undefined) user.active = active
    user.updated_at = new Date().toISOString()
  }
}

export async function deleteUser(id) {
  const pool = getPool()
  if (pool) {
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    return
  }
  memUsers.delete(Number(id))
}

export async function countOwners() {
  const pool = getPool()
  if (pool) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM users WHERE role = 'dono' AND active = true",
    )
    return rows[0].n
  }
  return [...memUsers.values()].filter((u) => u.role === 'dono' && u.active).length
}
