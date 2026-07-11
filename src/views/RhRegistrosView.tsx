import { useEffect, useMemo, useState } from 'react'
import { ExternalLinkIcon, PlusIcon, RefreshIcon, TrashIcon } from '../lib/icons'
import { DocumentoModal } from '../components/DocumentoModal'
import { resolveDoc } from '../lib/docpreview'
import {
  createRegistro,
  deleteRegistro,
  listAllRegistros,
  listColaboradores,
  updateRegistro,
  type Colaborador,
  type RegistroComPessoa,
} from '../lib/colaboradores'

export type RhRegistrosVariant = 'treinamentos' | 'medidas'

type Tone = 'olive' | 'terracotta' | 'mauve' | 'ink' | 'sand'
type Kind = { key: string; label: string; tone: Tone; tipo: string; categoria?: string }
type Config = {
  title: string
  subtitle: string
  addLabel: string
  tipos: string[]
  kinds: Kind[]
  tituloLabel: string
  linkLabel: string
}

const CONFIGS: Record<RhRegistrosVariant, Config> = {
  treinamentos: {
    title: 'Treinamentos e certificações',
    subtitle: 'Certificados, treinamentos e materiais da equipe, por pessoa.',
    addLabel: 'Novo registro',
    tipos: ['treinamento'],
    tituloLabel: 'Nome',
    linkLabel: 'Link do certificado / material',
    kinds: [
      { key: 'Treinamento', label: 'Treinamento', tone: 'olive', tipo: 'treinamento', categoria: 'Treinamento' },
      { key: 'Certificado', label: 'Certificado', tone: 'terracotta', tipo: 'treinamento', categoria: 'Certificado' },
      { key: 'Material', label: 'Material', tone: 'mauve', tipo: 'treinamento', categoria: 'Material' },
    ],
  },
  medidas: {
    title: 'Medidas disciplinares',
    subtitle: 'Advertências, suspensões, notificações e demissões da equipe.',
    addLabel: 'Nova medida',
    tipos: ['advertencia', 'suspensao', 'notificacao', 'demissao'],
    tituloLabel: 'Motivo',
    linkLabel: 'Link do documento (opcional)',
    kinds: [
      { key: 'advertencia', label: 'Advertência', tone: 'sand', tipo: 'advertencia' },
      { key: 'suspensao', label: 'Suspensão', tone: 'terracotta', tipo: 'suspensao' },
      { key: 'notificacao', label: 'Notificação', tone: 'mauve', tipo: 'notificacao' },
      { key: 'demissao', label: 'Demissão', tone: 'ink', tipo: 'demissao' },
    ],
  },
}

const TONES: Record<Tone, string> = {
  olive: 'bg-olive/10 text-olive',
  terracotta: 'bg-terracotta/10 text-terracotta',
  mauve: 'bg-linen text-mauve',
  ink: 'bg-ink/10 text-ink',
  sand: 'bg-sand/30 text-mauve',
}

function fmtDate(d: string | null): string {
  if (!d) return ''
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—'
}

type FormState = {
  pessoaId: string
  kindKey: string
  titulo: string
  data: string
  link: string
  descricao: string
}

