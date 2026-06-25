import { JWT } from 'google-auth-library'

/**
 * Leitura da planilha de respostas (privada) no servidor, via conta de serviço.
 *
 * Configuração por variáveis de ambiente:
 *   - GOOGLE_SERVICE_ACCOUNT_JSON: o JSON da conta de serviço (texto ou base64).
 *   - SHEET_ID: id da planilha (default abaixo).
 *   - SHEET_TAB: nome da aba (opcional; default = primeira aba).
 *
 * A planilha deve ser compartilhada (Leitor) com o e-mail da conta de serviço.
 * Sem credenciais, retornamos dados de exemplo (modo demonstração).
 */

const DEFAULT_SHEET_ID = '1U6_a-W2dZAgWRzwXCNr3KRLbl7ygJrE21S-8LiMncD0'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    } catch {
      console.error('[sheets] GOOGLE_SERVICE_ACCOUNT_JSON inválido (não é JSON nem base64).')
      return null
    }
  }
}

export const sheetMode = getCredentials() ? 'live' : 'sample'

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function pick(fields, re) {
  const key = Object.keys(fields).find((k) => re.test(k))
  return key ? fields[key] : ''
}

function stageFromText(text) {
  if (!text) return null
  const n = normalize(text)
  if (/entrevistad/.test(n)) return 'entrevistado'
  if (/(experien|90)/.test(n)) return 'experiencia'
  if (/(marcando|agend|entrevista)/.test(n)) return 'entrevista'
  if (/(novo|candidat|new|inscri)/.test(n)) return 'novo'
  return null
}

function makeId(seed, index) {
  const slug = normalize(seed).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return slug || `cand-${index}`
}

function rowToCandidate(headers, cells, index) {
  const fields = {}
  headers.forEach((header, i) => {
    const value = (cells[i] ?? '').toString().trim()
    if (header) fields[header] = value
  })

  const name =
    pick(fields, /nome|name/i) ||
    Object.entries(fields).find(
      ([k, v]) => v && !/carimbo|timestamp|data|e-?mail/i.test(k),
    )?.[1] ||
    'Candidato'

  const email = pick(fields, /e-?mail/i)
  const timestamp = pick(fields, /carimbo|timestamp|data\s*\/?\s*hora|data e hora/i)
  const stage = stageFromText(pick(fields, /etapa|fase|status|stage/i)) ?? 'novo'
  const id = makeId(email || `${name}-${timestamp}`, index)

  return { id, name, stage, timestamp: timestamp || undefined, fields }
}

async function fetchJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Sheets API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/** Lê os candidatos da planilha; cai para exemplos se não houver credencial. */
export async function getCandidates() {
  const creds = getCredentials()
  if (!creds) {
    return { candidates: SAMPLE_CANDIDATES, source: 'sample' }
  }

  const sheetId = process.env.SHEET_ID || DEFAULT_SHEET_ID
  const jwt = new JWT({ email: creds.client_email, key: creds.private_key, scopes: SCOPES })
  const { token } = await jwt.getAccessToken()

  let tab = process.env.SHEET_TAB
  if (!tab) {
    const meta = await fetchJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      token,
    )
    tab = meta.sheets?.[0]?.properties?.title || 'Sheet1'
  }

  const range = encodeURIComponent(tab)
  const data = await fetchJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    token,
  )

  const rows = (data.values || []).filter((r) => r.some((c) => String(c).trim() !== ''))
  if (rows.length < 2) return { candidates: [], source: 'live' }

  const headers = rows[0].map((h) => String(h).trim())
  const candidates = rows.slice(1).map((r, i) => rowToCandidate(headers, r, i))
  return { candidates, source: 'live' }
}

// Dados de exemplo (quando não há credencial configurada).
const SAMPLE_CANDIDATES = [
  {
    id: 'ana-souza',
    name: 'Ana Souza',
    stage: 'novo',
    timestamp: '24/06/2026 09:12',
    fields: {
      'Nome completo': 'Ana Souza',
      'E-mail': 'ana.souza@email.com',
      'Telefone / WhatsApp': '(11) 99876-5432',
      'Vaga de interesse': 'Esteticista',
      Cidade: 'São Paulo',
    },
  },
  {
    id: 'beatriz-lima',
    name: 'Beatriz Lima',
    stage: 'novo',
    timestamp: '24/06/2026 14:40',
    fields: {
      'Nome completo': 'Beatriz Lima',
      'E-mail': 'bia.lima@email.com',
      'Telefone / WhatsApp': '(11) 98123-4567',
      'Vaga de interesse': 'Recepcionista',
      Cidade: 'Guarulhos',
    },
  },
  {
    id: 'carla-mendes',
    name: 'Carla Mendes',
    stage: 'entrevista',
    timestamp: '23/06/2026 11:05',
    fields: {
      'Nome completo': 'Carla Mendes',
      'E-mail': 'carla.mendes@email.com',
      'Telefone / WhatsApp': '(11) 99090-1122',
      'Vaga de interesse': 'Biomédica esteta',
      Cidade: 'São Paulo',
    },
  },
  {
    id: 'elaine-castro',
    name: 'Elaine Castro',
    stage: 'entrevistado',
    timestamp: '20/06/2026 10:30',
    fields: {
      'Nome completo': 'Elaine Castro',
      'E-mail': 'elaine.castro@email.com',
      'Telefone / WhatsApp': '(11) 97777-3344',
      'Vaga de interesse': 'Gerente de clínica',
      Cidade: 'São Paulo',
    },
  },
  {
    id: 'fernanda-alves',
    name: 'Fernanda Alves',
    stage: 'experiencia',
    timestamp: '02/06/2026 08:00',
    fields: {
      'Nome completo': 'Fernanda Alves',
      'E-mail': 'fe.alves@email.com',
      'Telefone / WhatsApp': '(11) 96543-2211',
      'Vaga de interesse': 'Esteticista',
      Cidade: 'São Paulo',
    },
  },
]
