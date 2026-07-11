import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  initDb,
  getStages,
  setStage,
  getSeenCandidates,
  markCandidateSeen,
  dbMode,
  dbReady,
} from './db.js'
import { getCandidates, sheetMode } from './sheets.js'
import { getAuditData } from './audit.js'
import {
  initColaboradores,
  listColaboradores,
  getColaborador,
  createColaborador,
  updateColaborador,
  deleteColaborador,
  listRegistros,
  getRegistro,
  createRegistro,
  updateRegistro,
  deleteRegistro,
} from './colaboradores.js'
import {
  initFinanceiro,
  listLancamentos,
  getLancamento,
  createLancamento,
  updateLancamento,
  deleteLancamento,
  getFluxo,
  listDocumentos,
  getDocumento,
  createDocumento,
  updateDocumento,
  deleteDocumento,
  listPastas,
  createPasta,
  renamePasta,
  deletePasta,
  createArquivo,
  getArquivo,
} from './financeiro.js'
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
import { verifyPassword, signToken, requireAuth, requireRole, randomPassword, verifyFileSignature } from './auth.js'

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

/**
 * Exige login e recarrega o papel ATUAL do usuário do banco a cada requisição
 * (em vez de confiar no papel gravado no token). Assim, mudanças de perfil — e
 * a migração de papéis antigos (dono/gestor/vendedor) — valem na hora, sem que
 * tokens antigos fiquem presos num 403. Também bloqueia na hora quem foi
 * desativado.
 */
function authFresh(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const user = await getUserById(req.user.id)
      if (!user || !user.active) return res.status(401).json({ error: 'unauthorized' })
      req.user = { id: user.id, role: user.role, email: user.email }
      next()
    } catch (error) {
      console.error('[auth] erro ao recarregar usuário:', error)
      res.status(500).json({ error: 'auth_failed' })
    }
  })
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

app.get('/api/auth/me', authFresh, async (req, res) => {
  const user = await getUserById(req.user.id)
  if (!user || !user.active) return res.status(401).json({ error: 'unauthorized' })
  res.json({ user: strip(user) })
})

app.post('/api/auth/change-password', authFresh, async (req, res) => {
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

// ── Usuários (apenas Administrador) ──
app.get('/api/users', authFresh, requireRole('admin'), async (_req, res) => {
  res.json({ users: await listUsers() })
})

app.post('/api/users', authFresh, requireRole('admin'), async (req, res) => {
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

app.patch('/api/users/:id', authFresh, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  const { name, role, active } = req.body || {}
  if (role !== undefined && !ROLES.has(role)) return res.status(400).json({ error: 'invalid_role' })
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  // Protege o último administrador ativo de ser rebaixado/desativado.
  const losingOwner = target.role === 'admin' && ((role && role !== 'admin') || active === false)
  if (losingOwner && (await countOwners()) <= 1) {
    return res.status(400).json({ error: 'last_owner' })
  }
  await updateUser(id, { name, role, active })
  res.json({ user: await getUserByIdPublic(id) })
})

app.post('/api/users/:id/reset-password', authFresh, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  const { newPassword } = req.body || {}
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  const generated = !newPassword || String(newPassword).length < 6
  const finalPassword = generated ? randomPassword(12) : newPassword
  await updatePassword(id, finalPassword)
  res.json({ ok: true, generatedPassword: generated ? finalPassword : undefined })
})

app.delete('/api/users/:id', authFresh, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id)
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'cannot_delete_self' })
  const target = await getUserById(id)
  if (!target) return res.status(404).json({ error: 'not_found' })
  if (target.role === 'admin' && (await countOwners()) <= 1) {
    return res.status(400).json({ error: 'last_owner' })
  }
  await deleteUser(id)
  res.json({ ok: true })
})

// ── Auditoria de leads (Comercial) ──
app.get('/api/audit', authFresh, requireRole('admin', 'gerente_comercial'), async (_req, res) => {
  try {
    res.json(await getAuditData())
  } catch (error) {
    console.error('[api] erro na auditoria:', error)
    res.status(502).json({ error: 'fetch_failed' })
  }
})

