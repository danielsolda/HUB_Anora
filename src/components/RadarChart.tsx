/**
 * Gráfico de radar (teia) simples em SVG — sem bibliotecas. Mostra a média de
 * cada dimensão numa escala 0–max. Cores da marca.
 */
export function RadarChart({
  data,
  max = 5,
  size = 280,
}: {
  data: { dimensao: string; score: number }[]
  max?: number
  size?: number
}) {
  const n = data.length
  if (n < 3) {
    return <p className="py-8 text-center text-sm text-ink/45">Radar disponível a partir de 3 dimensões.</p>
  }
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 54
  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180)
  const at = (i: number, radius: number): [number, number] => [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))]

  const rings = Array.from({ length: max }, (_, k) => k + 1)
  const ringPts = (v: number) => data.map((_, i) => at(i, (v / max) * r).join(',')).join(' ')
  const valuePts = data.map((d, i) => at(i, (Math.max(0, Math.min(max, d.score)) / max) * r))
  const padX = 52 // margem para os rótulos das laterais não cortarem

  return (
    <svg viewBox={`${-padX} -8 ${size + padX * 2} ${size + 16}`} className="mx-auto h-auto w-full max-w-[340px]" role="img" aria-label="Gráfico de competências">
      {rings.map((v) => (
        <polygon key={v} points={ringPts(v)} fill="none" stroke="#1f2117" strokeOpacity={0.08} />
      ))}
      {data.map((d, i) => {
        const [x, y] = at(i, r)
        const [lx, ly] = at(i, r + 16)
        const anchor = lx > cx + 2 ? 'start' : lx < cx - 2 ? 'end' : 'middle'
        const words = d.dimensao.split(' ')
        const twoLines = d.dimensao.length > 14 && words.length > 1
        const mid = Math.ceil(words.length / 2)
        const line1 = twoLines ? words.slice(0, mid).join(' ') : d.dimensao
        const line2 = twoLines ? words.slice(mid).join(' ') : ''
        return (
          <g key={d.dimensao}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#1f2117" strokeOpacity={0.08} />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="9.5" fill="#937265">
              <tspan x={lx} dy={line2 ? '-0.4em' : '0'}>{line1}</tspan>
              {line2 ? (
                <tspan x={lx} dy="1.1em">{line2}</tspan>
              ) : null}
            </text>
          </g>
        )
      })}
      <polygon points={valuePts.map((p) => p.join(',')).join(' ')} fill="#894b36" fillOpacity={0.22} stroke="#894b36" strokeWidth={1.5} />
      {valuePts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.6} fill="#894b36" />
      ))}
    </svg>
  )
}
