import { useEffect, useState } from 'react'
import { PlusIcon, TrashIcon } from '../lib/icons'
import {
  createRegistro,
  deleteRegistro,
  listRegistros,
  updateRegistro,
  type Registro,
  type RegistroInput,
} from '../lib/colaboradores'

export type RegistroField = {
  key: 'data' | 'data_fim' | 'dias' | 'categoria' | 'titulo' | 'descricao'
  label: string
  type: 'date' | 'number' | 'text' | 'textarea' | 'select'
  options?: string[]
}

export type RegistroConfig = {
  tipo: string
  title: string
  addLabel: string
  emptyHint: string
  fields: RegistroField[]
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function periodo(r: Registro): string {
  const ini = fmtDate(r.data)
  const fim = fmtDate(r.data_fim)
  if (ini && fim) return `${ini} – ${fim}`
  return ini || fim
}

function emptyForm(config: RegistroConfig): RegistroInput {
  const f: RegistroInput = { tipo: config.tipo, data: '', data_fim: '', dias: null, categoria: '', titulo: '', descricao: '' }
  const sel = config.fields.find((x) => x.type === 'select')
  if (sel && sel.options?.length) (f as Record<string, unknown>)[sel.key] = sel.options[0]
  return f
}

export function RegistroSection({ colaboradorId, config }: { colaboradorId: number; config: RegistroConfig }) {
  const [list, setList] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<RegistroInput>(() => emptyForm(config))
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setList(await listRegistros(colaboradorId, config.tipo))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOpen(false)
    setEditingId(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradorId, config.tipo])

  function startAdd() {
    setForm(emptyForm(config))
    setEditingId(null)
    setOpen(true)
  }

  function startEdit(r: Registro) {
    setForm({
      tipo: config.tipo,
      data: r.data ?? '',
      data_fim: r.data_fim ?? '',
      dias: r.dias,
      categoria: r.categoria,
      titulo: r.titulo,
      descricao: r.descricao,
    })
    setEditingId(r.id)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) await updateRegistro(colaboradorId, editingId, form)
      else await createRegistro(colaboradorId, form)
      setOpen(false)
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(r: Registro) {
    if (!window.confirm('Remover este registro?')) return
    await deleteRegistro(colaboradorId, r.id)
    await load()
  }

  const inputCls = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'

  return (
    <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{config.title}</h3>
          <p className="text-sm text-ink/50">
            {loading ? '—' : `${list.length} registro${list.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
          >
            <PlusIcon className="h-4 w-4" />
            {config.addLabel}
          </button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={save} className="mt-5 rounded-xl2 border border-ink/10 bg-cream/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => {
              const v = (form as Record<string, unknown>)[field.key]
              const value = v === null || v === undefined ? '' : String(v)
              const span = field.type === 'textarea' ? 'sm:col-span-2' : ''
              return (
                <label key={field.key} className={`text-sm font-medium text-ink/70 ${span}`}>
                  {field.label}
                  {field.type === 'textarea' ? (
                    <textarea rows={3} value={value} onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))} className={`${inputCls} resize-y`} />
                  ) : field.type === 'select' ? (
                    <select value={value} onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))} className={inputCls}>
                      {(field.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={value}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [field.key]: field.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value,
                        }))
                      }
                      className={inputCls}
                    />
                  )}
                </label>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setEditingId(null) }} className="text-sm font-medium text-ink/55 hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="py-10 text-center text-sm text-ink/40">Carregando…</p>
        ) : list.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-ink/15 py-12 text-center text-sm text-ink/55">
            {config.emptyHint}
          </div>
        ) : (
          list.map((r) => (
            <div key={r.id} className="rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.titulo ? <span className="font-semibold text-ink">{r.titulo}</span> : null}
                    {r.categoria ? (
                      <span className="rounded-full bg-linen px-2 py-0.5 text-xs font-medium text-mauve">{r.categoria}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink/55">
                    {[periodo(r), r.dias != null ? `${r.dias} dia${r.dias === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}
                  </p>
                  {r.descricao ? <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{r.descricao}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => startEdit(r)} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
                    Editar
                  </button>
                  <button type="button" onClick={() => remove(r)} aria-label="Remover" className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Configuração de cada seção de registros da ficha. */
export const REGISTRO_CONFIGS: Record<string, RegistroConfig> = {
  advertencias: {
    tipo: 'advertencia',
    title: 'Advertências',
    addLabel: 'Nova advertência',
    emptyHint: 'Nenhuma advertência registrada.',
    fields: [
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'categoria', label: 'Gravidade', type: 'select', options: ['Leve', 'Grave', 'Gravíssima'] },
      { key: 'titulo', label: 'Motivo', type: 'text' },
      { key: 'descricao', label: 'Detalhes', type: 'textarea' },
    ],
  },
  suspensoes: {
    tipo: 'suspensao',
    title: 'Suspensões',
    addLabel: 'Nova suspensão',
    emptyHint: 'Nenhuma suspensão registrada.',
    fields: [
      { key: 'data', label: 'Início', type: 'date' },
      { key: 'data_fim', label: 'Fim', type: 'date' },
      { key: 'dias', label: 'Dias', type: 'number' },
      { key: 'titulo', label: 'Motivo', type: 'text' },
      { key: 'descricao', label: 'Detalhes', type: 'textarea' },
    ],
  },
  ferias: {
    tipo: 'ferias',
    title: 'Férias',
    addLabel: 'Novo período',
    emptyHint: 'Nenhum período de férias registrado.',
    fields: [
      { key: 'data', label: 'Início', type: 'date' },
      { key: 'data_fim', label: 'Fim', type: 'date' },
      { key: 'dias', label: 'Dias', type: 'number' },
      { key: 'categoria', label: 'Status', type: 'select', options: ['Agendada', 'Em andamento', 'Concluída'] },
      { key: 'descricao', label: 'Observações', type: 'textarea' },
    ],
  },
  avaliacoes: {
    tipo: 'avaliacao',
    title: 'Avaliações de desempenho',
    addLabel: 'Nova avaliação',
    emptyHint: 'Nenhuma avaliação registrada.',
    fields: [
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'categoria', label: 'Conceito', type: 'select', options: ['Abaixo do esperado', 'Dentro do esperado', 'Acima do esperado'] },
      { key: 'titulo', label: 'Resumo', type: 'text' },
      { key: 'descricao', label: 'Detalhes', type: 'textarea' },
    ],
  },
}
