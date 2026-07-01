import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  MoreVerticalIcon,
  PlusIcon,
  RefreshIcon,
  UploadIcon,
} from '../lib/icons'
import { DocumentoModal } from '../components/DocumentoModal'
import { previewFromArquivo, resolveDoc, type DocPreview } from '../lib/docpreview'
import {
  createDocumento,
  createPasta,
  deleteDocumento,
  deletePasta,
  formatBytes,
  formatDate,
  listDocumentos,
  listPastas,
  renamePasta,
  updateDocumento,
  uploadArquivo,
  type Documento,
  type DocumentoInput,
  type DocumentoTipo,
  type Pasta,
} from '../lib/financeiro'

const MAX_UPLOAD = 25 * 1024 * 1024

/** Prévia de um documento: arquivo enviado tem prioridade sobre o link. */
function docPreview(d: Documento): DocPreview | null {
  if (d.arquivo) return previewFromArquivo(d.arquivo)
  return resolveDoc(d.link)
}

/** Menu de três pontos (estilo Drive), fecha ao clicar fora ou apertar Esc. */
function Kebab({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Opções"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="rounded-full p-1.5 text-ink/45 transition-colors hover:bg-ink/8 hover:text-ink"
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false) }} aria-hidden="true" />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-ink/10 bg-cream py-1 shadow-card-hover">
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick() }}
                className={`block w-full px-3.5 py-1.5 text-left text-sm transition-colors hover:bg-ink/5 ${it.danger ? 'text-terracotta' : 'text-ink/75'}`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Miniatura grande do documento no card: imagem/thumbnail → iframe → ícone. */
function CardPreview({ d }: { d: Documento }) {
  const prev = docPreview(d)
  const [imgErr, setImgErr] = useState(false)
  if (!prev) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-mauve">
        <FileTextIcon className="h-9 w-9" />
        <span className="text-xs text-ink/40">Sem arquivo</span>
      </div>
    )
  }
  if (prev.thumbnail && !imgErr) {
    return (
      <img
        src={prev.thumbnail}
        alt=""
        loading="lazy"
        onError={() => setImgErr(true)}
        className="h-full w-full object-cover object-top"
      />
    )
  }
  if ((prev.kind === 'drive' || prev.kind === 'pdf') && prev.embed) {
    return (
      <iframe
        src={prev.embed}
        title=""
        tabIndex={-1}
        loading="lazy"
        className="pointer-events-none h-full w-full border-0 bg-white"
      />
    )
  }
  // Link externo sem miniatura (site genérico): mostra o domínio, não um "erro".
  const host = hostOf(prev.open)
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-mauve">
      <ExternalLinkIcon className="h-8 w-8" />
      <span className="max-w-full truncate text-center text-xs text-ink/45">{host || 'Abrir link'}</span>
    </div>
  )
}

const LABELS: Record<DocumentoTipo, { title: string; nova: string; contraparte: string; tituloPh: string }> = {
  nota_fiscal: { title: 'Notas fiscais', nova: 'Nova nota', contraparte: 'Emitente / Fornecedor', tituloPh: 'Ex.: NF 1234' },
  contrato_fornecedor: { title: 'Contratos com fornecedores', nova: 'Novo contrato', contraparte: 'Fornecedor', tituloPh: 'Ex.: Contrato de manutenção' },
  documento_contabil: { title: 'Documentos contábeis', nova: 'Novo documento', contraparte: 'Origem', tituloPh: 'Ex.: Balancete jun/2026' },
}

const emptyForm = (tipo: DocumentoTipo, pasta_id: number | null = null): DocumentoInput => ({
  tipo,
  titulo: '',
  link: '',
  data: '',
  categoria: '',
  contraparte: '',
  observacoes: '',
  pasta_id,
  arquivo_id: null,
})