export function RhRegistrosView({ variant }: { variant: RhRegistrosVariant }) {
  const cfg = CONFIGS[variant]
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [registros, setRegistros] = useState<RegistroComPessoa[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [filtroPessoa, setFiltroPessoa] = useState<string>('')
  const [filtroKind, setFiltroKind] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RegistroComPessoa | null>(null)
  const [form, setForm] = useState<FormState>(() => ({ pessoaId: '', kindKey: cfg.kinds[0].key, titulo: '', data: '', link: '', descricao: '' }))
  const [saving, setSaving] = useState(false)
  const [previewLink, setPreviewLink] = useState<{ titulo: string; link: string } | null>(null)

  const kindOf = (r: { tipo: string; categoria: string }): Kind =>
    cfg.kinds.find((k) => k.tipo === r.tipo && (k.categoria == null || k.categoria === r.categoria)) ?? cfg.kinds[0]

  async function load() {
    setStatus('loading')
    try {
      const [cols, regs] = await Promise.all([listColaboradores(), listAllRegistros(cfg.tipos)])
      setColaboradores(cols)
      setRegistros(regs)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditing(null)
    setFiltroPessoa('')
    setFiltroKind('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant])

  const filtered = useMemo(
    () =>
      registros.filter((r) => {
        if (filtroPessoa && String(r.colaborador_id) !== filtroPessoa) return false
        if (filtroKind && kindOf(r).key !== filtroKind) return false
        return true
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registros, filtroPessoa, filtroKind],
  )

  function startAdd() {
    setEditing(null)
    setForm({ pessoaId: filtroPessoa || '', kindKey: cfg.kinds[0].key, titulo: '', data: '', link: '', descricao: '' })
    setShowForm(true)
  }

  function startEdit(r: RegistroComPessoa) {
    setEditing(r)
    setForm({
      pessoaId: String(r.colaborador_id),
      kindKey: kindOf(r).key,
      titulo: r.titulo,
      data: r.data ?? '',
      link: r.link ?? '',
      descricao: r.descricao,
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const pessoaId = Number(form.pessoaId)
    if (!pessoaId) return
    const kind = cfg.kinds.find((k) => k.key === form.kindKey) ?? cfg.kinds[0]
    setSaving(true)
    try {
      const payload = {
        tipo: kind.tipo,
        categoria: kind.categoria ?? '',
        titulo: form.titulo,
        data: form.data || null,
        link: form.link,
        descricao: form.descricao,
      }
      if (editing) await updateRegistro(editing.colaborador_id, editing.id, payload)
      else await createRegistro(pessoaId, payload)
      setShowForm(false)
      setEditing(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(r: RegistroComPessoa) {
    if (!window.confirm('Remover este registro?')) return
    await deleteRegistro(r.colaborador_id, r.id)
    await load()
  }

  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of registros) {
      const k = kindOf(r).key
      m[k] = (m[k] || 0) + 1
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros])

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">RH &amp; Desenvolvimento</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{cfg.title}</h1>
            <p className="mt-1 text-sm text-ink/55">{cfg.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => (showForm ? setShowForm(false) : startAdd())} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta">
              <PlusIcon className="h-4 w-4" />
              {showForm ? 'Cancelar' : cfg.addLabel}
            </button>
          </div>
        </header>

        {showForm ? (
          <form onSubmit={save} className="mt-6 grid gap-4 rounded-xl2 border border-ink/10 bg-cream/60 p-5 sm:grid-cols-2">
            <label className={label}>
              Colaborador*
              <select required value={form.pessoaId} disabled={!!editing} onChange={(e) => setForm((f) => ({ ...f, pessoaId: e.target.value }))} className={`${field} disabled:opacity-60`}>
                <option value="">Selecione…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ''}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Tipo
              <select value={form.kindKey} onChange={(e) => setForm((f) => ({ ...f, kindKey: e.target.value }))} className={field}>
                {cfg.kinds.map((k) => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </label>
            <label className={`${label} sm:col-span-2`}>
              {cfg.tituloLabel}
              <input type="text" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={field} />
            </label>
            <label className={label}>
              Data
              <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className={field} />
            </label>
            <label className={label}>
              {cfg.linkLabel}
              <input type="url" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className={field} placeholder="https://…" />
            </label>
            <label className={`${label} sm:col-span-2`}>
              {variant === 'medidas' ? 'Detalhes' : 'Observações'}
              <textarea rows={2} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className={`${field} resize-y`} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving || !form.pessoaId} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <select value={filtroPessoa} onChange={(e) => setFiltroPessoa(e.target.value)} className="rounded-full border border-ink/15 bg-cream/70 px-4 py-1.5 text-sm text-ink outline-none focus:border-terracotta/40">
            <option value="">Todas as pessoas</option>
            {colaboradores.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <button type="button" onClick={() => setFiltroKind('')} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filtroKind === '' ? 'bg-ink text-cream' : 'border border-ink/15 bg-cream/70 text-ink/65 hover:text-ink'}`}>
            Todos <span className="opacity-60">{registros.length}</span>
          </button>
          {cfg.kinds.map((k) => (
            <button key={k.key} type="button" onClick={() => setFiltroKind(k.key)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filtroKind === k.key ? 'bg-ink text-cream' : 'border border-ink/15 bg-cream/70 text-ink/65 hover:text-ink'}`}>
              {k.label} <span className="opacity-60">{counts[k.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2.5">
          {status === 'loading' ? (
            <p className="py-12 text-center text-sm text-ink/45">Carregando…</p>
          ) : status === 'error' ? (
            <p className="py-12 text-center text-sm text-ink/55">Não foi possível carregar os registros.</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-ink/15 py-14 text-center text-sm text-ink/55">
              {registros.length === 0 ? 'Nenhum registro ainda.' : 'Nada encontrado com esses filtros.'}
            </div>
          ) : (
            filtered.map((r) => {
              const kind = kindOf(r)
              const prev = resolveDoc(r.link)
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-ink/10 bg-cream p-3.5 shadow-card">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linen text-sm font-semibold text-mauve">
                    {initials(r.colaborador_nome)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{r.colaborador_nome || '—'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONES[kind.tone]}`}>{kind.label}</span>
                      {r.colaborador_cargo ? <span className="text-xs text-ink/45">{r.colaborador_cargo}</span> : null}
                    </div>
                    <p className="mt-0.5 text-sm text-ink/70">
                      {[r.titulo, fmtDate(r.data)].filter(Boolean).join(' · ') || 'Sem detalhes'}
                    </p>
                    {r.descricao ? <p className="mt-1 whitespace-pre-wrap text-sm text-ink/55">{r.descricao}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {prev ? (
                      <button type="button" onClick={() => setPreviewLink({ titulo: r.titulo || r.colaborador_nome, link: r.link })} className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-terracotta">
                        Ver
                      </button>
                    ) : r.link ? (
                      <a href={r.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-terracotta">
                        Abrir <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <button type="button" onClick={() => startEdit(r)} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
                      Editar
                    </button>
                    <button type="button" onClick={() => remove(r)} aria-label="Remover" className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {previewLink && resolveDoc(previewLink.link) ? (
        <DocumentoModal
          titulo={previewLink.titulo || 'Documento'}
          preview={resolveDoc(previewLink.link)!}
          onClose={() => setPreviewLink(null)}
        />
      ) : null}
    </div>
  )
}
