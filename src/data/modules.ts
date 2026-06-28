import type { ComponentType, SVGProps } from 'react'
import {
  AwardIcon,
  BellIcon,
  BoxIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  ClipboardIcon,
  DashboardIcon,
  FileTextIcon,
  FolderIcon,
  MegaphoneIcon,
  ScaleIcon,
  StethoscopeIcon,
  TargetIcon,
  TrophyIcon,
  TruckIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
  WalletIcon,
} from '../lib/icons'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

/** Os 7 módulos da plataforma. */
export type ModuleId =
  | 'comercial'
  | 'operacoes'
  | 'rh'
  | 'financeiro'
  | 'juridico'
  | 'documentos'
  | 'meu-perfil'

/** Conteúdo que um submódulo abre. */
export type SubmoduleContent =
  | { kind: 'placeholder' }
  | { kind: 'embed'; url: string }
  | { kind: 'auditoria' }
  | { kind: 'contratacao' }
  | { kind: 'videos' }

export type Submodule = {
  id: string
  label: string
  description: string
  icon: IconType
  status: 'ativo' | 'em-breve'
  content: SubmoduleContent
}

export type Module = {
  id: ModuleId
  label: string
  description: string
  icon: IconType
  submodules: Submodule[]
}

const CRM_DASHBOARD_URL = 'https://kommo-dashboard-clinica-anora.lvvvr0.easypanel.host/'

// Atalho para submódulos ainda sem integração.
const soon = (
  id: string,
  label: string,
  icon: IconType,
  description: string,
): Submodule => ({ id, label, icon, description, status: 'em-breve', content: { kind: 'placeholder' } })