export function DocumentosFinView({ tipo }: { tipo: DocumentoTipo }) {
  const [list, setList] = useState<Documento[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [currentFolder, setCurrentFolder] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<DocumentoInput>(() => emptyForm(tipo))
  const [origem, setOrigem] = useState<'link' | 'arquivo'>('link')
  const [file, setFile] = useState<File | null>(null)
  const [existingArquivoNome, setExistingArquivoNome] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [busca, setBusca] = useState('')
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | 'root' | null>(null)
  const draggingRef = useRef<number | null>(null)

  const L = LABELS[tipo]

  async function load() {
    setStatus('loading')
    try {
      const [docs, ps] = await Promise.all([listDocumentos(tipo), listPastas(tipo)])
      setList(docs)
      setPastas(ps)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    setShowForm(false)
    setEditingId(null)
    setBusca('')
    setCurrentFolder(null)
    setShowNewFolder(false)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  const pastaById = useMemo(() => new Map(pastas.map((p) => [p.id, p])), [pastas])

  function pathTo(id: number | null): Pasta[] {
    const out: Pasta[] = []
    let cur = id
    while (cur != null) {
      const p = pastaById.get(cur)
      if (!p) break
      out.unshift(p)
      cur = p.parent_id ?? null
    }
    return out
  }
  const breadcrumb = pathTo(currentFolder)

  const searching = busca.trim().length > 0
  const q = busca.trim().toLowerCase()
  const matchDoc = (d: Documento) =>
    [d.titulo, d.contraparte, d.categoria, d.arquivo?.nome].some((v) => (v || '').toLowerCase().includes(q))

  const childFolders = pastas
    .filter((p) => (p.parent_id ?? null) === currentFolder)
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const docsHere = list.filter((d) => (d.pasta_id ?? null) === currentFolder)
  const shownDocs = searching ? list.filter(matchDoc) : docsHere

  const folderOptions = useMemo(() => {
    const out: { id: number; label: string }[] = []
    const walk = (parent: number | null, depth: number) => {
      pastas
        .filter((p) => (p.parent_id ?? null) === parent)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .forEach((p) => {
          out.push({ id: p.id, label: `${'   '.repeat(depth)}${p.nome}` })
          walk(p.id, depth + 1)
        })
    }
    walk(null, 0)
    return out
  }, [pastas])

  function goTo(id: number | null) {
    setCurrentFolder(id)
    setShowForm(false)
    setShowNewFolder(false)
    setBusca('')
  }

  // ── Arrastar documento para dentro de uma pasta ──
  function onDragStartDoc(id: number) {
    draggingRef.current = id
    setDraggingId(id)
  }
  function onDragEndDoc() {
    draggingRef.current = null
    setDraggingId(null)
    setDropTarget(null)
  }
  function allowDrop(e: React.DragEvent, target: number | 'root') {
    if (draggingRef.current == null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTarget !== target) setDropTarget(target)
  }
  async function moveDocTo(folderId: number | null) {
    const id = draggingRef.current
    onDragEndDoc()
    if (id == null) return
    const doc = list.find((d) => d.id === id)
    if (!doc || (doc.pasta_id ?? null) === folderId) return
    setList((prev) => prev.map((d) => (d.id === id ? { ...d, pasta_id: folderId } : d)))
    try {
      await updateDocumento(id, { pasta_id: folderId })
    } catch {
      await load()
    }
  }

  function startAdd() {
    setForm(emptyForm(tipo, currentFolder))
    setOrigem('link')
    setFile(null)
    setExistingArquivoNome(null)
    setFormErr('')
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(d: Documento) {
    setForm({
      tipo: d.tipo,
      titulo: d.titulo,
      link: d.link,
      data: d.data ?? '',
      categoria: d.categoria,
      contraparte: d.contraparte,
      observacoes: d.observacoes,
      pasta_id: d.pasta_id,
      arquivo_id: d.arquivo?.id ?? null,
    })
    setOrigem(d.arquivo ? 'arquivo' : 'link')
    setFile(null)
    setExistingArquivoNome(d.arquivo?.nome ?? null)
    setFormErr('')
    setEditingId(d.id)
    setShowForm(true)
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFormErr('')
    if (f && f.size > MAX_UPLOAD) {
      setFormErr('Arquivo muito grande (máximo 25 MB).')
      setFile(null)
      e.target.value = ''
      return
    }
    setFile(f)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo?.trim()) return
    setSaving(true)
    setFormErr('')
    try {
      const payload: DocumentoInput = { ...form, tipo, pasta_id: form.pasta_id ?? null }
      if (origem === 'arquivo') {
        payload.link = ''
        if (file) {
          const meta = await uploadArquivo(file)
          payload.arquivo_id = meta.id
        } else {
          payload.arquivo_id = form.arquivo_id ?? null
        }
        if (!payload.arquivo_id) {
          setFormErr('Selecione um arquivo para enviar.')
          setSaving(false)
          return
        }
      } else {
        payload.arquivo_id = null
      }
      if (editingId) await updateDocumento(editingId, payload)
      else await createDocumento(payload)
      setShowForm(false)
      setEditingId(null)
      setFile(null)
      setExistingArquivoNome(null)
      await load()
    } catch {
      setFormErr('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(d: Documento) {
    if (!window.confirm(`Remover "${d.titulo}"?`)) return
    await deleteDocumento(d.id)
    await load()
  }

  async function createFolder() {
    const nome = newFolderName.trim()
    if (!nome) return
    try {
      await createPasta({ tipo, nome, parent_id: currentFolder })
      setNewFolderName('')
      setShowNewFolder(false)
      await load()
    } catch {
      /* ignore */
    }
  }

  async function renameFolder(p: Pasta) {
    const nome = window.prompt('Renomear pasta', p.nome)?.trim()
    if (!nome || nome === p.nome) return
    await renamePasta(p.id, nome)
    await load()
  }

  async function removeFolder(p: Pasta) {
    if (!window.confirm(`Remover a pasta "${p.nome}"?`)) return
    try {
      await deletePasta(p.id)
      await load()
    } catch (err) {
      if ((err as Error).message === 'not_empty') {
        window.alert('A pasta não está vazia. Mova ou remova o conteúdo antes de excluí-la.')
      } else {
        window.alert('Não foi possível remover a pasta.')
      }
    }
  }

  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'
  const dragging = draggingId != null

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">Financeiro</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{L.title}</h1>
            <p className="mt-1 text-sm text-ink/55">Organize em pastas, por link ou arquivo enviado.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => { setShowNewFolder((v) => !v); setNewFolderName('') }} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink">
              <FolderPlusIcon className="h-4 w-4" />
              Nova pasta
            </button>
            <button type="button" onClick={() => (showForm ? setShowForm(false) : startAdd())} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta">
              <PlusIcon className="h-4 w-4" />
              {showForm ? 'Cancelar' : L.nova}
            </button>
          </div>
        </header>

        {/* Breadcrumb — também aceita soltar documentos para mover de pasta */}
        <nav className="mt-5 flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => goTo(null)}
            onDragOver={(e) => allowDrop(e, 'root')}
            onDragLeave={() => setDropTarget((t) => (t === 'root' ? null : t))}
            onDrop={() => moveDocTo(null)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors ${dropTarget === 'root' ? 'bg-terracotta/15 ring-1 ring-terracotta' : 'hover:bg-ink/5'} ${currentFolder === null ? 'font-semibold text-ink' : 'text-ink/60'}`}
          >
            <FolderIcon className="h-4 w-4" />
            Todos
          </button>
          {breadcrumb.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRightIcon className="h-4 w-4 text-ink/30" />
              <button
                type="button"
                onClick={() => goTo(p.id)}
                onDragOver={(e) => allowDrop(e, p.id)}
                onDragLeave={() => setDropTarget((t) => (t === p.id ? null : t))}
                onDrop={() => moveDocTo(p.id)}
                className={`rounded-full px-2 py-1 transition-colors ${dropTarget === p.id ? 'bg-terracotta/15 ring-1 ring-terracotta' : 'hover:bg-ink/5'} ${i === breadcrumb.length - 1 ? 'font-semibold text-ink' : 'text-ink/60'}`}
              >
                {p.nome}
              </button>
            </span>
          ))}
        </nav>

        {showNewFolder ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl2 border border-ink/10 bg-cream/60 p-3">
            <FolderPlusIcon className="h-4 w-4 text-terracotta" />
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              placeholder={currentFolder === null ? 'Nome da nova pasta' : `Nova subpasta em "${breadcrumb[breadcrumb.length - 1]?.nome}"`}
              className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-cream px-3 py-1.5 text-sm text-ink outline-none focus:border-terracotta/50"
            />
            <button type="button" onClick={createFolder} disabled={!newFolderName.trim()} className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
              Criar
            </button>
          </div>
        ) : null}

        {showForm ? (
          <form onSubmit={save} className="mt-4 grid gap-4 rounded-xl2 border border-ink/10 bg-cream/60 p-5 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              Título*
              <input type="text" required value={form.titulo ?? ''} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className={field} placeholder={L.tituloPh} />
            </label>

            <div className="sm:col-span-2">
              <span className={label}>Arquivo</span>
              <div className="mt-1.5 inline-flex rounded-full border border-ink/15 bg-cream p-0.5 text-sm">
                <button type="button" onClick={() => setOrigem('link')} className={`rounded-full px-3.5 py-1 font-medium transition-colors ${origem === 'link' ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}>
                  Link
                </button>
                <button type="button" onClick={() => setOrigem('arquivo')} className={`rounded-full px-3.5 py-1 font-medium transition-colors ${origem === 'arquivo' ? 'bg-ink text-cream' : 'text-ink/60 hover:text-ink'}`}>
                  Enviar arquivo
                </button>
              </div>

              {origem === 'link' ? (
                <input type="url" value={form.link ?? ''} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} className={field} placeholder="https://drive.google.com/…" />
              ) : (
                <div className="mt-2 rounded-lg border border-dashed border-ink/20 bg-cream p-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 bg-linen/60 px-3.5 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink">
                    <UploadIcon className="h-4 w-4" />
                    {file || existingArquivoNome ? 'Trocar arquivo' : 'Escolher arquivo'}
                    <input type="file" onChange={onPickFile} className="hidden" />
                  </label>
                  <p className="mt-2 text-xs text-ink/55">
                    {file
                      ? `${file.name} · ${formatBytes(file.size)}`
                      : existingArquivoNome
                        ? `Atual: ${existingArquivoNome}`
                        : 'PDF, imagem ou documento — até 25 MB.'}
                  </p>
                </div>
              )}
            </div>

            <label className={label}>
              Pasta
              <select value={form.pasta_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, pasta_id: e.target.value ? Number(e.target.value) : null }))} className={field}>
                <option value="">Todos (raiz)</option>
                {folderOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
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
            {formErr ? <p className="text-sm text-terracotta sm:col-span-2">{formErr}</p> : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving || !form.titulo?.trim()} className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="mt-6">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar em todas as pastas…" className="w-full max-w-xs rounded-full border border-ink/15 bg-cream/70 px-4 py-1.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-terracotta/40" />
        </div>

        {dragging ? (
          <p className="mt-4 text-center text-xs font-medium text-terracotta">Solte sobre uma pasta (ou no caminho acima) para mover.</p>
        ) : null}

        {/* Pastas — grade de blocos, cada um aceita soltar documentos */}
        {!searching && childFolders.length > 0 ? (
          <section className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Pastas</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {childFolders.map((p) => (
                <div
                  key={p.id}
                  onDragOver={(e) => allowDrop(e, p.id)}
                  onDragLeave={() => setDropTarget((t) => (t === p.id ? null : t))}
                  onDrop={() => moveDocTo(p.id)}
                  className={`group flex items-center gap-2 rounded-xl border bg-cream px-3 py-2.5 shadow-card transition-colors ${
                    dropTarget === p.id
                      ? 'border-terracotta ring-2 ring-terracotta/40'
                      : dragging
                        ? 'border-dashed border-terracotta/40'
                        : 'border-ink/10'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linen text-terracotta">
                    <FolderIcon className="h-5 w-5" />
                  </span>
                  <button type="button" onClick={() => goTo(p.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink transition-colors group-hover:text-terracotta" title={p.nome}>
                    {p.nome}
                  </button>
                  <Kebab
                    items={[
                      { label: 'Abrir', onClick: () => goTo(p.id) },
                      { label: 'Renomear', onClick: () => renameFolder(p) },
                      { label: 'Remover', onClick: () => removeFolder(p), danger: true },
                    ]}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Documentos — grade de cards com miniatura (estilo Drive) */}
        <section className="mt-6">
          {!searching && childFolders.length > 0 && shownDocs.length > 0 ? (
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Arquivos</h2>
          ) : null}

          {status === 'loading' ? (
            <p className="py-12 text-center text-sm text-ink/45">Carregando…</p>
          ) : status === 'error' ? (
            <p className="py-12 text-center text-sm text-ink/55">Não foi possível carregar os documentos.</p>
          ) : shownDocs.length === 0 ? (
            childFolders.length > 0 && !searching ? null : (
              <div className="rounded-xl2 border border-dashed border-ink/15 py-14 text-center text-sm text-ink/55">
                {searching ? 'Nada encontrado.' : list.length === 0 ? 'Nenhum documento ainda.' : 'Pasta vazia.'}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shownDocs.map((d) => {
                const prev = docPreview(d)
                const meta = [d.contraparte, d.data ? formatDate(d.data) : '', d.arquivo ? formatBytes(d.arquivo.tamanho) : '']
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <article
                    key={d.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(d.id)); onDragStartDoc(d.id) }}
                    onDragEnd={onDragEndDoc}
                    className={`group flex select-none flex-col overflow-hidden rounded-xl2 border border-ink/10 bg-cream shadow-card transition-all hover:shadow-card-hover ${draggingId === d.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 border-b border-ink/8 px-2.5 py-2">
                      <FileTextIcon className="h-4 w-4 shrink-0 text-mauve" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink" title={d.titulo}>{d.titulo || '—'}</span>
                      <Kebab
                        items={[
                          ...(prev ? [{ label: 'Ver', onClick: () => setPreviewDoc(d) }] : []),
                          { label: 'Editar', onClick: () => startEdit(d) },
                          { label: 'Remover', onClick: () => remove(d), danger: true },
                        ]}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => prev && setPreviewDoc(d)}
                      disabled={!prev}
                      title={prev ? 'Ver documento' : undefined}
                      className={`relative block h-40 w-full overflow-hidden bg-linen/40 ${prev ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <CardPreview d={d} />
                      <span className="pointer-events-none absolute left-2 top-2 flex gap-1">
                        {d.arquivo ? <span className="rounded-full bg-olive/90 px-2 py-0.5 text-[11px] font-medium text-cream">Arquivo</span> : null}
                        {d.categoria ? <span className="rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-medium text-cream">{d.categoria}</span> : null}
                      </span>
                    </button>
                    <div className="truncate px-2.5 py-2 text-xs text-ink/50" title={meta}>
                      {meta || 'Sem detalhes'}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {previewDoc && docPreview(previewDoc) ? (
        <DocumentoModal
          titulo={previewDoc.titulo || 'Documento'}
          preview={docPreview(previewDoc)!}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}
    </div>
  )
}
