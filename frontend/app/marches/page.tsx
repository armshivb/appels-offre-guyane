'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell } from 'recharts'
import { fetchAppelsOffre } from '@/lib/api'
import type { AppelOffre } from '@/lib/api'

// ── Définition des corps de métier ────────────────────────────────────────────

interface Metier {
  id: string
  label: string
  keywords: string[]
  unitKeywords: string[]   // mots qui précèdent/suivent une quantité
  unitPattern: RegExp      // regex pour extraire la quantité
}

const METIERS: Metier[] = [
  {
    id: 'terrassement',
    label: 'Terrassement / VRD',
    keywords: ['terrassement', 'terrassier', 'excavation', 'déblai', 'remblai', 'voirie', 'vrd', 'voies et réseaux', 'réseau divers'],
    unitKeywords: ['m3', 'm³', 'mètre cube', 'ml', 'mètre linéaire'],
    unitPattern: /(\d[\d\s.,]*)\s*(m3|m³|ml|mètre cube|mètre linéaire)/i,
  },
  {
    id: 'maconnerie',
    label: 'Maçonnerie / Béton',
    keywords: ['maçonnerie', 'maconnerie', 'béton armé', 'beton', 'gros œuvre', 'gros oeuvre', 'fondation', 'dallage', 'parpaing', 'agglo'],
    unitKeywords: ['m2', 'm²', 'm3', 'logement', 'bâtiment'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²|m3|logements?|bâtiments?|batiments?)/i,
  },
  {
    id: 'charpente',
    label: 'Charpente / Toiture',
    keywords: ['charpente', 'couverture', 'toiture', 'toit', 'zinguerie', 'bardage', 'étanchéité', 'etancheite', 'membrane', 'bac acier'],
    unitKeywords: ['m2', 'm²', 'ml'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²|ml)/i,
  },
  {
    id: 'carrelage',
    label: 'Carrelage / Revêtements',
    keywords: ['carrelage', 'carreleur', 'revêtement de sol', 'revetement', 'faïence', 'faience', 'parquet', 'stratifié', 'chape'],
    unitKeywords: ['m2', 'm²'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²)/i,
  },
  {
    id: 'peinture',
    label: 'Peinture / Finitions',
    keywords: ['peinture', 'peintre', 'enduit', 'ravalement', 'crépis', 'crepis', 'finition', 'nettoyage façade'],
    unitKeywords: ['m2', 'm²', 'logement'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²|logements?)/i,
  },
  {
    id: 'menuiserie',
    label: 'Menuiserie / Aluminium',
    keywords: ['menuiserie', 'menuisier', 'aluminium', 'pvc', 'fenêtre', 'fenetre', 'porte', 'portail', 'volet', 'persienne', 'vitrage', 'verre'],
    unitKeywords: ['u', 'unité', 'porte', 'fenêtre', 'ml'],
    unitPattern: /(\d[\d\s.,]*)\s*(u|unités?|portes?|fenêtres?|ml)/i,
  },
  {
    id: 'plomberie',
    label: 'Plomberie / Sanitaire',
    keywords: ['plomberie', 'plombier', 'sanitaire', 'eau potable', 'adduction', 'canalisation', 'assainissement', 'évacuation', 'wc', 'douche', 'évier'],
    unitKeywords: ['ml', 'logement', 'point d\'eau'],
    unitPattern: /(\d[\d\s.,]*)\s*(ml|logements?|points?\s*d.eau)/i,
  },
  {
    id: 'electricite',
    label: 'Électricité / CFO-CFA',
    keywords: ['électricité', 'electricite', 'électrique', 'electricien', 'courant fort', 'courant faible', 'cfo', 'cfa', 'tableau électrique', 'câblage', 'cablage', 'éclairage'],
    unitKeywords: ['ml', 'logement', 'point lumineux'],
    unitPattern: /(\d[\d\s.,]*)\s*(ml|logements?|points?\s*lumineux)/i,
  },
  {
    id: 'climatisation',
    label: 'Climatisation / VMC',
    keywords: ['climatisation', 'climatiseur', 'vmc', 'ventilation', 'thermique', 'pompe à chaleur', 'pac', 'split'],
    unitKeywords: ['u', 'unité', 'logement'],
    unitPattern: /(\d[\d\s.,]*)\s*(u|unités?|logements?)/i,
  },
  {
    id: 'serrurerie',
    label: 'Serrurerie / Métallerie',
    keywords: ['serrurerie', 'métallerie', 'metallerie', 'garde-corps', 'garde corps', 'rampe', 'escalier métallique', 'grillage', 'clôture', 'cloture', 'portillon'],
    unitKeywords: ['ml', 'u', 'ml linéaire'],
    unitPattern: /(\d[\d\s.,]*)\s*(ml|u|unités?)/i,
  },
  {
    id: 'platrerie',
    label: 'Plâtrerie / Cloisons',
    keywords: ['plâtrerie', 'platrerie', 'plâtre', 'platre', 'cloison', 'faux plafond', 'plafond suspendu', 'doublage', 'isolation thermique', 'isolation acoustique'],
    unitKeywords: ['m2', 'm²', 'logement'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²|logements?)/i,
  },
  {
    id: 'espaces_verts',
    label: 'Espaces verts / Paysage',
    keywords: ['espaces verts', 'paysage', 'paysagiste', 'plantation', 'engazonnement', 'gazon', 'arrosage', 'clôture verte'],
    unitKeywords: ['m2', 'm²', 'ha'],
    unitPattern: /(\d[\d\s.,]*)\s*(m2|m²|ha|hectare)/i,
  },
]

