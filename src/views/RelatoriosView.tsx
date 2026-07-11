import { useEffect, useMemo, useState } from 'react'
import { DownloadIcon, RefreshIcon } from '../lib/icons'
import { downloadCsv, effectiveStatus, formatBRL, listAllLancamentos, type Lancamento } from '../lib/financeiro'

type Modo = 'previsto' | 'realizado'

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago/Recebido',
  cancelado: 'Cancelado',
  vencido: 'Vencido',
}

/** Data de competência de um lançamento conforme o modo. */
function dateOf(l: Lancamento, modo: Modo): string | null {
  if (modo === 'realizado') return l.status === 'pago' ? l.pago_em : null
  return l.status !== 'cancelado' ? l.vencimento : null
}

function byCategoria(list: Lancamento[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  for (const l of list) {
    const key = (l.categoria || '').trim() || 'Sem categoria'
    map.set(key, (map.get(key) || 0) + l.valor)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

function CategoriaBars({
  title,
  data,
  total,
  color,
}: {
  title: string
  data: { label: string; value: number }[]
  total: number
  color: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-sm font-semibold tabular-nums text-ink">{formatBRL(total)}</span>
      </div>
      <ul className="mt-4 space-y-3">
        {data.length === 0 ? (
          <li className="text-sm text-ink/40">Sem lançamentos no período.</li>
        ) : (
          data.map((d) => (
            <li key={d.label}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink/70">{d.label}</span>
                <span className="shrink-0 font-medium tabular-nums text-ink">{formatBRL(d.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-linen/70">
                <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export function RelatoriosView() {
  const [all, setAll] = useState<Lancamento[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [modo, setModo] = useState<Modo>('previsto')
  const [ano, setAno] = useState<string>('todos')

  async function load() {
    setStatus('loading')
    try {
      setAll(await listAllLancamentos())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Anos presentes (por vencimento e por pagamento).
  const anos = useMemo(() => {
    const set = new Set<string>()
    for (const l of all) {
      if (l.vencimento) set.add(l.vencimento.slice(0, 4))
      if (l.pago_em) set.add(l.pago_em.slice(0, 4))
    }
    return [...set].sort()
  }, [all])

  const filtered = all.filter((l) => {
    const d = dateOf(l, modo)
    if (!d) return false
    if (ano !== 'todos' && d.slice(0, 4) !== ano) return false
    return true
  })

  const pagar = filtered.filter((l) => l.tipo === 'pagar')
  const receber = filtered.filter((l) => l.tipo === 'receber')
  const totalPagar = pagar.reduce((s, l) => s + l.valor, 0)
  const totalReceber = receber.reduce((s, l) => s + l.valor, 0)
  const saldo = totalReceber - totalPagar

  const kpis = [
    { label: 'Receitas', value: totalReceber, tone: 'text-olive' },
    { label: 'Despesas', value: totalPagar, tone: 'text-terracotta' },
    { label: 'Saldo', value: saldo, tone: saldo >= 0 ? 'text-olive' : 'text-terracotta' },
  ]

  function exportar() {
    const rows = filtered
      .slice()
      .sort((a, b) => (dateOf(a, modo) || '').localeCompare(dateOf(b, modo) || ''))
      .map((l) => ({
        Tipo: l.tipo === 'pagar' ? 'Despesa' : 'Receita',
        Descrição: l.descricao,
        Categoria: l.categoria,
        Contraparte: l.contraparte,
        'Valor (R$)': l.valor,
        Vencimento: l.vencimento || '',
        'Pago/Recebido em': l.pago_em || '',
        Situação: STATUS_LABEL[effectiveStatus(l)] || l.status,
        Forma: l.forma,
        Parcela: l.parcela != null && l.parcelas_total ? `${l.parcela}/${l.parcelas_total}` : '',
        Observações: l.observacoes,
      }))
    const sufixo = ano === 'todos' ? 'todos-os-anos' : ano
    downloadCsv(`relatorio-financeiro-${modo}-${sufixo}.csv`, rows)
  }

  const selectCls = 'rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink/80 outline-none transition-colors hover:border-terracotta/40'

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">Financeiro</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Relatórios financeiros</h1>
            <p className="mt-1 text-sm text-ink/55">Resumo por categoria e período.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-ink/15 bg-cream p-0.5">
              {(['previsto', 'realizado'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setModo(m)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${modo === m ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}>
                  {m === 'previsto' ? 'Previsto' : 'Realizado'}
                </button>
              ))}
            </div>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={selectCls}>
              <option value="todos">Todos os anos</option>
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button type="button" onClick={exportar} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40" title="Baixar em Excel/CSV">
              <DownloadIcon className="h-4 w-4" />
              Exportar
            </button>
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <p className="mt-2 text-xs text-ink/45">
          {modo === 'previsto' ? 'Previsto: por data de vencimento.' : 'Realizado: por data de pagamento/recebimento.'}
        </p>

        {status === 'error' ? (
          <p className="py-16 text-center text-sm text-ink/55">Não foi possível carregar os relatórios.</p>
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

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <CategoriaBars title="Despesas por categoria" data={byCategoria(pagar)} total={totalPagar} color="#894b36" />
              <CategoriaBars title="Receitas por categoria" data={byCategoria(receber)} total={totalReceber} color="#3f4429" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
