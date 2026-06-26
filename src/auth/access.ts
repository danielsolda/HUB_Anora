import type { Role } from './api'
import type { ViewId } from '../navigation'

/**
 * Controle de acesso por perfil.
 *
 * Perfis (do mais amplo ao mais restrito):
 *   - Administrador (Sócios): vê tudo.
 *   - Gerente Comercial: módulo Comercial + Documentos.
 *   - Gerente de Operações: Operações / RH & Desenvolvimento + Documentos.
 *   - Financeiro: módulo Financeiro + Documentos.
 *   - Biomédica / Assistente Comercial / Recepcionista: só Documentos (e, futuramente, Meu Perfil).
 *
 * As telas atuais já estão mapeadas para os módulos a que pertencerão.
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
  todos: MANAGERS,
  analise: ['admin', 'gerente_comercial'],
  auditoria: ['admin', 'gerente_comercial'],
  gestao: ['admin', 'gerente_operacoes'],
  videos: ROLE_OPTIONS, // Documentos › Treinamentos — todos os perfis
  financeiro: ['admin', 'financeiro'],
  usuarios: ['admin'],
}

// Visibilidade dos cards de serviço por perfil (default: todos podem ver).
const SERVICE_ROLES: Record<string, Role[]> = {
  'crm-dashboard': ['admin', 'gerente_comercial'],
  'auditoria-leads': ['admin', 'gerente_comercial'],
  contratacao: ['admin', 'gerente_operacoes'],
  pacientes: ['admin', 'gerente_operacoes'],
  financeiro: ['admin', 'financeiro'],
}

const COLLABORATORS = new Set<Role>(['biomedica', 'assistente_comercial', 'recepcionista'])

export function canAccessView(role: Role, view: ViewId): boolean {
  return (VIEW_ROLES[view] ?? []).includes(role)
}

export function defaultView(role: Role): ViewId {
  // Colaboradores só têm Documentos (Vídeos) por enquanto.
  return COLLABORATORS.has(role) ? 'videos' : 'inicio'
}

export function canSeeService(role: Role, serviceId: string): boolean {
  const allowed = SERVICE_ROLES[serviceId]
  return allowed ? allowed.includes(role) : true
}

/** Perfil "colaborador" (acesso restrito): usado para esconder a busca, etc. */
export function isCollaborator(role: Role): boolean {
  return COLLABORATORS.has(role)
}
