import type { Category, Service } from '../types'
import {
  ChartIcon,
  ClipboardIcon,
  DashboardIcon,
  GoogleSheetsIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from '../lib/icons'
import { SHEET_EDIT_URL, SHEET_PREVIEW_URL } from '../lib/candidates'

/**
 * Categorias usadas para organizar os serviços do HUB.
 * Mantenha o tom da marca: claro, objetivo, sem excessos.
 */
export const categories: Category[] = [
  {
    id: 'analise',
    label: 'Análise',
    description: 'Dashboards e indicadores para acompanhar a evolução da clínica.',
    icon: ChartIcon,
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    description: 'Auditoria de leads agendados e atendimentos.',
    icon: ClipboardIcon,
  },
  {
    id: 'gestao',
    label: 'Gestão',
    description: 'Pessoas, finanças e a rotina administrativa.',
    icon: UsersIcon,
  },
]

/**
 * ──────────────────────────────────────────────────────────────────────────
 * REGISTRO DE SERVIÇOS
 * ──────────────────────────────────────────────────────────────────────────
 * Cada item vira um card no HUB. Para adicionar um novo sistema:
 *   1. Importe (ou crie) um ícone em `src/lib/icons.tsx`.
 *   2. Acrescente um objeto aqui com um `id` único.
 *   3. Defina `status` ('ativo' | 'em-breve' | 'manutencao') e o `href`.
 * Os cards aparecem automaticamente, agrupados pela `category`.
 *
 * Dica: `href` pode ser um link interno por hash (ex.: '#gestao/contratacao')
 * para abrir um módulo do próprio HUB.
 */
export const services: Service[] = [
  {
    id: 'crm-dashboard',
    name: 'Análise do CRM',
    description:
      'Indicadores do funil de atendimento e conversão, a partir dos dados do CRM (Kommo).',
    category: 'analise',
    status: 'ativo',
    href: '#analise',
    embedUrl: 'https://kommo-dashboard-clinica-anora.lvvvr0.easypanel.host/',
    icon: DashboardIcon,
    keywords: ['crm', 'kommo', 'funil', 'conversão', 'vendas', 'indicadores'],
  },
  {
    id: 'auditoria-leads',
    name: 'Auditoria de Leads',
    description: 'Auditoria de leads agendados, comparecimentos e atendimentos.',
    category: 'auditoria',
    status: 'ativo',
    href: '#auditoria',
    embedUrl:
      'https://docs.google.com/spreadsheets/d/1JHIF4-epoArSNfgTpdvdy6VeelXHPIdGvGnbI3-XdEs/preview?gid=1358253473',
    icon: ClipboardIcon,
    keywords: ['auditoria', 'leads', 'agendados', 'planilha', 'atendimento'],
  },
  {
    id: 'contratacao',
    name: 'Contratação',
    description:
      'Acompanhe os candidatos das vagas em um quadro, do primeiro contato ao período de experiência.',
    category: 'gestao',
    status: 'ativo',
    href: '#gestao/contratacao',
    icon: UserPlusIcon,
    secondary: {
      label: 'Ver respostas',
      href: SHEET_EDIT_URL,
      embedSrc: SHEET_PREVIEW_URL,
      icon: GoogleSheetsIcon,
    },
    keywords: ['vagas', 'recrutamento', 'rh', 'contratação', 'candidatos', 'kanban', 'equipe'],
  },
  {
    id: 'pacientes',
    name: 'Pacientes',
    description:
      'O cadastro e o relacionamento com cada pessoa atendida, do primeiro contato ao retorno.',
    category: 'gestao',
    status: 'em-breve',
    icon: UsersIcon,
    keywords: ['crm', 'cadastro', 'clientes', 'contatos'],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description:
      'Contas, repasses e o controle do fluxo de caixa, sem complicação.',
    category: 'gestao',
    status: 'em-breve',
    icon: WalletIcon,
    keywords: ['caixa', 'contas', 'pagamentos', 'repasses'],
  },
]