export const modules: Module[] = [
  {
    id: 'comercial',
    label: 'Comercial',
    description: 'Funil, metas e desempenho da equipe comercial.',
    icon: ChartIcon,
    submodules: [
      {
        id: 'dashboard',
        label: 'Dashboard Comercial',
        description: 'Indicadores do funil de atendimento e conversão (CRM Kommo).',
        icon: DashboardIcon,
        status: 'ativo',
        content: { kind: 'embed', url: CRM_DASHBOARD_URL },
      },
      soon('crm', 'CRM (Kommo)', ChatIcon, 'Acesso ao CRM Kommo da clínica.'),
      soon('metas', 'Metas', TargetIcon, 'Metas comerciais por período e por pessoa.'),
      soon('rankings', 'Rankings', TrophyIcon, 'Ranking de desempenho da equipe comercial.'),
      {
        id: 'indicadores',
        label: 'Indicadores',
        description: 'Auditoria de leads agendados, comparecimentos e atendimentos.',
        icon: ClipboardIcon,
        status: 'ativo',
        content: { kind: 'auditoria' },
      },
      soon('avaliacoes', 'Avaliações da equipe', AwardIcon, 'Avaliações da equipe comercial.'),
    ],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    description: 'Agenda, viagens, recepção e insumos da operação.',
    icon: StethoscopeIcon,
    submodules: [
      soon('agenda', 'Agenda', CalendarIcon, 'Agenda de atendimentos e procedimentos.'),
      soon('viagens', 'Escala de viagens', TruckIcon, 'Escala e logística das viagens.'),
      soon('recepcionistas', 'Gestão das recepcionistas', UsersIcon, 'Gestão da equipe de recepção.'),
      soon('checklist', 'Checklist das malas', ClipboardIcon, 'Checklist de montagem das malas.'),
      soon('estoque', 'Estoque e insumos', BoxIcon, 'Controle de estoque e insumos.'),
      soon('avaliacoes-biomedicas', 'Avaliações das biomédicas', AwardIcon, 'Avaliações das biomédicas.'),
    ],
  },
  {
    id: 'rh',
    label: 'RH & Desenvolvimento',
    description: 'Pessoas, contratos, treinamentos e rotina trabalhista.',
    icon: BriefcaseIcon,
    submodules: [
      {
        id: 'recrutamento',
        label: 'Recrutamento',
        description: 'Acompanhe os candidatos das vagas em um quadro, do contato à experiência.',
        icon: UserPlusIcon,
        status: 'ativo',
        content: { kind: 'contratacao' },
      },
      soon('historico', 'Histórico do colaborador', FolderIcon, 'Histórico completo de cada colaborador.'),
      soon('contrato', 'Contrato de trabalho', FileTextIcon, 'Contratos de trabalho.'),
      soon('holerites', 'Holerites', WalletIcon, 'Holerites da equipe.'),
      soon('avaliacoes-desempenho', 'Avaliações de desempenho', AwardIcon, 'Avaliações de desempenho.'),
      soon('advertencias', 'Advertências', BellIcon, 'Registro de advertências.'),
      soon('suspensoes', 'Suspensões', BellIcon, 'Registro de suspensões.'),
      soon('ferias', 'Férias', CalendarIcon, 'Controle de férias.'),
      soon('banco-horas', 'Banco de horas', CalendarIcon, 'Banco de horas da equipe.'),
      soon('doc-trabalhistas', 'Documentos trabalhistas', FolderIcon, 'Documentos trabalhistas.'),
      soon('treinamentos', 'Treinamentos e certificações', AwardIcon, 'Histórico, certificados e materiais de treinamento.'),
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Caixa, contas, notas e relatórios financeiros.',
    icon: WalletIcon,
    submodules: [
      soon('fluxo-caixa', 'Fluxo de caixa', ChartIcon, 'Entradas e saídas do caixa.'),
      soon('contas-pagar', 'Contas a pagar', WalletIcon, 'Contas a pagar.'),
      soon('contas-receber', 'Contas a receber', WalletIcon, 'Contas a receber.'),
      soon('notas-fiscais', 'Notas fiscais', FileTextIcon, 'Emissão e controle de notas fiscais.'),
      soon('fornecedores', 'Contratos com fornecedores', FileTextIcon, 'Contratos com fornecedores.'),
      soon('relatorios', 'Relatórios financeiros', ChartIcon, 'Relatórios financeiros.'),
      soon('contabeis', 'Documentos contábeis', FolderIcon, 'Documentos contábeis.'),
    ],
  },
  {
    id: 'juridico',
    label: 'Jurídico',
    description: 'Contratos, processos, acordos e pareceres.',
    icon: ScaleIcon,
    submodules: [
      soon('contratos-pacientes', 'Contratos de pacientes', FileTextIcon, 'Contratos com pacientes.'),
      soon('reclamacoes', 'Reclamações', ChatIcon, 'Registro de reclamações.'),
      soon('processos', 'Processos judiciais', ScaleIcon, 'Processos judiciais.'),
      soon('notificacoes', 'Notificações', BellIcon, 'Notificações.'),
      soon('acordos', 'Acordos', FileTextIcon, 'Acordos.'),
      soon('pareceres', 'Pareceres jurídicos', FileTextIcon, 'Pareceres jurídicos.'),
      soon('documentos-juridicos', 'Documentos jurídicos', FolderIcon, 'Documentos jurídicos.'),
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos',
    description: 'A biblioteca da empresa: protocolos, manuais e modelos.',
    icon: FolderIcon,
    submodules: [
      {
        id: 'treinamentos',
        label: 'Treinamentos',
        description: 'Vídeos de treinamento, protocolos e materiais de apoio da equipe.',
        icon: VideoIcon,
        status: 'ativo',
        content: { kind: 'videos' },
      },
      soon('protocolos', 'Protocolos', ClipboardIcon, 'Protocolos da clínica.'),
      soon('manual', 'Manual do colaborador', BoxIcon, 'Manual do colaborador.'),
      soon('formularios', 'Formulários', FileTextIcon, 'Formulários.'),
      soon('modelos', 'Modelos de documentos', FileTextIcon, 'Modelos de documentos.'),
      soon('comunicados', 'Comunicados internos', MegaphoneIcon, 'Comunicados internos.'),
    ],
  },
  {
    id: 'meu-perfil',
    label: 'Meu Perfil',
    description: 'Sua área: agenda, performance, metas e documentos.',
    icon: UserIcon,
    submodules: [
      soon('minha-agenda', 'Minha agenda', CalendarIcon, 'Sua agenda.'),
      soon('meu-dashboard', 'Meu dashboard', DashboardIcon, 'Seu painel pessoal.'),
      soon('minha-performance', 'Minha performance', ChartIcon, 'Sua performance.'),
      soon('minhas-metas', 'Minhas metas', TargetIcon, 'Suas metas.'),
      soon('minha-avaliacao', 'Minha avaliação', AwardIcon, 'Sua avaliação de desempenho.'),
      soon('meus-treinamentos', 'Meus treinamentos', VideoIcon, 'Seus treinamentos.'),
      soon('meus-documentos', 'Meus documentos', FolderIcon, 'Seus documentos.'),
      soon('meus-holerites', 'Meus holerites', WalletIcon, 'Seus holerites.'),
    ],
  },
]

export const moduleIds = modules.map((m) => m.id)

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id)
}
