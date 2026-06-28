import { KanbanBoard } from '../components/KanbanBoard'
import { DashboardEmbed } from '../components/DashboardEmbed'
import { AuditoriaView } from './AuditoriaView'
import { VideosView } from './VideosView'
import { ColaboradoresView } from './ColaboradoresView'
import { MenuIcon } from '../lib/icons'
import { getModule, type Module, type Submodule } from '../data/modules'

function ModulePlaceholder({ submodule }: { submodule: Submodule }) {
  const Icon = submodule.icon
  return (
    <div className="flex h-full min-h-[24rem] flex-1 items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-linen text-mauve">
          <Icon className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink">{submodule.label}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/55">{submodule.description}</p>
        <p className="mt-5 inline-flex rounded-full bg-sand/25 px-3 py-1 text-xs font-medium text-mauve ring-1 ring-mauve/20">
          Em desenvolvimento
        </p>
      </div>
    </div>
  )
}

function SubmoduleContent({ submodule }: { submodule: Submodule }) {
  const c = submodule.content
  if (c.kind === 'embed') return <DashboardEmbed title={submodule.label} src={c.url} fullHeight />
  if (c.kind === 'auditoria') return <AuditoriaView />
  if (c.kind === 'contratacao') return <KanbanBoard />
  if (c.kind === 'colaboradores') return <ColaboradoresView />
  if (c.kind === 'videos') return <VideosView />
  return <ModulePlaceholder submodule={submodule} />
}

type ModuleWorkspaceProps = {
  moduleId: Module['id']
  activeSubmodule: string | null
  onSelectSubmodule: (submoduleId: string) => void
  onOpenMenu: () => void
}

export function ModuleWorkspace({
  moduleId,
  activeSubmodule,
  onSelectSubmodule,
  onOpenMenu,
}: ModuleWorkspaceProps) {
  const module = getModule(moduleId)
  if (!module) return null
  const subs = module.submodules

  const activeId =
    activeSubmodule && subs.some((s) => s.id === activeSubmodule)
      ? activeSubmodule
      : (subs.find((s) => s.status === 'ativo')?.id ?? subs[0]?.id ?? '')
  const active = subs.find((s) => s.id === activeId)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Segunda sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink/10 bg-cream/40 lg:flex">
        <div className="border-b border-ink/10 px-5 py-5">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ink/40">Módulo</p>
          <h2 className="mt-1 text-base font-semibold text-ink">{module.label}</h2>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {subs.map((s) => {
            const isActive = s.id === activeId
            const Icon = s.icon
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSubmodule(s.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-ink text-cream' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">{s.label}</span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.status === 'ativo' ? 'bg-olive' : 'bg-sand'
                  }`}
                  title={s.status === 'ativo' ? 'Ativo' : 'Em breve'}
                />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Cabeçalho + abas de submódulo (mobile) */}
      <div className="border-b border-ink/10 bg-cream/40 lg:hidden">
        <div className="flex items-center gap-1.5 px-3 py-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="-ml-1 rounded-lg p-2 text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-ink">{module.label}</h2>
        </div>
        <div className="overflow-x-auto px-3 pb-2">
          <div className="flex gap-2">
            {subs.map((s) => {
              const isActive = s.id === activeId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSubmodule(s.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-ink text-cream' : 'bg-cream text-ink/70 ring-1 ring-ink/10'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo do submódulo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? <SubmoduleContent submodule={active} /> : null}
      </div>
    </div>
  )
}
