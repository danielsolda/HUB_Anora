import { MenuIcon, SearchIcon } from '../lib/icons'
import type { ViewId } from '../navigation'
import { viewLabel } from '../navigation'

type TopBarProps = {
  view: ViewId
  query: string
  onQuery: (value: string) => void
  onOpenMenu: () => void
  showSearch?: boolean
}

export function TopBar({ view, query, onQuery, onOpenMenu, showSearch = true }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink/10 bg-cream/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="-ml-1 rounded-lg p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <h1 className="text-sm font-medium text-ink/80">{viewLabel(view)}</h1>

      {showSearch ? (
        <div className="relative ml-auto w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar sistema…"
            aria-label="Buscar sistema"
            className="w-full rounded-full border border-ink/15 bg-cream/70 py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-terracotta/40"
          />
        </div>
      ) : null}
    </header>
  )
}
