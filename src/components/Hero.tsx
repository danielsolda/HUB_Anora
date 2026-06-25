type HeroProps = {
  activeCount: number
  totalCount: number
  categoryCount: number
}

export function Hero({ activeCount, totalCount, categoryCount }: HeroProps) {
  const stats = [
    { value: activeCount, label: activeCount === 1 ? 'serviço ativo' : 'serviços ativos' },
    { value: totalCount, label: 'sistemas no hub' },
    { value: categoryCount, label: 'categorias' },
  ]

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
        <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.32em] text-terracotta">
          Clínica Anora · Plataforma interna
        </p>
        <h1 className="animate-fade-up mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
          Os sistemas da clínica, reunidos em um só lugar.
        </h1>
        <p className="animate-fade-up mt-6 max-w-xl text-balance text-lg leading-relaxed text-ink/65">
          Um ponto de acesso para os dashboards e as ferramentas que conduzem a rotina da
          Anora. Tudo organizado com critério, para encontrar o que precisa sem esforço.
        </p>

        <dl className="animate-fade-up mt-12 flex flex-wrap gap-x-12 gap-y-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="order-2 text-sm text-ink/55">{stat.label}</dt>
              <dd className="order-1 text-3xl font-semibold text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
