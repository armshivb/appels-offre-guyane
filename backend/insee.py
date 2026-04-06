import logging
import xml.etree.ElementTree as ET
from datetime import datetime
import httpx
from sqlalchemy.orm import Session
from models import IndiceInsee

logger = logging.getLogger(__name__)

# ── Séries BTP disponibles sur le BDM INSEE ──────────────────────────────────
# IDs confirmés publics (pas d'auth requise)
SERIES_BTP = {
    "001710986": "BT01 — Tous corps d'état",
    "001710950": "BT02 — Terrassements",
    "001710953": "BT07 — Ossature et charpentes métalliques",
    "001710960": "BT16b — Charpente bois",
    "001710955": "BT09 — Carrelage et revêtement céramique",
    "001710985": "BT53 — Étanchéité",
    "001710972": "BT38 — Plomberie sanitaire",
    "001710979": "BT47 — Électricité",
    "001710978": "BT46 — Peinture - revêtements muraux",
    "001710982": "BT50 — Rénovation tous corps d'état",
    "001711007": "TP01 — Travaux publics (tous)",
}

SDMX_NS = {
    "message": "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message",
    "ss":      "http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/structurespecific",
}

BASE_URL = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM"


def _fetch_serie(serie_id: str, start: str = "2020-01") -> list[dict]:
    url = f"{BASE_URL}/{serie_id}?startPeriod={start}"
    try:
        r = httpx.get(url, timeout=20, follow_redirects=True)
        r.raise_for_status()
    except Exception as e:
        logger.error(f"INSEE fetch error for {serie_id}: {e}")
        return []

    try:
        root = ET.fromstring(r.content)
    except ET.ParseError as e:
        logger.error(f"XML parse error for {serie_id}: {e}")
        return []

    observations = []
    # L'API INSEE renvoie parfois sans préfixe namespace, parfois avec
    # On cherche avec et sans préfixe
    obs_elements = root.findall(".//ss:Obs", SDMX_NS)
    if not obs_elements:
        obs_elements = root.findall(".//{http://www.sdmx.org/resources/sdmxml/schemas/v2_1/data/structurespecific}Obs")
    if not obs_elements:
        # Fallback : cherche sans namespace (cas réel de l'API INSEE)
        obs_elements = root.findall(".//Obs")

    for obs in obs_elements:
        periode = obs.get("TIME_PERIOD")
        valeur  = obs.get("OBS_VALUE")
        if periode and valeur:
            try:
                observations.append({"periode": periode, "valeur": float(valeur)})
            except ValueError:
                pass

    return sorted(observations, key=lambda x: x["periode"])


def sync_indices(db: Session) -> dict:
    """Fetch all BTP series from INSEE and upsert into DB."""
    total_new = 0
    total_updated = 0

    for serie_id, serie_nom in SERIES_BTP.items():
        observations = _fetch_serie(serie_id)
        logger.info(f"Serie {serie_id} ({serie_nom}): {len(observations)} observations")

        for obs in observations:
            existing = db.query(IndiceInsee).filter(
                IndiceInsee.serie_id == serie_id,
                IndiceInsee.periode  == obs["periode"],
            ).first()

            if existing:
                if existing.valeur != obs["valeur"]:
                    existing.valeur     = obs["valeur"]
                    existing.fetched_at = datetime.utcnow()
                    total_updated += 1
            else:
                db.add(IndiceInsee(
                    serie_id  = serie_id,
                    serie_nom = serie_nom,
                    periode   = obs["periode"],
                    valeur    = obs["valeur"],
                    fetched_at = datetime.utcnow(),
                ))
                total_new += 1

    db.commit()
    return {"new": total_new, "updated": total_updated, "series": len(SERIES_BTP)}


def get_indices(db: Session, series_ids: list[str] | None = None) -> list[dict]:
    """Return all stored indices grouped by serie."""
    q = db.query(IndiceInsee).order_by(IndiceInsee.serie_id, IndiceInsee.periode)
    if series_ids:
        q = q.filter(IndiceInsee.serie_id.in_(series_ids))

    rows = q.all()

    # Group by serie
    series: dict[str, dict] = {}
    for row in rows:
        if row.serie_id not in series:
            series[row.serie_id] = {
                "serie_id":  row.serie_id,
                "serie_nom": row.serie_nom,
                "data": [],
            }
        series[row.serie_id]["data"].append({
            "periode": row.periode,
            "valeur":  row.valeur,
        })

    return list(series.values())
