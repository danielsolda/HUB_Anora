import { KanbanBoard } from '../components/KanbanBoard'
import { DashboardEmbed } from '../components/DashboardEmbed'
import { categories, services } from '../data/services'
import type { CategoryId, Service } from '../types'
import { useAuth } from '../auth/AuthContext'
import { canSeeService } from '../auth/access'

function ModulePlaceholder({ service }: { service: Service }) {
  const Icon = service.icon
  return (
    <div className="flex h-full min-h-[24rem] items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-linen text-mauve">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink">{service.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">{service.description}</p>
        <p className="mt-5 inline-flex rounded-full bg-sand/25 px-3 py-1 text-xs font-medium text-mauve ring-1 ring-mauve/20">
          Em desenvolvimento
        </p>
      </div>
    </div>
  )
}

function ModuleContent({ service }: { service: Service }) {
  // Cada módulo abre seu conteúdo: Kanban, dashboard embutido ou placeholder.
  if (service.id === 'contratacao') return <KanbanBoard />
  if (service.embedUrl) return <DashboardEmbed title={service.name} src={service.embedUrl} />
  return <ModulePlaceholder service={service} />
}

type CategoryWorkspaceProps = {
  categoryId: CategoryId
  activeModule: string | null
  onSelectModule: (moduleId: string) => void
}

export function CategoryWorkspace({
  categoryId,
  activeModule,
  onSelectModule,
}: CategoryWorkspaceProps) {
  const { user } = useAuth()
  const category = categories.find((c) => c.id === categoryId)!
  const modules = services.filter(
    (s) => s.category === categoryId && (!user || canSeeService(user.role, s.id)),
  )

  const activeId =
    activeModule && modules.some((m) => m.id === activeModule)
      ? activeModule
      : (modules.find((m) => m.status === 'ativo')?.id ?? modules[0]?.id ?? '')
  const activeService = modules.find((m) => m.id === activeId)

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Segunda sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-ink/10 bg-cream/40 lg:flex">
        <div className="border-b border-ink/10 px-5 py-5">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">Módulos</p>
          <h2 className="mt-1 text-base font-semibold text-ink">{category.label}</h2>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {modules.map((module) => {
            const isActive = module.id === activeId
            const Icon = module.icon
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelectModule(module.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-ink text-cream' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">{module.name}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    module.status === 'ativo' ? 'bg-olive' : 'bg-sand'
                  }`}
                  title={module.status === 'ativo' ? 'Ativo' : 'Em breve'}
                />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Abas de módulo (mobile) */}
      <div className="overflow-x-auto border-b border-ink/10 bg-cream/40 px-3 py-2 lg:hidden">
        <div className="flex gap-2">
          {modules.map((module) => {
            const isActive = module.id === activeId
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => onSelectModule(module.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink text-cream' : 'bg-cream text-ink/70 ring-1 ring-ink/10'
                }`}
              >
                {module.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Conteúdo do módulo */}
      <div className="min-w-0 flex-1">
        {activeService ? <ModuleContent service={activeService} /> : null}
      </div>
    </div>
  )
}
