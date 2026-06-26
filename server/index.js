import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getStages, setStage, dbMode, dbReady } from './db.js'
import { getCandidates, sheetMode } from './sheets.js'
import { getAuditData } from './audit.js'
import {
  initStages,
  listStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
  stageIds,
} from './stages.js'
import {
  initUsers,
  getUserByEmail,
  getUserById,
  getUserByIdPublic,
  listUsers,
  createUser,
  updatePassword,
  updateUser,
  deleteUser,
  countOwners,
  ROLES,
} from './users.js'
import { verifyPassword, signToken, requireAuth, requireRole, randomPassword } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')

const app = express()
app.use(express.json())
app.use(cors())

const strip = (user) => {
  if (!user) return null
  const { password_hash, ...rest } = user
  return rest
}

// ── Saúde ──
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: dbMode, dbConnected: dbReady(), sheet: sheetMode })
})

// ── Autenticação ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
  const user = await getUserByEmail(String(email).toLowerCase())
  if (!user || !user.active) return res.status(401).json({ error: 'invalid_credentials' })
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
  res.json({ token: signToken(user), user: strip(user) })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id)
  if (!user || !user.active) return res.status(401).json({ error: 'unauthorized' })
  res.json({ user: strip(user) })
})

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'weak_password' })
  }
  const user = await getUserById(req.user.id)
  const ok = await verifyPassword(currentPassword || '', user.password_hash)
  if (!ok) return res.status(400).json({ error: 'wrong_current' })
  await updatePassword(user.id, newPassword)
  res.json({ ok: true })
})

// ── Usuários (apenas dono) ──
app.get('/api/users', requireAuth, requireRole('dono'), async (_req, res) => {
  res.json({ users: await listUsers() })
})

app.post('/api/users', requireAuth, requireRole('dono'), async (req, res) => {
  const { email, name, role, password } = req.body || {}
  if (!email || !ROLES.has(role)) return res.status(400).json({ error: 'invalid_data' })
  if (await getUserByEmail(String(email).toLowerCase())) {
    return res.status(409).json({ error: 'email_taken' })
  }
  const generated = !password || String(password).length < 6
  const finalPassword = generated ? randomPassword(12) : password
  const user = await createUser({
    email: String(email).toLowerCase(),
    name,
    role,
    password: finalPassword,
  })
  res.json({ user, generatedPassword: generated ? finalPassword : undefined })
})

app.patch('/api/users/:id', requireAuth, requireRole('dono'), async (req, res) => {
  const id = Number(req.params.id)
  const { name, role, active } = req.body || {}
  if (role !== undefined && !ROLES.has(role)) return res.status(400).json({ error: 'invalid_role' })
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  // Protege o último dono ativo de ser rebaixado/desativado.
  const losingOwner = target.role === 'dono' && ((role && role !== 'dono') || active === false)
  if (losingOwner && (await countOwners()) <= 1) {
    return res.status(400).json({ error: 'last_owner' })
  }
  await updateUser(id, { name, role, active })
  res.json({ user: await getUserByIdPublic(id) })
})

app.post('/api/users/:id/reset-password', requireAuth, requireRole('dono'), async (req, res) => {
  const id = Number(req.params.id)
  const { newPassword } = req.body || {}
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  const generated = !newPassword || String(newPassword).length < 6
  const finalPassword = generated ? randomPassword(12) : newPassword
  await updatePassword(id, finalPassword)
  res.json({ ok: true, generatedPassword: generated ? finalPassword : undefined })
})

app.delete('/api/users/:id', requireAuth, requireRole('dono'), async (req, res) => {
  const id = Number(req.params.id)
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'cannot_delete_self' })
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.role === 'dono' && (await countOwners()) <= 1) {
    return res.status(400).json({ error: 'last_owner' })
  }
  await deleteUser(id)
  res.json({ ok: true })
})

// ── Auditoria de leads (dono e gestor) ──
app.get('/api/audit', requireAuth, requireRole('dono', 'gestor'), async (_req, res) => {
  try {
    res.json(await getAuditData())
  } catch (error) {
    console.error('[api] erro na auditoria:', error)
    res.status(502).json({ error: 'fetch_failed' })
  }
})

// ── Etapas do Kanban (dono e gestor) ──
app.get('/api/stages', requireAuth, requireRole('dono', 'gestor'), async (_req, res) => {
  res.json({ stages: await listStages() })
})

app.post('/api/stages', requireAuth, requireRole('dono', 'gestor'), async (req, res) => {
  const label = String(req.body?.label || '').trim()
  if (!label) return res.status(400).json({ error: 'missing_label' })
  res.json({ stage: await createStage(label) })
})

app.patch('/api/stages/:id', requireAuth, requireRole('dono', 'gestor'), async (req, res) => {
  const { label, position } = req.body || {}
  await updateStage(req.params.id, {
    label: label !== undefined ? String(label).trim() : undefined,
    position,
  })
  res.json({ ok: true })
})

app.put('/api/stages/order', requireAuth, requireRole('dono', 'gestor'), async (req, res) => {
  const order = req.body?.order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'invalid_order' })
  await reorderStages(order)
  res.json({ ok: true })
})

app.delete('/api/stages/:id', requireAuth, requireRole('dono', 'gestor'), async (req, res) => {
  const stages = await listStages()
  if (stages.length <= 1) return res.status(400).json({ error: 'last_stage' })
  await deleteStage(req.params.id)
  res.json({ ok: true })
})

// ── Candidatos (dono e gestor) ──
app.get('/api/candidates', requireAuth, requireRole('dono', 'gestor'), async (_req, res) => {
  try {
    const [{ candidates, source }, stages] = await Promise.all([getCandidates(), getStages()])
    const merged = candidates.map((c) => (stages[c.id] ? { ...c, stage: stages[c.id] } : c))
    res.json({ candidates: merged, source })
  } catch (error) {
    console.error('[api] erro ao listar candidatos:', error)
    res.status(502).json({ error: 'fetch_failed', message: String(error?.message || error) })
  }
})

app.patch(
  '/api/candidates/:id/stage',
  requireAuth,
  requireRole('dono', 'gestor'),
  async (req, res) => {
    const { id } = req.params
    const { stage } = req.body || {}
    if (!(await stageIds()).has(stage)) return res.status(400).json({ error: 'invalid_stage' })
    try {
      await setStage(id, stage)
      res.json({ ok: true, id, stage })
    } catch (error) {
      console.error('[api] erro ao salvar etapa:', error)
      res.status(500).json({ error: 'save_failed' })
    }
  },
)

// ── Frontend estático (produção) ──
app.use(express.static(distDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT || 8787

initDb()
  .then(() => initUsers())
  .then(() => initStages())
  .catch((error) => {
    console.error('[boot] falha ao inicializar banco/usuários/etapas:', error)
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`[server] ouvindo em http://localhost:${port}  (db: ${dbMode}, sheet: ${sheetMode})`)
    })
  })
