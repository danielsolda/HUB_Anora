import { useEffect, useState } from 'react'
import { FileTextIcon, PlusIcon, RefreshIcon, TrashIcon } from '../lib/icons'
import { DocumentoModal } from '../components/DocumentoModal'
import { resolveDoc } from '../lib/docpreview'
import {
  createDocumento,
  deleteDocumento,
  formatDate,
  listDocumentos,
  updateDocumento,
  type Documento,
  type DocumentoInput,
  type DocumentoTipo,
} from '../lib/financeiro'

/** Miniatura do documento (thumbnail do Drive/imagem), com fallback para ícone. */
function Thumb({ url }: { url: string | null }) {
  const [err, setErr] = useState(false)
  if (!url || err) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-linen text-mauve">
        <FileTextIcon className="h-6 w-6" />
      </span>
    )
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setErr(true)}
      className="h-14 w-14 shrink-0 rounded-lg border border-ink/10 bg-linen object-cover"
    />
  )
}

const LABELS: Record<DocumentoTipo, { title: string; nova: string; contraparte: string; tituloPh: string }> = {
  nota_fiscal: { title: 'Notas fiscais', nova: 'Nova nota', contraparte: 'Emitente / Fornecedor', tituloPh: 'Ex.: NF 1234' },
  contrato_fornecedor: { title: 'Contratos com fornecedores', nova: 'Novo contrato', contraparte: 'Fornecedor', tituloPh: 'Ex.: Contrato de manutenção' },
  documento_contabil: { title: 'Documentos contábeis', nova: 'Novo documento', contraparte: 'Origem', tituloPh: 'Ex.: Balancete jun/2026' },
}

const emptyForm = (tipo: DocumentoTipo): DocumentoInput => ({
  tipo,
  titulo: '',
  link: '',
  data: '',
  categoria: '',
  contraparte: '',
  observacoes: '',
})

export function DocumentosFinView({ tipo }: { tipo: DocumentoTipo }) {
  const [list, setList] = useState<Documento[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<DocumentoInput>(() => emptyForm(tipo))
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null)

  const L = LABELS[tipo]

  async function load() {
    setStatus('loading')
    try {
      setList(await listDocumentos(tipo))
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setBusca('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const filtered = list.filter((d) => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return [d.titulo, d.contraparte, d.categoria].some((v) => (v || '').toLowerCase().includes(q))
  })

  function startAdd() {
    setForm(emptyForm(tipo))
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(d: Documento) {
    setForm({ ...d })
    setEditingId(d.id)
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo?.trim()) return
    setSaving(true)
    try {
      if (editingId) await updateDocumento(editingId, form)
      else await createDocumento({ ...form, tipo })
      setShowForm(false)
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(d: Documento) {
    if (!window.confirm(`Remover "${d.titulo}"?`)) return
    await deleteDocumento(d.id)
    await load()
  }

  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">Financeiro</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{L.title}</h1>
            <p className="mt-1 text-sm text-ink/55">Organizados por link (Google Drive, Dropbox, etc.).</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => (showForm ? setShowForm(false) : startAdd())} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta">
              <PlusIcon className="h-4 w-4" />
              {showForm ? 'Cancelar' : L.nova}
            </button>
          </div>
        </header>

        {showForm ? (
          <form onSubmit={save} className="mt-6 grid gap-4 rounded-xl2 border border-ink/10 bg-cream/60 p-5 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              Título*
              <input type="text" required value={form.titulo ?? ''} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={field} placeholder={L.tituloPh} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Link do arquivo
              <input type="url" value={form.link ?? ''} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className={field} placeholder="https://drive.google.com/…" />
            </label>
            <label className={label}>
              Data
              <input type="date" value={form.data ?? ''} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className={field} />
            </label>
            <label className={label}>
              {L.contraparte}
              <input type="text" value={form.contraparte ?? ''} onChange={(e) => setForm((f) => ({ ...f, contraparte: e.target.value }))} className={field} />
            </label>
            <label className={label}>
              Categoria
              <input type="text" value={form.categoria ?? ''} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} className={field} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Observações
              <textarea rows={2} value={form.observacoes ?? ''} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} className={`${field} resize-y`} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving || !form.titulo?.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-6">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, fornecedor…" className="w-full max-w-xs rounded-full border border-ink/15 bg-cream/70 px-4 py-1.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-terracotta/40" />
        </div>

        <div className="mt-5 space-y-2.5">
          {status === 'loading' ? (
            <p className="py-12 text-center text-sm text-ink/45">Carregando…</p>
          ) : status === 'error' ? (
            <p className="py-12 text-center text-sm text-ink/55">Não foi possível carregar os documentos.</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-ink/15 py-14 text-center text-sm text-ink/55">
              {list.length === 0 ? 'Nenhum documento ainda.' : 'Nada encontrado.'}
            </div>
          ) : (
            filtered.map((d) => {
              const prev = resolveDoc(d.link)
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl2 border border-ink/10 bg-cream p-3 shadow-card">
                  <button
                    type="button"
                    onClick={() => prev && setPreviewDoc(d)}
                    disabled={!prev}
                    title={prev ? 'Ver documento' : undefined}
                    className={`group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left ${prev ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <Thumb url={prev?.thumbnail ?? null} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`truncate font-semibold text-ink ${prev ? 'group-hover:text-terracotta' : ''}`}>{d.titulo || '—'}</span>
                        {d.categoria ? <span className="rounded-full bg-linen px-2 py-0.5 text-xs font-medium text-mauve">{d.categoria}</span> : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink/55">
                        {[d.contraparte, d.data ? formatDate(d.data) : ''].filter(Boolean).join(' · ') || 'Sem detalhes'}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    {prev ? (
                      <button type="button" onClick={() => setPreviewDoc(d)} className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-terracotta">
                        Ver
                      </button>
                    ) : null}
                    <button type="button" onClick={() => startEdit(d)} className="rounded-full px-2.5 py-1 text-xs font-medium text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
                      Editar
                    </button>
                    <button type="button" onClick={() => remove(d)} aria-label="Remover" className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {previewDoc && resolveDoc(previewDoc.link) ? (
        <DocumentoModal
          titulo={previewDoc.titulo || 'Documento'}
          preview={resolveDoc(previewDoc.link)!}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}
    </div>
  )
}
