from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class AppelOffre(Base):
    __tablename__ = "appels_offre"

    id = Column(Integer, primary_key=True, index=True)
    id_annonce = Column(String, unique=True, index=True, nullable=False)
    titre = Column(String, nullable=True)
    objet_marche = Column(Text, nullable=True)
    acheteur = Column(String, nullable=True)
    date_publication = Column(DateTime, nullable=True)
    date_limite = Column(DateTime, nullable=True)
    type_marche = Column(String, nullable=True)
    montant_estime = Column(Float, nullable=True)
    procedure = Column(String, nullable=True)
    url_detail = Column(String, nullable=True)
    texte_complet = Column(Text, nullable=True)
    resume_llm = Column(Text, nullable=True)
    resume_genere_le = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
