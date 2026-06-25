import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from '../lib/icons'
import { STAGES } from '../lib/candidates'
import type { Candidate, StageId } from '../lib/candidates'

type CandidateDetailModalProps = {
  candidate: Candidate
  onMove: (stage: StageId) => void
  onClose: () => void
}

/** Modal com os dados preenchidos de um candidato + troca de etapa. */
export function CandidateDetailModal({
  candidate,
  onMove,
  onClose,
}: CandidateDetailModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const entries = Object.entries(candidate.fields).filter(([, value]) => value)

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm [animation:fade-in_0.2s_ease-out]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Candidato ${candidate.name}`}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl2 bg-cream shadow-card-hover [animation:modal-in_0.25s_ease-out]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{candidate.name}</h2>
            {candidate.timestamp ? (
              <p className="mt-0.5 text-xs text-ink/50">Chegou em {candidate.timestamp}</p>
            ) : null}
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
          <dl className="space-y-3">
            {entries.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-ink/45">{label}</dt>
                <dd className="mt-0.5 text-sm text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="border-t border-ink/10 px-5 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/45">
            Mover para
          </p>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const isCurrent = stage.id === candidate.stage
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onMove(stage.id)}
                  disabled={isCurrent}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'cursor-default bg-ink text-cream'
                      : 'bg-cream text-ink/70 ring-1 ring-ink/15 hover:bg-linen/50 hover:text-ink'
                  }`}
                >
                  {stage.label}
                </button>
              )
            })}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
