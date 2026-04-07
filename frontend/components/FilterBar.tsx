'use client'
import { CSSProperties } from 'react'

const MOIS_LABELS = [
  { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
]

const TYPES = ['Travaux', 'Fournitures', 'Services', 'Autre']

const currentYear = new Date().getFullYear()
const ANNEES = Array.from({ length: currentYear - 2009 }, (_, i) => currentYear - i)

interface FilterBarProps {
  search?: string
  typeMarche: string
  acheteur: string
  mois: string
  annee: string
  ville?: string
  acheteurs: string[]
  villes?: { ville: string; count: number }[]
  onSearch?: (v: string) => void
  onTypeMarche: (v: string) => void
  onAcheteur: (v: string) => void
  onMois: (v: string) => void
  onAnnee: (v: string) => void
  onVille?: (v: string) => void
  hideSearch?: boolean
}

const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`

const fieldBase: CSSProperties = {
  width: '100%',
  padding: '9px 36px 9px 12px',
  fontSize: '13.5px',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  backgroundColor: 'white',
  color: '#374151',
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: chevron,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '16px',
  outline: 'none',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const inputBase: CSSProperties = {
  ...fieldBase,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z'/%3E%3C/svg%3E")`,
  cursor: 'text',
  paddingRight: '12px',
  backgroundSize: '16px',
  backgroundPosition: 'right 10px center',
}

export default function FilterBar({
  search = '', typeMarche, acheteur, mois, annee, ville = '', acheteurs, villes = [],
  onSearch, onTypeMarche, onAcheteur, onMois, onAnnee, onVille,
  hideSearch = false,
}: FilterBarProps) {
  const handleReset = () => {
    onTypeMarche(''); onAcheteur(''); onMois(''); onAnnee('')
    if (onSearch) onSearch('')
    if (onVille) onVille('')
  }

  const hasFilters = typeMarche || acheteur || mois || annee || search || ville
  const baseCount = hideSearch ? 4 : 5
  const cols = villes.length > 0 ? baseCount + 1 : baseCount

  return (
    <div style={{
      background: 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(8px)',
      borderRadius: '14px',
      border: '1.5px solid #e2e8f0',
      padding: '16px 18px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🔽</span>
          <p style={{
            fontSize: '11px', fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            color: '#15803d', margin: 0,
          }}>Filtres</p>
          {hasFilters && (
            <span style={{
              fontSize: '10px', fontWeight: '700',
              backgroundColor: '#dcfce7', color: '#15803d',
              padding: '2px 8px', borderRadius: '999px',
              border: '1px solid #bbf7d0',
            }}>
              {[typeMarche, acheteur, mois, annee, search, ville].filter(Boolean).length} actif{[typeMarche, acheteur, mois, annee, search, ville].filter(Boolean).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={handleReset}
            style={{
              fontSize: '12px', color: '#64748b', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px', borderRadius: '6px',
            }}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
        {!hideSearch && (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => onSearch?.(e.target.value)}
              style={inputBase}
            />
          </div>
        )}

        <select value={mois} onChange={e => onMois(e.target.value)} style={fieldBase}>
          <option value="">Tous les mois</option>
          {MOIS_LABELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select value={annee} onChange={e => onAnnee(e.target.value)} style={fieldBase}>
          <option value="">Toutes les années</option>
          {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select value={typeMarche} onChange={e => onTypeMarche(e.target.value)} style={fieldBase}>
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={acheteur} onChange={e => onAcheteur(e.target.value)} style={fieldBase}>
          <option value="">Tous les acheteurs</option>
          {acheteurs.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {villes.length > 0 && onVille && (
          <select value={ville} onChange={e => onVille(e.target.value)} style={{
            ...fieldBase,
            borderColor: ville ? '#15803d' : '#e2e8f0',
            background: ville ? '#f0fdf4' : 'white',
            color: ville ? '#15803d' : '#374151',
            fontWeight: ville ? '700' : '400',
          }}>
            <option value="">Toutes les villes</option>
            {villes.map(v => <option key={v.ville} value={v.ville}>{v.ville} ({v.count})</option>)}
          </select>
        )}
      </div>
    </div>
  )
}
