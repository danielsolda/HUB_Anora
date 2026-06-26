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

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function shortMonth(mes: string): string {
  return titleCase(mes).slice(0, 3)
}

function countByRegex(rows: Record<string, string>[], re: RegExp): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = Object.keys(row).find((k) => re.test(k))
    if (!key) continue
    const raw = (row[key] || '').trim()
    if (!raw) continue
    const norm = raw.toLowerCase().replace(/\s+/g, ' ').trim()
    map.set(norm, (map.get(norm) || 0) + 1)
  }
  return [...map.entries()]
    .map(([k, v]) => ({ label: titleCase(k), value: v }))
    .sort((a, b) => b.value - a.value)
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink/40">Sem dados</p>
  }
  const W = 760
  const H = 280
  const padX = 40
  const padTop = 28
  const padBottom = 34
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = data.length
  const x = (i: number) => (n === 1 ? padX + innerW / 2 : padX + (i * innerW) / (n - 1))
  const y = (v: number) => padTop + innerH - (v / max) * innerH
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const area = `${x(0)},${padTop + innerH} ${line} ${x(n - 1)},${padTop + innerH}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução mensal">
      {[0, 0.5, 1].map((t) => {
        const gy = padTop + innerH - t * innerH
        return <line key={t} x1={padX} x2={W - padX} y1={gy} y2={gy} stroke="rgba(31,33,23,0.08)" />
      })}
      <polygon points={area} fill="rgba(137,75,54,0.10)" />
      <polyline
        points={line}
        fill="none"
        stroke="#894b36"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={d.label}>
          <circle cx={x(i)} cy={y(d.value)} r="3.5" fill="#894b36" />
          <text x={x(i)} y={y(d.value) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1f2117">
            {d.value}
          </text>
          <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="rgba(31,33,23,0.6)">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function BarChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
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
                  className="h-2 rounded-full bg-olive transition-[width] duration-500"
                  style={{ width: `${(d.value / max) * 100}%` }}
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

  const months = data?.months ?? []
  const rows = data?.rows ?? []
  const evolucao = months.map((m) => ({ label: shortMonth(m.mes), value: m.total }))
  const porResponsavel = countByRegex(rows, /respons/i)
  const porDoutora = countByRegex(rows, /doutor|m[eé]dic/i)

  const total = months.reduce((s, m) => s + m.total, 0) || rows.length
  const ultimo = months[months.length - 1]
  const kpis = [
    { value: total, label: 'Agendamentos' },
    { value: months.length, label: 'Meses' },
    { value: months.length ? Math.round(total / months.length) : 0, label: 'Média/mês' },
    { value: ultimo?.total ?? 0, label: ultimo ? titleCase(ultimo.mes) : 'Último mês' },
  ]

  return (
    <div className="flex h-full min-h-screen flex-col">
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

                <div className="mt-5 rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
                  <h3 className="text-sm font-semibold text-ink">
                    Evolução mensal de agendamentos
                  </h3>
                  <div className="mt-3">
                    <LineChart data={evolucao} />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <BarChart title="Por responsável (total)" data={porResponsavel} />
                  <BarChart title="Por doutora (total)" data={porDoutora} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
