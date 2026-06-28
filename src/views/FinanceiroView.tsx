import { useEffect, useState } from 'react'
import { PlusIcon, RefreshIcon, TrashIcon } from '../lib/icons'
import {
  createLancamento,
  deleteLancamento,
  effectiveStatus,
  formatBRL,
  formatDate,
  listLancamentos,
  today,
  updateLancamento,
  type Lancamento,
  type LancamentoInput,
  type LancamentoStatus,
  type LancamentoTipo,
} from '../lib/financeiro'

const LABELS = {
  pagar: { title: 'Contas a pagar', contraparte: 'Fornecedor', marcar: 'Marcar pago', aberto: 'A pagar', pago: 'Pago' },
  receber: { title: 'Contas a receber', contraparte: 'Cliente', marcar: 'Marcar recebido', aberto: 'A receber', pago: 'Recebido' },
} as const

type VisualStatus = LancamentoStatus | 'vencido'

function statusLabel(s: VisualStatus, tipo: LancamentoTipo): string {
  if (s === 'pendente') return 'Em aberto'
  if (s === 'vencido') return 'Vencido'
  if (s === 'cancelado') return 'Cancelado'
  return LABELS[tipo].pago
}

const STATUS_STYLE: Record<VisualStatus, string> = {
  pendente: 'bg-sand/30 text-mauve',
  vencido: 'bg-terracotta/15 text-terracotta',
  pago: 'bg-olive/15 text-olive',
  cancelado: 'bg-ink/10 text-ink/45',
}

const emptyForm = (tipo: LancamentoTipo): LancamentoInput => ({
  tipo,
  descricao: '',
  valor: undefined,
  vencimento: '',
  status: 'pendente',
  categoria: '',
  contraparte: '',
  pago_em: '',
  forma: '',
  observacoes: '',
})

