# AgentFlow

Mini n8n orienté agents IA - Plateforme de workflow automation avec agents IA intégrés.

## 📁 Structure du projet

```
.
├── backend/              # Backend FastAPI (Python 3.11+)
│   ├── src/             # Code source Python
│   │   ├── api/         # Routes API
│   │   ├── auth/        # Authentification FastAPI-Users
│   │   ├── db/          # Modèles SQLAlchemy
│   │   ├── engine/      # Moteur d'exécution des workflows
│   │   ├── nodes/       # Définitions des nœuds
│   │   ├── credentials/ # Gestion des credentials chiffrés
│   │   └── lib/         # Utilitaires
│   ├── data/            # Base de données SQLite
│   └── .env             # Configuration backend
│
├── frontend/            # Frontend React + TypeScript
│   ├── src/             # Code source React
│   │   ├── features/    # Fonctionnalités par domaine
│   │   ├── components/  # Composants UI réutilisables
│   │   ├── stores/      # Stores Zustand
│   │   └── lib/         # Utilitaires frontend
│   ├── shared/          # Types et schémas partagés (intégrés)
│   │   └── src/         # Types TypeScript + Zod
│   └── package.json     # Dépendances frontend
│
├── .kiro/               # Configuration Kiro
│   ├── specs/           # Spécifications du projet
│   └── steering/        # Guides d'implémentation
│
├── package.json         # Scripts racine du monorepo
├── pnpm-workspace.yaml  # Configuration workspace pnpm
└── tsconfig.base.json   # Configuration TypeScript partagée
```

## 🚀 Démarrage rapide

### Prérequis

- Node.js >= 22.0.0
- Python >= 3.11
- pnpm

### Installation

```bash
# Installer les dépendances
pnpm install

# Configuration backend
cd backend
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\activate sur Windows
pip install -e .

# Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos valeurs
```

### Développement

```bash
# Démarrer frontend et backend en parallèle
pnpm dev

# Ou séparément :
# Frontend (http://localhost:5173)
cd frontend && pnpm dev

# Backend (http://localhost:8000)
cd backend && python -m uvicorn src.main:app --reload
```

### Scripts disponibles

```bash
pnpm dev          # Démarrer frontend + backend
pnpm build        # Build du frontend
pnpm typecheck    # Vérification TypeScript
pnpm lint         # Linting TypeScript + Python
pnpm test         # Tests frontend + backend
pnpm db:migrate   # Appliquer les migrations
pnpm db:generate  # Générer une migration
```

## 🏗️ Stack technique

### Frontend
- **Framework** : React 18 + Vite
- **Router** : React Router v6
- **State** : Zustand + TanStack Query
- **UI** : Tailwind CSS + shadcn/ui
- **Canvas** : React Flow (@xyflow/react v12)
- **Validation** : Zod
- **Forms** : React Hook Form

### Backend
- **Framework** : FastAPI
- **ORM** : SQLAlchemy
- **Database** : SQLite (avec possibilité PostgreSQL)
- **Auth** : FastAPI-Users (JWT + sessions)
- **Migrations** : Alembic
- **Validation** : Pydantic

### Types partagés
- Situés dans `frontend/shared/src/`
- Schémas Zod pour validation runtime
- Types TypeScript pour type-safety
- Accessibles via `@shared/*` dans le frontend

## 📚 Documentation

La documentation complète est disponible dans `.kiro/steering/` :

- `product.md` - Vision et périmètre produit
- `tech.md` - Stack technique et conventions
- `structure.md` - Architecture du code
- `node-contract.md` - Format des workflows et nœuds
- `execution-engine.md` - Moteur d'exécution
- `triggers-integrations.md` - Triggers et intégrations
- `agents-ai.md` - Système d'agents IA

## 🔐 Sécurité

- Credentials chiffrés avec AES-256-GCM
- Isolation stricte par utilisateur
- Protection SSRF sur les requêtes HTTP
- Rate limiting sur les routes d'authentification
- Cookies sécurisés (httpOnly, sameSite, secure)

## 📝 License

MIT
