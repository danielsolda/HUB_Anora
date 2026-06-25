/**
 * Camada de dados do Kanban de Contratação.
 *
 * Os candidatos vêm da planilha de respostas do formulário de vagas. A planilha
 * é lida como CSV pelo endpoint público do Google (gviz), desde que esteja
 * compartilhada como "qualquer pessoa com o link". O parser é genérico: usa a
 * primeira linha como nomes de campo, então acompanha qualquer coluna que o
 * formulário tiver.
 *
 * Se a leitura ao vivo falhar (acesso/CORS), caímos para dados de exemplo, e a
 * tela sinaliza "modo demonstração". As mudanças de etapa (mover cards) são
 * guardadas localmente (localStorage) — persistência entre dispositivos exige um
 * backend, que é o próximo passo natural.
 */

// ── Identificadores da planilha / formulário ──
export const SHEET_ID = '1U6_a-W2dZAgWRzwXCNr3KRLbl7ygJrE21S-8LiMncD0'
export const FORM_URL =
  'https://kommo-dashboard-vagas-clinicaanora.lvvvr0.easypanel.host/'
export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
export const SHEET_PREVIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/preview`
// gviz CSV: funciona com a planilha compartilhada por link. Para múltiplas abas,
// acrescente `&sheet=Nome%20da%20aba`.
export const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`

// ── Etapas do Kanban ──
export type StageId = 'novo' | 'entrevista' | 'entrevistado' | 'experiencia'

export type Stage = { id: StageId; label: string }

export const STAGES: Stage[] = [
  { id: 'novo', label: 'Novo Candidato' },
  { id: 'entrevista', label: 'Marcando entrevista' },
  { id: 'entrevistado', label: 'Entrevistado' },
  { id: 'experiencia', label: 'Experiência 90 dias' },
]

export type Candidate = {
  id: string
  name: string
  stage: StageId
  /** Data/hora de chegada (carimbo do formulário), se houver. */
  timestamp?: string
  /** Todos os campos preenchidos: rótulo da coluna → valor. */
  fields: Record<string, string>
}

export type CandidatesResult = {
  candidates: Candidate[]
  source: 'live' | 'sample'
  error?: string
}

const STORAGE_KEY = 'anora_kanban_stages'

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Parser de CSV que respeita aspas, vírgulas e quebras de linha internas. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Primeiro valor cujo rótulo casa com a expressão. */
function pick(fields: Record<string, string>, re: RegExp): string {
  const key = Object.keys(fields).find((k) => re.test(k))
  return key ? fields[key] : ''
}

function stageFromText(text: string): StageId | null {
  if (!text) return null
  const n = normalize(text)
  if (/entrevistad/.test(n)) return 'entrevistado'
  if (/(experien|90)/.test(n)) return 'experiencia'
  if (/(marcando|agend|entrevista)/.test(n)) return 'entrevista'
  if (/(novo|candidat|new|inscri)/.test(n)) return 'novo'
  return null
}

function makeId(seed: string, index: number): string {
  const slug = normalize(seed).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return slug || `cand-${index}`
}

function rowToCandidate(headers: string[], cells: string[], index: number): Candidate {
  const fields: Record<string, string> = {}
  headers.forEach((header, i) => {
    const value = (cells[i] ?? '').trim()
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

// ── Persistência local das etapas (mover cards) ──
function loadOverrides(): Record<string, StageId> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveStageOverride(id: string, stage: StageId): void {
  try {
    const overrides = loadOverrides()
    overrides[id] = stage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    /* localStorage indisponível */
  }
}

function applyOverrides(candidates: Candidate[]): Candidate[] {
  const overrides = loadOverrides()
  return candidates.map((c) =>
    overrides[c.id] ? { ...c, stage: overrides[c.id] } : c,
  )
}

/** Busca os candidatos na planilha; cai para exemplos se não conseguir. */
export async function fetchCandidates(): Promise<CandidatesResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal }).finally(() =>
      clearTimeout(timeout),
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ''))
    if (rows.length < 2) throw new Error('planilha vazia')
    const headers = rows[0].map((h) => h.trim())
    const candidates = rows.slice(1).map((r, i) => rowToCandidate(headers, r, i))
    return { candidates: applyOverrides(candidates), source: 'live' }
  } catch (error) {
    return {
      candidates: applyOverrides(SAMPLE_CANDIDATES),
      source: 'sample',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ── Dados de exemplo (fallback / demonstração) ──
const SAMPLE_CANDIDATES: Candidate[] = [
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
      'Disponibilidade': 'Imediata',
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
      'Disponibilidade': 'A combinar',
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
      'Experiência': '3 anos em clínica de estética',
    },
  },
  {
    id: 'daniela-rocha',
    name: 'Daniela Rocha',
    stage: 'entrevista',
    timestamp: '22/06/2026 16:20',
    fields: {
      'Nome completo': 'Daniela Rocha',
      'E-mail': 'dani.rocha@email.com',
      'Telefone / WhatsApp': '(11) 98765-0099',
      'Vaga de interesse': 'Esteticista',
      Cidade: 'Osasco',
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
      'Experiência': '6 anos em gestão',
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
      'Início': '02/06/2026',
    },
  },
]
