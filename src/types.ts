import type { ComponentType, SVGProps } from 'react'

/** Situação de um serviço dentro do HUB. */
export type ServiceStatus = 'ativo' | 'em-breve' | 'manutencao'

/** Identificadores das categorias usadas para agrupar serviços. */
export type CategoryId =
  | 'gestao'
  | 'atendimento'
  | 'analise'
  | 'marketing'
  | 'operacao'

export type Category = {
  id: CategoryId
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

/** Um sistema/software desenvolvido para a clínica, exibido como card no HUB. */
export type Service = {
  /** Identificador único e estável (usado em chaves e âncoras). */
  id: string
  /** Nome do sistema. */
  name: string
  /** Descrição curta, em tom calmo e objetivo (voz da marca). */
  description: string
  /** Categoria à qual o serviço pertence. */
  category: CategoryId
  /** Situação atual. */
  status: ServiceStatus
  /** URL de acesso ao sistema (interna ou externa). */
  href?: string
  /** Abre em nova aba quando o destino é um sistema separado. */
  external?: boolean
  /** Link secundário opcional (ex.: planilha de respostas, área administrativa). */
  secondary?: {
    label: string
    href: string
  }
  /** Ícone do card. */
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Palavras-chave adicionais para a busca. */
  keywords?: string[]
}
