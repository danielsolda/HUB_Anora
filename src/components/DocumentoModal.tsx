import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DownloadIcon, ExternalLinkIcon, XIcon } from '../lib/icons'
import type { DocPreview } from '../lib/docpreview'

/**
 * Modal que exibe um documento (imagem, PDF ou preview do Google Drive) sobre a
 * página, com botões para baixar e abrir em nova aba. Fecha com Esc ou no fundo.
 */
export function DocumentoModal({
  titulo,
  preview,
  onClose,
}: {
  titulo: string
  preview: DocPreview
  onClose: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div onClick={onClose} aria-hidden="true" className="absolute inset-0 bg-ink/60 backdrop-blur-sm [animation:fade-in_0.2s_ease-out]" />

      <div role="dialog" aria-modal="true" aria-label={titulo} className="relative flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl2 bg-cream shadow-card-hover [animation:modal-in_0.25s_ease-out]">
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
          <h2 className="min-w-0 truncate text-sm font-medium text-ink">{titulo}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <a href={preview.download} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-terracotta">
              <DownloadIcon className="h-3.5 w-3.5" />
              Baixar
            </a>
            <a href={preview.open} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink">
              <span className="hidden sm:inline">Abrir</span>
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 bg-linen/30">
          {!loaded ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink/45">
              Carregando documento…
            </div>
          ) : null}
          {preview.image ? (
            <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
              <img src={preview.image} alt={titulo} onLoad={() => setLoaded(true)} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <iframe src={preview.embed ?? preview.open} title={titulo} onLoad={() => setLoaded(true)} className="absolute inset-0 h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
