'use client'
import { useEffect, useState } from 'react'

interface VilleStat {
  ville: string
  count: number
  montant_total: number
  acheteurs: string[]
}

const COORDS: Record<string, [number, number]> = {
  'Cayenne':                   [4.9224,  -52.3135],
  'Saint-Laurent-du-Maroni':   [5.4982,  -54.0316],
  'Kourou':                    [5.1604,  -52.6502],
  'Matoury':                   [4.8352,  -52.3262],
  'Rémire-Montjoly':           [4.8833,  -52.2667],
  'Maripasoula':               [3.6377,  -54.0361],
  'Mana':                      [5.6578,  -53.7780],
  'Apatou':                    [5.1517,  -54.3417],
  'Saint-Georges':             [3.8982,  -51.8046],
  'Sinnamary':                 [5.3793,  -52.9579],
  'Iracoubo':                  [5.4800,  -53.2100],
  'Grand-Santi':               [4.2500,  -54.3833],
  'Roura':                     [4.7333,  -52.3167],
  'Montsinéry-Tonnegrande':    [4.8833,  -52.5000],
  'Papaïchton':                [3.9000,  -54.2500],
  'Camopi':                    [3.1667,  -52.3333],
  'Awala-Yalimapo':            [5.7500,  -53.9667],
  'Saül':                      [3.6167,  -53.2000],
  'Saint-Élie':                [4.8167,  -53.2667],
  'Régina':                    [4.3167,  -52.1333],
  'Ouanary':                   [4.2167,  -51.6667],
}

function formatMontant(m: number) {
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m} €`
}

function getColor(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 0
  if (ratio >= 0.75) return '#14532d'
  if (ratio >= 0.5)  return '#16a34a'
  if (ratio >= 0.25) return '#4ade80'
  return '#bbf7d0'
}

function getRadius(count: number, max: number): number {
  const ratio = max > 0 ? count / max : 0
  return 12 + ratio * 28
}

export default function GuyaneMap({ data, filtreVille, onVilleClick }: {
  data: VilleStat[]
  filtreVille: string
  onVilleClick: (ville: string) => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<Record<string, React.ComponentType<any>> | null>(null)
  const [tooltip, setTooltip] = useState<{ ville: VilleStat; x: number; y: number } | null>(null)

  useEffect(() => {
    // Inject leaflet CSS dynamically
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    import('react-leaflet').then(rl => {
      setMapComponents({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        Tooltip: rl.Tooltip,
      })
    })
  }, [])

  const max = Math.max(...data.map(d => d.count), 1)
  const dataWithCoords = data.filter(d => COORDS[d.ville])

  if (!MapComponents) {
    return (
      <div style={{ height: '420px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #bbf7d0', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Chargement de la carte…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const { MapContainer, TileLayer, CircleMarker, Tooltip } = MapComponents as Record<string, React.ComponentType<any>> // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        bounds={[[2.1, -54.6], [5.75, -51.6]]}
        boundsOptions={{ padding: [20, 20] }}
        style={{ height: '420px', borderRadius: '12px', border: '1.5px solid #bbf7d0', zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {dataWithCoords.map(ville => {
          const [lat, lng] = COORDS[ville.ville]
          const isSelected = filtreVille === ville.ville
          return (
            <CircleMarker
              key={ville.ville}
              center={[lat, lng]}
              radius={getRadius(ville.count, max)}
              pathOptions={{
                fillColor: isSelected ? '#facc15' : getColor(ville.count, max),
                fillOpacity: 0.85,
                color: isSelected ? '#f59e0b' : '#fff',
                weight: isSelected ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onVilleClick(ville.ville === filtreVille ? '' : ville.ville),
              }}
            >
              <Tooltip permanent={false} sticky>
                <div style={{ minWidth: '180px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: '800', fontSize: '13px', color: '#14532d' }}>
                    📍 {ville.ville}
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: '12px' }}>
                    <strong>{ville.count}</strong> AO en cours
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: '12px' }}>
                    Montant : <strong>{formatMontant(ville.montant_total)}</strong>
                  </p>
                  {ville.acheteurs.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '4px' }}>
                      {ville.acheteurs.slice(0, 3).map((a, i) => (
                        <div key={i}>• {a}</div>
                      ))}
                    </div>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Cliquez pour filtrer
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Légende */}
      <div style={{
        position: 'absolute', bottom: '16px', right: '16px', zIndex: 1000,
        background: 'white', borderRadius: '10px', padding: '10px 14px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
          Nb d&apos;AO en cours
        </p>
        {[
          { color: '#14532d', label: 'Très élevé' },
          { color: '#16a34a', label: 'Élevé' },
          { color: '#4ade80', label: 'Moyen' },
          { color: '#bbf7d0', label: 'Faible' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#374151' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
