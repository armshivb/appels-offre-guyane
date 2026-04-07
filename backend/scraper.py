import httpx
import json
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from models import AppelOffre

logger = logging.getLogger(__name__)

VILLES_DETECTION = [
    (["cayenne"],                                   "Cayenne"),
    (["saint-laurent-du-maroni", "saint laurent"],  "Saint-Laurent-du-Maroni"),
    (["kourou"],                                    "Kourou"),
    (["matoury"],                                   "Matoury"),
    (["rémire-montjoly", "remire-montjoly",
      "rémire", "remire"],                          "Rémire-Montjoly"),
    (["maripasoula", "maripa-soula"],               "Maripasoula"),
    (["mana"],                                      "Mana"),
    (["apatou"],                                    "Apatou"),
    (["saint-georges"],                             "Saint-Georges"),
    (["sinnamary"],                                 "Sinnamary"),
    (["iracoubo"],                                  "Iracoubo"),
    (["grand-santi"],                               "Grand-Santi"),
    (["roura"],                                     "Roura"),
    (["montsinéry", "montsinery"],                  "Montsinéry-Tonnegrande"),
    (["papaïchton", "papaichton"],                  "Papaïchton"),
    (["camopi"],                                    "Camopi"),
    (["awala-yalimapo", "awala"],                   "Awala-Yalimapo"),
    (["saül", "saul"],                              "Saül"),
    (["saint-élie", "saint-elie"],                  "Saint-Élie"),
    (["régina", "regina"],                          "Régina"),
    (["ouanary"],                                   "Ouanary"),
]

def detect_ville(acheteur: str = "", titre: str = "", objet: str = "", texte: str = "") -> Optional[str]:
    haystack = " ".join(filter(None, [acheteur, titre, objet, texte[:2000]])).lower()
    for aliases, canonical in VILLES_DETECTION:
        if any(a in haystack for a in aliases):
            return canonical
    return None

BOAMP_API_URL = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str[:19], fmt)
        except (ValueError, TypeError):
            continue
    return None


def _to_float(val) -> Optional[float]:
    """Convert a raw value to float, handling dict with '#text', strings with spaces/commas."""
    if val is None:
        return None
    # XML-style node: {"#text": "12000", "@DEVISE": "EUR"}
    if isinstance(val, dict):
        val = val.get("#text") or val.get("valeur") or val.get("VALEUR")
    if val is None:
        return None
    try:
        cleaned = str(val).strip().replace("\xa0", "").replace(" ", "").replace(",", ".")
        if not cleaned or cleaned == "-":
            return None
        f = float(cleaned)
        return f if f > 0 else None
    except (ValueError, TypeError):
        return None


# Keys that typically hold monetary amounts (both old uppercase and new camelCase formats)
_AMOUNT_KEYS = {
    "VALEUR_ESTIMEE", "valeurEstimee",
    "MONTANT_ESTIME", "montantEstime",
    "MONTANT_HT", "montantHT",
    "MONTANT_TTC", "montantTTC",
    "VALEUR",  # old format: {"@DEVISE": "EUR", "#text": "..."}
    "MONTANT",
}

# Keys whose *children* might contain amounts — recurse into them
_CONTAINER_KEYS = {
    "OBJET", "ATTRIBUTION", "MARCHE", "CONDITIONS_MARCHE",
    "FNSimple", "initial", "natureMarche", "lots", "lot",
    "VALEUR_GLOBALE", "ACCORD_CADRE",
}


def _search_montant(node, depth: int = 0) -> Optional[float]:
    """Recursively search a JSON node for the first non-zero monetary value."""
    if depth > 10 or node is None:
        return None

    if isinstance(node, list):
        for item in node:
            result = _search_montant(item, depth + 1)
            if result is not None:
                return result
        return None

    if not isinstance(node, dict):
        return None

    # 1. Check direct amount keys first
    for key in _AMOUNT_KEYS:
        if key in node:
            val = _to_float(node[key])
            if val is not None:
                return val

    # 2. Recurse into known container keys
    for key in _CONTAINER_KEYS:
        if key in node:
            result = _search_montant(node[key], depth + 1)
            if result is not None:
                return result

    return None


def parse_montant(donnees: dict) -> Optional[float]:
    """Extract estimated amount from the nested 'donnees' JSON field (handles old + new formats)."""
    if not donnees:
        return None

    # Priority paths (fastest, most reliable)
    priority_paths = [
        ["OBJET", "VALEUR_ESTIMEE"],
        ["OBJET", "VALEUR"],
        ["CONDITIONS_MARCHE", "VALEUR_ESTIMEE"],
        ["ATTRIBUTION", "MARCHE", "VALEUR"],
        ["FNSimple", "initial", "natureMarche", "valeurEstimee"],
    ]
    for path in priority_paths:
        node = donnees
        for key in path:
            node = node.get(key) if isinstance(node, dict) else None
        val = _to_float(node)
        if val is not None:
            return val

    # Fallback: recursive search across the whole structure
    return _search_montant(donnees)


