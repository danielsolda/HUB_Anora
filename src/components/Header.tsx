import { AnoraLogo } from './AnoraLogo'

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#topo" className="text-ink transition-opacity hover:opacity-80" aria-label="Início">
          <AnoraLogo size="sm" />
        </a>

        <nav className="hidden items-center gap-8 text-sm text-ink/70 md:flex">
          <a className="transition-colors hover:text-terracotta" href="#servicos">
            Serviços
          </a>
          <a className="transition-colors hover:text-terracotta" href="#categorias">
            Categorias
          </a>
          <a className="transition-colors hover:text-terracotta" href="#sobre">
            Sobre
          </a>
        </nav>

        <span className="hidden text-xs uppercase tracking-[0.2em] text-ink/50 sm:block">
          HUB de Serviços
        </span>
      </div>
    </header>
  )
}
