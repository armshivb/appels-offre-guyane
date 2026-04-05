'use client'
import { useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Lot {
  numero: string
  intitule: string
  code_ape: string
  montant_previsionnel: string
  surface_plancher: string
  corps_metier: string
  materiel: string
  estimation_basse: string
  estimation_haute: string
}

interface AOAnalyse {
  id_operation: string
  designation: string
  maitre_ouvrage: string
  description: string
  localite: string
  type_travaux: string
  secteur: string
  numero_log: string
  procedure: string
  ao_date_prevue: string
  ao_date_reelle: string
  statut: string
  resultat_marche_date_prevue: string
  contact: string
  email: string
  telephone: string
  lots: Lot[]
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'id_operation',              label: 'Id Opération' },
  { key: 'designation',               label: 'Désignation' },
  { key: 'maitre_ouvrage',            label: "Maîtrise d'ouvrage" },
  { key: 'description',               label: 'Description' },
  { key: 'localite',                  label: 'Localité' },
  { key: 'type_travaux',              label: 'Type de travaux' },
  { key: 'secteur',                   label: 'Secteur' },
  { key: 'numero_log',                label: 'Nº Log' },
  { key: 'procedure',                 label: 'Procédure' },
  { key: 'ao_date_prevue',            label: 'AO date prévue' },
  { key: 'ao_date_reelle',            label: 'AO date réelle' },
  { key: 'statut',                    label: 'Statut' },
  { key: 'resultat_marche_date_prevue', label: 'Résultat marché date prévue' },
  { key: 'lot_numero',                label: 'Nº Lot' },
  { key: 'lot_intitule',              label: 'Intitulé Lot' },
  { key: 'lot_code_ape',              label: 'Code APE' },
  { key: 'lot_montant_previsionnel',  label: 'Montant prévisionnel' },
  { key: 'lot_surface_plancher',      label: 'Surface plancher' },
  { key: 'lot_corps_metier',          label: 'Corps de métier' },
  { key: 'lot_materiel',              label: 'Matériel' },
  { key: 'lot_estimation_basse',      label: 'Estimation basse' },
  { key: 'lot_estimation_haute',      label: 'Estimation haute' },
]

function Cell({ value }: { value: string }) {
  const isNd = value === 'Non dispo*'
  return (
    <td style={{
      padding: '10px 14px',
      whiteSpace: 'nowrap',
      fontSize: '13px',
      color: isNd ? '#94a3b8' : '#1e293b',
      fontStyle: isNd ? 'italic' : 'normal',
      borderBottom: '1px solid #f1f5f9',
      maxWidth: '260px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {value}
    </td>
  )
}

export default function AOTable() {
  const [aoBrut, setAoBrut] = useState('')
  const [result, setResult] = useState<AOAnalyse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyse = async () => {
    if (!aoBrut.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetch(`${BASE}/api/analyser-ao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ao_brut: aoBrut }),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || `Erreur ${r.status}`)
      }
      const data: AOAnalyse = await r.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Build rows: one per lot, repeated ao fields
  const rows: Record<string, string>[] = result
    ? (result.lots.length > 0 ? result.lots : [{}]).map((lot) => ({
        id_operation:               result.id_operation,
        designation:                result.designation,
        maitre_ouvrage:             result.maitre_ouvrage,
        description:                result.description,
        localite:                   result.localite,
        type_travaux:               result.type_travaux,
        secteur:                    result.secteur,
        numero_log:                 result.numero_log,
        procedure:                  result.procedure,
        ao_date_prevue:             result.ao_date_prevue,
        ao_date_reelle:             result.ao_date_reelle,
        statut:                     result.statut,
        resultat_marche_date_prevue: result.resultat_marche_date_prevue,
        lot_numero:                 (lot as Lot).numero              || 'Non dispo*',
        lot_intitule:               (lot as Lot).intitule            || 'Non dispo*',
        lot_code_ape:               (lot as Lot).code_ape            || 'Non dispo*',
        lot_montant_previsionnel:   (lot as Lot).montant_previsionnel || 'Non dispo*',
        lot_surface_plancher:       (lot as Lot).surface_plancher     || 'Non dispo*',
        lot_corps_metier:           (lot as Lot).corps_metier         || 'Non dispo*',
        lot_materiel:               (lot as Lot).materiel             || 'Non dispo*',
        lot_estimation_basse:       (lot as Lot).estimation_basse     || 'Non dispo*',
        lot_estimation_haute:       (lot as Lot).estimation_haute     || 'Non dispo*',
      }))
    : []

  return (
    <div>
      {/* Input zone */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '22px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '10px' }}>
          Collez le texte brut de l'appel d'offre
        </label>
        <textarea
          value={aoBrut}
          onChange={e => setAoBrut(e.target.value)}
          placeholder="Collez ici le texte de l'appel d'offre..."
          rows={8}
          style={{
            width: '100%', boxSizing: 'border-box',
            borderRadius: '10px', border: '1.5px solid #e2e8f0',
            padding: '12px 14px', fontSize: '13px', color: '#374151',
            fontFamily: 'inherit', resize: 'vertical', outline: 'none',
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button
            onClick={analyse}
            disabled={loading || !aoBrut.trim()}
            style={{
              background: loading || !aoBrut.trim()
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #15803d, #16a34a)',
              color: loading || !aoBrut.trim() ? '#94a3b8' : 'white',
              border: 'none', borderRadius: '10px',
              padding: '10px 22px', fontSize: '14px', fontWeight: '700',
              cursor: loading || !aoBrut.trim() ? 'not-allowed' : 'pointer',
              boxShadow: loading || !aoBrut.trim() ? 'none' : '0 2px 10px rgba(21,128,61,0.3)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span>
                Analyse en cours…
              </>
            ) : '✨ Analyser'}
          </button>
          {result && (
            <button
              onClick={() => { setResult(null); setAoBrut('') }}
              style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '14px 18px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {/* Table */}
      {result && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
              Résultat de l'analyse · <span style={{ color: '#15803d' }}>{rows.length} lot{rows.length > 1 ? 's' : ''}</span>
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {COLUMNS.map(col => (
                    <th key={col.key} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '700',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: '#64748b', borderBottom: '2px solid #e2e8f0',
                      whiteSpace: 'nowrap',
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    {COLUMNS.map(col => (
                      <Cell key={col.key} value={row[col.key] || 'Non dispo*'} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
