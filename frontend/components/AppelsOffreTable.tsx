'use client'
import Link from 'next/link'
import type { AppelOffre } from '@/lib/api'

interface Props {
  items: AppelOffre[]
  loading?: boolean
  showResumes?: boolean
  resumeLoading?: Record<number, boolean>
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatMontant(m: number | null) {
  if (m === null || m === undefined) return '—'
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(1)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m} €`
}

const TYPE_COLORS: Record<string, string> = {
  Travaux: 'bg-orange-100 text-orange-700',
  Fournitures: 'bg-blue-100 text-blue-700',
  Services: 'bg-green-100 text-green-700',
  Autre: 'bg-gray-100 text-gray-700',
}

export default function AppelsOffreTable({ items, loading, showResumes, resumeLoading = {} }: Props) {
  const colSpan = showResumes ? 8 : 7

  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-400">
          Chargement...
        </td>
      </tr>
    )
  }

  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center text-gray-400">
          Aucun appel d&apos;offre trouvé
        </td>
      </tr>
    )
  }

  return (
    <>
      {items.map(ao => (
        <tr key={ao.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 max-w-xs">
            <span className="line-clamp-2 font-medium text-gray-800">
              {ao.titre || ao.objet_marche || '—'}
            </span>
          </td>
          <td className="px-4 py-3 max-w-xs">
            <span className="line-clamp-1 text-gray-600">{ao.acheteur || '—'}</span>
          </td>
          <td className="px-4 py-3">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[ao.type_marche || ''] || TYPE_COLORS.Autre}`}>
              {ao.type_marche || 'Autre'}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(ao.date_publication)}</td>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className={`${ao.date_limite && new Date(ao.date_limite) < new Date() ? 'text-red-500' : 'text-gray-600'}`}>
              {formatDate(ao.date_limite)}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatMontant(ao.montant_estime)}</td>
          {showResumes && (
            <td className="px-4 py-3 max-w-xs">
              {resumeLoading[ao.id] ? (
                <span className="text-gray-400 text-xs">Génération...</span>
              ) : ao.resume_llm ? (
                <p className="text-xs text-gray-600 line-clamp-3">{ao.resume_llm}</p>
              ) : (
                <span className="text-gray-400 text-xs">—</span>
              )}
            </td>
          )}
          <td className="px-4 py-3 text-center">
            <Link
              href={`/appels-offre/${ao.id}`}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
            >
              Voir détail
            </Link>
          </td>
        </tr>
      ))}
    </>
  )
}
