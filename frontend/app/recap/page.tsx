'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { fetchAppelsOffre, fetchAcheteurs } from '@/lib/api'
import FilterBar from '@/components/FilterBar'
import type { AppelOffre } from '@/lib/api'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatMontant(m: number | null) {
  if (m === null || m === undefined) return '—'
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m} €`
}

function getStatut(date_limite: string | null) {
  if (!date_limite) return { label: 'Inconnu', cls: 'bg-gray-100 text-gray-500' }
  const now = new Date()
  const dl = new Date(date_limite)
  const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Expiré', cls: 'bg-red-100 text-red-700' }
  if (diff <= 7) return { label: `J-${diff}`, cls: 'bg-orange-100 text-orange-700' }
  if (diff <= 30) return { label: `J-${diff}`, cls: 'bg-yellow-100 text-yellow-700' }
  return { label: `J-${diff}`, cls: 'bg-green-100 text-green-700' }
}

const TYPE_BADGE: Record<string, string> = {
  Travaux:     'bg-yellow-100 text-yellow-800',
  Fournitures: 'bg-green-100 text-green-800',
  Services:    'bg-emerald-100 text-emerald-800',
  Autre:       'bg-gray-100 text-gray-600',
}

type SortDir = 'asc' | 'desc'

const COLUMNS = [
  { key: 'id_annonce',       label: 'Référence' },
  { key: 'titre',            label: 'Objet du marché' },
  { key: 'acheteur',         label: 'Acheteur' },
  { key: 'type_marche',      label: 'Type' },
  { key: 'procedure',        label: 'Procédure' },
  { key: 'date_publication', label: 'Publication' },
  { key: 'date_limite',      label: 'Date limite' },
  { key: 'montant_estime',   label: 'Montant estimé' },
  { key: 'statut',           label: 'Statut' },
  { key: 'lien',             label: 'Lien' },
]

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api'

function buildExportUrl(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  })
  return `${BASE}/appels-offre/export?${qs}`
}

export default function RecapPage() {
  const [items, setItems] = useState<AppelOffre[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

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
      const result = await fetchAppelsOffre({
        page, page_size: PAGE_SIZE,
        search, type_marche: typeMarche, acheteur,
        mois: mois ? Number(mois) : undefined,
        annee: annee ? Number(annee) : undefined,
        sort_by: sortBy, sort_dir: sortDir,
      })
      setItems(result.items)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [page, search, typeMarche, acheteur, mois, annee, sortBy, sortDir])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetchAcheteurs().then(setAcheteurs) }, [])

  const handleSort = (col: string) => {
    if (!['titre', 'acheteur', 'type_marche', 'date_publication', 'date_limite', 'montant_estime'].includes(col)) return
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
    setPage(1)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <span className="text-green-300 ml-1 text-xs">↕</span>
    return <span className="text-yellow-300 ml-1 text-xs">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        borderRadius: '18px', padding: '24px 28px',
        boxShadow: '0 6px 30px rgba(20,83,45,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(250,204,21,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
              Tableau récapitulatif
            </h1>
            <p style={{ color: '#86efac', marginTop: '5px', fontSize: '13px', margin: '5px 0 0' }}>
              {total} appels d&apos;offre — Département 973, Guyane
            </p>
          </div>
          <a
            href={buildExportUrl({
              search: search || undefined,
              type_marche: typeMarche || undefined,
              acheteur: acheteur || undefined,
              mois: mois ? Number(mois) : undefined,
              annee: annee ? Number(annee) : undefined,
              sort_by: sortBy, sort_dir: sortDir,
            })}
            download
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #facc15, #f59e0b)',
              color: '#14532d', textDecoration: 'none',
              border: 'none', borderRadius: '10px',
              padding: '10px 18px', fontSize: '13px', fontWeight: '700',
              boxShadow: '0 2px 12px rgba(250,204,21,0.4)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exporter CSV
          </a>
        </div>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-900 text-white text-xs uppercase tracking-wide">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 text-left whitespace-nowrap ${
                      ['titre','acheteur','type_marche','date_publication','date_limite','montant_estime'].includes(col.key)
                        ? 'cursor-pointer hover:bg-green-700'
                        : ''
                    }`}
                  >
                    {col.label}
                    {['titre','acheteur','type_marche','date_publication','date_limite','montant_estime'].includes(col.key) && (
                      <SortIcon col={col.key} />
                    )}
                  </th>
                ))}
                <th className="px-3 py-3 text-left">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">Aucun résultat</td>
                </tr>
              ) : items.map((ao, idx) => {
                const statut = getStatut(ao.date_limite)
                return (
                  <tr key={ao.id} className={`hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {/* Référence */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-500">{ao.id_annonce}</span>
                    </td>
                    {/* Objet */}
                    <td className="px-3 py-2 max-w-xs">
                      <span className="line-clamp-2 text-gray-800 font-medium text-xs">{ao.titre || ao.objet_marche || '—'}</span>
                    </td>
                    {/* Acheteur */}
                    <td className="px-3 py-2 max-w-xs">
                      <span className="line-clamp-1 text-gray-600 text-xs">{ao.acheteur || '—'}</span>
                    </td>
                    {/* Type */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[ao.type_marche || ''] || TYPE_BADGE.Autre}`}>
                        {ao.type_marche || 'Autre'}
                      </span>
                    </td>
                    {/* Procédure */}
                    <td className="px-3 py-2 max-w-xs">
                      <span className="text-xs text-gray-500 line-clamp-1">{ao.procedure || '—'}</span>
                    </td>
                    {/* Publication */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">{formatDate(ao.date_publication)}</td>
                    {/* Date limite */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                      <span className={ao.date_limite && new Date(ao.date_limite) < new Date() ? 'text-red-500' : 'text-gray-700'}>
                        {formatDate(ao.date_limite)}
                      </span>
                    </td>
                    {/* Montant */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold text-yellow-700">
                      {formatMontant(ao.montant_estime)}
                    </td>
                    {/* Statut */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statut.cls}`}>
                        {statut.label}
                      </span>
                    </td>
                    {/* Lien BOAMP */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {ao.url_detail ? (
                        <a href={ao.url_detail} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-700 hover:text-green-900 hover:underline font-medium">
                          BOAMP ↗
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Détail */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link href={`/appels-offre/${ao.id}`} className="text-xs text-green-700 hover:text-green-900 hover:underline font-semibold">
                        Voir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer avec pagination et légende */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-green-50">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{total} résultats</span>
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span><span>Actif</span>
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span><span>&lt; 30 j</span>
              <span className="inline-block w-2 h-2 rounded-full bg-orange-400"></span><span>&lt; 7 j</span>
              <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span><span>Expiré</span>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded-lg disabled:opacity-40 hover:bg-green-100">
                ← Préc.
              </button>
              <span className="text-xs text-gray-600">Page {page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-green-300 text-green-700 rounded-lg disabled:opacity-40 hover:bg-green-100">
                Suiv. →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
