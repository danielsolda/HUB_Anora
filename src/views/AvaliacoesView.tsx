import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from '../lib/icons'
import { RadarChart } from '../components/RadarChart'
import { listColaboradores, type Colaborador } from '../lib/colaboradores'
import {
  createAvaliacao,
  deleteAvaliacao,
  dimensaoScores,
  getModelo,
  listAvaliacoes,
  MODELOS,
  mediaGeral,
  modeloForCargo,
  updateAvaliacao,
  type AvaliacaoComPessoa,
  type Respostas,
} from '../lib/avaliacoes'

const today = () => new Date().toISOString().slice(0, 10)
function fmtDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}
function initials(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '—'
}
function mediaTone(v: number): string {
  if (v >= 4) return 'bg-olive/15 text-olive'
  if (v >= 3) return 'bg-sand/30 text-mauve'
  return 'bg-terracotta/15 text-terracotta'
}

function Score({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${value === n ? 'bg-ink text-cream' : 'bg-linen/70 text-ink/55 hover:bg-linen'}`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

type Ass = { nome: string; data: string }

export function AvaliacoesView() {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoComPessoa[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [screen, setScreen] = useState<'list' | 'detail' | 'form'>('list')
  const [current, setCurrent] = useState<AvaliacaoComPessoa | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Form
  const [colaboradorId, setColaboradorId] = useState<string>('')
  const [modeloKey, setModeloKey] = useState<string>(MODELOS[0].key)
  const [dataAdmissao, setDataAdmissao] = useState<string>('')
  const [dataAvaliacao, setDataAvaliacao] = useState<string>('')
  const [respostas, setRespostas] = useState<Respostas>({})
  const [assColab, setAssColab] = useState<Ass>({ nome: '', data: '' })
  const [assGestor, setAssGestor] = useState<Ass>({ nome: '', data: '' })
  const [observacoes, setObservacoes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setStatus('loading')
    try {
      const [avs, cols] = await Promise.all([listAvaliacoes(), listColaboradores()])
      setAvaliacoes(avs)
      setColaboradores(cols)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const colaboradorById = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores])
  const modelo = getModelo(modeloKey)

  function openDetail(a: AvaliacaoComPessoa) {
    setCurrent(a)
    setScreen('detail')
  }

  function startNew() {
    setEditingId(null)
    setColaboradorId('')
    setModeloKey(MODELOS[0].key)
    setDataAdmissao('')
    setDataAvaliacao(today())
    setRespostas({})
    setAssColab({ nome: '', data: '' })
    setAssGestor({ nome: '', data: '' })
    setObservacoes('')
    setScreen('form')
  }

  function startEdit(a: AvaliacaoComPessoa) {
    setEditingId(a.id)
    setColaboradorId(String(a.colaborador_id))
    setModeloKey(a.modelo || modeloForCargo(a.colaborador_cargo).key)
    setDataAdmissao(a.data_admissao ?? '')
    setDataAvaliacao(a.data_avaliacao ?? today())
    setRespostas(a.respostas || {})
    setAssColab(a.assinatura_colaborador ?? { nome: '', data: '' })
    setAssGestor(a.assinatura_gestor ?? { nome: '', data: '' })
    setObservacoes(a.observacoes || '')
    setScreen('form')
  }

  function onSelectColaborador(id: string) {
    setColaboradorId(id)
    if (editingId) return
    const c = colaboradorById.get(Number(id))
    if (c) {
      setModeloKey(modeloForCargo(c.cargo).key)
      if (c.admissao) setDataAdmissao(c.admissao)
    }
  }

  async function save() {
    const cid = Number(colaboradorId)
    if (!cid) return
    setSaving(true)
    try {
      const payload = {
        modelo: modeloKey,
        data_admissao: dataAdmissao || null,
        data_avaliacao: dataAvaliacao || null,
        respostas,
        assinatura_colaborador: assColab.nome && assColab.data ? assColab : null,
        assinatura_gestor: assGestor.nome && assGestor.data ? assGestor : null,
        observacoes,
      }
      if (editingId) await updateAvaliacao(cid, editingId, payload)
      else await createAvaliacao(cid, payload)
      await load()
      setScreen('list')
    } finally {
      setSaving(false)
    }
  }

  async function remove(a: AvaliacaoComPessoa) {
    if (!window.confirm(`Remover a avaliação de ${a.colaborador_nome}?`)) return
    await deleteAvaliacao(a.colaborador_id, a.id)
    await load()
    setScreen('list')
  }

  const field = 'mt-1.5 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50'
  const label = 'text-sm font-medium text-ink/70'

  // ── LISTA ──
  if (screen === 'list') {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">RH &amp; Desenvolvimento</p>
              <h1 className="mt-2 text-2xl font-semibold text-ink">Avaliação de desempenho</h1>
              <p className="mt-1 text-sm text-ink/55">Avaliações por função, com notas de 0 a 5 e gráfico de competências.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={load} aria-label="Atualizar" className="inline-flex items-center rounded-full border border-ink/15 bg-cream px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:border-terracotta/40 hover:text-ink">
                <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={startNew} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta">
                <PlusIcon className="h-4 w-4" />
                Nova avaliação
              </button>
            </div>
          </header>

          <div className="mt-6 space-y-2.5">
            {status === 'loading' ? (
              <p className="py-12 text-center text-sm text-ink/45">Carregando…</p>
            ) : status === 'error' ? (
              <p className="py-12 text-center text-sm text-ink/55">Não foi possível carregar as avaliações.</p>
            ) : avaliacoes.length === 0 ? (
              <div className="rounded-xl2 border border-dashed border-ink/15 py-14 text-center text-sm text-ink/55">
                Nenhuma avaliação ainda. Clique em “Nova avaliação”.
              </div>
            ) : (
              avaliacoes.map((a) => {
                const m = getModelo(a.modelo)
                const media = mediaGeral(m, a.respostas || {})
                const assinada = !!(a.assinatura_colaborador && a.assinatura_gestor)
                return (
                  <button key={a.id} type="button" onClick={() => openDetail(a)} className="flex w-full flex-wrap items-center gap-3 rounded-xl2 border border-ink/10 bg-cream p-3.5 text-left shadow-card transition-shadow hover:shadow-card-hover">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linen text-sm font-semibold text-mauve">
                      {initials(a.colaborador_nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{a.colaborador_nome}</span>
                        <span className="rounded-full bg-linen px-2 py-0.5 text-xs font-medium text-mauve">{m.label}</span>
                        {assinada ? <span className="rounded-full bg-olive/10 px-2 py-0.5 text-xs font-medium text-olive">Assinada</span> : null}
                      </div>
                      <p className="mt-0.5 text-sm text-ink/55">Avaliação em {fmtDate(a.data_avaliacao)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${mediaTone(media)}`}>{media.toFixed(1)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── DETALHE ──
  if (screen === 'detail' && current) {
    const m = getModelo(current.modelo)
    const dims = dimensaoScores(m, current.respostas || {})
    const media = mediaGeral(m, current.respostas || {})
    return (
      <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <button type="button" onClick={() => setScreen('list')} className="inline-flex items-center gap-1 text-sm font-medium text-ink/60 transition-colors hover:text-ink">
            <ChevronLeftIcon className="h-4 w-4" /> Voltar
          </button>
          <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">{current.colaborador_nome}</h1>
              <p className="mt-1 text-sm text-ink/55">
                {m.label} · Avaliação em {fmtDate(current.data_avaliacao)} · Admissão {fmtDate(current.data_admissao)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${mediaTone(media)}`}>Média {media.toFixed(1)}</span>
              <button type="button" onClick={() => startEdit(current)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink">
                <PencilIcon className="h-4 w-4" /> Editar
              </button>
              <button type="button" onClick={() => remove(current)} aria-label="Remover" className="rounded-full p-2 text-ink/45 transition-colors hover:bg-terracotta/10 hover:text-terracotta">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
              <RadarChart data={dims} />
            </div>
            <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
              <h3 className="text-sm font-semibold text-ink">Competências</h3>
              <ul className="mt-3 space-y-2.5">
                {dims.map((d) => (
                  <li key={d.dimensao}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink/70">{d.dimensao}</span>
                      <span className="shrink-0 font-medium tabular-nums text-ink">{d.score.toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-linen/70">
                      <div className="h-2 rounded-full bg-terracotta transition-[width] duration-500" style={{ width: `${(d.score / 5) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {current.observacoes ? (
            <div className="mt-4 rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
              <h3 className="text-sm font-semibold text-ink">Observações</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{current.observacoes}</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Assinatura do colaborador', a: current.assinatura_colaborador },
              { t: 'Assinatura do gestor', a: current.assinatura_gestor },
            ].map(({ t, a }) => (
              <div key={t} className="rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
                <p className="text-xs uppercase tracking-wide text-ink/45">{t}</p>
                {a ? (
                  <p className="mt-1.5 text-sm text-ink"><span className="font-medium">{a.nome}</span> · {fmtDate(a.data)}</p>
                ) : (
                  <p className="mt-1.5 text-sm text-ink/40">Pendente</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── FORMULÁRIO ──
  const dimsPreview = dimensaoScores(modelo, respostas)
  return (
    <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <button type="button" onClick={() => setScreen('list')} className="inline-flex items-center gap-1 text-sm font-medium text-ink/60 transition-colors hover:text-ink">
          <ChevronLeftIcon className="h-4 w-4" /> Voltar
        </button>
        <h1 className="mt-3 text-2xl font-semibold text-ink">{editingId ? 'Editar avaliação' : 'Nova avaliação'}</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="mt-5"
        >
          <div className="grid gap-4 rounded-xl2 border border-ink/10 bg-cream/60 p-5 sm:grid-cols-2">
            <label className={label}>
              Colaborador*
              <select required value={colaboradorId} disabled={!!editingId} onChange={(e) => onSelectColaborador(e.target.value)} className={`${field} disabled:opacity-60`}>
                <option value="">Selecione…</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}{c.cargo ? ` — ${c.cargo}` : ''}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Modelo (função)
              <select value={modeloKey} onChange={(e) => setModeloKey(e.target.value)} className={field}>
                {MODELOS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Data de admissão
              <input type="date" value={dataAdmissao} onChange={(e) => setDataAdmissao(e.target.value)} className={field} />
            </label>
            <label className={label}>
              Data da avaliação
              <input type="date" value={dataAvaliacao} onChange={(e) => setDataAvaliacao(e.target.value)} className={field} />
            </label>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Perguntas por dimensão */}
            <div className="space-y-4">
              {modelo.dimensoes.map((dim) => (
                <div key={dim} className="rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-ink">{dim}</h3>
                  <div className="mt-3 space-y-3">
                    {modelo.perguntas.filter((p) => p.dimensao === dim).map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 text-sm text-ink/70">{p.label}</span>
                        <Score value={respostas[p.id]} onChange={(v) => setRespostas((r) => ({ ...r, [p.id]: v }))} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Radar ao vivo + resumo */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">Competências</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${mediaTone(mediaGeral(modelo, respostas))}`}>{mediaGeral(modelo, respostas).toFixed(1)}</span>
                </div>
                <RadarChart data={dimsPreview} />
              </div>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Assinatura do colaborador', ass: assColab, set: setAssColab },
              { t: 'Assinatura do gestor', ass: assGestor, set: setAssGestor },
            ].map(({ t, ass, set }) => (
              <div key={t} className="rounded-xl2 border border-ink/10 bg-cream p-4 shadow-card">
                <p className="text-xs uppercase tracking-wide text-ink/45">{t}</p>
                <input type="text" value={ass.nome} onChange={(e) => set({ ...ass, nome: e.target.value })} placeholder="Nome de quem assina" className={field} />
                <label className="mt-2 flex items-center gap-2 text-sm text-ink/70">
                  <input type="checkbox" checked={!!ass.data} onChange={(e) => set({ ...ass, data: e.target.checked ? today() : '' })} className="h-4 w-4 accent-terracotta" />
                  De acordo {ass.data ? `· ${fmtDate(ass.data)}` : ''}
                </label>
              </div>
            ))}
          </div>

          <label className={`${label} mt-4 block`}>
            Observações
            <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={`${field} resize-y`} />
          </label>

          <div className="mt-5 flex items-center gap-3">
            <button type="submit" disabled={saving || !colaboradorId} className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-40">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Salvar avaliação'}
            </button>
            <button type="button" onClick={() => setScreen('list')} className="text-sm font-medium text-ink/55 hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
