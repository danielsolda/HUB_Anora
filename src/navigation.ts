import { moduleIds, getModule } from './data/modules'
import type { ModuleId } from './data/modules'

/** Telas de topo do HUB: Início, os 7 módulos e a administração de Usuários. */
export type ViewId = 'inicio' | 'usuarios' | ModuleId

/** Rota atual: uma tela e, opcionalmente, um submódulo dentro de um módulo. */
export type Route = { view: ViewId; module: string | null }

export const viewIds: ViewId[] = ['inicio', 'usuarios', ...moduleIds]

export function isViewId(value: string): value is ViewId {
  return (viewIds as string[]).includes(value)
}

/** Título legível de cada tela (usado na barra superior). */
export function viewLabel(view: ViewId): string {
  if (view === 'inicio') return 'Início'
  if (view === 'usuarios') return 'Usuários'
  return getModule(view)?.label ?? 'HUB'
}

/**
 * Lê a rota atual do hash da URL. Formato: `#view` ou `#view/submódulo`.
 * Ex.: `#comercial/indicadores` → { view: 'comercial', module: 'indicadores' }.
 */
export function readRoute(): Route | null {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return null
  const [view, module] = raw.split('/')
  if (!isViewId(view)) return null
  return { view, module: module || null }
}

/** Atualiza o hash da URL sem poluir o histórico. */
export function writeRoute(route: Route): void {
  const target = route.module ? `#${route.view}/${route.module}` : `#${route.view}`
  if (window.location.hash !== target) {
    window.history.replaceState(null, '', target)
  }
}
