import csv
import io
import logging
import os
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from datetime import datetime, date
from pydantic import BaseModel

from database import engine, get_db
from models import Base, AppelOffre
from scraper import run_scraper
from llm import get_or_generate_resume
from scheduler import start_scheduler, stop_scheduler
from insee import sync_indices, get_indices, SERIES_BTP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="Appels d'offre Guyane API", lifespan=lifespan)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Schemas ────────────────────────────────────────────────────────────────

class AppelOffreOut(BaseModel):
    id: int
    id_annonce: str
    titre: Optional[str]
    objet_marche: Optional[str]
    acheteur: Optional[str]
    date_publication: Optional[datetime]
    date_limite: Optional[datetime]
    type_marche: Optional[str]
    montant_estime: Optional[float]
    procedure: Optional[str]
    url_detail: Optional[str]
    texte_complet: Optional[str]
    resume_llm: Optional[str]
    resume_genere_le: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AppelOffreOut]

class ResumeResponse(BaseModel):
    id: int
    resume_llm: str
    resume_genere_le: Optional[datetime]

# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/scrape")
def trigger_scrape(db: Session = Depends(get_db)):
    result = run_scraper(db)
    return result

@app.get("/api/appels-offre", response_model=PaginatedResponse)
def list_appels_offre(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    type_marche: Optional[str] = None,
    acheteur: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    sort_by: str = "date_publication",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
):
    q = db.query(AppelOffre)

    if search:
        like = f"%{search}%"
        q = q.filter(
            (AppelOffre.titre.ilike(like)) | (AppelOffre.acheteur.ilike(like))
        )
    if type_marche:
        q = q.filter(AppelOffre.type_marche == type_marche)
    if acheteur:
        q = q.filter(AppelOffre.acheteur == acheteur)
    if annee:
        q = q.filter(extract("year", AppelOffre.date_publication) == annee)
    if mois:
        q = q.filter(extract("month", AppelOffre.date_publication) == mois)

    total = q.count()

    sortable = {
        "date_publication": AppelOffre.date_publication,
        "date_limite": AppelOffre.date_limite,
        "titre": AppelOffre.titre,
        "acheteur": AppelOffre.acheteur,
        "montant_estime": AppelOffre.montant_estime,
        "type_marche": AppelOffre.type_marche,
    }
    col = sortable.get(sort_by, AppelOffre.date_publication)
    q = q.order_by(desc(col) if sort_dir == "desc" else col)
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(total=total, page=page, page_size=page_size, items=items)

@app.get("/api/appels-offre/export")
def export_appels_offre(
    search: Optional[str] = None,
    type_marche: Optional[str] = None,
    acheteur: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    sort_by: str = "date_publication",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
):
    q = db.query(AppelOffre)
    if search:
        like = f"%{search}%"
        q = q.filter((AppelOffre.titre.ilike(like)) | (AppelOffre.acheteur.ilike(like)))
    if type_marche:
        q = q.filter(AppelOffre.type_marche == type_marche)
    if acheteur:
        q = q.filter(AppelOffre.acheteur == acheteur)
    if annee:
        q = q.filter(extract("year", AppelOffre.date_publication) == annee)
    if mois:
        q = q.filter(extract("month", AppelOffre.date_publication) == mois)

    sortable = {
        "date_publication": AppelOffre.date_publication,
        "date_limite": AppelOffre.date_limite,
        "titre": AppelOffre.titre,
        "acheteur": AppelOffre.acheteur,
        "montant_estime": AppelOffre.montant_estime,
        "type_marche": AppelOffre.type_marche,
    }
    col = sortable.get(sort_by, AppelOffre.date_publication)
    items = q.order_by(desc(col) if sort_dir == "desc" else col).all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_ALL)
        writer.writerow([
            "id", "id_annonce", "titre", "objet_marche", "acheteur",
            "date_publication", "date_limite", "type_marche",
            "montant_estime", "procedure", "url_detail", "resume_llm"
        ])
        yield buf.getvalue()
        for ao in items:
            buf = io.StringIO()
            writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_ALL)
            writer.writerow([
                ao.id, ao.id_annonce, ao.titre, ao.objet_marche, ao.acheteur,
                ao.date_publication.isoformat() if ao.date_publication else "",
                ao.date_limite.isoformat() if ao.date_limite else "",
                ao.type_marche, ao.montant_estime, ao.procedure,
                ao.url_detail, ao.resume_llm or "",
            ])
            yield buf.getvalue()

    filename = f"appels_offre_guyane_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@app.get("/api/appels-offre/{ao_id}", response_model=AppelOffreOut)
