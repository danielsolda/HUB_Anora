import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { ServiceCard } from './components/ServiceCard'
import { Footer } from './components/Footer'
import { SearchIcon } from './lib/icons'
import { categories, services } from './data/services'
import type { CategoryId } from './types'

type Filter = 'todos' | CategoryId

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function App() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

  const activeCount = useMemo(
    () => services.filter((s) => s.status === 'ativo').length,
    [],
  )

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return services.filter((service) => {
      if (filter !== 'todos' && service.category !== filter) return false
      if (!q) return true
      const haystack = normalize(
        [service.name, service.description, ...(service.keywords ?? [])].join(' '),
      )
      return haystack.includes(q)
    })
  }, [query, filter])

  // Categorias que têm ao menos um serviço no resultado atual.
  const visibleCategories = categories.filter((category) =>
    filtered.some((service) => service.category === category.id),
  )

  const filters: { id: Filter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    ...categories.map((c) => ({ id: c.id as Filter, label: c.label })),
  ]

  return (
    <div id="topo" className="bg-anora min-h-screen">
      <Header />

      <main>
        <Hero
          activeCount={activeCount}
          totalCount={services.length}
          categoryCount={categories.length}
        />

        <section id="servicos" className="mx-auto max-w-6xl px-5 pb-8 sm:px-8">
          {/* Controles: busca + filtros por categoria */}
          <div className="flex flex-col gap-5 border-t border-ink/10 pt-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar sistema…"
                aria-label="Buscar sistema"
                className="w-full rounded-full border border-ink/15 bg-cream/70 py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink/40 transition-colors focus:border-terracotta/40"
              />
            </div>

            <div id="categorias" className="flex flex-wrap gap-2">
              {filters.map((f) => {
                const isActive = filter === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={isActive}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-ink text-cream'
                        : 'bg-cream/60 text-ink/70 ring-1 ring-ink/10 hover:bg-cream hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resultados agrupados por categoria */}
          {visibleCategories.length > 0 ? (
            <div className="mt-12 space-y-16">
              {visibleCategories.map((category) => {
                const items = filtered.filter((s) => s.category === category.id)
                return (
                  <div key={category.id} className="scroll-mt-24">
                    <div className="flex items-baseline justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-ink">{category.label}</h2>
                        <p className="mt-1 text-sm text-ink/55">{category.description}</p>
                      </div>
                      <span className="shrink-0 text-sm text-ink/40">
                        {items.length} {items.length === 1 ? 'sistema' : 'sistemas'}
                      </span>
                    </div>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-16 rounded-xl2 border border-dashed border-ink/15 py-20 text-center">
              <p className="text-ink/60">Nenhum sistema encontrado para essa busca.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilter('todos')
                }}
                className="mt-4 text-sm font-medium text-terracotta hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
