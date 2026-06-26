/**
 * Dados da planilha de Auditoria de Leads (pública) para a visualização em
 * gráficos. Lida no servidor como CSV (gviz). Sem alcançar a planilha, devolve
 * dados de exemplo (modo demonstração).
 */

const AUDIT_SHEET_ID = process.env.AUDIT_SHEET_ID || '1JHIF4-epoArSNfgTpdvdy6VeelXHPIdGvGnbI3-XdEs'
const AUDIT_GID = process.env.AUDIT_GID || '1358253473'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${AUDIT_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${AUDIT_GID}`

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

export async function getAuditData() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(CSV_URL, { signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const matrix = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''))
    if (matrix.length < 2) throw new Error('vazio')
    const headers = matrix[0].map((h) => h.trim())
    const rows = matrix.slice(1).map((cells) => {
      const obj = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = (cells[i] ?? '').trim()
      })
      return obj
    })
    return { headers, rows, source: 'live' }
  } catch {
    return { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS, source: 'sample' }
  }
}

// Dados de exemplo (estrutura real, valores fictícios — sem dados de clientes).
const SAMPLE_HEADERS = [
  'NOME DA CLIENTE',
  'TELEFONE',
  'CIDADE',
  'DATA DO CONTATO',
  'DATA DO AGENDAMENTO',
  'HORÁRIO',
  'RESPONSÁVEL',
  'DOUTORA',
]
const _resp = ['Grupo Silva', 'Bruna', 'Helenice', 'Gabriela', 'Virginia']
const _dout = ['Eduarda', 'Susana', 'Isabela']
const _cid = ['Belo Horizonte', 'São Paulo', 'Santos', 'Rio de Janeiro', 'Campinas', 'Goiânia']
const SAMPLE_ROWS = Array.from({ length: 18 }, (_, i) => ({
  'NOME DA CLIENTE': `Cliente Exemplo ${i + 1}`,
  TELEFONE: '(31) 9xxxx-xxxx',
  CIDADE: _cid[i % _cid.length],
  'DATA DO CONTATO': '11/02/2026',
  'DATA DO AGENDAMENTO': '09/03/2026',
  'HORÁRIO': '9h',
  RESPONSÁVEL: _resp[i % _resp.length],
  DOUTORA: _dout[i % _dout.length],
}))
