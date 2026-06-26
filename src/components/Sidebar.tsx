import { useState, type ComponentType, type SVGProps } from 'react'
import { AnoraMark } from './AnoraLogo'
import { ChangePasswordModal } from './ChangePasswordModal'
import {
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  HomeIcon,
  KeyIcon,
  LogoutIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
} from '../lib/icons'
import { categories, services } from '../data/services'
import type { ViewId } from '../navigation'
import { useAuth } from '../auth/AuthContext'
import { canAccessView, canSeeService, ROLE_LABELS } from '../auth/access'
import type { Role } from '../auth/api'

type NavItem = {
  id: ViewId
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  count?: number
}

function buildNav(role: Role) {
  const visibleServices = (categoryId: string) =>
    services.filter((s) => s.category === categoryId && canSeeService(role, s.id)).length

  const primary: NavItem[] = [
    { id: 'inicio', label: 'Início', icon: HomeIcon },
    { id: 'videos', label: 'Vídeos', icon: VideoIcon },
  ]
  const servicesNav: NavItem[] = [
    {
      id: 'todos',
      label: 'Todos os serviços',
      icon: GridIcon,
      count: services.filter((s) => canSeeService(role, s.id)).length,
    },
    ...categories.map((c) => ({
      id: c.id as ViewId,
      label: c.label,
      icon: c.icon,
      count: visibleServices(c.id),
    })),
    { id: 'financeiro', label: 'Financeiro', icon: ChartIcon },
  ]
  const admin: NavItem[] = [{ id: 'usuarios', label: 'Usuários', icon: UsersIcon }]

  const keep = (items: NavItem[]) => items.filter((i) => canAccessView(role, i.id))
  return { primary: keep(primary), services: keep(servicesNav), admin: keep(admin) }
}

type SidebarProps = {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function NavButton({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const { icon: Icon, label, count } = item
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        collapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
      } ${active ? 'bg-cream/10 font-medium text-cream' : 'text-cream/60 hover:bg-cream/5 hover:text-cream'}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors ${
          active ? 'text-terracotta' : 'text-cream/45 group-hover:text-cream/80'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className={`flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {typeof count === 'number' ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums ${
            collapsed ? 'lg:hidden' : ''
          } ${active ? 'bg-cream/15 text-cream/80' : 'text-cream/35'}`}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

export function Sidebar({
  activeView,
  onNavigate,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const [showChangePassword, setShowChangePassword] = useState(false)

  if (!user) return null
  const nav = buildNav(user.role)

  const sectionLabel = (text: string) => (
    <p
      className={`px-3 pb-2 pt-6 text-[0.65rem] uppercase tracking-[0.22em] text-cream/35 ${
        collapsed ? 'lg:hidden' : ''
      }`}
    >
      {text}
    </p>
  )

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink text-cream transition-all duration-300 lg:translate-x-0 ${
          collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Botão de recolher (apenas desktop) */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="absolute -right-3 top-8 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-cream text-ink shadow-card transition-colors hover:text-terracotta lg:flex"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>

        {/* Marca */}
        <div
          className={`flex h-16 items-center gap-2.5 border-b border-cream/10 px-5 ${
            collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'
          }`}
        >
          <button
            type="button"
            onClick={() => onNavigate(nav.primary[0]?.id ?? 'videos')}
            className="flex items-center gap-2.5 text-left"
          >
            <AnoraMark className="h-8 w-8 shrink-0 text-terracotta" title="Clínica Anora" />
            <span className={`flex flex-col leading-none ${collapsed ? 'lg:hidden' : ''}`}>
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
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
          <div className="space-y-1">
            {nav.primary.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeView === item.id}
                collapsed={collapsed}
                onClick={() => onNavigate(item.id)}
              />
            ))}
          </div>

          {nav.services.length > 0 ? (
            <>
              {sectionLabel('Serviços')}
              <div className="space-y-1">
                {nav.services.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={activeView === item.id}
                    collapsed={collapsed}
                    onClick={() => onNavigate(item.id)}
                  />
                ))}
              </div>
            </>
          ) : null}

          {nav.admin.length > 0 ? (
            <>
              {sectionLabel('Administração')}
              <div className="space-y-1">
                {nav.admin.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={activeView === item.id}
                    collapsed={collapsed}
                    onClick={() => onNavigate(item.id)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </nav>

        {/* Rodapé: usuário + ações */}
        <div className="border-t border-cream/10 px-4 py-4">
          <p className={`truncate text-sm font-medium text-cream ${collapsed ? 'lg:hidden' : ''}`}>
            {user.name || user.email}
          </p>
          <p className={`text-xs text-cream/45 ${collapsed ? 'lg:hidden' : ''}`}>
            {ROLE_LABELS[user.role]}
          </p>
          <div
            className={`mt-3 flex items-center gap-2 ${collapsed ? 'lg:mt-0 lg:flex-col lg:gap-1.5' : ''}`}
          >
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              title="Trocar senha"
              className={`inline-flex items-center gap-1.5 rounded-full border border-cream/15 px-2.5 py-1.5 text-xs text-cream/70 transition-colors hover:border-cream/30 hover:text-cream ${
                collapsed ? 'lg:px-2' : ''
              }`}
            >
              <KeyIcon className="h-3.5 w-3.5" />
              <span className={collapsed ? 'lg:hidden' : ''}>Trocar senha</span>
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sair"
              className={`inline-flex items-center gap-1.5 rounded-full border border-cream/15 px-2.5 py-1.5 text-xs text-cream/70 transition-colors hover:border-cream/30 hover:text-cream ${
                collapsed ? 'lg:px-2' : ''
              }`}
            >
              <LogoutIcon className="h-3.5 w-3.5" />
              <span className={collapsed ? 'lg:hidden' : ''}>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {showChangePassword ? (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      ) : null}
    </>
  )
}
