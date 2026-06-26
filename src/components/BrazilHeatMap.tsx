import { BRAZIL_STATES, MAP_H, MAP_W, project } from '../lib/brazilMap'
import type { LocatedCity } from '../lib/insights'

const LIGHT = [233, 224, 200] // #e9e0c8 — estado sem agendamentos
const HEAT = [137, 75, 54] // terracotta — estado com mais agendamentos

function mix(t: number): string {
  const c = LIGHT.map((l, i) => Math.round(l + (HEAT[i] - l) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

export function BrazilHeatMap({ cities }: { cities: LocatedCity[] }) {
  const maxCount = Math.max(1, ...cities.map((c) => c.count))

  // Total por estado (UF) para o leve sombreamento de fundo.
  const byUf = new Map<string, number>()
  for (const c of cities) byUf.set(c.uf, (byUf.get(c.uf) || 0) + c.count)
  const maxUf = Math.max(1, ...byUf.values())

  // Maiores primeiro para os menores ficarem por cima (não somem atrás).
  const ordered = [...cities].sort((a, b) => b.count - a.count)
  const labelled = new Set(ordered.slice(0, 6).map((c) => c.name))

  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Mapa de agendamentos por cidade"
    >
      {BRAZIL_STATES.map((s) => {
        const uf = byUf.get(s.uf) || 0
        const t = uf === 0 ? 0 : 0.12 + 0.78 * Math.sqrt(uf / maxUf)
        return (
          <path
            key={s.uf}
            d={s.d}
            fill={uf === 0 ? '#ece4d2' : mix(t)}
            stroke="#b9ad94"
            strokeWidth={0.6}
            strokeLinejoin="round"
          />
        )
      })}

      {ordered.map((c) => {
        const [x, y] = project(c.lng, c.lat)
        const r = 5 + Math.sqrt(c.count / maxCount) * 21
        const right = x > MAP_W * 0.78
        return (
          <g key={c.name}>
            <title>{`${c.name} (${c.uf}) — ${c.count} agendamentos`}</title>
            <circle cx={x} cy={y} r={r * 1.7} fill="#894b36" opacity={0.1} />
            <circle cx={x} cy={y} r={r} fill="#894b36" opacity={0.72} stroke="#f7f4e8" strokeWidth={1.4} />
            {labelled.has(c.name) ? (
              <text
                x={right ? x - r - 4 : x + r + 4}
                y={y + 3.5}
                textAnchor={right ? 'end' : 'start'}
                fontSize={11}
                fontWeight={600}
                fill="#1f2117"
                paintOrder="stroke"
                stroke="#f7f4e8"
                strokeWidth={2.6}
                strokeLinejoin="round"
              >
                {c.name}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
