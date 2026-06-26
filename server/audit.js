/**
 * Dados da planilha de Auditoria de Leads (pública).
 * A planilha tem uma ABA por mês. Lemos todas as abas (descobertas pelo htmlview)
 * e montamos: a série mensal (para o gráfico de linha) + todas as linhas
 * combinadas (para os recortes por responsável/doutora).
 * Sem alcançar a planilha, devolve dados de exemplo.
 */

const AUDIT_SHEET_ID = process.env.AUDIT_SHEET_ID || '1JHIF4-epoArSNfgTpdvdy6VeelXHPIdGvGnbI3-XdEs'
const AUDIT_GID = process.env.AUDIT_GID || '1358253473'
const BASE = `https://docs.google.com/spreadsheets/d/${AUDIT_SHEET_ID}`
const CACHE_MS = 60000

let cache = null

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += char
      continue
    }
    if (char === '"') inQuotes = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Descobre as abas (nome + gid) na ordem em que aparecem na planilha. */
async function discoverTabs() {
  const html = await fetchText(`${BASE}/htmlview`)
  const tabs = []
  const seen = new Set()
  const re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?gid:\s*"(\d+)"/g
  let m
  while ((m = re.exec(html)) !== null) {
    const name = m[1].replace(/\\(.)/g, '$1')
    const gid = m[2]
    if (!seen.has(gid)) {
      seen.add(gid)
      tabs.push({ name, gid })
    }
  }
  if (tabs.length === 0) return [{ name: 'Mês atual', gid: AUDIT_GID }]
  return tabs
}

async function fetchTabRows(gid) {
  const text = await fetchText(`${BASE}/gviz/tq?tqx=out:csv&gid=${gid}`)
  const matrix = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''))
  if (matrix.length < 1) return { headers: [], rows: [] }
  const headers = matrix[0].map((h) => h.trim())
  const rows = matrix.slice(1).map((cells) => {
    const obj = {}
    headers.forEach((h, i) => {
      if (h) obj[h] = (cells[i] ?? '').trim()
    })
    return obj
  })
  return { headers, rows }
}

export async function getAuditData() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  try {
    const tabs = await discoverTabs()
    const results = await Promise.all(
      tabs.map((t) => fetchTabRows(t.gid).then((d) => ({ ...t, ...d }))),
    )
    const months = results
      .map((r) => ({ mes: r.name, total: r.rows.length }))
      .filter((m) => m.total > 0)
    const rows = results.flatMap((r) => r.rows)
    const headers = results.find((r) => r.headers.length)?.headers ?? []
    if (rows.length === 0) throw new Error('vazio')
    const data = { months, rows, headers, source: 'live' }
    cache = { at: Date.now(), data }
    return data
  } catch {
    return SAMPLE
  }
}

// Dados de exemplo (estrutura real, valores fictícios).
const SAMPLE_HEADERS = ['NOME DA CLIENTE', 'CIDADE', 'RESPONSÁVEL', 'DOUTORA']
const _resp = ['Grupo Silva', 'Bruna', 'Helenice', 'Gabriela', 'Virginia']
const _dout = ['Eduarda', 'Susana', 'Isabela']
const _cid = ['Belo Horizonte', 'São Paulo', 'Santos', 'Rio de Janeiro']
const SAMPLE = {
  source: 'sample',
  headers: SAMPLE_HEADERS,
  months: [
    { mes: 'Fevereiro', total: 42 },
    { mes: 'Março', total: 58 },
    { mes: 'Abril', total: 73 },
    { mes: 'Maio', total: 61 },
    { mes: 'Junho', total: 88 },
  ],
  rows: Array.from({ length: 24 }, (_, i) => ({
    'NOME DA CLIENTE': `Cliente Exemplo ${i + 1}`,
    CIDADE: _cid[i % _cid.length],
    RESPONSÁVEL: _resp[i % _resp.length],
    DOUTORA: _dout[i % _dout.length],
  })),
}
