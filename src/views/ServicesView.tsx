import { useMemo } from 'react'
import { ServiceCard } from '../components/ServiceCard'
import { categories, services } from '../data/services'
import type { Category, Service } from '../types'
import type { ViewId } from '../navigation'

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function CategorySection({ category, items }: { category: Category; items: Service[] }) {
  if (items.length === 0) return null
  return (
    <section className="scroll-mt-24">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">{category.label}</h2>
          <p className="mt-1 text-sm text-ink/55">{category.description}</p>
        </div>
        <span className="shrink-0 text-sm text-ink/40">
          {items.length} {items.length === 1 ? 'sistema' : 'sistemas'}
        </span>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  )
}

type ServicesViewProps = {
  /** 'todos' ou uma categoria específica. */
  view: Exclude<ViewId, 'inicio'>
  query: string
}

export function ServicesView({ view, query }: ServicesViewProps) {
  const q = query.trim()
  const searching = q.length > 0

  const filtered = useMemo(() => {
    if (!searching) return services
    const needle = normalize(q)
    return services.filter((service) =>
      normalize(
        [service.name, service.description, ...(service.keywords ?? [])].join(' '),
      ).includes(needle),
    )
  }, [q, searching])

  // ── Modo busca: resultados de todas as categorias ──
  if (searching) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <header className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-terracotta">
            Resultados
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            {filtered.length} {filtered.length === 1 ? 'sistema encontrado' : 'sistemas encontrados'}
          </h1>
          <p className="mt-1 text-sm text-ink/55">para “{q}”</p>
        </header>

        {filtered.length > 0 ? (
          <div className="space-y-14">
            {categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                items={filtered.filter((s) => s.category === category.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-dashed border-ink/15 py-20 text-center text-ink/60">
            Nenhum sistema encontrado.
          </div>
        )}
      </div>
    )
  }

  // ── Categoria específica ──
  if (view !== 'todos') {
    const category = categories.find((c) => c.id === view)
    if (!category) return null
    const items = services.filter((s) => s.category === view)
    return (
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <CategorySection category={category} items={items} />
      </div>
    )
  }

  // ── Todos os serviços, agrupados por categoria ──
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-5 py-8 sm:px-8">
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          items={services.filter((s) => s.category === category.id)}
        />
      ))}
    </div>
  )
}
