import type { Category, Service } from '../types'
import {
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  DashboardIcon,
  GoogleSheetsIcon,
  HeartPulseIcon,
  StethoscopeIcon,
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
    id: 'atendimento',
    label: 'Atendimento',
    description: 'Da avaliação ao acompanhamento de cada paciente.',
    icon: HeartPulseIcon,
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
    href: 'https://kommo-dashboard-clinica-anora.lvvvr0.easypanel.host/',
    external: true,
    icon: DashboardIcon,
    keywords: ['crm', 'kommo', 'funil', 'conversão', 'vendas', 'indicadores'],
  },
  {
    id: 'dashboard-financeiro',
    name: 'Dashboard Financeiro',
    description:
      'Faturamento, recebimentos e desempenho por procedimento, organizados para leitura rápida.',
    category: 'analise',
    status: 'em-breve',
    icon: ChartIcon,
    keywords: ['faturamento', 'receita', 'financeiro', 'desempenho'],
  },
  {
    id: 'agendamento',
    name: 'Agenda',
    description:
      'Agendamentos, confirmações e a rotina de horários da equipe em um só lugar.',
    category: 'atendimento',
    status: 'em-breve',
    icon: CalendarIcon,
    keywords: ['agenda', 'horários', 'consultas', 'marcação'],
  },
  {
    id: 'avaliacao',
    name: 'Ficha de Avaliação',
    description:
      'Cada atendimento começa com uma avaliação. Registre o ponto de partida de cada paciente.',
    category: 'atendimento',
    status: 'em-breve',
    icon: ClipboardIcon,
    keywords: ['avaliação', 'anamnese', 'ficha', 'protocolo'],
  },
  {
    id: 'acompanhamento',
    name: 'Acompanhamento',
    description:
      'O registro da evolução ao longo do processo — fotos, sessões e notas de condução.',
    category: 'atendimento',
    status: 'em-breve',
    icon: HeartPulseIcon,
    keywords: ['evolução', 'sessões', 'progresso', 'condução'],
  },
  {
    id: 'prontuario',
    name: 'Prontuário',
    description:
      'Histórico clínico de cada paciente, reunido com organização e segurança.',
    category: 'atendimento',
    status: 'em-breve',
    icon: StethoscopeIcon,
    keywords: ['prontuário', 'histórico', 'clínico'],
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
