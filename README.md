# Appels d'offre Guyane

Application de veille des marchés publics publiés pour le département de la Guyane (973) sur le BOAMP.

## Fonctionnalités

- Collecte automatique quotidienne via l'API BOAMP
- Tableau de bord avec KPIs et graphiques interactifs
- Liste complète avec tri, filtres et pagination
- Résumés IA des annonces (via Claude d'Anthropic)

## Prérequis

- Python 3.11+
- Node.js 20+
- Une clé API Anthropic

## Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Éditez .env et renseignez votre ANTHROPIC_API_KEY
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Lancement

### Backend (port 8000)

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Frontend (port 3000)

```bash
cd frontend
npm run dev
```

### Première collecte des données

Une fois le backend démarré, cliquez sur **Actualiser** dans la navbar, ou appelez :

```bash
curl -X POST http://localhost:8000/api/scrape
```

## Structure

```
appels-offre-guyane/
├── backend/          # FastAPI + SQLite
│   ├── main.py       # Routes API
│   ├── models.py     # Modèles SQLAlchemy
│   ├── scraper.py    # Collecte BOAMP
│   ├── llm.py        # Résumés Claude
│   └── scheduler.py  # Tâche quotidienne
└── frontend/         # Next.js 15
    ├── app/          # Pages (Dashboard, Liste, Détail)
    ├── components/   # Composants réutilisables
    └── lib/api.ts    # Client API
```

## Variables d'environnement

### Backend `.env`

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (obligatoire pour les résumés) |
| `DATABASE_URL` | URL SQLite ou PostgreSQL (défaut: `sqlite:///./appels_offre.db`) |

### Frontend `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL du backend (défaut: `http://localhost:8000`) |
