import type { Category, Service } from '../types'
import {
  BoxIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  ClipboardIcon,
  DashboardIcon,
  HeartPulseIcon,
  MegaphoneIcon,
  StethoscopeIcon,
  UsersIcon,
  WalletIcon,
} from '../lib/icons'

/**
 * Categorias usadas para organizar os serviços do HUB.
 * Mantenha o tom da marca: claro, objetivo, sem excessos.
 */
export const categories: Category[] = [
  {
    id: 'analise',
    label: 'Análise',
    description: 'Dashboards e indicadores para acompanhar a evolução da clínica.',
  },
  {
    id: 'atendimento',
    label: 'Atendimento',
    description: 'Da avaliação ao acompanhamento de cada paciente.',
  },
  {
    id: 'gestao',
    label: 'Gestão',
    description: 'Pessoas, finanças e a rotina administrativa.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Relacionamento e presença da marca, com critério.',
  },
  {
    id: 'operacao',
    label: 'Operação',
    description: 'Estoque, insumos e o que sustenta o dia a dia.',
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
 */
export const services: Service[] = [
  {
    id: 'dashboard-geral',
    name: 'Dashboard Geral',
    description:
      'Visão consolidada dos indicadores da clínica: atendimentos, ocupação e evolução ao longo do tempo.',
    category: 'analise',
    status: 'ativo',
    href: '#',
    icon: DashboardIcon,
    keywords: ['indicadores', 'kpi', 'visão geral', 'painel'],
  },
  {
    id: 'dashboard-financeiro',
    name: 'Dashboard Financeiro',
    description:
      'Faturamento, recebimentos e desempenho por procedimento, organizados para leitura rápida.',
    category: 'analise',
    status: 'ativo',
    href: '#',
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
  {
    id: 'marketing',
    name: 'Campanhas',
    description:
      'Relacionamento e comunicação com a base, conduzidos com leveza e consistência.',
    category: 'marketing',
    status: 'em-breve',
    icon: MegaphoneIcon,
    keywords: ['campanhas', 'comunicação', 'relacionamento'],
  },
  {
    id: 'atendimento-whatsapp',
    name: 'Mensagens',
    description:
      'Conversas e confirmações centralizadas, mantendo o tom próximo da marca.',
    category: 'marketing',
    status: 'em-breve',
    icon: ChatIcon,
    keywords: ['whatsapp', 'mensagens', 'atendimento', 'chat'],
  },
  {
    id: 'estoque',
    name: 'Estoque',
    description:
      'Insumos e produtos sob controle, com visão do que entra e do que falta.',
    category: 'operacao',
    status: 'em-breve',
    icon: BoxIcon,
    keywords: ['estoque', 'insumos', 'produtos', 'inventário'],
  },
]
