'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Serie {
  serie_id: string
  serie_nom: string
  data: { periode: string; valeur: number }[]
}

interface SerieInfo { id: string; nom: string }

const COLORS = [
  '#15803d','#facc15','#2563eb','#dc2626','#7c3aed',
  '#ea580c','#0891b2','#be185d','#84cc16','#f59e0b',
  '#6366f1',
]

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function formatPeriode(p: string) {
  const [y, m] = p.split('-')
  return `${MOIS_FR[parseInt(m) - 1]} ${y}`
}

// Merge toutes les séries sur un axe temporel commun
function buildChartData(series: Serie[], activeSeries: Set<string>) {
  const periodes = new Set<string>()
  series.forEach(s => { if (activeSeries.has(s.serie_id)) s.data.forEach(d => periodes.add(d.periode)) })
  const sorted = Array.from(periodes).sort()

  return sorted.map(periode => {
    const row: Record<string, string | number> = { periode, label: formatPeriode(periode) }
    series.forEach(s => {
      if (activeSeries.has(s.serie_id)) {
        const obs = s.data.find(d => d.periode === periode)
        row[s.serie_id] = obs?.valeur ?? null!
      }
    })
    return row
  })
}

export default function IndicesPage() {
  const [series, setSeries]           = useState<Serie[]>([])
  const [seriesList, setSeriesList]   = useState<SerieInfo[]>([])
  const [activeSeries, setActiveSeries] = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [syncResult, setSyncResult]   = useState<string | null>(null)
  const [annee, setAnnee]             = useState('')
  const [viewMode, setViewMode]       = useState<'mois'|'annee'>('mois')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [seriesData, listData] = await Promise.all([
        fetch(`${BASE}/api/indices`).then(r => r.json()),
        fetch(`${BASE}/api/indices/series`).then(r => r.json()),
      ])
      setSeries(seriesData)
      setSeriesList(listData)
      // Active toutes les séries par défaut
      if (seriesData.length > 0) {
        setActiveSeries(new Set(seriesData.map((s: Serie) => s.serie_id)))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await fetch(`${BASE}/api/indices/sync`, { method: 'POST' })
      const data = await r.json()
      setSyncResult(`✓ ${data.new} nouvelles · ${data.updated} mises à jour · ${data.series} séries`)
      await load()
    } catch {
      setSyncResult('✗ Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 8000)
    }
  }

  const toggleSerie = (id: string) => {
    setActiveSeries(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filtrage par année
  const seriesFiltered: Serie[] = series.map(s => ({
    ...s,
    data: s.data.filter(d => annee ? d.periode.startsWith(annee) : true),
  }))

  // Vue annuelle : moyenne par an
  const seriesAnnuelles: Serie[] = series.map(s => {
    const byYear: Record<string, number[]> = {}
    s.data.forEach(d => {
      const y = d.periode.split('-')[0]
      if (!byYear[y]) byYear[y] = []
      byYear[y].push(d.valeur)
    })
    return {
      ...s,
      data: Object.entries(byYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([y, vals]) => ({
          periode: y,
          valeur: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
        })),
    }
  })

  const displaySeries = viewMode === 'annee' ? seriesAnnuelles : seriesFiltered
  const chartData = buildChartData(displaySeries, activeSeries)

  // Calcul tendance : variation depuis 2020
  const getTendance = (s: Serie) => {
    const sorted = [...s.data].sort((a, b) => a.periode.localeCompare(b.periode))
    if (sorted.length < 2) return null
    const first = sorted[0].valeur
    const last  = sorted[sorted.length - 1].valeur
    return ((last - first) / first * 100).toFixed(1)
  }

  const annees = Array.from(new Set(
    series.flatMap(s => s.data.map(d => d.periode.split('-')[0]))
  )).sort()

  const hasData = series.some(s => s.data.length > 0)

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        borderRadius: '18px', padding: '24px 28px',
        boxShadow: '0 6px 30px rgba(20,83,45,0.25)',
        position: 'relative', overflow: 'hidden', marginBottom: '20px',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(250,204,21,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', position: 'relative' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 6px' }}>
              Indices BTP — INSEE
            </h1>
            <p style={{ color: '#86efac', fontSize: '13px', margin: 0 }}>
              Indices du bâtiment et travaux publics · Source : Banque de Données Macroéconomiques INSEE · Depuis 2020
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                background: syncing ? 'rgba(250,204,21,0.3)' : 'linear-gradient(135deg, #facc15, #f59e0b)',
                color: '#14532d', border: 'none', borderRadius: '10px',
                padding: '9px 18px', fontSize: '13px', fontWeight: '700',
                cursor: syncing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: syncing ? 'none' : '0 2px 10px rgba(250,204,21,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'inline-block', animation: syncing ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
              {syncing ? 'Synchronisation…' : 'Sync INSEE'}
            </button>
            {syncResult && (
              <span style={{ fontSize: '12px', color: '#fef08a', background: 'rgba(22,101,52,0.8)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(250,204,21,0.3)' }}>
                {syncResult}
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasData && !loading && (
        <div style={{ background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '28px' }}>📊</span>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: '700', color: '#92400e', fontSize: '14px' }}>Aucune donnée disponible</p>
            <p style={{ margin: 0, fontSize: '13px', color: '#a16207' }}>
              Cliquez sur <strong>Sync INSEE</strong> pour télécharger les indices depuis la base de données macroéconomiques INSEE.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
          <div style={{ width: '24px', height: '24px', border: '3px solid #bbf7d0', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Chargement…
        </div>
      ) : hasData && (
        <>
          {/* KPI tendances */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {series.filter(s => activeSeries.has(s.serie_id)).slice(0, 6).map(s => {
              const tendance = getTendance(s)
              const hausse = tendance !== null && parseFloat(tendance) > 0
              return (
                <div key={s.serie_id} style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {s.serie_nom.split('—')[0].trim()}
                  </p>
                  <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
                    {s.data[s.data.length - 1]?.valeur?.toFixed(1) ?? '—'}
                  </p>
                  {tendance && (
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: hausse ? '#dc2626' : '#15803d' }}>
                      {hausse ? '▲' : '▼'} {Math.abs(parseFloat(tendance))}% depuis 2020
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94a3b8' }}>
                    {s.data[s.data.length - 1]?.periode}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Contrôles */}
          <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {/* Vue */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['mois', 'annee'] as const).map(v => (
                  <button key={v} onClick={() => setViewMode(v)} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: viewMode === v ? '#15803d' : '#e2e8f0',
                    background: viewMode === v ? '#f0fdf4' : 'white',
                    color: viewMode === v ? '#15803d' : '#64748b',
                  }}>
                    {v === 'mois' ? 'Mensuel' : 'Annuel (moy.)'}
                  </button>
                ))}
              </div>

              {/* Filtre année (mode mensuel) */}
              {viewMode === 'mois' && (
                <select value={annee} onChange={e => setAnnee(e.target.value)} style={{
                  padding: '7px 12px', borderRadius: '9px', fontSize: '13px',
                  border: '1.5px solid', borderColor: annee ? '#15803d' : '#e2e8f0',
                  background: annee ? '#f0fdf4' : 'white',
                  color: annee ? '#15803d' : '#374151',
                  fontWeight: annee ? '700' : '400', cursor: 'pointer', outline: 'none',
                }}>
                  <option value="">— Toutes les années</option>
                  {annees.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>

            {/* Toggle séries */}
            <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 10px' }}>
              Séries affichées
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {series.map((s, i) => {
                const active = activeSeries.has(s.serie_id)
                return (
                  <button key={s.serie_id} onClick={() => toggleSerie(s.serie_id)} style={{
                    padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', border: '1.5px solid',
                    borderColor: active ? COLORS[i % COLORS.length] : '#e2e8f0',
                    background: active ? `${COLORS[i % COLORS.length]}18` : '#f8fafc',
                    color: active ? COLORS[i % COLORS.length] : '#94a3b8',
                  }}>
                    {s.serie_nom.split('—')[1]?.trim() || s.serie_nom}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Graphique */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px' }}>
              Tendances {viewMode === 'annee' ? 'annuelles (moyennes)' : 'mensuelles'} depuis 2020
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px' }}>
              Base 2010 = 100 · Source BDM INSEE · Indices nationaux de référence pour révision de prix dans les marchés publics
            </p>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={viewMode === 'annee' ? 0 : 'preserveStartEnd'}
                  angle={viewMode === 'mois' && !annee ? -35 : 0}
                  textAnchor={viewMode === 'mois' && !annee ? 'end' : 'middle'}
                  height={viewMode === 'mois' && !annee ? 50 : 30}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  domain={['auto', 'auto']}
                  tickFormatter={v => `${v}`}
                  width={45}
                />
                <Tooltip
                  contentStyle={{ fontSize: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number, name: string) => {
                    const s = series.find(s => s.serie_id === name)
                    return [`${value?.toFixed(1) ?? '—'}`, s?.serie_nom || name]
                  }}
                  labelStyle={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}
                />
                <Legend
                  formatter={(value) => {
                    const s = series.find(s => s.serie_id === value)
                    return s?.serie_nom.split('—')[0].trim() || value
                  }}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <ReferenceLine y={100} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: 'Base 100', fill: '#94a3b8', fontSize: 10 }} />
                {series.map((s, i) => activeSeries.has(s.serie_id) && (
                  <Line
                    key={s.serie_id}
                    type="monotone"
                    dataKey={s.serie_id}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau données */}
          <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Données brutes</h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#14532d' }}>
                    <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fef08a', whiteSpace: 'nowrap' }}>
                      Période
                    </th>
                    {series.filter(s => activeSeries.has(s.serie_id)).map(s => (
                      <th key={s.serie_id} style={{ padding: '9px 12px', textAlign: 'center', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86efac', whiteSpace: 'nowrap' }}>
                        {s.serie_nom.split('—')[0].trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice(-24).reverse().map((row, i) => (
                    <tr key={row.periode} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                        {row.label}
                      </td>
                      {series.filter(s => activeSeries.has(s.serie_id)).map(s => (
                        <td key={s.serie_id} style={{ padding: '8px 12px', textAlign: 'center', fontSize: '12px', color: row[s.serie_id] ? '#1e293b' : '#cbd5e1', fontStyle: row[s.serie_id] ? 'normal' : 'italic', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                          {row[s.serie_id] ? (row[s.serie_id] as number).toFixed(1) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Source */}
      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '16px', textAlign: 'center' }}>
        Source : Banque de Données Macroéconomiques (BDM) — INSEE · Indices nationaux BT/TP base 2010 ·{' '}
        <a href="https://www.insee.fr/fr/statistiques/series/103173847" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d' }}>
          Voir sur insee.fr ↗
        </a>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
