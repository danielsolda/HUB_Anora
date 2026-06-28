import { useEffect, useState } from 'react'
import { RefreshIcon } from '../lib/icons'
import { fetchFluxo, formatBRL, formatMes, type Fluxo, type FluxoMes } from '../lib/financeiro'

type Modo = 'previsto' | 'realizado'

function MonthlyBars({ data }: { data: FluxoMes[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-ink/40">Sem dados no período.</p>
  }
  const W = 760
  const H = 280
  const padX = 44
  const padTop = 18
  const padBottom = 38
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom
  const max = Math.max(1, ...data.flatMap((d) => [d.entradas, d.saidas]))
  const n = data.length
  const groupW = innerW / n
  const barW = Math.min(26, groupW * 0.32)
  const yOf = (v: number) => padTop + innerH - (v / max) * innerH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fluxo de caixa mensal">
      {[0, 0.5, 1].map((t) => {
        const gy = padTop + innerH - t * innerH
        return <line key={t} x1={padX} x2={W - padX} y1={gy} y2={gy} stroke="rgba(31,33,23,0.08)" />
      })}
      {data.map((d, i) => {
        const cx = padX + i * groupW + groupW / 2
        const xEnt = cx - barW - 2
        const xSai = cx + 2
        return (
          <g key={d.mes}>
            <rect x={xEnt} y={yOf(d.entradas)} width={barW} height={padTop + innerH - yOf(d.entradas)} rx="3" fill="#3f4429">
              <title>{`Entradas ${formatMes(d.mes)}: ${formatBRL(d.entradas)}`}</title>
            </rect>
            <rect x={xSai} y={yOf(d.saidas)} width={barW} height={padTop + innerH - yOf(d.saidas)} rx="3" fill="#894b36">
              <title>{`Saídas ${formatMes(d.mes)}: ${formatBRL(d.saidas)}`}</title>
            </rect>
            <text x={cx} y={H - 14} textAnchor="middle" fontSize="11" fill="rgba(31,33,23,0.6)">
              {formatMes(d.mes)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function FluxoCaixaView() {
  const [fluxo, setFluxo] = useState<Fluxo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [modo, setModo] = useState<Modo>('previsto')

  async function load() {
    setStatus('loading')
    try {
      setFluxo(await fetchFluxo())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const series = fluxo?.[modo] ?? []
  const totalEntradas = series.reduce((s, m) => s + m.entradas, 0)
  const totalSaidas = series.reduce((s, m) => s + m.saidas, 0)
  const saldo = totalEntradas - totalSaidas

  // Saldo acumulado mês a mês.
  let running = 0
  const rows = series.map((m) => {
    running += m.saldo
    return { ...m, acumulado: running }
  })

  const kpis = [
    { label: 'Entradas', value: totalEntradas, tone: 'text-olive' },
    { label: 'Saídas', value: totalSaidas, tone: 'text-terracotta' },
    { label: 'Saldo', value: saldo, tone: saldo >= 0 ? 'text-olive' : 'text-terracotta' },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">Financeiro</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Fluxo de caixa</h1>
            <p className="mt-1 text-sm text-ink/55">
              Entradas e saídas por mês, somando contas a pagar e a receber.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-ink/15 bg-cream p-0.5">
              {(['previsto', 'realizado'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    modo === m ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'
                  }`}
                >
                  {m === 'previsto' ? 'Previsto' : 'Realizado'}
                </button>
              ))}
            </div>
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <p className="mt-2 text-xs text-ink/45">
          {modo === 'previsto'
            ? 'Previsto: por data de vencimento (inclui o que está em aberto).'
            : 'Realizado: por data de pagamento/recebimento (só o que já foi quitado).'}
        </p>

        {status === 'error' ? (
          <p className="py-16 text-center text-sm text-ink/55">Não foi possível carregar o fluxo.</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl2 border border-ink/10 bg-cream/70 p-4 shadow-card">
                  <div className={`text-xl font-semibold ${k.tone}`}>{status === 'loading' ? '—' : formatBRL(k.value)}</div>
                  <div className="mt-1 text-xs text-ink/55">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Por mês</h3>
                <div className="flex items-center gap-4 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-olive" /> Entradas
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-terracotta" /> Saídas
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <MonthlyBars data={series} />
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-xl2 border border-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-cream/60 text-xs uppercase tracking-wide text-ink/45">
                      <th className="px-4 py-2.5 text-left font-medium">Mês</th>
                      <th className="px-4 py-2.5 text-right font-medium">Entradas</th>
                      <th className="px-4 py-2.5 text-right font-medium">Saídas</th>
                      <th className="px-4 py-2.5 text-right font-medium">Saldo</th>
                      <th className="px-4 py-2.5 text-right font-medium">Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {rows.map((m) => (
                      <tr key={m.mes} className="bg-cream/30">
                        <td className="px-4 py-2.5 font-medium text-ink">{formatMes(m.mes)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-olive">{formatBRL(m.entradas)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-terracotta">{formatBRL(m.saidas)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${m.saldo >= 0 ? 'text-ink' : 'text-terracotta'}`}>{formatBRL(m.saldo)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${m.acumulado >= 0 ? 'text-ink/70' : 'text-terracotta'}`}>{formatBRL(m.acumulado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : status === 'ok' ? (
              <p className="mt-5 rounded-xl2 border border-dashed border-ink/15 py-12 text-center text-sm text-ink/55">
                Nada lançado ainda. Cadastre contas a pagar/receber para ver o fluxo.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
