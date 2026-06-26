import { useEffect, useState } from 'react'
import {
  ChartIcon,
  ExternalLinkIcon,
  GoogleSheetsIcon,
  MenuIcon,
  RefreshIcon,
} from '../lib/icons'
import { AUDIT_EMBED_URL, fetchAudit, type AuditData } from '../lib/audit'

type Mode = 'graficos' | 'planilha'
type Status = 'loading' | 'ok' | 'error'

const BAR_COLORS = ['#3f4429', '#894b36', '#937265']

function titleCase(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function findKey(headers: string[], re: RegExp): string | undefined {
  return headers.find((h) => re.test(h))
}

function countBy(rows: Record<string, string>[], key: string | undefined): { label: string; value: number }[] {
  if (!key) return []
  const map = new Map<string, number>()
  for (const row of rows) {
    const raw = (row[key] || '').trim()
    if (!raw) continue
    const norm = raw.toLowerCase().replace(/\s+/g, ' ').trim()
    map.set(norm, (map.get(norm) || 0) + 1)
  }
  return [...map.entries()]
    .map(([k, v]) => ({ label: titleCase(k), value: v }))
    .sort((a, b) => b.value - a.value)
}

function BarChart({
  title,
  data,
  color,
}: {
  title: string
  data: { label: string; value: number }[]
  color: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-4 space-y-3">
        {data.length === 0 ? (
          <li className="text-sm text-ink/40">Sem dados</li>
        ) : (
          data.map((d) => (
            <li key={d.label}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink/70">{d.label}</span>
                <span className="font-medium tabular-nums text-ink">{d.value}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-linen/70">
                <div
                  className="h-2 rounded-full transition-[width] duration-500"
                  style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
                />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export function AuditoriaView({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const [mode, setMode] = useState<Mode>('graficos')
  const [data, setData] = useState<AuditData | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  async function load() {
    setStatus('loading')
    try {
      setData(await fetchAudit())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  function refresh() {
    if (mode === 'planilha') setReloadKey((k) => k + 1)
    else load()
  }

  const headers = data?.headers ?? []
  const rows = data?.rows ?? []
  const porResponsavel = countBy(rows, findKey(headers, /respons/i))
  const porDoutora = countBy(rows, findKey(headers, /doutor|m[eé]dic/i))
  const porCidade = countBy(rows, findKey(headers, /cidade|local/i)).slice(0, 8)

  const kpis = [
    { value: rows.length, label: 'Agendamentos' },
    { value: porResponsavel.length, label: 'Responsáveis' },
    { value: porDoutora.length, label: 'Doutoras' },
    { value: countBy(rows, findKey(headers, /cidade|local/i)).length, label: 'Cidades' },
  ]

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1.5">
          {onOpenMenu ? (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
              className="-ml-1 rounded-lg p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          ) : null}
          <h1 className="text-base font-semibold text-ink">Auditoria de Leads</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink"
          >
            <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'graficos' ? 'planilha' : 'graficos'))}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-terracotta/40"
          >
            {mode === 'graficos' ? (
              <>
                <GoogleSheetsIcon className="h-4 w-4" />
                Planilha
              </>
            ) : (
              <>
                <ChartIcon className="h-4 w-4" />
                Gráficos
              </>
            )}
          </button>
          <a
            href={AUDIT_EMBED_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
          >
            Abrir em nova aba
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Conteúdo */}
      {mode === 'planilha' ? (
        <div className="relative flex-1 bg-linen/20">
          <iframe
            key={reloadKey}
            src={AUDIT_EMBED_URL}
            title="Auditoria de Leads"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">
            {status === 'error' ? (
              <div className="rounded-xl2 border border-dashed border-ink/15 py-16 text-center text-ink/55">
                Não foi possível carregar os dados.
              </div>
            ) : (
              <>
                {data?.source === 'sample' ? (
                  <div className="mb-5 rounded-lg border border-mauve/30 bg-sand/20 px-4 py-2.5 text-sm text-ink/70">
                    Modo demonstração — não foi possível ler a planilha. Exibindo dados de
                    exemplo.
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl2 border border-ink/10 bg-cream/70 p-5 shadow-card"
                    >
                      <div className="text-3xl font-semibold text-ink">
                        {status === 'loading' ? '—' : k.value}
                      </div>
                      <div className="mt-1 text-sm text-ink/55">{k.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <BarChart title="Agendamentos por responsável" data={porResponsavel} color={BAR_COLORS[0]} />
                  <BarChart title="Agendamentos por doutora" data={porDoutora} color={BAR_COLORS[1]} />
                  <BarChart title="Agendamentos por cidade (top 8)" data={porCidade} color={BAR_COLORS[2]} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