// ── Analyse d'un AO pour un corps de métier ──────────────────────────────────

type CellValue = { type: 'oui'; quantite?: string } | { type: 'non' }

function analyserMetier(ao: AppelOffre, metier: Metier): CellValue {
  const texte = [ao.texte_complet, ao.titre, ao.objet_marche, ao.type_marche]
    .filter(Boolean).join(' ').toLowerCase()

  const found = metier.keywords.some(kw => texte.includes(kw.toLowerCase()))
  if (!found) return { type: 'non' }

  // Cherche une quantité dans le texte autour du mot-clé
  const match = texte.match(metier.unitPattern)
  if (match) {
    const quantite = match[1].trim().replace(/\s+/g, '') + ' ' + match[2]
    return { type: 'oui', quantite }
  }

  return { type: 'oui' }
}

// ── Rendu d'une cellule ───────────────────────────────────────────────────────

function MatrixCell({ value }: { value: CellValue }) {
  if (value.type === 'non') {
    return (
      <td style={{
        padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap',
        fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic',
        borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9',
        background: 'white',
      }}>
        Non précisé
      </td>
    )
  }
  if (value.quantite) {
    return (
      <td style={{
        padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap',
        fontSize: '11px', fontWeight: '700',
        color: '#92400e',
        background: '#fffbeb',
        borderBottom: '1px solid #fde68a', borderRight: '1px solid #fde68a',
      }}>
        ✓ nécessité<br />
        <span style={{ fontSize: '10px', fontWeight: '500', color: '#b45309' }}>
          {value.quantite}
        </span>
      </td>
    )
  }
  return (
    <td style={{
      padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap',
      fontSize: '11px', fontWeight: '700', color: '#14532d',
      background: '#f0fdf4',
      borderBottom: '1px solid #bbf7d0', borderRight: '1px solid #bbf7d0',
    }}>
      ✓ nécessité
    </td>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MarchesPage() {
  const [items, setItems] = useState<AppelOffre[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  // Colonnes affichées
  const [activeMetiers, setActiveMetiers] = useState<Set<string>>(
    new Set(METIERS.map(m => m.id))
  )
  // Filtre lignes : ne montrer que les AO ayant ce corps de métier détecté
  const [filtreMetier, setFiltreMetier] = useState<string>('')

  const topScrollRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetchAppelsOffre({ page, page_size: PAGE_SIZE, sort_by: 'date_publication', sort_dir: 'desc' })
      .then(r => { setItems(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    if (!tableScrollRef.current || !ghostRef.current) return
    const table = tableScrollRef.current.querySelector('table')
    if (table) ghostRef.current.style.width = `${table.scrollWidth}px`
  }, [items, activeMetiers])

  const syncFromTop = () => {
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
  }
  const syncFromTable = () => {
    if (topScrollRef.current && tableScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
  }

  const toggleMetier = (id: string) => {
    setActiveMetiers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleMetiers = METIERS.filter(m => activeMetiers.has(m.id))
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Pré-calculer toutes les cellules
  const allMatrix = items.map(ao => ({
    ao,
    cells: METIERS.reduce<Record<string, CellValue>>((acc, m) => {
      acc[m.id] = analyserMetier(ao, m)
      return acc
    }, {}),
  }))

  // Filtre lignes par corps de métier sélectionné
  const matrix = filtreMetier
    ? allMatrix.filter(({ cells }) => cells[filtreMetier]?.type === 'oui')
    : allMatrix

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
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 6px', position: 'relative' }}>
          Analyse des marchés
        </h1>
        <p style={{ color: '#86efac', fontSize: '13px', margin: 0, position: 'relative' }}>
          {total} appels d&apos;offre · Détection automatique des corps de métier
        </p>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', paddingTop: '4px' }}>Légende :</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#14532d', fontWeight: '600' }}>
            ✓ nécessité — <span style={{ fontWeight: '400' }}>métier détecté dans l&apos;AO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
            ✓ nécessité + quantité — <span style={{ fontWeight: '400' }}>uniquement si l&apos;AO la mentionne explicitement</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
            Non précisé — métier absent du document
          </div>
        </div>
      </div>

      {/* Graphique besoins futurs */}
      {!loading && (() => {
        const now = new Date()
        const futurs = allMatrix.filter(({ ao }) =>
          !ao.date_limite || new Date(ao.date_limite) >= now
        )
        const chartData = METIERS.map(m => ({
          label: m.label.split('/')[0].trim(),
          labelFull: m.label,
          besoins: futurs.filter(({ cells }) => cells[m.id]?.type === 'oui').length,
          id: m.id,
        })).sort((a, b) => b.besoins - a.besoins)

        const maxVal = Math.max(...chartData.map(d => d.besoins), 1)

        return (
          <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px' }}>
                Besoins futurs par corps de métier
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                AO actifs (date limite non dépassée) · 1 barre = nombre d&apos;AO avec ce métier détecté · <strong style={{ color: '#15803d' }}>{futurs.length} AO actifs</strong> sur {allMatrix.length} analysés
              </p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  width={28}
                />
                <Tooltip
                  formatter={(value: number, _: string, props: { payload?: { labelFull?: string } }) => [
                    `${value} AO`,
                    props.payload?.labelFull || '',
                  ]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="besoins" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => {
                    const isSelected = entry.id === filtreMetier
                    const baseColor =
                      entry.besoins === maxVal ? '#15803d' :
                      entry.besoins > maxVal * 0.6 ? '#16a34a' :
                      entry.besoins > maxVal * 0.3 ? '#4ade80' : '#bbf7d0'
                    return (
                      <ReCell
                        key={entry.id}
                        fill={isSelected ? '#facc15' : baseColor}
                        stroke={isSelected ? '#f59e0b' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                        opacity={filtreMetier && !isSelected ? 0.35 : 1}
                        cursor="pointer"
                        onClick={() => setFiltreMetier(entry.id === filtreMetier ? '' : entry.id)}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                Cliquez sur une barre pour filtrer le tableau
              </p>
              {filtreMetier && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fefce8', border: '1.5px solid #facc15', borderRadius: '8px', padding: '4px 12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>
                    {METIERS.find(m => m.id === filtreMetier)?.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#a16207' }}>· {matrix.length} AO</span>
                  <button
                    onClick={() => setFiltreMetier('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a16207', fontSize: '13px', fontWeight: '700', padding: '0 0 0 4px', lineHeight: 1 }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Filtres */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #e2e8f0', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Filtre lignes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: 0, whiteSpace: 'nowrap' }}>
            Filtrer les AO par métier
          </p>
          <select
            value={filtreMetier}
            onChange={e => setFiltreMetier(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: '9px', fontSize: '13px',
              border: '1.5px solid', borderColor: filtreMetier ? '#15803d' : '#e2e8f0',
              background: filtreMetier ? '#f0fdf4' : 'white',
              color: filtreMetier ? '#15803d' : '#374151',
              fontWeight: filtreMetier ? '700' : '400',
              cursor: 'pointer', outline: 'none', minWidth: '220px',
            }}
          >
            <option value="">— Tous les AO</option>
            {METIERS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {filtreMetier && (
            <button onClick={() => setFiltreMetier('')}
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer' }}>
              ✕ Effacer
            </button>
          )}
          {filtreMetier && (
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
              {matrix.length} AO avec ce métier détecté
            </span>
          )}
        </div>

        {/* Toggle colonnes */}
        <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 10px' }}>
          Colonnes affichées
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {METIERS.map(m => {
            const active = activeMetiers.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMetier(m.id)}
                style={{
                  padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', border: '1.5px solid',
                  borderColor: active ? '#15803d' : '#e2e8f0',
                  background: active ? '#f0fdf4' : '#f8fafc',
                  color: active ? '#15803d' : '#94a3b8',
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Matrice */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', gap: '10px', color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid #bbf7d0', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Analyse en cours…
          </div>
        ) : (
          <>
            {/* Scrollbar haut */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', gap: '6px', padding: '0 6px' }}>
              <div ref={topScrollRef} onScroll={syncFromTop} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', height: '12px' }}>
                <div ref={ghostRef} style={{ height: '1px' }} />
              </div>
              <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = 0 }}
                title="Début" style={{ flexShrink: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '2px 7px', fontSize: '12px', color: '#15803d', cursor: 'pointer' }}>⇤</button>
              <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth }}
                title="Fin" style={{ flexShrink: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '2px 7px', fontSize: '12px', color: '#15803d', cursor: 'pointer' }}>⇥</button>
            </div>

            <div ref={tableScrollRef} onScroll={syncFromTable} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#14532d' }}>
                    {/* Colonne AO */}
                    <th style={{
                      padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap',
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: '#fef08a',
                      borderRight: '2px solid rgba(250,204,21,0.3)',
                      position: 'sticky', left: 0, background: '#14532d', zIndex: 2,
                      minWidth: '320px',
                    }}>
                      Appel d&apos;offre
                    </th>
                    {visibleMetiers.map(m => (
                      <th key={m.id} style={{
                        padding: '10px 10px', textAlign: 'center',
                        fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: '#86efac',
                        borderRight: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap', minWidth: '130px',
                      }}>
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map(({ ao, cells }, i) => (
                    <tr key={ao.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                      {/* Nom AO — colonne sticky */}
                      <td style={{
                        padding: '9px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        borderRight: '2px solid #e2e8f0',
                        position: 'sticky', left: 0,
                        background: i % 2 === 0 ? 'white' : '#f8fafc',
                        zIndex: 1, minWidth: '320px', maxWidth: '380px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#1e293b', whiteSpace: 'normal', lineHeight: 1.4, flex: 1 }}>
                            {ao.titre || ao.objet_marche || 'Sans titre'}
                          </p>
                          <Link href={`/appels-offre/${ao.id}`}
                            title="Voir le détail"
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '22px', height: '22px', borderRadius: '50%',
                              background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                              color: '#15803d', fontSize: '12px', fontWeight: '800',
                              textDecoration: 'none', lineHeight: 1,
                            }}>
                            i
                          </Link>
                        </div>
                        <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {ao.id_annonce}
                        </p>
                      </td>
                      {visibleMetiers.map(m => (
                        <MatrixCell key={m.id} value={cells[m.id]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f0fdf4' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{total} AO · page {page}/{totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', fontSize: '12px', border: '1.5px solid #d1fae5', borderRadius: '8px', background: 'white', color: '#15803d', fontWeight: '600', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                ← Préc.
              </button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', fontSize: '12px', border: '1.5px solid #d1fae5', borderRadius: '8px', background: 'white', color: '#15803d', fontWeight: '600', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
