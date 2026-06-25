import { useEffect, useState } from 'react'
import { CandidateDetailModal } from './CandidateDetailModal'
import { EmbedModal } from './EmbedModal'
import { ExternalLinkIcon, GoogleSheetsIcon, RefreshIcon } from '../lib/icons'
import {
  FORM_URL,
  SHEET_EDIT_URL,
  SHEET_PREVIEW_URL,
  STAGES,
  fetchCandidates,
  saveStage,
} from '../lib/candidates'
import type { Candidate, StageId } from '../lib/candidates'

type Status = 'loading' | 'ok' | 'error'

function pickField(candidate: Candidate, re: RegExp): string {
  const key = Object.keys(candidate.fields).find((k) => re.test(k))
  return key ? candidate.fields[key] : ''
}

function previewOf(candidate: Candidate): string[] {
  const out: string[] = []
  const role = pickField(candidate, /vaga|cargo|fun[cç]/i)
  const phone = pickField(candidate, /tele|whats|fone|cel/i)
  const city = pickField(candidate, /cidade|local/i)
  if (role) out.push(role)
  if (phone) out.push(phone)
  else if (city) out.push(city)
  return out
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function KanbanBoard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [source, setSource] = useState<'live' | 'sample'>('live')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<StageId | null>(null)

  async function load() {
    setStatus('loading')
    try {
      const result = await fetchCandidates()
      setCandidates(result.candidates)
      setSource(result.source)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  function move(id: string, stage: StageId) {
    let previous: StageId | undefined
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          previous = c.stage
          return { ...c, stage }
        }
        return c
      }),
    )
    // Salva no backend; em caso de falha, desfaz a movimentação.
    saveStage(id, stage).catch(() => {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id && previous ? { ...c, stage: previous } : c)),
      )
      setSaveError('Não foi possível salvar a movimentação. Tente novamente.')
      window.setTimeout(() => setSaveError(null), 4000)
    })
  }

  const selected = candidates.find((c) => c.id === selectedId) ?? null

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho do módulo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-4 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Contratação</h1>
          <p className="mt-0.5 text-sm text-ink/55">
            Quadro de candidatos das vagas, por etapa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink"
          >
            <RefreshIcon className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowSheet(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-terracotta/40"
          >
            <GoogleSheetsIcon className="h-4 w-4" />
            Planilha
          </button>
          <a
            href={FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
          >
            Abrir formulário
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Banner de modo demonstração */}
      {status === 'ok' && source === 'sample' ? (
        <div className="mx-5 mt-4 rounded-lg border border-mauve/30 bg-sand/20 px-4 py-2.5 text-sm text-ink/70 sm:mx-6">
          Modo demonstração — o servidor ainda não está conectado à planilha
          (conta de serviço não configurada). Exibindo dados de exemplo.
        </div>
      ) : null}

      {/* Aviso de falha ao salvar */}
      {saveError ? (
        <div className="mx-5 mt-4 rounded-lg border border-terracotta/30 bg-terracotta/10 px-4 py-2.5 text-sm text-terracotta sm:mx-6">
          {saveError}
        </div>
      ) : null}

      {/* Estado de erro de conexão */}
      {status === 'error' ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <h2 className="text-lg font-semibold text-ink">Sem conexão com o servidor</h2>
            <p className="mt-2 text-sm text-ink/55">
              Não foi possível carregar os candidatos. Verifique se o servidor está no ar
              e tente novamente.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
              >
                <RefreshIcon className="h-4 w-4" />
                Tentar de novo
              </button>
              <a
                href={SHEET_EDIT_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium text-ink/75 transition-colors hover:text-ink"
              >
                Abrir planilha
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Colunas */
        <div className="flex-1 overflow-x-auto px-5 py-5 sm:px-6">
          <div className="flex gap-4">
            {STAGES.map((stage) => {
              const items = candidates.filter((c) => c.stage === stage.id)
              const isOver = overStage === stage.id
              return (
                <section
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setOverStage(stage.id)
                  }}
                  onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain')
                    if (id) move(id, stage.id)
                    setOverStage(null)
                    setDragId(null)
                  }}
                  className={`flex w-[280px] shrink-0 flex-col rounded-xl2 border bg-cream/50 transition-colors ${
                    isOver ? 'border-terracotta/50 bg-linen/40' : 'border-ink/10'
                  }`}
                >
                  <header className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
                    <h2 className="text-sm font-semibold text-ink">{stage.label}</h2>
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs tabular-nums text-ink/55">
                      {items.length}
                    </span>
                  </header>

                  <div className="flex max-h-[calc(100vh-19rem)] min-h-[6rem] flex-col gap-2.5 overflow-y-auto p-3">
                    {status === 'loading' ? (
                      <div className="space-y-2.5">
                        <div className="h-16 animate-pulse rounded-lg bg-ink/5" />
                        <div className="h-16 animate-pulse rounded-lg bg-ink/5" />
                      </div>
                    ) : items.length === 0 ? (
                      <p className="px-1 py-6 text-center text-xs text-ink/35">
                        Nenhum candidato
                      </p>
                    ) : (
                      items.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', candidate.id)
                            e.dataTransfer.effectAllowed = 'move'
                            setDragId(candidate.id)
                          }}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverStage(null)
                          }}
                          onClick={() => setSelectedId(candidate.id)}
                          className={`group w-full cursor-grab rounded-lg border border-ink/10 bg-cream p-3 text-left shadow-sm transition-all hover:border-terracotta/30 hover:shadow-card active:cursor-grabbing ${
                            dragId === candidate.id ? 'opacity-40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linen text-[0.7rem] font-semibold text-olive">
                              {initials(candidate.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-ink">
                                {candidate.name}
                              </span>
                              {previewOf(candidate).length > 0 ? (
                                <span className="block truncate text-xs text-ink/50">
                                  {previewOf(candidate).join(' · ')}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {selected ? (
        <CandidateDetailModal
          candidate={selected}
          onMove={(stage) => {
            move(selected.id, stage)
            setSelectedId(null)
          }}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {showSheet ? (
        <EmbedModal
          title="Contratação · Respostas"
          src={SHEET_PREVIEW_URL}
          href={SHEET_EDIT_URL}
          onClose={() => setShowSheet(false)}
        />
      ) : null}
    </div>
  )
}
