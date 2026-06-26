import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon, XIcon } from '../lib/icons'
import {
  createStage,
  deleteStage,
  reorderStages,
  updateStage,
  type Stage,
} from '../lib/candidates'

type StageSettingsModalProps = {
  stages: Stage[]
  onClose: () => void
  onChanged: () => void | Promise<void>
}

export function StageSettingsModal({ stages, onClose, onChanged }: StageSettingsModalProps) {
  const [newLabel, setNewLabel] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
      await onChanged()
    } catch {
      /* ignora; a lista permanece como está */
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const label = newLabel.trim()
    if (!label) return
    await run(() => createStage(label))
    setNewLabel('')
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= stages.length) return
    const order = stages.map((s) => s.id)
    ;[order[index], order[target]] = [order[target], order[index]]
    run(() => reorderStages(order))
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm [animation:fade-in_0.2s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurar etapas"
        className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-xl2 bg-cream shadow-card-hover [animation:modal-in_0.25s_ease-out]"
      >
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Etapas do quadro</h2>
            <p className="mt-0.5 text-xs text-ink/50">Crie, renomeie, reordene ou remova.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="space-y-2">
            {stages.map((stage, index) => {
              const draft = drafts[stage.id]
              const changed = draft !== undefined && draft.trim() !== stage.label
              return (
                <li
                  key={stage.id}
                  className="flex items-center gap-2 rounded-lg border border-ink/10 bg-cream/60 p-2"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label="Mover para cima"
                      className="rounded p-0.5 text-ink/40 transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={busy || index === stages.length - 1}
                      aria-label="Mover para baixo"
                      className="rounded p-0.5 text-ink/40 transition-colors hover:text-ink disabled:opacity-30"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    value={draft ?? stage.label}
                    onChange={(e) => setDrafts({ ...drafts, [stage.id]: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-ink outline-none focus:border-ink/15 focus:bg-cream"
                  />

                  {changed ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(() => updateStage(stage.id, draft.trim())).then(() =>
                          setDrafts((d) => {
                            const next = { ...d }
                            delete next[stage.id]
                            return next
                          }),
                        )
                      }
                      className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-cream transition-colors hover:bg-terracotta"
                    >
                      Salvar
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy || stages.length <= 1}
                    onClick={() => {
                      if (window.confirm(`Remover a etapa "${stage.label}"?`)) {
                        run(() => deleteStage(stage.id))
                      }
                    }}
                    aria-label="Remover etapa"
                    className="rounded-full p-1.5 text-ink/40 transition-colors hover:bg-terracotta/10 hover:text-terracotta disabled:opacity-30"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <form onSubmit={onAdd} className="flex items-center gap-2 border-t border-ink/10 px-5 py-4">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nova etapa…"
            className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-terracotta/50"
          />
          <button
            type="submit"
            disabled={busy || !newLabel.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-terracotta disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
