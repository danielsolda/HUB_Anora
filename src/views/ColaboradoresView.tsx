import { useEffect, useMemo, useState } from 'react'
import {
  AwardIcon,
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  FileTextIcon,
  FolderIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UserIcon,
  VideoIcon,
  WalletIcon,
} from '../lib/icons'
import {
  createColaborador,
  deleteColaborador,
  listColaboradores,
  updateColaborador,
  STATUS_LABELS,
  type Colaborador,
  type ColaboradorInput,
  type ColaboradorStatus,
} from '../lib/colaboradores'
import { RegistroSection, REGISTRO_CONFIGS } from '../components/RegistroSection'

const STATUS_STYLE: Record<ColaboradorStatus, string> = {
  experiencia: 'bg-sand/30 text-mauve',
  ativo: 'bg-olive/15 text-olive',
  desligado: 'bg-ink/10 text-ink/50',
}

function StatusBadge({ status }: { status: ColaboradorStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const EMPTY: ColaboradorInput = {
  nome: '',
  cargo: '',
  setor: '',
  email: '',
  telefone: '',
  admissao: '',
  status: 'experiencia',
  observacoes: '',
}

/** Campos editáveis de um colaborador (usado em criar e na aba Dados). */
function ColaboradorForm({
  value,
  onChange,
}: {
  value: ColaboradorInput
  onChange: (patch: Partial<ColaboradorInput>) => void
}) {
  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        Nome*
        <input
          type="text"
          required
          value={value.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
          className={field}
        />
      </label>
      <label className={label}>
        Cargo / função
        <input type="text" value={value.cargo} onChange={(e) => onChange({ cargo: e.target.value })} className={field} placeholder="Biomédica, Recepcionista…" />
      </label>
      <label className={label}>
        Setor
        <input type="text" value={value.setor} onChange={(e) => onChange({ setor: e.target.value })} className={field} placeholder="Comercial, Operações…" />
      </label>
      <label className={label}>
        E-mail
        <input type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} className={field} />
      </label>
      <label className={label}>
        Telefone
        <input type="text" value={value.telefone} onChange={(e) => onChange({ telefone: e.target.value })} className={field} />
      </label>
      <label className={label}>
        Admissão
        <input type="date" value={value.admissao ?? ''} onChange={(e) => onChange({ admissao: e.target.value })} className={field} />
      </label>
      <label className={label}>
        Situação
        <select value={value.status} onChange={(e) => onChange({ status: e.target.value as ColaboradorStatus })} className={field}>
          {(Object.keys(STATUS_LABELS) as ColaboradorStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Histórico / observações
        <textarea
          rows={3}
          value={value.observacoes}
          onChange={(e) => onChange({ observacoes: e.target.value })}
          className={`${field} resize-y`}
          placeholder="Anotações sobre a trajetória do colaborador…"
        />
      </label>
    </div>
  )
}

function SoonSection({ icon: Icon, title, hint }: { icon: typeof UserIcon; title: string; hint: string }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-linen text-mauve">
          <Icon className="h-7 w-7" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">{hint}</p>
        <p className="mt-5 inline-flex rounded-full bg-sand/25 px-3 py-1 text-xs font-medium text-mauve ring-1 ring-mauve/20">
          Em desenvolvimento
        </p>
      </div>
    </div>
  )
}

const SECTIONS = [
  { id: 'dados', label: 'Dados', icon: UserIcon },
  { id: 'contrato', label: 'Contrato', icon: FileTextIcon, hint: 'Contrato de trabalho, aditivos e datas importantes.' },
  { id: 'holerites', label: 'Holerites', icon: WalletIcon, hint: 'Holerites e comprovantes de pagamento por competência.' },
  { id: 'avaliacoes', label: 'Avaliações', icon: AwardIcon, hint: 'Avaliações de desempenho e feedbacks ao longo do tempo.' },
  { id: 'advertencias', label: 'Advertências', icon: BellIcon, hint: 'Registro de advertências, com data e motivo.' },
  { id: 'suspensoes', label: 'Suspensões', icon: BellIcon, hint: 'Registro de suspensões, com período e motivo.' },
  { id: 'ferias', label: 'Férias', icon: CalendarIcon, hint: 'Períodos aquisitivos, agendamentos e saldo de férias.' },
  { id: 'banco-horas', label: 'Banco de horas', icon: CalendarIcon, hint: 'Saldo de horas, extras e compensações.' },
  { id: 'documentos', label: 'Documentos', icon: FolderIcon, hint: 'Documentos trabalhistas e arquivos da pessoa.' },
  { id: 'treinamentos', label: 'Treinamentos', icon: VideoIcon, hint: 'Treinamentos realizados, certificados e materiais.' },
] as const

function Ficha({
  colaborador,
  onBack,
  onSaved,
  onDeleted,
}: {
  colaborador: Colaborador
  onBack: () => void
  onSaved: (c: Colaborador) => void
  onDeleted: (id: number) => void
}) {
  const [tab, setTab] = useState<string>('dados')
  const [form, setForm] = useState<ColaboradorInput>(colaborador)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(false)

  // Recarrega o formulário só ao trocar de pessoa (não a cada salvar).
  useEffect(() => {
    setForm(colaborador)
    setSavedAt(false)
    setTab('dados')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaborador.id])

  const dirty = useMemo(
    () => (Object.keys(EMPTY) as (keyof ColaboradorInput)[]).some((k) => (form[k] ?? '') !== ((colaborador as ColaboradorInput)[k] ?? '')),
    [form, colaborador],
  )

  async function save() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const updated = await updateColaborador(colaborador.id, form)
      onSaved(updated)
      setSavedAt(true)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remover o colaborador ${colaborador.nome}?`)) return
    await deleteColaborador(colaborador.id)
    onDeleted(colaborador.id)
  }

  const section = SECTIONS.find((s) => s.id === tab)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Cabeçalho da ficha */}
      <div className="border-b border-ink/10 bg-cream/50 px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Colaboradores
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-cream">
            {initials(colaborador.nome)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-ink">{colaborador.nome}</h2>
            <p className="text-sm text-ink/55">
              {[colaborador.cargo, colaborador.setor].filter(Boolean).join(' · ') || 'Sem cargo definido'}
            </p>
          </div>
          <StatusBadge status={colaborador.status} />
        </div>
      </div>

      {/* Abas da ficha */}
      <div className="overflow-x-auto border-b border-ink/10 px-3 sm:px-6">
        <div className="flex gap-1 py-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const isActive = s.id === tab
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink text-cream' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo da aba */}
      {tab === 'dados' ? (
        <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
          <ColaboradorForm value={form} onChange={(patch) => { setForm((f) => ({ ...f, ...patch })); setSavedAt(false) }} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty || !form.nome.trim()}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
            {savedAt && !dirty ? <span className="text-sm text-olive">Salvo ✓</span> : null}
            <button
              type="button"
              onClick={remove}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/10"
            >
              <TrashIcon className="h-4 w-4" />
              Remover
            </button>
          </div>
        </div>
      ) : REGISTRO_CONFIGS[tab] ? (
        <RegistroSection colaboradorId={colaborador.id} config={REGISTRO_CONFIGS[tab]} />
      ) : section ? (
        <SoonSection icon={section.icon} title={section.label} hint={'hint' in section ? section.hint : ''} />
      ) : null}
    </div>
  )
}

export function ColaboradoresView() {
  const [list, setList] = useState<Colaborador[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [novo, setNovo] = useState<ColaboradorInput>(EMPTY)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<'todos' | ColaboradorStatus>('todos')
  const [busca, setBusca] = useState('')

  async function load() {
    setStatus('loading')
    try {
      setList(await listColaboradores())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selected = list.find((c) => c.id === selectedId) ?? null

  const filtered = list.filter((c) => {
    if (filter !== 'todos' && c.status !== filter) return false
    if (busca.trim()) {
      const q = busca.toLowerCase()
      return [c.nome, c.cargo, c.setor].some((v) => (v || '').toLowerCase().includes(q))
    }
    return true
  })

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!novo.nome.trim()) return
    setCreating(true)
    try {
      const created = await createColaborador(novo)
      setList((l) => [...l, created].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovo(EMPTY)
      setShowCreate(false)
      setSelectedId(created.id)
    } finally {
      setCreating(false)
    }
  }

  if (selected) {
    return (
      <Ficha
        colaborador={selected}
        onBack={() => setSelectedId(null)}
        onSaved={(c) => setList((l) => l.map((x) => (x.id === c.id ? c : x)))}
        onDeleted={(id) => {
          setList((l) => l.filter((x) => x.id !== id))
          setSelectedId(null)
        }}
      />
    )
  }

  const counts = {
    todos: list.length,
    ativo: list.filter((c) => c.status === 'ativo').length,
    experiencia: list.filter((c) => c.status === 'experiencia').length,
    desligado: list.filter((c) => c.status === 'desligado').length,
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">
              RH &amp; Desenvolvimento
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">Colaboradores</h1>
            <p className="mt-1 text-sm text-ink/55">
              O time da clínica. Clique numa pessoa para abrir a ficha completa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              aria-label="Atualizar"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink"
            >
              <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
            >
              <PlusIcon className="h-4 w-4" />
              {showCreate ? 'Cancelar' : 'Novo colaborador'}
            </button>
          </div>
        </header>

        {showCreate ? (
          <form onSubmit={onCreate} className="mt-6 rounded-xl2 border border-ink/10 bg-cream/60 p-5">
            <ColaboradorForm value={novo} onChange={(patch) => setNovo((n) => ({ ...n, ...patch }))} />
            <div className="mt-5">
              <button
                type="submit"
                disabled={creating || !novo.nome.trim()}
                className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40"
              >
                {creating ? 'Adicionando…' : 'Adicionar colaborador'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {([
            ['todos', 'Todos'],
            ['ativo', STATUS_LABELS.ativo],
            ['experiencia', STATUS_LABELS.experiencia],
            ['desligado', STATUS_LABELS.desligado],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? 'border-terracotta/40 bg-terracotta/10 text-ink'
                  : 'border-ink/15 bg-cream text-ink/60 hover:border-terracotta/40 hover:text-ink'
              }`}
            >
              {label} <span className="tabular-nums text-ink/40">{counts[key]}</span>
            </button>
          ))}
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cargo…"
            className="ml-auto w-full max-w-xs rounded-full border border-ink/15 bg-cream/70 px-4 py-1.5 text-sm text-ink placeholder:text-ink/40 outline-none focus:border-terracotta/40"
          />
        </div>

        {/* Lista */}
        <div className="mt-6">
          {status === 'loading' ? (
            <p className="py-16 text-center text-sm text-ink/45">Carregando…</p>
          ) : status === 'error' ? (
            <p className="py-16 text-center text-sm text-ink/55">Não foi possível carregar os colaboradores.</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-ink/15 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl2 bg-linen text-mauve">
                <ClipboardIcon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-ink/70">
                {list.length === 0 ? 'Nenhum colaborador cadastrado ainda.' : 'Nada encontrado com esse filtro.'}
              </p>
              {list.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm font-medium text-terracotta hover:text-ink"
                >
                  Adicionar o primeiro
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="group flex items-start gap-3 rounded-xl2 border border-ink/10 bg-cream p-4 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-terracotta/30 hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linen text-sm font-semibold text-olive transition-colors group-hover:bg-ink group-hover:text-cream">
                    {initials(c.nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{c.nome}</span>
                    <span className="block truncate text-sm text-ink/55">
                      {[c.cargo, c.setor].filter(Boolean).join(' · ') || 'Sem cargo'}
                    </span>
                    <span className="mt-2 block">
                      <StatusBadge status={c.status} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