function LancamentoForm({
  tipo,
  value,
  onChange,
  allowParcelado,
  parcelado,
  onParcelado,
}: {
  tipo: LancamentoTipo
  value: LancamentoInput
  onChange: (patch: Partial<LancamentoInput>) => void
  allowParcelado: boolean
  parcelado: boolean
  onParcelado: (on: boolean) => void
}) {
  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'
  const num = (v: string) => (v === '' ? undefined : Number(v))
  return (
    <div className="space-y-4">
      {allowParcelado ? (
        <label className="flex items-center gap-2 text-sm font-medium text-ink/75">
          <input type="checkbox" checked={parcelado} onChange={(e) => onParcelado(e.target.checked)} className="h-4 w-4 rounded border-ink/30 text-terracotta focus:ring-terracotta/40" />
          Parcelado
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          Descrição*
          <input type="text" required value={value.descricao ?? ''} onChange={(e) => onChange({ descricao: e.target.value })} className={field} placeholder="Ex.: Aluguel, Fornecedor X, Procedimento…" />
        </label>
        <label className={label}>
          {parcelado ? 'Valor total (R$)*' : 'Valor (R$)*'}
          <input type="number" step="0.01" min="0" required value={value.valor ?? ''} onChange={(e) => onChange({ valor: num(e.target.value) })} className={field} />
        </label>
        <label className={label}>
          {parcelado ? '1º vencimento' : 'Vencimento'}
          <input type="date" value={value.vencimento ?? ''} onChange={(e) => onChange({ vencimento: e.target.value })} className={field} />
        </label>
        <label className={label}>
          {LABELS[tipo].contraparte}
          <input type="text" value={value.contraparte ?? ''} onChange={(e) => onChange({ contraparte: e.target.value })} className={field} />
        </label>
        <label className={label}>
          Categoria
          <input type="text" value={value.categoria ?? ''} onChange={(e) => onChange({ categoria: e.target.value })} className={field} placeholder="Aluguel, Salários, Insumos…" />
        </label>

        {parcelado ? (
          <>
            <label className={label}>
              Nº de parcelas
              <input type="number" min="1" step="1" value={value.parcelas ?? ''} onChange={(e) => onChange({ parcelas: num(e.target.value) })} className={field} placeholder="Ex.: 12" />
            </label>
            <label className={label}>
              Entrada (R$)
              <input type="number" step="0.01" min="0" value={value.entrada ?? ''} onChange={(e) => onChange({ entrada: num(e.target.value) })} className={field} placeholder="0,00 (opcional)" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink/70">
              <input type="checkbox" checked={!!value.entradaPaga} onChange={(e) => onChange({ entradaPaga: e.target.checked })} className="h-4 w-4 rounded border-ink/30 text-terracotta focus:ring-terracotta/40" />
              Entrada já paga
            </label>
          </>
        ) : (
          <>
            <label className={label}>
              Situação
              <select value={value.status ?? 'pendente'} onChange={(e) => onChange({ status: e.target.value as LancamentoStatus })} className={field}>
                <option value="pendente">Em aberto</option>
                <option value="pago">{LABELS[tipo].pago}</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <label className={label}>
              Data do {tipo === 'pagar' ? 'pagamento' : 'recebimento'}
              <input type="date" value={value.pago_em ?? ''} onChange={(e) => onChange({ pago_em: e.target.value })} className={field} />
            </label>
          </>
        )}

        <label className={`${label} sm:col-span-2`}>
          Observações
          <textarea rows={2} value={value.observacoes ?? ''} onChange={(e) => onChange({ observacoes: e.target.value })} className={`${field} resize-y`} />
        </label>
      </div>

      {parcelado ? (
        <p className="text-xs text-ink/45">
          O valor total (menos a entrada) será dividido em parcelas mensais a partir do
          1º vencimento — cada parcela vira um lançamento que pode ser pago separadamente.
        </p>
      ) : null}
    </div>
  )
}

export function FinanceiroView({ tipo }: { tipo: LancamentoTipo }) {
  const [list, setList] = useState<Lancamento[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<LancamentoInput>(() => emptyForm(tipo))
  const [parcelado, setParcelado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'todas' | 'aberto' | 'vencido' | 'pago'>('todas')
  const [busca, setBusca] = useState('')

  async function load() {
    setStatus('loading')
    try {
      setList(await listLancamentos(tipo))
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setParcelado(false)
    setFilter('todas')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const L = LABELS[tipo]

  const totals = {
    aberto: list.filter((l) => l.status === 'pendente').reduce((s, l) => s + l.valor, 0),
    vencido: list.filter((l) => effectiveStatus(l) === 'vencido').reduce((s, l) => s + l.valor, 0),
    pago: list.filter((l) => l.status === 'pago').reduce((s, l) => s + l.valor, 0),
  }

  const filtered = list.filter((l) => {
    const es = effectiveStatus(l)
    if (filter === 'aberto' && l.status !== 'pendente') return false
    if (filter === 'vencido' && es !== 'vencido') return false
    if (filter === 'pago' && l.status !== 'pago') return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      return [l.descricao, l.contraparte, l.categoria].some((v) => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  function startAdd() {
    setForm(emptyForm(tipo))
    setEditingId(null)
    setParcelado(false)
    setShowForm(true)
  }

  function startEdit(l: Lancamento) {
    setForm({ ...l })
    setEditingId(l.id)
    setParcelado(false)
    setShowForm(true)
  }

  function toggleParcelado(on: boolean) {
    setParcelado(on)
    if (on && !form.parcelas) setForm((f) => ({ ...f, parcelas: 2 }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.descricao?.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateLancamento(editingId, form)
      } else if (parcelado) {
        await createLancamento({ ...form, tipo })
      } else {
        await createLancamento({ ...form, tipo, parcelas: 1, entrada: 0, entradaPaga: false })
      }
      setShowForm(false)
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function marcarPago(l: Lancamento) {
    await updateLancamento(l.id, { status: 'pago', pago_em: l.pago_em || today() })
    await load()
  }

  async function remove(l: Lancamento) {
    if (!window.confirm(`Remover "${l.descricao}"?`)) return
    await deleteLancamento(l.id)
    await load()
  }

  const kpis = [
    { label: L.aberto, value: totals.aberto, tone: 'text-ink' },
    { label: 'Vencido', value: totals.vencido, tone: 'text-terracotta' },
    { label: L.pago, value: totals.pago, tone: 'text-olive' },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">Financeiro</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{L.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => (showForm ? setShowForm(false) : startAdd())} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta">
              <PlusIcon className="h-4 w-4" />
              {showForm ? 'Cancelar' : 'Nova conta'}
            </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl2 border border-ink/10 bg-cream/70 p-4 shadow-card">
              <div className={`text-xl font-semibold ${k.tone}`}>{status === 'loading' ? '—' : formatBRL(k.value)}</div>
              <div className="mt-1 text-xs text-ink/55">{k.label}</div>
            </div>
          ))}
        </div>

        {showForm ? (
          <form onSubmit={save} className="mt-6 rounded-xl2 border border-ink/10 bg-cream/60 p-5">
            <LancamentoForm
              tipo={tipo}
              value={form}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              allowParcelado={editingId === null}
              parcelado={parcelado}
              onParcelado={toggleParcelado}
            />
            <div className="mt-5">
              <button type="submit" disabled={saving || !form.descricao?.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {([
            ['todas', 'Todas'],
            ['aberto', 'Em aberto'],
            ['vencido', 'Vencido'],
            ['pago', L.pago],
          ] as const).map(([key, lbl]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${filter === key ? 'border-terracotta/40 bg-terracotta/10 text-ink' : 'border-ink/15 bg-cream text-ink/60 hover:border-terracotta/40 hover:text-ink'}`}>
              {lbl}
            </button>
          ))}
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar descrição, fornecedor…" className="ml-auto w-full max-w-xs rounded-full border border-ink/15 bg-cream/70 px-4 py-1.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-terracotta/40" />
        </div>

        {/* Lista */}
        <div className="mt-5 space-y-2.5">
          {status === 'loading' ? (
            <p className="py-12 text-center text-sm text-ink/45">Carregando…</p>
          ) : status === 'error' ? (
            <p className="py-12 text-center text-sm text-ink/55">Não foi possível carregar os lançamentos.</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-ink/15 py-14 text-center text-sm text-ink/55">
              {list.length === 0 ? 'Nenhuma conta lançada ainda.' : 'Nada encontrado com esse filtro.'}
            </div>
          ) : (
            filtered.map((l) => {
              const es = effectiveStatus(l)
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-ink">{l.descricao || '—'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[es]}`}>{statusLabel(es, tipo)}</span>
                      {l.parcelas_total ? (
                        <span className="rounded-full bg-linen px-2 py-0.5 text-xs font-medium text-ink/55">
                          {l.parcela === 0 ? 'Entrada' : `${l.parcela}/${l.parcelas_total}`}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-ink/55">
                      {[l.contraparte, l.categoria].filter(Boolean).join(' · ') || 'Sem categoria'}
                      {l.vencimento ? ` · vence ${formatDate(l.vencimento)}` : ''}
                      {l.status === 'pago' && l.pago_em ? ` · ${L.pago.toLowerCase()} ${formatDate(l.pago_em)}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold tabular-nums text-ink">{formatBRL(l.valor)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {l.status === 'pendente' ? (
                      <button type="button" onClick={() => marcarPago(l)} className="rounded-full bg-olive/10 px-2.5 py-1 text-xs font-medium text-olive transition-colors hover:bg-olive/20">
                        {L.marcar}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => startEdit(l)} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
                      Editar
                    </button>
                    <button type="button" onClick={() => remove(l)} aria-label="Remover" className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
