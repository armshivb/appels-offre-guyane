'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { fetchAppelsOffre, fetchAcheteurs } from '@/lib/api'
import FilterBar from '@/components/FilterBar'
import type { AppelOffre } from '@/lib/api'

type SortDir = 'asc' | 'desc'

const ND = 'Non dispo*'

function getStatut(date_limite: string | null): string {
  if (!date_limite) return ND
  const diff = Math.ceil((new Date(date_limite).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Expiré'
  if (diff <= 7) return `Urgent — J-${diff}`
  if (diff <= 30) return `En cours — J-${diff}`
  return `Actif — J-${diff}`
}

function formatDate(d: string | null) {
  if (!d) return ND
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatMontant(m: number | null) {
  if (m === null || m === undefined) return ND
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m} €`
}

const VILLES_GUYANE: { alias: string[]; canonical: string }[] = [
  { alias: ['cayenne'],                                    canonical: 'CAYENNE' },
  { alias: ['saint-laurent-du-maroni', 'saint laurent'],  canonical: 'SAINT-LAURENT-DU-MARONI' },
  { alias: ['kourou'],                                     canonical: 'KOUROU' },
  { alias: ['matoury'],                                    canonical: 'MATOURY' },
  { alias: ['rémire-montjoly', 'remire-montjoly', 'rémire', 'remire'], canonical: 'RÉMIRE-MONTJOLY' },
  { alias: ['maripasoula', 'maripa-soula'],                canonical: 'MARIPASOULA' },
  { alias: ['mana'],                                       canonical: 'MANA' },
  { alias: ['apatou'],                                     canonical: 'APATOU' },
  { alias: ['saint-georges'],                              canonical: 'SAINT-GEORGES' },
  { alias: ['sinnamary'],                                  canonical: 'SINNAMARY' },
  { alias: ['iracoubo'],                                   canonical: 'IRACOUBO' },
  { alias: ['grand-santi'],                                canonical: 'GRAND-SANTI' },
  { alias: ['roura'],                                      canonical: 'ROURA' },
  { alias: ['montsinéry', 'montsinery'],                   canonical: 'MONTSINÉRY-TONNEGRANDE' },
  { alias: ['papaïchton', 'papaichton'],                   canonical: 'PAPAÏCHTON' },
  { alias: ['camopi'],                                     canonical: 'CAMOPI' },
  { alias: ['awala-yalimapo', 'awala'],                    canonical: 'AWALA-YALIMAPO' },
  { alias: ['saül', 'saul'],                               canonical: 'SAÜL' },
  { alias: ['saint-élie', 'saint-elie'],                   canonical: 'SAINT-ÉLIE' },
  { alias: ['régina', 'regina'],                           canonical: 'RÉGINA' },
  { alias: ['ouanary'],                                    canonical: 'OUANARY' },
]

function detectVille(ao: AppelOffre): string {
  const texte = [ao.acheteur, ao.titre, ao.objet_marche, ao.texte_complet]
    .filter(Boolean).join(' ').toLowerCase()
  for (const { alias, canonical } of VILLES_GUYANE) {
    if (alias.some(a => texte.includes(a))) return canonical
  }
  return 'GUYANE (973)'
}

// Mapping AO → colonnes du tableau
function aoToRow(ao: AppelOffre): Record<string, string> {
  return {
    id_operation:                 ao.id_annonce              || ND,
    designation:                  ao.titre || ao.objet_marche || ND,
    maitre_ouvrage:               ao.acheteur                || ND,
    description:                  ao.objet_marche            || ND,
    localite:                     detectVille(ao),
    type_travaux:                 ao.type_marche             || ND,
    secteur:                      ND,
    numero_log:                   String(ao.id),
    code_ape:                     ND,
    montant_previsionnel:         formatMontant(ao.montant_estime),
    statut:                       getStatut(ao.date_limite),
    surface_plancher:             ND,
    ao_date_prevue:               ND,
    ao_date_reelle:               formatDate(ao.date_publication),
    procedure:                    ao.procedure               || ND,
    resultat_marche_date_prevue:  formatDate(ao.date_limite),
    resultat_marche_date_reelle:  ND,
    montant:                      formatMontant(ao.montant_estime),
    os_date_prevue:               ND,
    os_date_reelle:               ND,
    reception_date_prevue:        ND,
    reception_date_reelle:        ND,
  }
}

const COLUMNS: { key: string; label: string; sortKey?: string }[] = [
  { key: 'id_operation',                label: 'Id Opération',                      sortKey: undefined },
  { key: 'designation',                 label: 'Désignation',                       sortKey: 'titre' },
  { key: 'maitre_ouvrage',              label: "Maîtrise d'ouvrage",                sortKey: 'acheteur' },
  { key: 'description',                 label: 'Description',                       sortKey: undefined },
  { key: 'localite',                    label: 'Localité',                          sortKey: undefined },
  { key: 'type_travaux',                label: 'Type de travaux',                   sortKey: 'type_marche' },
  { key: 'secteur',                     label: 'Secteur',                           sortKey: undefined },
  { key: 'numero_log',                  label: 'Nº Log',                            sortKey: undefined },
  { key: 'code_ape',                    label: 'Code APE',                          sortKey: undefined },
  { key: 'montant_previsionnel',        label: 'Montant prévisionnel',              sortKey: 'montant_estime' },
  { key: 'statut',                      label: 'Statut',                            sortKey: undefined },
  { key: 'surface_plancher',            label: 'Surface plancher',                  sortKey: undefined },
  { key: 'ao_date_prevue',              label: "Appel d'offres date prévue",        sortKey: undefined },
  { key: 'ao_date_reelle',              label: "Appel d'offres date réelle",        sortKey: 'date_publication' },
  { key: 'procedure',                   label: 'Procédure',                         sortKey: undefined },
  { key: 'resultat_marche_date_prevue', label: 'Résultat du marché date prévue',    sortKey: 'date_limite' },
  { key: 'resultat_marche_date_reelle', label: 'Résultat du marché date réelle',    sortKey: undefined },
  { key: 'montant',                     label: 'Montant',                           sortKey: undefined },
  { key: 'os_date_prevue',              label: 'Ordre de service date prévue',      sortKey: undefined },
  { key: 'os_date_reelle',              label: 'Ordre de service date réelle',      sortKey: undefined },
  { key: 'reception_date_prevue',       label: 'Réception date prévue',             sortKey: undefined },
  { key: 'reception_date_reelle',       label: 'Réception date réelle',             sortKey: undefined },
  { key: 'boamp',                       label: 'BOAMP',                             sortKey: undefined },
  { key: 'detail',                      label: 'Détail',                            sortKey: undefined },
]

function Cell({ value, colKey, ao }: { value: string; colKey: string; ao: AppelOffre }) {
  const isNd = value === ND

  if (colKey === 'boamp') return (
    <td style={{ padding: '9px 13px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
      {ao.url_detail ? (
        <a href={ao.url_detail} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '12px', color: '#15803d', fontWeight: '600', textDecoration: 'none' }}>
          BOAMP ↗
        </a>
      ) : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>}
    </td>
  )

  if (colKey === 'detail') return (
    <td style={{ padding: '9px 13px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
      <Link href={`/appels-offre/${ao.id}`}
        style={{ fontSize: '12px', color: '#15803d', fontWeight: '700', textDecoration: 'none' }}>
        Voir →
      </Link>
    </td>
  )

  return (
    <td style={{
      padding: '9px 13px', whiteSpace: 'nowrap', fontSize: '12px',
      color: isNd ? '#94a3b8' : '#1e293b',
      fontStyle: isNd ? 'italic' : 'normal',
      borderBottom: '1px solid #f1f5f9',
      maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {value}
    </td>
  )
}

export default function AnalyserPage() {
  const [items, setItems] = useState<AppelOffre[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const [search, setSearch] = useState('')
  const [typeMarche, setTypeMarche] = useState('')
  const [acheteur, setAcheteur] = useState('')
  const [mois, setMois] = useState('')
  const [annee, setAnnee] = useState('')
  const [acheteurs, setAcheteurs] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('date_publication')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchAppelsOffre({
        page, page_size: PAGE_SIZE,
        search, type_marche: typeMarche, acheteur,
        mois: mois ? Number(mois) : undefined,
        annee: annee ? Number(annee) : undefined,
        sort_by: sortBy, sort_dir: sortDir,
      })
      setItems(r.items)
      setTotal(r.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeMarche, acheteur, mois, annee, sortBy, sortDir])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchAcheteurs().then(setAcheteurs) }, [])

  const handleSort = (col: typeof COLUMNS[0]) => {
    if (!col.sortKey) return
    if (sortBy === col.sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col.sortKey); setSortDir('desc') }
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const topScrollRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  // Sync ghost width to real table width after render
  useEffect(() => {
    if (!tableScrollRef.current || !ghostRef.current) return
    const table = tableScrollRef.current.querySelector('table')
    if (table) ghostRef.current.style.width = `${table.scrollWidth}px`
  }, [items])

  const syncFromTop = () => {
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
  }
  const syncFromTable = () => {
    if (topScrollRef.current && tableScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
  }

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
          Analyse des AO
        </h1>
        <p style={{ color: '#86efac', fontSize: '13px', margin: 0, position: 'relative' }}>
          {total} appels d&apos;offre — Tableau structuré · Département 973, Guyane
        </p>
      </div>

      <FilterBar
        search={search} typeMarche={typeMarche} acheteur={acheteur}
        mois={mois} annee={annee} acheteurs={acheteurs}
        onSearch={v => { setSearch(v); setPage(1) }}
        onTypeMarche={v => { setTypeMarche(v); setPage(1) }}
        onAcheteur={v => { setAcheteur(v); setPage(1) }}
        onMois={v => { setMois(v); setPage(1) }}
        onAnnee={v => { setAnnee(v); setPage(1) }}
      />

      {/* Table */}
      <div style={{ marginTop: '16px', background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', gap: '10px', color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
            <div style={{ width: '24px', height: '24px', border: '3px solid #bbf7d0', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px', fontSize: '14px' }}>Aucun résultat</div>
        ) : (
          <>
            {/* Scrollbar du haut + boutons navigation */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', gap: '6px', padding: '0 6px' }}>
              <div
                ref={topScrollRef}
                onScroll={syncFromTop}
                style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', height: '12px' }}
              >
                <div ref={ghostRef} style={{ height: '1px' }} />
              </div>
              <button
                onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = 0 }}
                title="Début du tableau"
                style={{ flexShrink: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '2px 7px', fontSize: '12px', color: '#15803d', cursor: 'pointer', lineHeight: 1 }}
              >⇤</button>
              <button
                onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollLeft = tableScrollRef.current.scrollWidth }}
                title="Fin du tableau"
                style={{ flexShrink: 0, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '5px', padding: '2px 7px', fontSize: '12px', color: '#15803d', cursor: 'pointer', lineHeight: 1 }}
              >⇥</button>
            </div>
          <div ref={tableScrollRef} onScroll={syncFromTable} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '2400px' }}>
              <thead>
                <tr style={{ background: '#14532d' }}>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col)}
                      style={{
                        padding: '10px 13px', textAlign: 'left',
                        fontSize: '10px', fontWeight: '700',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: col.sortKey ? '#fef08a' : '#86efac',
                        borderBottom: '2px solid rgba(250,204,21,0.3)',
                        whiteSpace: 'nowrap',
                        cursor: col.sortKey ? 'pointer' : 'default',
                      }}
                    >
                      {col.label}
                      {col.sortKey && (
                        <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                          {sortBy === col.sortKey ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((ao, i) => {
                  const row = aoToRow(ao)
                  return (
                    <tr key={ao.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                      {COLUMNS.map(col => (
                        <Cell key={col.key} value={row[col.key] || ND} colKey={col.key} ao={ao} />
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f0fdf4' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{total} résultats · page {page}/{totalPages}</span>
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
