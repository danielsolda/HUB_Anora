import type { Service, ServiceStatus } from '../types'
import { ArrowRightIcon, ExternalLinkIcon } from '../lib/icons'

const statusConfig: Record<ServiceStatus, { label: string; className: string }> = {
  ativo: {
    label: 'Ativo',
    className: 'bg-olive/10 text-olive ring-1 ring-olive/20',
  },
  'em-breve': {
    label: 'Em breve',
    className: 'bg-sand/25 text-mauve ring-1 ring-mauve/20',
  },
  manutencao: {
    label: 'Manutenção',
    className: 'bg-terracotta/10 text-terracotta ring-1 ring-terracotta/20',
  },
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const { label, className } = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}

export function ServiceCard({ service }: { service: Service }) {
  const { name, description, status, href, external, icon: Icon } = service
  const isActive = status === 'ativo' && Boolean(href)

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl2 transition-colors ${
            isActive
              ? 'bg-ink text-cream group-hover:bg-terracotta'
              : 'bg-linen text-mauve'
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <StatusBadge status={status} />
      </div>

      <div className="mt-5 flex-1">
        <h3 className="text-lg font-semibold text-ink">{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{description}</p>
      </div>

      <div className="mt-5 flex items-center gap-1.5 text-sm font-medium">
        {isActive ? (
          <span className="inline-flex items-center gap-1.5 text-terracotta">
            Acessar
            {external ? (
              <ExternalLinkIcon className="h-4 w-4" />
            ) : (
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </span>
        ) : (
          <span className="text-ink/35">Disponível em breve</span>
        )}
      </div>
    </>
  )

  const baseClass =
    'group flex h-full flex-col rounded-xl2 border border-ink/10 bg-cream p-6 shadow-card transition-all duration-300'

  if (isActive) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className={`${baseClass} hover:-translate-y-1 hover:border-terracotta/30 hover:shadow-card-hover`}
      >
        {inner}
      </a>
    )
  }

  return <div className={`${baseClass} opacity-75`}>{inner}</div>
}