def fetch_boamp_records(offset: int = 0, limit: int = 100, year: int = None) -> dict:
    where = "code_departement=973"
    if year:
        where += f" AND year(dateparution)={year}"
    params = {
        "where": where,
        "limit": limit,
        "offset": offset,
        "order_by": "dateparution desc",
    }
    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(BOAMP_API_URL, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching BOAMP records: {e}")
        return {"results": [], "total_count": 0}


def record_to_appel_offre(record: dict) -> dict:
    # Parse nested 'donnees' JSON string
    donnees = {}
    raw_donnees = record.get("donnees")
    if raw_donnees and isinstance(raw_donnees, str):
        try:
            donnees = json.loads(raw_donnees)
        except (json.JSONDecodeError, TypeError):
            donnees = {}
    elif isinstance(raw_donnees, dict):
        donnees = raw_donnees

    # type_marche: the API returns a list like ['SERVICES']
    type_marche_raw = record.get("type_marche") or []
    if isinstance(type_marche_raw, list):
        type_marche_raw = type_marche_raw[0] if type_marche_raw else ""
    type_marche_lower = type_marche_raw.lower()

    if "travaux" in type_marche_lower:
        type_marche = "Travaux"
    elif "fournitures" in type_marche_lower or "fourniture" in type_marche_lower:
        type_marche = "Fournitures"
    elif "services" in type_marche_lower or "service" in type_marche_lower:
        type_marche = "Services"
    else:
        type_marche = type_marche_raw or "Autre"

    id_ann = record.get("idweb") or record.get("id") or record.get("gestion")

    # Use the real url_avis field from the API
    url = record.get("url_avis") or (
        f"https://www.boamp.fr/pages/avis/?q=idweb:{id_ann}" if id_ann else None
    )

    # Build texte_complet: objet + raw donnees for LLM context
    texte_parts = []
    objet = record.get("objet", "")
    if objet:
        texte_parts.append(objet)
    if donnees:
        texte_parts.append(json.dumps(donnees, ensure_ascii=False)[:3000])
    texte_complet = "\n\n".join(texte_parts) if texte_parts else objet

    acheteur_val = record.get("nomacheteur", "")
    return {
        "id_annonce": str(id_ann) if id_ann else "",
        "titre": objet,
        "objet_marche": objet,
        "acheteur": acheteur_val,
        "date_publication": parse_date(record.get("dateparution")),
        "date_limite": parse_date(record.get("datelimitereponse")),
        "type_marche": type_marche,
        "montant_estime": parse_montant(donnees),
        "procedure": record.get("procedure_libelle") or record.get("soustype_procedure", ""),
        "url_detail": url,
        "texte_complet": texte_complet,
        "ville": detect_ville(acheteur_val, objet, objet, texte_complet or ""),
    }


def fetch_all_for_year(year: int, db: Session) -> tuple[int, int, int]:
    """Fetch all records for a given year, respecting the 10 000 offset limit."""
    new_count = skip_count = error_count = 0
    offset = 0
    limit = 100

    while True:
        data = fetch_boamp_records(offset=offset, limit=limit, year=year)
        records = data.get("results", [])
        if not records:
            break

        for record in records:
            try:
                ao_data = record_to_appel_offre(record)
                if not ao_data["id_annonce"]:
                    error_count += 1
                    continue
                existing = db.query(AppelOffre).filter(
                    AppelOffre.id_annonce == ao_data["id_annonce"]
                ).first()
                if existing:
                    skip_count += 1
                    continue
                db.add(AppelOffre(**ao_data))
                new_count += 1
            except Exception as e:
                logger.error(f"Error processing record: {e}")
                error_count += 1

        db.commit()
        total = data.get("total_count", 0)
        offset += limit
        if offset >= min(total, 9900) or len(records) < limit:
            break

    return new_count, skip_count, error_count


def run_scraper(db: Session) -> dict:
    """Fetch all records from BOAMP for department 973, year by year to bypass 10k offset limit."""
    new_count = skip_count = error_count = 0
    current_year = datetime.now().year

    logger.info("Starting BOAMP scraper for department 973 (Guyane) — year by year")

    # Collect from 2010 to current year
    for year in range(2010, current_year + 1):
        logger.info(f"Fetching year {year}...")
        n, s, e = fetch_all_for_year(year, db)
        new_count += n
        skip_count += s
        error_count += e

    logger.info(f"Scraper done: {new_count} new, {skip_count} skipped, {error_count} errors")
    return {"new": new_count, "skipped": skip_count, "errors": error_count}
