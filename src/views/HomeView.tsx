import { ServiceCard } from '../components/ServiceCard'
import { ArrowRightIcon } from '../lib/icons'
import { categories, services } from '../data/services'
import type { ViewId } from '../navigation'

export function HomeView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const active = services.filter((s) => s.status === 'ativo')
  const upcoming = services.filter((s) => s.status !== 'ativo').length

  const stats = [
    { value: active.length, label: 'Sistemas ativos' },
    { value: upcoming, label: 'Em desenvolvimento' },
    { value: categories.length, label: 'Categorias' },
    { value: services.length, label: 'Total no hub' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      {/* Saudação */}
      <section className="animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.32em] text-terracotta">
          Central de controle
        </p>
        <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Tudo o que move a clínica, em um só lugar.
        </h1>
        <p className="mt-4 max-w-xl text-balance text-base leading-relaxed text-ink/60">
          Acesse os dashboards e sistemas da Anora pela navegação ao lado, ou comece pelos
          atalhos abaixo.
        </p>
      </section>

      {/* Indicadores */}
      <section
        className="animate-fade-up mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4"
        style={{ animationDelay: '60ms' }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl2 border border-ink/10 bg-cream/70 p-5 shadow-card"
          >
            <div className="text-3xl font-semibold text-ink">{stat.value}</div>
            <div className="mt-1 text-sm text-ink/55">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Acesso rápido */}
      {active.length > 0 ? (
        <section className="animate-fade-up mt-14" style={{ animationDelay: '120ms' }}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink">Acesso rápido</h2>
            <button
              type="button"
              onClick={() => onNavigate('todos')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-terracotta transition-colors hover:text-ink"
            >
              Ver todos
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Explorar por categoria */}
      <section className="animate-fade-up mt-14" style={{ animationDelay: '180ms' }}>
        <h2 className="text-lg font-semibold text-ink">Explorar por categoria</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const count = services.filter((s) => s.category === category.id).length
            const Icon = category.icon
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onNavigate(category.id)}
                className="group flex items-start gap-4 rounded-xl2 border border-ink/10 bg-cream p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-terracotta/30 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl2 bg-linen text-olive transition-colors group-hover:bg-ink group-hover:text-cream">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{category.label}</span>
                    <span className="text-xs text-ink/40">{count}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink/55">
                    {category.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
