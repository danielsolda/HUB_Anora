import { categories } from './data/services'
import type { CategoryId } from './types'

/** Telas (abas) do HUB: início, "todos", vídeos, usuários e cada categoria. */
export type ViewId = 'inicio' | 'todos' | 'videos' | 'usuarios' | CategoryId

/** Rota atual: uma aba e, opcionalmente, um módulo dentro dela. */
export type Route = { view: ViewId; module: string | null }

export const viewIds: ViewId[] = [
  'inicio',
  'todos',
  'videos',
  'usuarios',
  ...categories.map((c) => c.id),
]

export function isViewId(value: string): value is ViewId {
  return (viewIds as string[]).includes(value)
}

/** Título legível de cada aba (usado na barra superior). */
export function viewLabel(view: ViewId): string {
  if (view === 'inicio') return 'Início'
  if (view === 'todos') return 'Todos os serviços'
  if (view === 'videos') return 'Vídeos'
  if (view === 'usuarios') return 'Usuários'
  return categories.find((c) => c.id === view)?.label ?? 'Serviços'
}

/**
 * Lê a rota atual do hash da URL. Formato: `#view` ou `#view/module`.
 * Ex.: `#gestao/contratacao` → { view: 'gestao', module: 'contratacao' }.
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
