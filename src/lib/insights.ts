/**
 * Recortes derivados das linhas da Auditoria para a aba Início:
 * - agendamentos por cidade (para o heatmap no mapa do Brasil)
 * - agendamentos por dia da semana (para identificar o padrão de dias)
 */
import { resolveCity, normalizeCity, type City } from './cities'

type Row = Record<string, string>

function findKey(row: Row, re: RegExp): string | undefined {
  return Object.keys(row).find((k) => k !== '__mes' && re.test(k))
}

export type LocatedCity = City & { count: number }

export type CityStats = {
  located: LocatedCity[]
  unresolved: { label: string; count: number }[]
  totalLocated: number
  totalUnresolved: number
}

/** Conta agendamentos por cidade, resolvendo nomes para cidades conhecidas. */
export function computeCityStats(rows: Row[]): CityStats {
  const re = /cidade|munic/i
  // Agrega por texto distinto primeiro (barato) e só então resolve cada um.
  const raw = new Map<string, number>()
  for (const row of rows) {
    const key = findKey(row, re)
    const val = key ? (row[key] || '').trim() : ''
    if (!val) continue
    raw.set(val, (raw.get(val) || 0) + 1)
  }

  const byCity = new Map<string, LocatedCity>()
  const unresolved = new Map<string, number>()
  for (const [text, count] of raw) {
    const city = resolveCity(text)
    if (city) {
      const cur = byCity.get(city.name)
      if (cur) cur.count += count
      else byCity.set(city.name, { ...city, count })
    } else {
      const label = normalizeCity(text)
      unresolved.set(label, (unresolved.get(label) || 0) + count)
    }
  }

  const located = [...byCity.values()].sort((a, b) => b.count - a.count)
  const unresolvedList = [...unresolved.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
  return {
    located,
    unresolved: unresolvedList,
    totalLocated: located.reduce((s, c) => s + c.count, 0),
    totalUnresolved: unresolvedList.reduce((s, c) => s + c.count, 0),
  }
}

const WEEK = [
  { day: 1, label: 'Seg' },
  { day: 2, label: 'Ter' },
  { day: 3, label: 'Qua' },
  { day: 4, label: 'Qui' },
  { day: 5, label: 'Sex' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
]

function parseDate(value: string, defaultYear: number): Date | null {
  const m = String(value).match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (!m) return null
  const dd = +m[1]
  const mm = +m[2]
  let yy = m[3] ? +m[3] : defaultYear
  if (yy < 100) yy += 2000
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const dt = new Date(Date.UTC(yy, mm - 1, dd))
  return Number.isNaN(+dt) ? null : dt
}

export type WeekdayStats = {
  data: { label: string; value: number }[]
  total: number
  peak: { label: string; value: number } | null
}

/** Conta agendamentos por dia da semana (a partir da DATA DO AGENDAMENTO). */
export function computeWeekdayStats(rows: Row[], defaultYear = new Date().getUTCFullYear()): WeekdayStats {
  const re = /agendamento/i
  const counts = new Map<number, number>()
  for (const row of rows) {
    const key = findKey(row, re)
    const val = key ? (row[key] || '').trim() : ''
    if (!val) continue
    const dt = parseDate(val, defaultYear)
    if (!dt) continue
    const d = dt.getUTCDay()
    counts.set(d, (counts.get(d) || 0) + 1)
  }
  const data = WEEK.map((w) => ({ label: w.label, value: counts.get(w.day) || 0 }))
  const total = data.reduce((s, d) => s + d.value, 0)
  const peak = data.reduce<{ label: string; value: number } | null>(
    (best, d) => (best && best.value >= d.value ? best : d),
    null,
  )
  return { data, total, peak: peak && peak.value > 0 ? peak : null }
}
