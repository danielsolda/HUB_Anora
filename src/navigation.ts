import { categories } from './data/services'
import type { CategoryId } from './types'

/** Telas (abas) do HUB: início, "todos" e cada categoria. */
export type ViewId = 'inicio' | 'todos' | CategoryId

export const viewIds: ViewId[] = [
  'inicio',
  'todos',
  ...categories.map((c) => c.id),
]

export function isViewId(value: string): value is ViewId {
  return (viewIds as string[]).includes(value)
}

/** Título legível de cada aba (usado na barra superior). */
export function viewLabel(view: ViewId): string {
  if (view === 'inicio') return 'Início'
  if (view === 'todos') return 'Todos os serviços'
  return categories.find((c) => c.id === view)?.label ?? 'Serviços'
}

/** Lê a aba atual a partir do hash da URL (deep-link / compartilhamento). */
export function readHash(): ViewId | null {
  const raw = window.location.hash.replace(/^#/, '')
  return isViewId(raw) ? raw : null
}

/** Atualiza o hash da URL sem poluir o histórico. */
export function writeHash(view: ViewId): void {
  const target = `#${view}`
  if (window.location.hash !== target) {
    window.history.replaceState(null, '', target)
  }
}
