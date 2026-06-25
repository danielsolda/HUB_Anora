import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getStages, setStage, dbMode, dbReady } from './db.js'
import { getCandidates, sheetMode } from './sheets.js'
import { STAGE_IDS } from './stages.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')

const app = express()
app.use(express.json())
app.use(cors())

// ── API ──
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: dbMode, dbConnected: dbReady(), sheet: sheetMode })
})

// Lista candidatos da planilha, com a etapa salva no banco (quando houver).
app.get('/api/candidates', async (_req, res) => {
  try {
    const [{ candidates, source }, stages] = await Promise.all([getCandidates(), getStages()])
    const merged = candidates.map((c) => (stages[c.id] ? { ...c, stage: stages[c.id] } : c))
    res.json({ candidates: merged, source })
  } catch (error) {
    console.error('[api] erro ao listar candidatos:', error)
    res.status(502).json({ error: 'fetch_failed', message: String(error?.message || error) })
  }
})

// Salva a movimentação de um card (etapa).
app.patch('/api/candidates/:id/stage', async (req, res) => {
  const { id } = req.params
  const { stage } = req.body || {}
  if (!STAGE_IDS.has(stage)) {
    return res.status(400).json({ error: 'invalid_stage' })
  }
  try {
    await setStage(id, stage)
    res.json({ ok: true, id, stage })
  } catch (error) {
    console.error('[api] erro ao salvar etapa:', error)
    res.status(500).json({ error: 'save_failed' })
  }
})

// ── Frontend estático (produção) ──
app.use(express.static(distDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT || 8787

initDb()
  .catch((error) => {
    console.error('[db] falha ao inicializar (seguindo mesmo assim):', error)
  })
  .finally(() => {
    app.listen(port, () => {
      console.log(`[server] ouvindo em http://localhost:${port}  (db: ${dbMode}, sheet: ${sheetMode})`)
    })
  })