def get_appel_offre(ao_id: int, db: Session = Depends(get_db)):
    ao = db.query(AppelOffre).filter(AppelOffre.id == ao_id).first()
    if not ao:
        raise HTTPException(status_code=404, detail="Appel d'offre non trouvé")
    return ao

@app.post("/api/appels-offre/{ao_id}/resume", response_model=ResumeResponse)
def generate_resume(ao_id: int, db: Session = Depends(get_db)):
    try:
        resume = get_or_generate_resume(ao_id, db)
        ao = db.query(AppelOffre).filter(AppelOffre.id == ao_id).first()
        return ResumeResponse(id=ao_id, resume_llm=resume, resume_genere_le=ao.resume_genere_le)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating resume for {ao_id}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du résumé")

VILLES_GUYANE = [
    "Cayenne", "Saint-Laurent-du-Maroni", "Kourou", "Matoury", "Rémire-Montjoly",
    "Remire-Montjoly", "Maripasoula", "Mana", "Apatou", "Saint-Georges",
    "Sinnamary", "Iracoubo", "Grand-Santi", "Roura", "Montsinéry-Tonnegrande",
    "Montsinery", "Papaïchton", "Papaichton", "Camopi", "Awala-Yalimapo",
    "Awala", "Saül", "Saul", "Saint-Élie", "Saint-Elie", "Régina", "Regina",
    "Ouanary", "Maripa-Soula",
]