// ── Etapas do Kanban (RH & Desenvolvimento) ──
app.get('/api/stages', authFresh, requireRole('admin', 'gerente_operacoes'), async (_req, res) => {
  res.json({ stages: await listStages() })
})

app.post('/api/stages', authFresh, requireRole('admin', 'gerente_operacoes'), async (req, res) => {
  const label = String(req.body?.label || '').trim()
  if (!label) return res.status(400).json({ error: 'missing_label' })
  res.json({ stage: await createStage(label) })
})

app.patch('/api/stages/:id', authFresh, requireRole('admin', 'gerente_operacoes'), async (req, res) => {
  const { label, position } = req.body || {}
  await updateStage(req.params.id, {
    label: label !== undefined ? String(label).trim() : undefined,
    position,
  })
  res.json({ ok: true })
})

app.put('/api/stages/order', authFresh, requireRole('admin', 'gerente_operacoes'), async (req, res) => {
  const order = req.body?.order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'invalid_order' })
  await reorderStages(order)
  res.json({ ok: true })
})

app.delete('/api/stages/:id', authFresh, requireRole('admin', 'gerente_operacoes'), async (req, res) => {
  const stages = await listStages()
  if (stages.length <= 1) return res.status(400).json({ error: 'last_stage' })
  await deleteStage(req.params.id)
  res.json({ ok: true })
})

