'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchAppelOffre } from '@/lib/api'
import type { AppelOffre } from '@/lib/api'

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatMontant(m: number | null) {
  if (m === null || m === undefined) return '—'
  if (m >= 1_000_000) return `${(m / 1_000_000).toFixed(2)} M€`
  if (m >= 1000) return `${(m / 1000).toFixed(0)} k€`
  return `${m} €`
}

function getStatut(date_limite: string | null) {
  if (!date_limite) return { label: 'Date inconnue', color: '#94a3b8', bg: '#f1f5f9' }
  const diff = Math.ceil((new Date(date_limite).getTime() - Date.now()) / 86400000)
  if (diff < 0)  return { label: 'Expiré', color: '#dc2626', bg: '#fff1f2' }
  if (diff <= 7) return { label: `Urgent — J-${diff}`, color: '#ea580c', bg: '#fff7ed' }
  if (diff <= 30) return { label: `J-${diff}`, color: '#ca8a04', bg: '#fefce8' }
  return { label: `J-${diff}`, color: '#15803d', bg: '#f0fdf4' }
}

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Travaux:     { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  Fournitures: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  Services:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  Autre:       { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <p style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 5px' }}>
        {label}
      </p>
      <div style={{ fontSize: '14px', color: '#1e293b', fontFamily: mono ? 'monospace' : 'inherit', lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  )
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [ao, setAo] = useState<AppelOffre | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetchAppelOffre(Number(id))
      .then(setAo)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', flexDirection: 'column', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #bbf7d0', borderTopColor: '#15803d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#15803d', fontWeight: '600', fontSize: '14px' }}>Chargement…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (notFound || !ao) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>🔍</div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', margin: 0 }}>Appel d&apos;offre introuvable</h2>
        <button onClick={() => router.back()} style={{ background: '#15803d', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
          ← Retour
        </button>
      </div>
    )
  }

  const statut = getStatut(ao.date_limite)
  const typeStyle = TYPE_COLORS[ao.type_marche || ''] || TYPE_COLORS.Autre

  return (
    <div className="animate-fade-slide" style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          marginBottom: '16px', background: 'none', border: 'none',
          color: '#15803d', fontWeight: '600', fontSize: '13px',
          cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
        }}
      >
        ← Retour
      </button>

      {/* Header card */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)',
        borderRadius: '18px', padding: '26px 28px',
        boxShadow: '0 6px 30px rgba(20,83,45,0.25)',
        marginBottom: '20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(250,204,21,0.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}`, fontSize: '12px', fontWeight: '700', padding: '3px 12px', borderRadius: '999px' }}>
              {ao.type_marche || 'Autre'}
            </span>
            <span style={{ background: statut.bg, color: statut.color, fontSize: '12px', fontWeight: '700', padding: '3px 12px', borderRadius: '999px' }}>
              {statut.label}
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 0 8px', lineHeight: 1.4 }}>
            {ao.titre || ao.objet_marche || 'Sans titre'}
          </h1>
          <p style={{ color: '#86efac', fontSize: '13px', margin: 0 }}>
            {ao.acheteur || '—'} · Réf. <span style={{ fontFamily: 'monospace', color: '#d1fae5' }}>{ao.id_annonce}</span>
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Infos clés */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#15803d', margin: '0 0 4px' }}>
            Informations clés
          </h2>
          <Field label="Acheteur" value={ao.acheteur || '—'} />
          <Field label="Procédure" value={ao.procedure || '—'} />
          <Field label="Montant estimé" value={
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#a16207' }}>
              {formatMontant(ao.montant_estime)}
            </span>
          } />
          <Field label="Référence" value={ao.id_annonce} mono />
        </div>

        {/* Dates */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#15803d', margin: '0 0 4px' }}>
            Calendrier
          </h2>
          <Field label="Date de publication" value={formatDate(ao.date_publication)} />
          <Field label="Date limite de réponse" value={
            <span style={{ color: ao.date_limite && new Date(ao.date_limite) < new Date() ? '#dc2626' : '#1e293b', fontWeight: '600' }}>
              {formatDate(ao.date_limite)}
            </span>
          } />
          <Field label="Statut" value={
            <span style={{ background: statut.bg, color: statut.color, fontWeight: '700', padding: '3px 12px', borderRadius: '999px', fontSize: '13px' }}>
              {statut.label}
            </span>
          } />
          {ao.url_detail && (
            <div style={{ paddingTop: '16px' }}>
              <a href={ao.url_detail} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #15803d, #16a34a)',
                color: 'white', textDecoration: 'none',
                padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: '700',
                boxShadow: '0 2px 10px rgba(21,128,61,0.3)',
              }}>
                Voir sur BOAMP ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Texte / Résumé IA */}
      {(ao.resume_llm || ao.texte_complet) && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          {ao.resume_llm && (
            <div style={{ marginBottom: ao.texte_complet ? '20px' : 0 }}>
              <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#15803d', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✨ Résumé IA
              </h2>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, margin: 0, background: '#f0fdf4', padding: '14px 16px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                {ao.resume_llm}
              </p>
            </div>
          )}
          {ao.texte_complet && (
            <div>
              <h2 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', margin: '0 0 10px' }}>
                Texte complet
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                {ao.texte_complet}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
