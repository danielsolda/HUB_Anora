import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

/**
 * Autenticação: hash de senha (bcrypt), tokens (JWT) e middlewares de proteção.
 */

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
if (!process.env.JWT_SECRET) {
  console.warn(
    '[auth] JWT_SECRET não definido — usando segredo temporário (as sessões caem a cada reinício). Defina JWT_SECRET no ambiente.',
  )
}
const JWT_EXPIRES = '7d'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

/** Senha aleatória legível (para bootstrap do dono e reset pelo admin). */
export function randomPassword(length = 12) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length)
}

/** Exige um token válido; popula req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = token ? verifyToken(token) : null
  if (!payload) return res.status(401).json({ error: 'unauthorized' })
  req.user = { id: payload.sub, role: payload.role, email: payload.email }
  next()
}

/** Exige que req.user tenha um dos papéis informados. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    next()
  }
}
