import type { ComponentType, SVGProps } from 'react'
import { AnoraMark } from './AnoraLogo'
import { GridIcon, HomeIcon, XIcon } from '../lib/icons'
import { categories, services } from '../data/services'
import type { ViewId } from '../navigation'

type NavItem = {
  id: ViewId
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  count?: number
}

const primaryNav: NavItem[] = [{ id: 'inicio', label: 'Início', icon: HomeIcon }]

const servicesNav: NavItem[] = [
  { id: 'todos', label: 'Todos os serviços', icon: GridIcon, count: services.length },
  ...categories.map((category) => ({
    id: category.id as ViewId,
    label: category.label,
    icon: category.icon,
    count: services.filter((s) => s.category === category.id).length,
  })),
]

type SidebarProps = {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  open: boolean
  onClose: () => void
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const { icon: Icon, label, count } = item
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active
          ? 'bg-cream/10 font-medium text-cream'
          : 'text-cream/60 hover:bg-cream/5 hover:text-cream'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
          active ? 'text-terracotta' : 'text-cream/45 group-hover:text-cream/80'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums ${
            active ? 'bg-cream/15 text-cream/80' : 'text-cream/35'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

export function Sidebar({ activeView, onNavigate, open, onClose }: SidebarProps) {
  const year = new Date().getFullYear()

  return (
    <>
      {/* Backdrop (apenas mobile) */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink text-cream transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Marca */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-cream/10 px-5">
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="flex items-center gap-2.5 text-left"
          >
            <AnoraMark className="h-8 w-8 shrink-0 text-terracotta" title="Clínica Anora" />
            <span className="flex flex-col leading-none">
              <span className="text-base font-medium tracking-[0.24em]">ANORA</span>
              <span className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-cream/45">
                HUB de Serviços
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="text-cream/60 transition-colors hover:text-cream lg:hidden"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>

          <p className="px-3 pb-2 pt-6 text-[0.65rem] uppercase tracking-[0.22em] text-cream/35">
            Serviços
          </p>
          <div className="space-y-1">
            {servicesNav.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* Rodapé */}
        <div className="border-t border-cream/10 px-5 py-4 text-[0.7rem] leading-relaxed text-cream/40">
          <p className="uppercase tracking-[0.15em]">Uso interno</p>
          <p className="mt-1">© {year} Clínica Anora</p>
        </div>
      </aside>
    </>
  )
}
