import os
import logging
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()
from anthropic import Anthropic
from sqlalchemy.orm import Session
from models import AppelOffre

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un assistant spécialisé dans les marchés publics en Guyane.
Tu résumes les appels d'offre de façon claire et accessible pour des entrepreneurs locaux
qui ne sont pas nécessairement juristes. Sois concis, factuel, et mets en avant
ce que l'entreprise candidate doit savoir : qui achète, quoi, pour quand, et combien."""

USER_PROMPT_TEMPLATE = """Voici un appel d'offre publié en Guyane. Résume-le en 3 phrases maximum,
en langage simple. Indique : 1) qui publie et ce qui est demandé,
2) le montant estimé et la procédure, 3) la date limite de remise des offres.

{texte_complet}"""

def generate_resume(texte_complet: str) -> str:
    if not texte_complet or not texte_complet.strip():
        return "Texte complet non disponible pour générer un résumé."

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY non configurée dans le fichier .env")

    logger.info(f"Calling Anthropic API with key starting with: {api_key[:15]}...")
    client = Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": USER_PROMPT_TEMPLATE.format(texte_complet=texte_complet[:4000])
        }]
    )
    return response.content[0].text

def get_or_generate_resume(ao_id: int, db: Session) -> str:
    ao = db.query(AppelOffre).filter(AppelOffre.id == ao_id).first()
    if not ao:
        raise ValueError(f"AppelOffre {ao_id} not found")

    if ao.resume_llm:
        return ao.resume_llm

    resume = generate_resume(ao.texte_complet or ao.objet_marche or ao.titre or "")
    ao.resume_llm = resume
    ao.resume_genere_le = datetime.utcnow()
    db.commit()
    return resume
