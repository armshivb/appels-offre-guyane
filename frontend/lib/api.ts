const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api'

export interface AppelOffre {
  id: number
  id_annonce: string
  titre: string | null
  objet_marche: string | null
  acheteur: string | null
  date_publication: string | null
  date_limite: string | null
  type_marche: string | null
  montant_estime: number | null
  procedure: string | null
  url_detail: string | null
  texte_complet: string | null
  resume_llm: string | null
  resume_genere_le: string | null
}

export interface PaginatedResponse {
  total: number
  page: number
  page_size: number
  items: AppelOffre[]
}

export interface KPI {
  total: number
  ao_mois: number
  montant_total: number
  delai_moyen: number
}

export interface StatMois {
  annee: number
  mois: number
  count: number
}

export interface StatType {
  type_marche: string
  count: number
}

export interface StatAcheteur {
  acheteur: string
  count: number
}

export interface StatsFilters {
  type_marche?: string
  acheteur?: string
  mois?: number
  annee?: number
  ville?: string
}

function buildQS(filters: StatsFilters): string {
  const qs = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export async function fetchKPI(filters: StatsFilters = {}): Promise<KPI> {
  const r = await fetch(`${BASE}/stats/kpi${buildQS(filters)}`)
  if (!r.ok) throw new Error('Failed to fetch KPI')
  return r.json()
}

export async function fetchStatsMois(filters: StatsFilters = {}): Promise<StatMois[]> {
  const r = await fetch(`${BASE}/stats/par-mois${buildQS(filters)}`)
  if (!r.ok) throw new Error('Failed to fetch stats par mois')
  return r.json()
}

export async function fetchStatsType(filters: StatsFilters = {}): Promise<StatType[]> {
  const r = await fetch(`${BASE}/stats/par-type${buildQS(filters)}`)
  if (!r.ok) throw new Error('Failed to fetch stats par type')
  return r.json()
}

export async function fetchTopAcheteurs(filters: StatsFilters = {}): Promise<StatAcheteur[]> {
  const r = await fetch(`${BASE}/stats/top-acheteurs${buildQS(filters)}`)
  if (!r.ok) throw new Error('Failed to fetch top acheteurs')
  return r.json()
}

export async function fetchAppelsOffre(params: {
  page?: number
  page_size?: number
  search?: string
  type_marche?: string
  acheteur?: string
  mois?: number
  annee?: number
  sort_by?: string
  sort_dir?: string
}): Promise<PaginatedResponse> {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
  })
  const r = await fetch(`${BASE}/appels-offre?${qs}`)
  if (!r.ok) throw new Error('Failed to fetch appels offre')
  return r.json()
}

export async function fetchAppelOffre(id: number): Promise<AppelOffre> {
  const r = await fetch(`${BASE}/appels-offre/${id}`)
  if (!r.ok) throw new Error('Failed to fetch appel offre')
  return r.json()
}

export async function generateResume(id: number): Promise<{ resume_llm: string }> {
  const r = await fetch(`${BASE}/appels-offre/${id}/resume`, { method: 'POST' })
  if (!r.ok) throw new Error('Failed to generate resume')
  return r.json()
}

export async function fetchAcheteurs(): Promise<string[]> {
  const r = await fetch(`${BASE}/acheteurs`)
  if (!r.ok) throw new Error('Failed to fetch acheteurs')
  return r.json()
}

export async function fetchVilles(): Promise<{ ville: string; count: number }[]> {
  const r = await fetch(`${BASE}/villes`)
  if (!r.ok) throw new Error('Failed to fetch villes')
  return r.json()
}

export async function triggerScrape(): Promise<{ new: number; skipped: number; errors: number }> {
  const r = await fetch(`${BASE}/scrape`, { method: 'POST' })
  if (!r.ok) throw new Error('Failed to trigger scrape')
  return r.json()
}