@app.get("/api/stats/par-ville")
def get_stats_par_ville(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    aos = db.query(AppelOffre).filter(
        (AppelOffre.date_limite >= now) | (AppelOffre.date_limite.is_(None))
    ).all()

    result: dict = {}
    for ao in aos:
        texte = " ".join(filter(None, [ao.acheteur, ao.titre, ao.objet_marche, ao.texte_complet or ""]))
        texte_lower = texte.lower()
        matched = None
        for ville in VILLES_GUYANE:
            if ville.lower() in texte_lower:
                # Normalise le nom
                matched = ville.replace("Remire-Montjoly", "Rémire-Montjoly") \
                               .replace("Papaichton", "Papaïchton") \
                               .replace("Saul", "Saül") \
                               .replace("Saint-Elie", "Saint-Élie") \
                               .replace("Maripa-Soula", "Maripasoula") \
                               .replace("Montsinery", "Montsinéry-Tonnegrande") \
                               .replace("Regina", "Régina") \
                               .replace("Awala", "Awala-Yalimapo")
                break
        if not matched:
            matched = "Non localisé"
        if matched not in result:
            result[matched] = {"ville": matched, "count": 0, "montant_total": 0.0, "acheteurs": set()}
        result[matched]["count"] += 1
        result[matched]["montant_total"] += ao.montant_estime or 0
        if ao.acheteur:
            result[matched]["acheteurs"].add(ao.acheteur)

    return [
        {
            "ville": v["ville"],
            "count": v["count"],
            "montant_total": round(v["montant_total"]),
            "acheteurs": list(v["acheteurs"])[:5],
        }
        for v in sorted(result.values(), key=lambda x: -x["count"])
        if v["ville"] != "Non localisé"
    ]

def _apply_filters(q, type_marche=None, acheteur=None, mois=None, annee=None):
    if type_marche:
        q = q.filter(AppelOffre.type_marche == type_marche)
    if acheteur:
        q = q.filter(AppelOffre.acheteur == acheteur)
    if annee:
        q = q.filter(extract("year", AppelOffre.date_publication) == annee)
    if mois:
        q = q.filter(extract("month", AppelOffre.date_publication) == mois)
    return q

@app.get("/api/stats/kpi")
def get_kpi(
    type_marche: Optional[str] = None,
    acheteur: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    q = _apply_filters(db.query(AppelOffre), type_marche, acheteur, mois, annee)
    total = q.count()

    now = datetime.utcnow()
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ao_mois = _apply_filters(
        db.query(AppelOffre).filter(AppelOffre.date_publication >= first_day),
        type_marche, acheteur
    ).count()

    montant_total = q.with_entities(func.sum(AppelOffre.montant_estime)).scalar() or 0

    aos_with_dates = q.filter(
        AppelOffre.date_publication.isnot(None),
        AppelOffre.date_limite.isnot(None)
    ).all()

    if aos_with_dates:
        deltas = [
            (ao.date_limite - ao.date_publication).days
            for ao in aos_with_dates
            if ao.date_limite > ao.date_publication
        ]
        delai_moyen = round(sum(deltas) / len(deltas)) if deltas else 0
    else:
        delai_moyen = 0

    return {"total": total, "ao_mois": ao_mois, "montant_total": montant_total, "delai_moyen": delai_moyen}

@app.get("/api/stats/par-mois")
def get_stats_par_mois(
    type_marche: Optional[str] = None,
    acheteur: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        db.query(
            extract("year", AppelOffre.date_publication).label("annee"),
            extract("month", AppelOffre.date_publication).label("mois"),
            func.count(AppelOffre.id).label("count"),
        ).filter(AppelOffre.date_publication.isnot(None)),
        type_marche, acheteur, mois, annee
    )
    rows = q.group_by("annee", "mois").order_by("annee", "mois").all()
    return [{"annee": int(r.annee), "mois": int(r.mois), "count": r.count} for r in rows]

@app.get("/api/stats/par-type")
def get_stats_par_type(
    acheteur: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        db.query(AppelOffre.type_marche, func.count(AppelOffre.id).label("count")),
        None, acheteur, mois, annee
    )
    rows = q.group_by(AppelOffre.type_marche).all()
    return [{"type_marche": r.type_marche or "Autre", "count": r.count} for r in rows]

@app.get("/api/stats/top-acheteurs")
def get_top_acheteurs(
    type_marche: Optional[str] = None,
    mois: Optional[int] = Query(None, ge=1, le=12),
    annee: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        db.query(AppelOffre.acheteur, func.count(AppelOffre.id).label("count"))
        .filter(AppelOffre.acheteur.isnot(None)),
        type_marche, None, mois, annee
    )
    rows = q.group_by(AppelOffre.acheteur).order_by(desc("count")).limit(10).all()
    return [{"acheteur": r.acheteur, "count": r.count} for r in rows]

ANALYSE_SYSTEM_PROMPT = """Tu es un expert en marchés publics français.
À partir de l'appel d'offre fourni, extrais uniquement les informations
explicitement présentes dans le document et retourne un JSON structuré.

Format de réponse obligatoire :
{
  "id_operation": "...",
  "designation": "...",
  "maitre_ouvrage": "...",
  "description": "...",
  "localite": "...",
  "type_travaux": "...",
  "secteur": "...",
  "numero_log": "...",
  "procedure": "...",
  "ao_date_prevue": "...",
  "ao_date_reelle": "...",
  "statut": "...",
  "resultat_marche_date_prevue": "...",
  "contact": "...",
  "email": "...",
  "telephone": "...",
  "lots": [
    {
      "numero": "LOT 1",
      "intitule": "...",
      "code_ape": "...",
      "montant_previsionnel": "...",
      "surface_plancher": "...",
      "corps_metier": "...",
      "materiel": "...",
      "estimation_basse": "...",
      "estimation_haute": "..."
    }
  ]
}

Règles strictes :
- Si une information est absente du document, mets exactement "Non dispo*"
- Ne jamais inventer, estimer ou déduire une information
- Retourne uniquement le JSON brut, sans texte autour, sans balises markdown"""

class AnalyseRequest(BaseModel):
    ao_brut: str

@app.post("/api/analyser-ao")
def analyser_ao(body: AnalyseRequest):
    import json
    from anthropic import Anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY non configurée")

    client = Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system=ANALYSE_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": body.ao_brut[:8000]}],
        )
        raw = response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur API Anthropic: {str(e)}")

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail=f"Claude n'a pas retourné un JSON valide : {raw[:200]}"
        )

    return result

@app.get("/api/indices")
def get_indices_route(
    series: Optional[str] = None,
    db: Session = Depends(get_db),
):
    ids = series.split(",") if series else None
    return get_indices(db, ids)

@app.post("/api/indices/sync")
def sync_indices_route(db: Session = Depends(get_db)):
    try:
        result = sync_indices(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/indices/series")
def list_series():
    return [{"id": k, "nom": v} for k, v in SERIES_BTP.items()]

@app.get("/api/acheteurs")
def get_acheteurs(db: Session = Depends(get_db)):
    rows = db.query(AppelOffre.acheteur).filter(
        AppelOffre.acheteur.isnot(None)
    ).distinct().order_by(AppelOffre.acheteur).all()
    return [r.acheteur for r in rows]
