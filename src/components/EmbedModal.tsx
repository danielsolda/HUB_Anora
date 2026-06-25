import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLinkIcon, GoogleSheetsIcon, XIcon } from '../lib/icons'

type EmbedModalProps = {
  /** Título exibido no cabeçalho do modal. */
  title: string
  /** URL embutida no iframe. */
  src: string
  /** Link opcional para abrir o conteúdo original em nova aba. */
  href?: string
  onClose: () => void
}

/**
 * Modal que exibe um conteúdo externo embutido (iframe) sobre a página.
 * Renderizado via portal no <body> para não sofrer com o `transform` do card.
 * Fecha com Esc ou clique no fundo; trava o scroll enquanto aberto.
 */
export function EmbedModal({ title, src, href, onClose }: EmbedModalProps) {
  const [loaded, setLoaded] = useState(false)

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
        aria-label={title}
        className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl2 bg-cream shadow-card-hover [animation:modal-in_0.25s_ease-out]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <GoogleSheetsIcon className="h-5 w-5 shrink-0" />
            <h2 className="truncate text-sm font-medium text-ink">{title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <span className="hidden sm:inline">Abrir no Google Sheets</span>
                <span className="sm:hidden">Abrir</span>
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-1.5 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 bg-linen/30">
          {!loaded ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink/45">
              Carregando planilha…
            </div>
          ) : null}
          <iframe
            src={src}
            title={title}
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
