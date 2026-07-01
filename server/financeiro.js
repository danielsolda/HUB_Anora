import crypto from 'node:crypto'
import { getPool } from './db.js'
import { fileSignature } from './auth.js'

/**
 * Lançamentos financeiros: contas a pagar e a receber (módulo Financeiro).
 * Um lançamento tem um `tipo` ('pagar' | 'receber'); o resto é igual, então
 * Fluxo de caixa e Relatórios podem somar os dois depois.
 * Valores são guardados em CENTAVOS (inteiro) para evitar erro de ponto
 * flutuante; a API troca para reais (número) na entrada e na saída.
 */

export const TIPOS = new Set(['pagar', 'receber'])
export const STATUSES = new Set(['pendente', 'pago', 'cancelado'])

const TEXT_FIELDS = ['descricao', 'categoria', 'contraparte', 'forma', 'observacoes']

const mem = new Map()
let memSeq = 1

function clean(v) {
  return v === undefined || v === null ? '' : String(v).trim()
}

function toCents(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

function dateOrNull(v) {
  const s = clean(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function serverToday() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Soma n meses a uma data 'YYYY-MM-DD', ajustando o dia ao fim do mês. */
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = (m - 1) + n
  const ty = y + Math.floor(target / 12)
  const tm = ((target % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return `${ty}-${pad2(tm + 1)}-${pad2(Math.min(d, lastDay))}`
}

function sanitize(input, { partial } = {}) {
  const out = {}
  const set = (k, val) => {
    if (partial && input[k] === undefined) return
    out[k] = val
  }
  if (!partial || input.tipo !== undefined) {
    const t = clean(input.tipo)
    out.tipo = TIPOS.has(t) ? t : 'pagar'
  }
  set('valor_centavos', toCents(input.valor))
  set('vencimento', dateOrNull(input.vencimento))
  set('pago_em', dateOrNull(input.pago_em))
  if (!partial || input.status !== undefined) {
    const s = clean(input.status) || 'pendente'
    out.status = STATUSES.has(s) ? s : 'pendente'
  }
  for (const f of TEXT_FIELDS) set(f, clean(input[f]))
  return out
}

function shape(row) {
  if (!row) return null
  const { valor_centavos, ...rest } = row
  return { ...rest, valor: (valor_centavos || 0) / 100 }
}

export async function initFinanceiro() {
  const pool = getPool()
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
      id             serial PRIMARY KEY,
      tipo           text NOT NULL,
      descricao      text NOT NULL DEFAULT '',
      valor_centavos integer NOT NULL DEFAULT 0,
      vencimento     date,
      status         text NOT NULL DEFAULT 'pendente',
      categoria      text NOT NULL DEFAULT '',
      contraparte    text NOT NULL DEFAULT '',
      pago_em        date,
      forma          text NOT NULL DEFAULT '',
      observacoes    text NOT NULL DEFAULT '',
      grupo          text,
      parcela        integer,
      parcelas_total integer,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `)
  // Colunas de parcelamento (para tabelas criadas antes desta versão).
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS grupo text')
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcela integer')
  await pool.query('ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parcelas_total integer')
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_fin_tipo ON financeiro_lancamentos (tipo, vencimento)',
  )
  // Documentos por link (notas fiscais, contratos com fornecedores, contábeis).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_documentos (
      id          serial PRIMARY KEY,
      tipo        text NOT NULL,
      titulo      text NOT NULL DEFAULT '',
      link        text NOT NULL DEFAULT '',
      data        date,
      categoria   text NOT NULL DEFAULT '',
      contraparte text NOT NULL DEFAULT '',
      observacoes text NOT NULL DEFAULT '',
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_fin_doc_tipo ON financeiro_documentos (tipo, data)')
  // Pasta (organização em árvore) e arquivo anexado (upload guardado no banco).
  await pool.query('ALTER TABLE financeiro_documentos ADD COLUMN IF NOT EXISTS pasta_id integer')
  await pool.query('ALTER TABLE financeiro_documentos ADD COLUMN IF NOT EXISTS arquivo_id integer')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_pastas (
      id         serial PRIMARY KEY,
      tipo       text NOT NULL,
      nome       text NOT NULL DEFAULT '',
      parent_id  integer REFERENCES financeiro_pastas(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_fin_pasta_tipo ON financeiro_pastas (tipo, parent_id)')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financeiro_arquivos (
      id         serial PRIMARY KEY,
      nome       text NOT NULL DEFAULT '',
      mime       text NOT NULL DEFAULT 'application/octet-stream',
      tamanho    integer NOT NULL DEFAULT 0,
      conteudo   bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
}

const SELECT = `
  SELECT id, tipo, descricao, valor_centavos,
         to_char(vencimento, 'YYYY-MM-DD') AS vencimento,
         status, categoria, contraparte,
         to_char(pago_em, 'YYYY-MM-DD') AS pago_em,
         forma, observacoes, grupo, parcela, parcelas_total, created_at
  FROM financeiro_lancamentos
`

export async function listLancamentos(tipo) {
  const pool = getPool()
  if (!pool) {
    return [...mem.values()]
      .filter((r) => !tipo || r.tipo === tipo)
      .sort((a, b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999') || b.id - a.id)
      .map(shape)
  }
  const params = []
  let where = ''
  if (tipo && TIPOS.has(tipo)) {
    params.push(tipo)
    where = 'WHERE tipo = $1'
  }
  const { rows } = await pool.query(`${SELECT} ${where} ORDER BY vencimento ASC NULLS LAST, id DESC`, params)
  return rows.map(shape)
}

export async function getLancamento(id) {
  const pool = getPool()
  if (!pool) return shape(mem.get(Number(id)) || null)
  const { rows } = await pool.query(`${SELECT} WHERE id = $1`, [id])
  return shape(rows[0] || null)
}

async function insertOne(data) {
  const row = {
    tipo: data.tipo || 'pagar',
    descricao: data.descricao || '',
    valor_centavos: data.valor_centavos || 0,
    vencimento: data.vencimento ?? null,
    status: data.status || 'pendente',
    categoria: data.categoria || '',
    contraparte: data.contraparte || '',
    pago_em: data.pago_em ?? null,
    forma: data.forma || '',
    observacoes: data.observacoes || '',
    grupo: data.grupo ?? null,
    parcela: data.parcela ?? null,
    parcelas_total: data.parcelas_total ?? null,
  }
  const pool = getPool()
  if (!pool) {
    const stored = { id: memSeq++, ...row, created_at: new Date().toISOString() }
    mem.set(stored.id, stored)
    return shape(stored)
  }
  const { rows } = await pool.query(
    `INSERT INTO financeiro_lancamentos
       (tipo, descricao, valor_centavos, vencimento, status, categoria, contraparte, pago_em, forma, observacoes, grupo, parcela, parcelas_total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      row.tipo, row.descricao, row.valor_centavos, row.vencimento, row.status, row.categoria,
      row.contraparte, row.pago_em, row.forma, row.observacoes, row.grupo, row.parcela, row.parcelas_total,
    ],
  )
  return getLancamento(rows[0].id)
}

/**
 * Cria um lançamento. Se vier `parcelas > 1` ou `entrada > 0`, gera o
 * parcelamento: uma entrada (opcional) + N parcelas mensais, ligadas por um
 * `grupo`. Cada parcela é um lançamento independente (pode ser paga sozinha).
 */
export async function createLancamento(input) {
  const base = sanitize(input)
  const parcelasN = Math.max(1, parseInt(input.parcelas, 10) || 1)
  const entradaCents = toCents(input.entrada)
  const parcelado = parcelasN > 1 || entradaCents > 0
  if (!parcelado) return insertOne(base)

  const totalCents = base.valor_centavos || 0
  const firstVenc = base.vencimento || serverToday()
  const grupo = crypto.randomUUID()
  const common = {
    tipo: base.tipo,
    descricao: base.descricao,
    categoria: base.categoria,
    contraparte: base.contraparte,
    forma: base.forma,
    observacoes: base.observacoes,
    grupo,
    parcelas_total: parcelasN,
  }

  let first = null
  let monthOffset = 0
  if (entradaCents > 0) {
    first = await insertOne({
      ...common,
      valor_centavos: Math.min(entradaCents, totalCents || entradaCents),
      vencimento: firstVenc,
      parcela: 0,
      status: input.entradaPaga ? 'pago' : 'pendente',
      pago_em: input.entradaPaga ? serverToday() : null,
    })
    monthOffset = 1 // parcelas começam no mês seguinte à entrada
  }

  const remaining = Math.max(0, totalCents - entradaCents)
  if (remaining > 0 || entradaCents === 0) {
    const baseParcela = Math.floor(remaining / parcelasN)
    for (let i = 1; i <= parcelasN; i++) {
      const cents = i === parcelasN ? remaining - baseParcela * (parcelasN - 1) : baseParcela
      const r = await insertOne({
        ...common,
        valor_centavos: cents,
        vencimento: addMonths(firstVenc, monthOffset + (i - 1)),
        parcela: i,
        status: 'pendente',
        pago_em: null,
      })
      first = first || r
    }
  }
  return first
}

export async function updateLancamento(id, input) {
  const data = sanitize(input, { partial: true })
  delete data.tipo // o tipo não muda
  const keys = Object.keys(data)
  if (keys.length === 0) return getLancamento(id)
  const pool = getPool()
  if (!pool) {
    const row = mem.get(Number(id))
    if (row) Object.assign(row, data)
    return shape(row || null)
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`)
  const values = keys.map((k) => data[k])
  values.push(id)
  await pool.query(
    `UPDATE financeiro_lancamentos SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
    values,
  )
  return getLancamento(id)
}

export async function deleteLancamento(id) {
  const pool = getPool()
  if (!pool) {
    mem.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM financeiro_lancamentos WHERE id = $1', [id])
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Fluxo de caixa mensal, em dois modos:
 *   - realizado: o que foi de fato pago/recebido (status 'pago', pela data do
 *     pagamento/recebimento);
 *   - previsto: tudo que não foi cancelado, pela data de vencimento.
 * Entradas = contas a receber; saídas = contas a pagar.
 */
export async function getFluxo() {
  const all = await listLancamentos()
  const realizado = new Map()
  const previsto = new Map()
  const add = (map, mes, tipo, valor) => {
    if (!mes) return
    let b = map.get(mes)
    if (!b) {
      b = { entradas: 0, saidas: 0 }
      map.set(mes, b)
    }
    if (tipo === 'receber') b.entradas += valor
    else b.saidas += valor
  }
  for (const l of all) {
    if (l.status === 'pago' && l.pago_em) add(realizado, l.pago_em.slice(0, 7), l.tipo, l.valor)
    if (l.status !== 'cancelado' && l.vencimento) add(previsto, l.vencimento.slice(0, 7), l.tipo, l.valor)
  }
  const toSeries = (map) =>
    [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, b]) => ({
        mes,
        entradas: round2(b.entradas),
        saidas: round2(b.saidas),
        saldo: round2(b.entradas - b.saidas),
      }))
  return { realizado: toSeries(realizado), previsto: toSeries(previsto) }
}

// ── Documentos (notas fiscais, contratos, contábeis) ──
// Cada documento pode apontar para um link externo OU para um arquivo enviado
// (guardado em financeiro_arquivos) e ficar dentro de uma pasta (árvore).
const DOC_TEXT_FIELDS = ['tipo', 'titulo', 'link', 'data', 'categoria', 'contraparte', 'observacoes']
const DOC_INT_FIELDS = ['pasta_id', 'arquivo_id']
const memDoc = new Map()
let memDocSeq = 1

function intOrNull(v) {
  if (v === undefined || v === null || v === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function sanitizeDoc(input, { partial } = {}) {
  const out = {}
  for (const f of DOC_TEXT_FIELDS) {
    if (partial && input[f] === undefined) continue
    out[f] = f === 'data' ? dateOrNull(input[f]) : clean(input[f])
  }
  for (const f of DOC_INT_FIELDS) {
    if (partial && input[f] === undefined) continue
    out[f] = intOrNull(input[f])
  }
  return out
}

const FILE_TTL_SECONDS = 12 * 3600

/** Monta a URL assinada (inline + download) de um arquivo anexado. */
function signedFileUrls(arquivoId) {
  const exp = Math.floor(Date.now() / 1000) + FILE_TTL_SECONDS
  const sig = fileSignature(arquivoId, exp)
  const base = `/api/financeiro/arquivos/${arquivoId}?exp=${exp}&sig=${sig}`
  return { url: base, download: `${base}&dl=1` }
}

/** Anexa o objeto `arquivo` (metadados + URLs) e normaliza pasta_id. */
function shapeDoc(row) {
  if (!row) return null
  const { arquivo_nome, arquivo_mime, arquivo_tamanho, ...rest } = row
  const pasta_id = rest.pasta_id ?? null
  let arquivo = null
  if (rest.arquivo_id) {
    arquivo = {
      id: rest.arquivo_id,
      nome: arquivo_nome || '',
      mime: arquivo_mime || 'application/octet-stream',
      tamanho: arquivo_tamanho || 0,
      ...signedFileUrls(rest.arquivo_id),
    }
  }
  return { ...rest, pasta_id, arquivo }
}

/** Para o modo memória (sem banco): busca o arquivo no mapa e aplica shapeDoc. */
function shapeMemDoc(d) {
  const a = d.arquivo_id ? memArq.get(d.arquivo_id) : null
  return shapeDoc({
    ...d,
    pasta_id: d.pasta_id ?? null,
    arquivo_id: d.arquivo_id ?? null,
    arquivo_nome: a?.nome,
    arquivo_mime: a?.mime,
    arquivo_tamanho: a?.tamanho,
  })
}

const DOC_SELECT = `
  SELECT d.id, d.tipo, d.titulo, d.link, to_char(d.data, 'YYYY-MM-DD') AS data,
         d.categoria, d.contraparte, d.observacoes, d.pasta_id, d.arquivo_id,
         a.nome AS arquivo_nome, a.mime AS arquivo_mime, a.tamanho AS arquivo_tamanho,
         d.created_at
  FROM financeiro_documentos d
  LEFT JOIN financeiro_arquivos a ON a.id = d.arquivo_id
`

export async function listDocumentos(tipo) {
  const pool = getPool()
  if (!pool) {
    return [...memDoc.values()]
      .filter((d) => !tipo || d.tipo === tipo)
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id - a.id)
      .map(shapeMemDoc)
  }
  const params = []
  let where = ''
  if (tipo) {
    params.push(tipo)
    where = 'WHERE d.tipo = $1'
  }
  const { rows } = await pool.query(`${DOC_SELECT} ${where} ORDER BY d.data DESC NULLS LAST, d.id DESC`, params)
  return rows.map(shapeDoc)
}

export async function getDocumento(id) {
  const pool = getPool()
  if (!pool) {
    const d = memDoc.get(Number(id))
    return d ? shapeMemDoc(d) : null
  }
  const { rows } = await pool.query(`${DOC_SELECT} WHERE d.id = $1`, [id])
  return shapeDoc(rows[0] || null)
}

export async function createDocumento(input) {
  const data = sanitizeDoc(input)
  if (!data.tipo) throw new Error('missing_tipo')
  const pool = getPool()
  if (!pool) {
    const row = { id: memDocSeq++, ...data, created_at: new Date().toISOString() }
    memDoc.set(row.id, row)
    return shapeMemDoc(row)
  }
  const { rows } = await pool.query(
    `INSERT INTO financeiro_documentos (tipo, titulo, link, data, categoria, contraparte, observacoes, pasta_id, arquivo_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      data.tipo, data.titulo || '', data.link || '', data.data ?? null, data.categoria || '',
      data.contraparte || '', data.observacoes || '', data.pasta_id ?? null, data.arquivo_id ?? null,
    ],
  )
  return getDocumento(rows[0].id)
}

export async function updateDocumento(id, input) {
  const data = sanitizeDoc(input, { partial: true })
  delete data.tipo
  const keys = Object.keys(data)
  if (keys.length === 0) return getDocumento(id)
  const pool = getPool()
  if (!pool) {
    const row = memDoc.get(Number(id))
    if (row) {
      const prevArquivo = row.arquivo_id
      Object.assign(row, data)
      if ('arquivo_id' in data && prevArquivo && prevArquivo !== row.arquivo_id) memArq.delete(prevArquivo)
    }
    return row ? shapeMemDoc(row) : null
  }
  // Se o arquivo anexado mudou, remove o antigo para não deixar lixo no banco.
  let orphan = null
  if ('arquivo_id' in data) {
    const { rows: prev } = await pool.query('SELECT arquivo_id FROM financeiro_documentos WHERE id = $1', [id])
    const prevId = prev[0]?.arquivo_id
    if (prevId && prevId !== data.arquivo_id) orphan = prevId
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`)
  const values = keys.map((k) => data[k])
  values.push(id)
  await pool.query(
    `UPDATE financeiro_documentos SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
    values,
  )
  if (orphan) await deleteArquivo(orphan)
  return getDocumento(id)
}

export async function deleteDocumento(id) {
  const pool = getPool()
  if (!pool) {
    const row = memDoc.get(Number(id))
    if (row?.arquivo_id) memArq.delete(row.arquivo_id)
    memDoc.delete(Number(id))
    return
  }
  const { rows } = await pool.query('SELECT arquivo_id FROM financeiro_documentos WHERE id = $1', [id])
  await pool.query('DELETE FROM financeiro_documentos WHERE id = $1', [id])
  if (rows[0]?.arquivo_id) await deleteArquivo(rows[0].arquivo_id)
}

// ── Pastas (organização dos documentos em árvore) ──
const memPasta = new Map()
let memPastaSeq = 1
const PASTA_SELECT = 'SELECT id, tipo, nome, parent_id, created_at FROM financeiro_pastas'

export async function listPastas(tipo) {
  const pool = getPool()
  if (!pool) {
    return [...memPasta.values()]
      .filter((p) => !tipo || p.tipo === tipo)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }
  const params = []
  let where = ''
  if (tipo) {
    params.push(tipo)
    where = 'WHERE tipo = $1'
  }
  const { rows } = await pool.query(`${PASTA_SELECT} ${where} ORDER BY nome ASC`, params)
  return rows
}

export async function createPasta({ tipo, nome, parent_id }) {
  const t = clean(tipo)
  const n = clean(nome)
  const pid = intOrNull(parent_id)
  if (!t || !n) throw new Error('invalid_data')
  const pool = getPool()
  if (!pool) {
    const row = { id: memPastaSeq++, tipo: t, nome: n, parent_id: pid, created_at: new Date().toISOString() }
    memPasta.set(row.id, row)
    return row
  }
  const { rows } = await pool.query(
    `INSERT INTO financeiro_pastas (tipo, nome, parent_id) VALUES ($1,$2,$3)
     RETURNING id, tipo, nome, parent_id, created_at`,
    [t, n, pid],
  )
  return rows[0]
}

export async function renamePasta(id, nome) {
  const n = clean(nome)
  if (!n) throw new Error('invalid_data')
  const pool = getPool()
  if (!pool) {
    const row = memPasta.get(Number(id))
    if (row) row.nome = n
    return row || null
  }
  const { rows } = await pool.query(
    'UPDATE financeiro_pastas SET nome = $1 WHERE id = $2 RETURNING id, tipo, nome, parent_id, created_at',
    [n, id],
  )
  return rows[0] || null
}

export async function deletePasta(id) {
  const pool = getPool()
  if (!pool) {
    const nid = Number(id)
    const hasChild = [...memPasta.values()].some((p) => p.parent_id === nid)
    const hasDocs = [...memDoc.values()].some((d) => (d.pasta_id ?? null) === nid)
    if (hasChild || hasDocs) throw new Error('not_empty')
    memPasta.delete(nid)
    return
  }
  const { rows: childP } = await pool.query('SELECT 1 FROM financeiro_pastas WHERE parent_id = $1 LIMIT 1', [id])
  const { rows: childD } = await pool.query('SELECT 1 FROM financeiro_documentos WHERE pasta_id = $1 LIMIT 1', [id])
  if (childP.length || childD.length) throw new Error('not_empty')
  await pool.query('DELETE FROM financeiro_pastas WHERE id = $1', [id])
}

// ── Arquivos enviados (guardados como bytea no banco) ──
const memArq = new Map()
let memArqSeq = 1

export async function createArquivo({ nome, mime, buffer }) {
  const tamanho = buffer ? buffer.length : 0
  const finalNome = clean(nome) || 'arquivo'
  const finalMime = clean(mime) || 'application/octet-stream'
  const pool = getPool()
  if (!pool) {
    const row = { id: memArqSeq++, nome: finalNome, mime: finalMime, tamanho, conteudo: buffer }
    memArq.set(row.id, row)
    return { id: row.id, nome: finalNome, mime: finalMime, tamanho }
  }
  const { rows } = await pool.query(
    'INSERT INTO financeiro_arquivos (nome, mime, tamanho, conteudo) VALUES ($1,$2,$3,$4) RETURNING id',
    [finalNome, finalMime, tamanho, buffer],
  )
  return { id: rows[0].id, nome: finalNome, mime: finalMime, tamanho }
}

export async function getArquivo(id) {
  const pool = getPool()
  if (!pool) return memArq.get(Number(id)) || null
  const { rows } = await pool.query(
    'SELECT id, nome, mime, tamanho, conteudo FROM financeiro_arquivos WHERE id = $1',
    [id],
  )
  return rows[0] || null
}

export async function deleteArquivo(id) {
  const pool = getPool()
  if (!pool) {
    memArq.delete(Number(id))
    return
  }
  await pool.query('DELETE FROM financeiro_arquivos WHERE id = $1', [id])
}