// ── Candidatos (RH & Desenvolvimento) ──
app.get('/api/candidates', authFresh, requireRole('admin', 'gerente_operacoes'), async (_req, res) => {
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
  authFresh,
  requireRole('admin', 'gerente_operacoes'),
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

// Cards de recrutamento já vistos por ESTE usuário (selo "Novo").
app.get(
  '/api/candidates/seen',
  authFresh,
  requireRole('admin', 'gerente_operacoes'),
  async (req, res) => {
    res.json({ seen: await getSeenCandidates(req.user.id) })
  },
)

app.post(
  '/api/candidates/:id/seen',
  authFresh,
  requireRole('admin', 'gerente_operacoes'),
  async (req, res) => {
    try {
      await markCandidateSeen(req.user.id, req.params.id)
      res.json({ ok: true })
    } catch (error) {
      console.error('[api] erro ao marcar visto:', error)
      res.status(500).json({ error: 'save_failed' })
    }
  },
)

// ── Colaboradores (RH & Desenvolvimento) ──
const rhRole = requireRole('admin', 'gerente_operacoes')

app.get('/api/colaboradores', authFresh, rhRole, async (_req, res) => {
  try {
    res.json({ colaboradores: await listColaboradores() })
  } catch (error) {
    console.error('[api] erro ao listar colaboradores:', error)
    res.status(500).json({ error: 'list_failed' })
  }
})

app.post('/api/colaboradores', authFresh, rhRole, async (req, res) => {
  const nome = String(req.body?.nome || '').trim()
  if (!nome) return res.status(400).json({ error: 'missing_nome' })
  try {
    res.json({ colaborador: await createColaborador(req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao criar colaborador:', error)
    res.status(500).json({ error: 'create_failed' })
  }
})

app.get('/api/colaboradores/:id', authFresh, rhRole, async (req, res) => {
  const c = await getColaborador(req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  res.json({ colaborador: c })
})

app.patch('/api/colaboradores/:id', authFresh, rhRole, async (req, res) => {
  const c = await getColaborador(req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  try {
    res.json({ colaborador: await updateColaborador(req.params.id, req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao atualizar colaborador:', error)
    res.status(500).json({ error: 'update_failed' })
  }
})

app.delete('/api/colaboradores/:id', authFresh, rhRole, async (req, res) => {
  const c = await getColaborador(req.params.id)
  if (!c) return res.status(404).json({ error: 'not_found' })
  await deleteColaborador(req.params.id)
  res.json({ ok: true })
})

// Registros da ficha (advertências, suspensões, férias, avaliações…)
app.get('/api/colaboradores/:id/registros', authFresh, rhRole, async (req, res) => {
  try {
    res.json({ registros: await listRegistros(req.params.id, req.query.tipo) })
  } catch (error) {
    console.error('[api] erro ao listar registros:', error)
    res.status(500).json({ error: 'list_failed' })
  }
})

app.post('/api/colaboradores/:id/registros', authFresh, rhRole, async (req, res) => {
  if (!String(req.body?.tipo || '').trim()) return res.status(400).json({ error: 'missing_tipo' })
  try {
    res.json({ registro: await createRegistro(req.params.id, req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao criar registro:', error)
    res.status(500).json({ error: 'create_failed' })
  }
})

app.patch('/api/colaboradores/:id/registros/:rid', authFresh, rhRole, async (req, res) => {
  const r = await getRegistro(req.params.rid)
  if (!r) return res.status(404).json({ error: 'not_found' })
  try {
    res.json({ registro: await updateRegistro(req.params.rid, req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao atualizar registro:', error)
    res.status(500).json({ error: 'update_failed' })
  }
})

app.delete('/api/colaboradores/:id/registros/:rid', authFresh, rhRole, async (req, res) => {
  const r = await getRegistro(req.params.rid)
  if (!r) return res.status(404).json({ error: 'not_found' })
  await deleteRegistro(req.params.rid)
  res.json({ ok: true })
})

// ── Financeiro: contas a pagar e a receber ──
const finRole = requireRole('admin', 'financeiro', 'contabilidade')

app.get('/api/financeiro/lancamentos', authFresh, finRole, async (req, res) => {
  try {
    res.json({ lancamentos: await listLancamentos(req.query.tipo) })
  } catch (error) {
    console.error('[api] erro ao listar lançamentos:', error)
    res.status(500).json({ error: 'list_failed' })
  }
})

app.post('/api/financeiro/lancamentos', authFresh, finRole, async (req, res) => {
  try {
    res.json({ lancamento: await createLancamento(req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao criar lançamento:', error)
    res.status(500).json({ error: 'create_failed' })
  }
})

app.get('/api/financeiro/lancamentos/:id', authFresh, finRole, async (req, res) => {
  const l = await getLancamento(req.params.id)
  if (!l) return res.status(404).json({ error: 'not_found' })
  res.json({ lancamento: l })
})

app.patch('/api/financeiro/lancamentos/:id', authFresh, finRole, async (req, res) => {
  const l = await getLancamento(req.params.id)
  if (!l) return res.status(404).json({ error: 'not_found' })
  try {
    res.json({ lancamento: await updateLancamento(req.params.id, req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao atualizar lançamento:', error)
    res.status(500).json({ error: 'update_failed' })
  }
})

app.delete('/api/financeiro/lancamentos/:id', authFresh, finRole, async (req, res) => {
  const l = await getLancamento(req.params.id)
  if (!l) return res.status(404).json({ error: 'not_found' })
  await deleteLancamento(req.params.id)
  res.json({ ok: true })
})

app.get('/api/financeiro/fluxo', authFresh, finRole, async (_req, res) => {
  try {
    res.json(await getFluxo())
  } catch (error) {
    console.error('[api] erro no fluxo de caixa:', error)
    res.status(500).json({ error: 'fluxo_failed' })
  }
})

// Documentos por link (notas fiscais, contratos, contábeis)
app.get('/api/financeiro/documentos', authFresh, finRole, async (req, res) => {
  try {
    res.json({ documentos: await listDocumentos(req.query.tipo) })
  } catch (error) {
    console.error('[api] erro ao listar documentos:', error)
    res.status(500).json({ error: 'list_failed' })
  }
})

app.post('/api/financeiro/documentos', authFresh, finRole, async (req, res) => {
  if (!String(req.body?.tipo || '').trim()) return res.status(400).json({ error: 'missing_tipo' })
  try {
    res.json({ documento: await createDocumento(req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao criar documento:', error)
    res.status(500).json({ error: 'create_failed' })
  }
})

app.patch('/api/financeiro/documentos/:id', authFresh, finRole, async (req, res) => {
  const d = await getDocumento(req.params.id)
  if (!d) return res.status(404).json({ error: 'not_found' })
  try {
    res.json({ documento: await updateDocumento(req.params.id, req.body || {}) })
  } catch (error) {
    console.error('[api] erro ao atualizar documento:', error)
    res.status(500).json({ error: 'update_failed' })
  }
})

app.delete('/api/financeiro/documentos/:id', authFresh, finRole, async (req, res) => {
  const d = await getDocumento(req.params.id)
  if (!d) return res.status(404).json({ error: 'not_found' })
  await deleteDocumento(req.params.id)
  res.json({ ok: true })
})

// ── Pastas de documentos financeiros ──
app.get('/api/financeiro/pastas', authFresh, finRole, async (req, res) => {
  try {
    res.json({ pastas: await listPastas(req.query.tipo) })
  } catch (error) {
    console.error('[api] erro ao listar pastas:', error)
    res.status(500).json({ error: 'list_failed' })
  }
})

app.post('/api/financeiro/pastas', authFresh, finRole, async (req, res) => {
  try {
    res.json({ pasta: await createPasta(req.body || {}) })
  } catch (error) {
    res.status(400).json({ error: 'create_failed' })
  }
})

app.patch('/api/financeiro/pastas/:id', authFresh, finRole, async (req, res) => {
  try {
    const pasta = await renamePasta(req.params.id, req.body?.nome)
    if (!pasta) return res.status(404).json({ error: 'not_found' })
    res.json({ pasta })
  } catch (error) {
    res.status(400).json({ error: 'update_failed' })
  }
})

app.delete('/api/financeiro/pastas/:id', authFresh, finRole, async (req, res) => {
  try {
    await deletePasta(req.params.id)
    res.json({ ok: true })
  } catch (error) {
    if (String(error?.message) === 'not_empty') return res.status(409).json({ error: 'not_empty' })
    console.error('[api] erro ao remover pasta:', error)
    res.status(500).json({ error: 'delete_failed' })
  }
})

// ── Upload de arquivo (bytes crus → guardado no banco) ──
app.post(
  '/api/financeiro/arquivos',
  authFresh,
  finRole,
  express.raw({ type: () => true, limit: '25mb' }),
  async (req, res) => {
    try {
      const buffer = Buffer.isBuffer(req.body) ? req.body : null
      if (!buffer || buffer.length === 0) return res.status(400).json({ error: 'empty_file' })
      const arquivo = await createArquivo({
        nome: String(req.query.nome || 'arquivo'),
        mime: String(req.query.mime || 'application/octet-stream'),
        buffer,
      })
      res.json({ arquivo })
    } catch (error) {
      console.error('[api] erro no upload:', error)
      res.status(500).json({ error: 'upload_failed' })
    }
  },
)

// Servir o arquivo com URL assinada (sem Bearer, para <img>/<iframe>). ?dl=1 baixa.
app.get('/api/financeiro/arquivos/:id', async (req, res) => {
  const { id } = req.params
  if (!verifyFileSignature(id, req.query.exp, req.query.sig)) return res.status(403).send('forbidden')
  try {
    const arquivo = await getArquivo(id)
    if (!arquivo || !arquivo.conteudo) return res.status(404).send('not found')
    const safe = String(arquivo.nome || 'arquivo').replace(/[\r\n"\\]/g, '_')
    res.setHeader('Content-Type', arquivo.mime || 'application/octet-stream')
    res.setHeader('Content-Length', arquivo.conteudo.length)
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${safe}"`)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(arquivo.conteudo)
  } catch (error) {
    console.error('[api] erro ao servir arquivo:', error)
    res.status(500).send('error')
  }
})

// ── Frontend estático (produção) ──
app.use(express.static(distDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT || 8787

initDb()
  .then(() => initUsers())
  .then(() => initStages())
  .then(() => initColaboradores())
  .then(() => initFinanceiro())
  .catch((error) => {
    console.error('[boot] falha ao inicializar banco/usuários/etapas:', error)
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`[server] ouvindo em http://localhost:${port}  (db: ${dbMode}, sheet: ${sheetMode})`)
    })
  })
