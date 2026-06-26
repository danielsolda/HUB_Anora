import { useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L, { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LocatedCity } from '../lib/insights'

const BRAZIL_CENTER: LatLngExpression = [-15.78, -47.93]

/** Ajusta o zoom para enquadrar as cidades com agendamentos. */
function FitToCities({ cities }: { cities: LocatedCity[] }) {
  const map = useMap()
  useEffect(() => {
    if (cities.length === 0) return
    const bounds = L.latLngBounds(cities.map((c) => [c.lat, c.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.35), { animate: false })
  }, [map, cities])
  return null
}

/** Mapa interativo (zoom/arrastar) com bolhas de calor por cidade. */
export function AppointmentsMap({ cities }: { cities: LocatedCity[] }) {
  const max = Math.max(1, ...cities.map((c) => c.count))

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10">
      <MapContainer
        center={BRAZIL_CENTER}
        zoom={4}
        scrollWheelZoom
        style={{ height: 380, width: '100%', background: '#eee7d8' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToCities cities={cities} />
        {cities.map((c) => {
          const radius = 6 + Math.sqrt(c.count / max) * 24
          return (
            <CircleMarker
              key={c.name}
              center={[c.lat, c.lng]}
              radius={radius}
              pathOptions={{
                color: '#f7f4e8',
                weight: 1.5,
                fillColor: '#894b36',
                fillOpacity: 0.62,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <span className="font-semibold">{c.name}</span> — {c.count}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">
                    {c.name} <span className="font-normal text-ink/50">{c.uf}</span>
                  </div>
                  <div>{c.count} agendamentos</div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
