import type { Role } from './api'
import type { ViewId } from '../navigation'

/**
 * Regras de acesso por papel.
 *   - Dono: vê tudo.
 *   - Gestor: tudo, exceto o que é financeiro e a gestão de usuários.
 *   - Vendedor: apenas a aba Vídeos.
 */

const VIEW_ROLES: Record<ViewId, Role[]> = {
  inicio: ['dono', 'gestor'],
  todos: ['dono', 'gestor'],
  analise: ['dono', 'gestor'],
  atendimento: ['dono', 'gestor'],
  gestao: ['dono', 'gestor'],
  videos: ['dono', 'gestor', 'vendedor'],
  financeiro: ['dono'],
  usuarios: ['dono'],
}

// Serviços/módulos com informação financeira — visíveis só para o dono.
const OWNER_ONLY_SERVICES = new Set(['financeiro'])

export function canAccessView(role: Role, view: ViewId): boolean {
  return (VIEW_ROLES[view] ?? []).includes(role)
}

export function defaultView(role: Role): ViewId {
  return role === 'vendedor' ? 'videos' : 'inicio'
}

export function canSeeService(role: Role, serviceId: string): boolean {
  if (OWNER_ONLY_SERVICES.has(serviceId)) return role === 'dono'
  return true
}
