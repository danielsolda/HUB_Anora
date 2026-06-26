import { useState } from 'react'
import { ExternalLinkIcon, MenuIcon, RefreshIcon } from '../lib/icons'

type DashboardEmbedProps = {
  title: string
  /** URL embutida (iframe). */
  src: string
  /** Abre o menu lateral no mobile (quando esta view não tem barra superior). */
  onOpenMenu?: () => void
  /** Ocupa a altura toda da viewport (quando renderizada sem barra superior). */
  fullHeight?: boolean
}

/**
 * Exibe um sistema externo embutido inline (iframe), preenchendo a área de
 * conteúdo — sem modal. Tem um cabeçalho com atualizar e abrir em nova aba
 * (fallback caso o sistema não permita ser embutido).
 */
export function DashboardEmbed({ title, src, onOpenMenu, fullHeight }: DashboardEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  function reload() {
    setLoaded(false)
    setReloadKey((k) => k + 1)
  }

  return (
    <div
      className={`flex h-full flex-col ${
        fullHeight ? 'min-h-screen' : 'min-h-[calc(100vh-4rem)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1.5">
          {onOpenMenu ? (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
              className="-ml-1 rounded-lg p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          ) : null}
          <h1 className="text-base font-semibold text-ink">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors hover:border-terracotta/40 hover:text-ink"
          >
            <RefreshIcon className={`h-4 w-4 ${loaded ? '' : 'animate-spin'}`} />
            Atualizar
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-cream transition-colors hover:bg-terracotta"
          >
            Abrir em nova aba
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="relative flex-1 bg-linen/20">
        {!loaded ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink/45">
            Carregando dashboard…
          </div>
        ) : null}
        <iframe
          key={reloadKey}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  )
}
