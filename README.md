# Overwatch — Marchés publics Guyane

Application de veille des marchés publics du département 973 (Guyane).
Collecte automatique depuis le BOAMP, analyse IA, carte interactive, indices BTP INSEE.

---

## Liens rapides

| Environnement | URL |
|---------------|-----|
| **Frontend local** | http://localhost:3000 |
| **Backend local (API)** | http://localhost:8000 |
| **Docs API locale** | http://localhost:8000/docs |
| **Frontend prod (Vercel)** | https://appels-offre-guyane-54d9ja4do-armshivbs-projects.vercel.app |
| **Backend prod (Railway)** | https://appels-offre-guyane-production.up.railway.app |

---

## Lancement en local

### Étape 1 — Backend (terminal 1)

```bash
cd C:/Users/armon/appels-offre-guyane/backend
source venv/Scripts/activate
uvicorn main:app --reload
```

> Le backend tourne sur **http://localhost:8000**
> Laissez ce terminal ouvert.

### Étape 2 — Frontend (terminal 2)

```bash
cd C:/Users/armon/appels-offre-guyane/frontend
npm run dev
```

> Le frontend tourne sur **http://localhost:3000**
> Ouvrez ce lien dans votre navigateur.

### Étape 3 — Première collecte de données

Une fois les deux serveurs lancés, cliquez sur **"Actualiser les données"** dans le menu latéral.
Ou via curl :
```bash
curl -X POST http://localhost:8000/api/scrape
```

### Étape 4 — Synchroniser les indices INSEE (facultatif)

Allez sur la page **Indices BTP** → cliquez **"Sync INSEE"**.
Ou via curl :
```bash
curl -X POST http://localhost:8000/api/indices/sync
```

---

## Déploiement (production)

Chaque `git push` sur `main` redéploie automatiquement :
- **Vercel** → frontend
- **Railway** → backend

```bash
cd C:/Users/armon/appels-offre-guyane
git add .
git commit -m "Description des changements"
git push
```

---

## Pages de l'application

| Page | URL locale | Description |
|------|-----------|-------------|
| Tableau de bord | http://localhost:3000/ | KPIs, graphiques, carte Guyane |
| Récapitulatif | http://localhost:3000/recap | Tableau de tous les AO avec filtres |
| Analyse des AO | http://localhost:3000/analyser | Tableau structuré par AO |
| Analyse des marchés | http://localhost:3000/marches | Matrice AO × corps de métier |
| Indices BTP | http://localhost:3000/indices | Tendances indices INSEE depuis 2020 |
| Détail AO | http://localhost:3000/appels-offre/[id] | Fiche détaillée d'un AO |

---

## Structure du projet

```
appels-offre-guyane/
├── backend/
│   ├── main.py         Routes API FastAPI
│   ├── models.py       Modèles base de données (SQLAlchemy)
│   ├── scraper.py      Collecte BOAMP
│   ├── insee.py        Collecte indices BTP INSEE
│   ├── llm.py          Résumés IA (Claude Anthropic)
│   ├── scheduler.py    Tâche automatique quotidienne (06h00)
│   ├── database.py     Connexion DB (SQLite local / PostgreSQL prod)
│   ├── requirements.txt
│   ├── nixpacks.toml   Config build Railway
│   └── .env.example    Variables d'environnement (modèle)
└── frontend/
    ├── app/            Pages Next.js (App Router)
    ├── components/     Composants réutilisables
    ├── lib/api.ts      Client API
    └── .env.example    Variables d'environnement (modèle)
```

---

## Variables d'environnement

### Backend — `backend/.env`

```env
ANTHROPIC_API_KEY=sk-ant-XXXXXXXX   # Clé API Anthropic (résumés IA)
DATABASE_URL=sqlite:///./appels_offre.db   # SQLite en local
ALLOWED_ORIGINS=http://localhost:3000      # CORS
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # URL du backend
```

### Production (Railway — variables déjà configurées)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (référence auto Railway) |
| `ANTHROPIC_API_KEY` | Ta clé Anthropic |
| `ALLOWED_ORIGINS` | URL Vercel du frontend |

---

## Dépannage

### "Backend inaccessible" sur le site
→ Lancer `uvicorn main:app --reload` dans `backend/`
→ Vérifier que le `.env` contient bien `ANTHROPIC_API_KEY`

### Données à zéro
→ Cliquer **"Actualiser les données"** dans le menu

### Erreur de port déjà utilisé
```bash
# Trouver et tuer le process sur le port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Forcer un redéploiement Vercel sans changer le code
→ Vercel → Deployments → 3 points → Redeploy → décocher "Use cache"
