/** Distribuição de agendamentos por dia da semana (barras verticais). */
export function WeekdayChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const peak = data.reduce((b, d) => (d.value > b.value ? d : b), data[0] ?? { label: '', value: 0 })

  return (
    <div>
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {data.map((d) => {
          const isPeak = d.value === peak.value && d.value > 0
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-semibold tabular-nums text-ink/70">{d.value}</span>
              <div
                className={`w-full rounded-t-md transition-[height] duration-700 ${
                  isPeak ? 'bg-terracotta' : 'bg-olive/70'
                }`}
                style={{ height: `${(d.value / max) * 100}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-xs font-medium text-ink/55">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
