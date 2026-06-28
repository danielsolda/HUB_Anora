import type { Role } from './api'
import type { ViewId } from '../navigation'

/**
 * Controle de acesso por perfil.
 *
 * Perfis (do mais amplo ao mais restrito):
 *   - Administrador (Sócios): vê tudo.
 *   - Gerente Comercial: Comercial + Documentos + Meu Perfil.
 *   - Gerente de Operações: Operações + RH & Desenvolvimento + Documentos + Meu Perfil.
 *   - Financeiro: Financeiro + Jurídico + Documentos + Meu Perfil.
 *   - Biomédica / Assistente Comercial / Recepcionista: Documentos + Meu Perfil.
 */

/** Rótulo legível de cada perfil. Fonte única (Sidebar e Usuários reutilizam). */
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  gerente_comercial: 'Gerente Comercial',
  gerente_operacoes: 'Gerente de Operações',
  financeiro: 'Financeiro',
  biomedica: 'Biomédica',
  assistente_comercial: 'Assistente Comercial',
  recepcionista: 'Recepcionista',
}

/** Ordem dos perfis nos seletores (do mais amplo ao mais restrito). */
export const ROLE_OPTIONS: Role[] = [
  'admin',
  'gerente_comercial',
  'gerente_operacoes',
  'financeiro',
  'biomedica',
  'assistente_comercial',
  'recepcionista',
]

const MANAGERS: Role[] = ['admin', 'gerente_comercial', 'gerente_operacoes', 'financeiro']

const VIEW_ROLES: Record<ViewId, Role[]> = {
  inicio: MANAGERS,
  usuarios: ['admin'],
  comercial: ['admin', 'gerente_comercial'],
  operacoes: ['admin', 'gerente_operacoes'],
  rh: ['admin', 'gerente_operacoes'],
  financeiro: ['admin', 'financeiro'],
  juridico: ['admin', 'financeiro'],
  documentos: ROLE_OPTIONS, // todos os perfis
  'meu-perfil': ROLE_OPTIONS, // todos os perfis
}

const COLLABORATORS = new Set<Role>(['biomedica', 'assistente_comercial', 'recepcionista'])

export function canAccessView(role: Role, view: ViewId): boolean {
  return (VIEW_ROLES[view] ?? []).includes(role)
}

export function defaultView(role: Role): ViewId {
  // Colaboradores começam pela área pessoal (Meu Perfil).
  return COLLABORATORS.has(role) ? 'meu-perfil' : 'inicio'
}

/** Perfil "colaborador" (acesso restrito): usado para ajustes de UI. */
export function isCollaborator(role: Role): boolean {
  return COLLABORATORS.has(role)
}
