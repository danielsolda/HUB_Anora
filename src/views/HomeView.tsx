import { useEffect, useState } from 'react'
import { AppointmentsMap } from '../components/AppointmentsMap'
import { WeekdayChart } from '../components/WeekdayChart'
import { ArrowRightIcon } from '../lib/icons'
import { modules } from '../data/modules'
import { fetchAudit } from '../lib/audit'
import { computeCityStats, computeWeekdayStats, type CityStats, type WeekdayStats } from '../lib/insights'
import type { ViewId } from '../navigation'
import { useAuth } from '../auth/AuthContext'
import { canAccessView } from '../auth/access'

const WEEK_FULL: Record<string, string> = {
  Seg: 'Segunda',
  Ter: 'Terça',
  Qua: 'Quarta',
  Qui: 'Quinta',
  Sex: 'Sexta',
  Sáb: 'Sábado',
  Dom: 'Domingo',
}

function Agendamentos() {
  const [cidades, setCidades] = useState<CityStats | null>(null)
  const [dias, setDias] = useState<WeekdayStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    fetchAudit()
      .then((data) => {
        if (!alive) return
        setCidades(computeCityStats(data.rows))
        setDias(computeWeekdayStats(data.rows))
        setStatus('ok')
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  if (status === 'error') return null

  const located = cidades?.located ?? []
  const maxCity = Math.max(1, ...located.map((c) => c.count))
  const peak = dias?.peak ?? null

  return (
    <section className="animate-fade-up mt-12" style={{ animationDelay: '90ms' }}>
      <h2 className="text-lg font-semibold text-ink">Agendamentos</h2>
      <p className="mt-1 text-sm text-ink/55">
        De onde vêm os leads agendados e em quais dias eles mais agendam.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Mapa de calor por cidade */}
        <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Por cidade</h3>
            <span className="text-xs text-ink/45">
              {status === 'loading' ? '—' : `${cidades?.totalLocated ?? 0} no mapa`}
            </span>
          </div>

          {status === 'loading' ? (
            <div className="mt-4 h-[380px] animate-pulse rounded-xl bg-linen/50" />
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-[1.5fr_1fr]">
              <div className="min-w-0">
                <AppointmentsMap cities={located} />
              </div>
              <div className="min-w-0">
                <ul className="space-y-2.5">
                  {located.slice(0, 8).map((c) => (
                    <li key={c.name}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-ink/75">
                          {c.name}
                          <span className="ml-1 text-ink/35">{c.uf}</span>
                        </span>
                        <span className="font-medium tabular-nums text-ink">{c.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-linen/70">
                        <div
                          className="h-1.5 rounded-full bg-terracotta/80"
                          style={{ width: `${(c.count / maxCity) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {cidades && cidades.totalUnresolved > 0 ? (
                  <p className="mt-3 text-xs text-ink/40">
                    +{cidades.totalUnresolved} sem cidade reconhecida
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Padrão de dias da semana */}
        <div className="rounded-xl2 border border-ink/10 bg-cream p-5 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">Por dia da semana</h3>
            <span className="text-xs text-ink/45">
              {status === 'loading' ? '—' : `${dias?.total ?? 0} datas`}
            </span>
          </div>

          {status === 'loading' ? (
            <div className="mt-4 h-48 animate-pulse rounded-xl bg-linen/50" />
          ) : (
            <div className="mt-4">
              <WeekdayChart data={dias?.data ?? []} />
              {peak ? (
                <p className="mt-4 rounded-lg bg-linen/40 px-3 py-2 text-sm text-ink/70">
                  <span className="font-semibold text-terracotta">{WEEK_FULL[peak.label] ?? peak.label}</span>{' '}
                  é o dia com mais agendamentos ({peak.value}).
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function HomeView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { user } = useAuth()
  const visibleModules = modules.filter((m) => !user || canAccessView(user.role, m.id))
  const showInsights = !user || canAccessView(user.role, 'comercial')

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
          Acesse os módulos da Anora pela navegação ao lado, ou comece pelos atalhos
          abaixo.
        </p>
      </section>

      {/* Agendamentos: mapa por cidade + dias da semana */}
      {showInsights ? <Agendamentos /> : null}

      {/* Acesso rápido aos módulos */}
      {visibleModules.length > 0 ? (
        <section className="animate-fade-up mt-14" style={{ animationDelay: '120ms' }}>
          <h2 className="text-lg font-semibold text-ink">Módulos</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleModules.map((module) => {
              const Icon = module.icon
              const ativos = module.submodules.filter((s) => s.status === 'ativo').length
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onNavigate(module.id)}
                  className="group flex items-start gap-4 rounded-xl2 border border-ink/10 bg-cream p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-terracotta/30 hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl2 bg-linen text-olive transition-colors group-hover:bg-ink group-hover:text-cream">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{module.label}</span>
                      <ArrowRightIcon className="h-4 w-4 text-ink/25 transition-transform group-hover:translate-x-0.5 group-hover:text-terracotta" />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink/55">
                      {module.description}
                    </span>
                    {ativos > 0 ? (
                      <span className="mt-2 inline-flex rounded-full bg-olive/10 px-2 py-0.5 text-[0.7rem] font-medium text-olive">
                        {ativos} ativo{ativos > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="mt-2 inline-flex rounded-full bg-sand/25 px-2 py-0.5 text-[0.7rem] font-medium text-mauve">
                        Em breve
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
