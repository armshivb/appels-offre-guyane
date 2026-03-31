'use client'
import { useEffect, useState } from 'react'
import { fetchKPI, fetchStatsMois, fetchStatsType, fetchTopAcheteurs, fetchAcheteurs } from '@/lib/api'
import type { KPI, StatMois, StatType, StatAcheteur } from '@/lib/api'
import KpiCard from '@/components/KpiCard'
import BarChart from '@/components/BarChart'
import PieChart from '@/components/PieChart'
import HorizontalBarChart from '@/components/HorizontalBarChart'
import FilterBar from '@/components/FilterBar'

function formatMontant(m: number): string {
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m.toFixed(0)} €`
}

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Dashboard() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [statsMois, setStatsMois] = useState<StatMois[]>([])
  const [statsType, setStatsType] = useState<StatType[]>([])
  const [topAcheteurs, setTopAcheteurs] = useState<StatAcheteur[]>([])
  const [acheteurs, setAcheteurs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState(false)

  const [typeMarche, setTypeMarche] = useState('')
  const [acheteur, setAcheteur] = useState('')
  const [mois, setMois] = useState('')
  const [annee, setAnnee] = useState('')

  useEffect(() => {
    fetchAcheteurs().then(setAcheteurs).catch(() => {})
  }, [])

  useEffect(() => {
    const filters = {
      type_marche: typeMarche || undefined,
      acheteur: acheteur || undefined,
      mois: mois ? Number(mois) : undefined,
      annee: annee ? Number(annee) : undefined,
    }
    setLoading(true)
    Promise.all([
      fetchKPI(filters),
      fetchStatsMois(filters),
      fetchStatsType(filters),
      fetchTopAcheteurs(filters),
    ]).then(([kpiData, moisData, typeData, top]) => {
      setKpi(kpiData)
      setStatsMois(moisData)
      setStatsType(typeData)
      setTopAcheteurs(top)
    }).catch(() => setBackendError(true))
    .finally(() => setLoading(false))
  }, [typeMarche, acheteur, mois, annee])

  const barData = (() => {
    if (annee) {
      const selectedYear = Number(annee)
      return MOIS_LABELS.map((label, i) => {
        const found = statsMois.find(s => s.annee === selectedYear && s.mois === i + 1)
        return { label, count: found?.count ?? 0 }
      })
    }
    const byYear: Record<number, number> = {}
    statsMois.forEach(s => { byYear[s.annee] = (byYear[s.annee] ?? 0) + s.count })
    return Object.entries(byYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, count]) => ({ label: year, count }))
  })()

  const pieData = statsType.map(s => ({ name: s.type_marche, value: s.count }))

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', gap: '16px' }}>
        <div style={{
          width: '44px', height: '44px',
          border: '3px solid #bbf7d0',
          borderTopColor: '#15803d',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#15803d', fontWeight: '600', fontSize: '14px' }}>Chargement des données…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (backendError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', gap: '14px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#dc2626', margin: 0 }}>Backend inaccessible</h2>
        <p style={{ color: '#64748b', maxWidth: '380px', lineHeight: 1.6, margin: 0, fontSize: '14px' }}>
          Lancez <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>uvicorn main:app --reload</code> dans le dossier <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>backend</code>.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: 'white', border: 'none', borderRadius: '10px',
            padding: '10px 22px', fontSize: '14px', fontWeight: '700',
            cursor: 'pointer', boxShadow: '0 2px 10px rgba(21,128,61,0.3)',
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        borderRadius: '18px', padding: '28px 28px',
        boxShadow: '0 6px 30px rgba(20, 83, 45, 0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'rgba(250, 204, 21, 0.07)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '120px',
          width: '150px', height: '150px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
              Tableau de bord
            </h1>
            <p style={{ color: '#86efac', marginTop: '6px', fontSize: '13.5px', margin: '6px 0 0' }}>
              Veille des marchés publics — Département 973, Guyane
            </p>
            {kpi && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  background: 'rgba(255,255,255,0.12)', color: '#d1fae5',
                  padding: '4px 12px', borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  {kpi.total} appels d&apos;offre
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: '600',
                  background: 'rgba(250,204,21,0.15)', color: '#fef08a',
                  padding: '4px 12px', borderRadius: '999px',
                  border: '1px solid rgba(250,204,21,0.25)',
                }}>
                  {formatMontant(kpi.montant_total)} estimés
                </span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '64px', opacity: 0.12, flexShrink: 0 }}>🌿</div>
        </div>
      </div>

      <FilterBar
        typeMarche={typeMarche} acheteur={acheteur}
        mois={mois} annee={annee} acheteurs={acheteurs}
        onTypeMarche={setTypeMarche} onAcheteur={setAcheteur}
        onMois={setMois} onAnnee={setAnnee}
        hideSearch
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total appels d'offre" value={kpi?.total ?? 0} icon="📋" accent="green" />
        <KpiCard title="AO ce mois" value={kpi?.ao_mois ?? 0} icon="📅" accent="yellow" />
        <KpiCard title="Montant total estimé" value={kpi ? formatMontant(kpi.montant_total) : '—'} icon="💶" accent="yellow" />
        <KpiCard title="Délai moyen de réponse" value={kpi ? `${kpi.delai_moyen} j` : '—'} subtitle="entre publication et échéance" icon="⏱️" accent="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart data={barData} title={annee ? `Appels d'offre par mois — ${annee}` : "Appels d'offre par année"} />
        <PieChart data={pieData} title="Répartition par type de marché" />
      </div>
      <HorizontalBarChart data={topAcheteurs} title="Top 10 acheteurs les plus actifs" />
    </div>
  )
}
