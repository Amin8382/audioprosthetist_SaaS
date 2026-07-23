# Odyio — Plateforme de Gestion pour Audioprothésiste

SaaS mono-clinique de gestion complète pour cabinet d'audioprothésiste en Tunisie. Couvre le cycle de vie complet du patient : consultation, vente d'appareils auditifs, facturation, suivi CNAM, gestion de stock, trésorerie et marketplace B2B.

---

## Architecture

```
audioprosthetist_SaaS/
├── apps/
│   ├── odyio_cnam/          # App Frappe principale — config, workspace, print formats
│   └── odyio_noah/          # App Frappe — sync Noah ES (phase 3)
├── odyio-frontend/          # React + Vite + Tailwind — UI custom
├── archive/                 # Ancien codebase Spring Boot/React (référence)
├── setup/                   # Scripts d'installation WSL2 + bench
├── PROJECT_LOG.md           # Journal de développement détaillé
└── README.md
```

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    Bureau / Navigateur                   │
│              http://odyio.localhost:5173                  │
│                                                         │
│    ┌───────────────────────────────────────────────┐    │
│    │       React + Vite + Tailwind (UI custom)     │    │
│    │   Login, Dashboard, Clients, Ventes, CNAM     │    │
│    │   Stocks, Fournisseurs, Trésorerie, Settings  │    │
│    └───────────────────┬───────────────────────────┘    │
│                        │ REST API                       │
│    ┌───────────────────▼───────────────────────────┐    │
│    │           Frappe Framework (Python)           │    │
│    │    DocTypes, Controllers, Hooks, Whitelisted   │    │
│    │    /api/resource/...  +  /api/method/...      │    │
│    └──────┬──────────────────────────┬─────────────┘    │
│           │                          │                  │
│  ┌────────▼────────┐      ┌─────────▼──────────┐      │
│  │   PostgreSQL     │      │      Redis          │      │
│  │   (données)      │      │  (cache, queue)     │      │
│  └─────────────────┘      └────────────────────┘      │
│                                                         │
│    ┌───────────────────────────────────────────────┐    │
│    │     ERPNext v15 (modules standard)             │    │
│    │  Ventes, Achats, Stock, Comptabilité, RH      │    │
│    └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Stack technique

| Couche | Technologie | Rôle |
|--------|------------|------|
| **Framework** | Frappe Framework v15 | MVC complet — DocTypes, ORM, API REST |
| **ERP** | ERPNext v15 | Modules standards (ventes, achats, stock, comptabilité) |
| **Backend** | Python 3.12 | Controllers, hooks, API whitelisted |
| **Frontend** | React 18 + Vite + Tailwind | UI custom, SPA, routing, state management |
| **Base de données** | PostgreSQL 16 | Données (JSONB pour audiogrammes, schéma auto-généré) |
| **Cache / Queue** | Redis 7 | Cache, SocketIO, background jobs (RQ) |
| **OS** | WSL2 Ubuntu 24.04 | Environnement de développement |

### Pourquoi Frappe (et pas Spring Boot/React)

| Critère | Frappe/ERPNext | Spring Boot/React |
|---------|---------------|-------------------|
| Setup initial | `bench init` → 10 min | Docker Compose → 30 min |
| CRUD automatisé | DocType → formulaire + API auto | Code manuel par endpoint |
| UI desk | Intégrée (listes, formulaires, filtres) | React custom complet |
| Auth + rôles | Intégré (System Manager, User, Role) | JWT custom + tables |
| Print formats | Jinja2 templates, pas de LaTeX | Templates externes |
| Modules ERP | 30+ modules inclus (stock, achats, comptabilité) | Dev custom ou libs tierces |
| Déploiement | `bench update` | CI/CD Docker custom |

---

## Modules fonctionnels

### Phase 1 (en cours) — Configuration ERPNext + React Frontend

| Module | Odyio | ERPNext Standard | Statut |
|--------|-------|-----------------|--------|
| Patients / Clients | Customer + custom fields (CNAM, audiogramme, Noah) | Customer | Configuré |
| Ventes / Facturation | Sales Invoice, Delivery Note, Payment Entry | Standards | Configuré |
| Articles / Stock | Item, Item Group, Warehouse, Stock Entry | Standards | Configuré |
| Achats / Fournisseurs | Supplier, Purchase Order, Purchase Invoice | Standards | Configuré |
| Trésorerie | Journal Entry, Account, Bank Account | Standards | Configuré |
| Rapports | General Ledger, AR, AP, Stock Balance, Gross Profit | Standards | Configuré |
| Configuration | Company, Fiscal Year, User, Role, Print Format | Standards | Configuré |
| React Frontend | Vite + Tailwind + REST API | — | Fonctionnel |

**Print formats personnalisés :**
- `Odyio BL` — Bon de livraison (Delivery Note)
- `Odyio Facture` — Facture client (Sales Invoice)

**Workspace :** `Odyio` — 8 cartes, 8 raccourcis, labels en français.

**React Frontend :**
- Login, Dashboard, layout responsive (Sidebar + Topbar)
- API clients (Frappe REST), Zustand stores
- Proxy Vite → Frappe backend

### Phase 2 (à venir) — CNAM

| Fonctionnalité | Description |
|----------------|-------------|
| CNAM Demande | DocType submittable — demande de prise en charge |
| CNAM Document | Child table — documents joints (ordonnance, audiogramme, devis) |
| CNAM API | Whitelisted methods pour workflow CNAM |

### Phase 3 (à venir) — Marketplace + Noah ES

| Fonctionnalité | Description |
|----------------|-------------|
| Marketplace B2B | Catalogue produits fournisseurs, panier multi-fournisseurs |
| Noah ES Sync | Bidirectional sync with Noah ES hearing aid fitting software |

---

## Installation

### Prérequis

- Windows 10/11 avec WSL2 activé
- Ubuntu 24.04 sur WSL2
- 8 Go RAM minimum (16 Go recommandé)
- Node.js 18+ (pour le frontend React)

### Configuration WSL2

```bash
# 1. Créer l'utilisateur odyio
sudo adduser odyio
sudo usermod -aG sudo odyio

# 2. Installer les dépendances système
sudo apt update && sudo apt install -y python3-dev python3-pip python3-venv \
    postgresql postgresql-contrib postgresql-client redis-server git curl build-essential

# 3. Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Installer Yarn
npm install -g yarn

# 5. Créer la base PostgreSQL
sudo -u postgres psql -c "CREATE USER odyio WITH PASSWORD 'odyio_password_here';"
sudo -u postgres psql -c "CREATE DATABASE odyio_db OWNER odyio;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE odyio_db TO odyio;"
sudo -u postgres psql -d odyio_db -c "GRANT ALL ON SCHEMA public TO odyio;"

# 6. Installer psycopg2-binary
sudo -u odyio pip install psycopg2-binary
```

### Initialiser le bench

```bash
# 1. Initialiser le bench Frappe v15
bench init odyio-bench-pg --frappe-branch version-15

# 2. Installer ERPNext
cd odyio-bench-pg
bench get-app erpnext --branch version-15

# 3. Créer le site PostgreSQL
bench new-site odyio.localhost \
  --db-type postgres \
  --db-name odyio_db \
  --db-password odyio_password_here \
  --db-root-username postgres \
  --db-root-password postgres \
  --admin-password admin

# 4. Installer ERPNext sur le site
bench --site odyio.localhost install-app erpnext

# 5. Installer les apps Odyio
bench get-app $URL_DU_REPO
bench --site odyio.localhost install-app odyio_cnam
bench --site odyio.localhost install-app odyio_noah

# 6. Configurer le workspace
bench --site odyio.localhost execute odyio_cnam.build_workspace.execute

# 7. Lancer le serveur Frappe
bench start
```

### Lancer le frontend React

```bash
cd odyio-frontend
npm install
npm run dev
# Accessible sur http://localhost:5173
```

### Accès

- **Frontend React :** http://localhost:5173
- **Frappe Desk :** http://odyio.localhost:8000
- **Admin :** `Administrator` / `admin`

---

## Custom DocTypes

| DocType | Type | Description |
|---------|------|-------------|
| CNAM Demande | Main (submittable) | Demande de prise en charge CNAM |
| CNAM Document | Child Table | Documents joints à une demande CNAM |

## Custom Fields (sur DocTypes ERPNext)

| DocType | Champ | Type | Description |
|---------|-------|------|-------------|
| Customer | `cnam_number` | Data | Numéro CNAM |
| Customer | `cnam_affiliation_type` | Select | Type d'affiliation CNAM |
| Customer | `cnam_expiry` | Date | Date d'expiration CNAM |
| Customer | `audiogram_left` | JSON | Audiogramme oreille gauche |
| Customer | `audiogram_right` | JSON | Audiogramme oreille droite |
| Customer | `ear_side` | Select | Latéralité (LEFT/RIGHT/BILATERAL) |
| Customer | `noah_patient_id` | Data | ID patient Noah ES |
| Customer | `noah_last_sync` | Datetime | Dernière synchronisation Noah |
| Customer | `noah_sync_status` | Select | Statut synchronisation Noah |
| Delivery Note | `bl_type` | Select | Type de bon de livraison |
| Sales Invoice | `custom_cnam_eligible` | Check | Éligibilité CNAM |

---

## Développement

### Structure d'une app Frappe

```
apps/odyio_cnam/
├── odyio_cnam/
│   ├── __init__.py
│   ├── hooks.py              # Configuration de l'app
│   ├── modules.txt           # Modules de l'app
│   ├── build_workspace.py    # Script de création du workspace
│   ├── commands.py           # Commandes CLI personnalisées
│   ├── config/               # Configuration du module
│   ├── templates/            # Templates Jinja2 (print formats)
│   ├── workspace/            # JSON du workspace
│   └── public/               # Assets JS/CSS
├── pyproject.toml            # Métadonnées Python
├── README.md
└── license.txt
```

### Structure du frontend React

```
odyio-frontend/
├── src/
│   ├── api/
│   │   └── frappe.js         # Client REST Frappe (login, CRUD, methods)
│   ├── stores/
│   │   ├── authStore.js      # Auth (Zustand + persist)
│   │   └── clientStore.js    # Client CRUD
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.jsx # Shell layout
│   │       ├── Sidebar.jsx   # Navigation latérale
│   │       └── Topbar.jsx    # Barre supérieure
│   ├── pages/
│   │   ├── Login.jsx         # Page de connexion
│   │   └── Dashboard.jsx     # Tableau de bord
│   ├── App.jsx               # Router + ProtectedRoute
│   ├── main.jsx              # Entry point
│   └── index.css             # Tailwind + custom styles
├── tailwind.config.js
├── vite.config.js            # Proxy /api → Frappe
└── .env                      # VITE_FRAPPE_URL, VITE_FRAPPE_SITE
```

### Commandes utiles

```bash
# Rebuild le workspace Odyio
bench --site odyio.localhost execute odyio_cnam.build_workspace.execute

# Vider le cache
bench --site odyio.localhost clear-cache

# Migrer après changements de DocType
bench --site odyio.localhost migrate

# Rebuild les assets JS/CSS
bench build

# Console Python (bench)
bench --site odyio.localhost console
```

---

## Journal de développement

Voir `PROJECT_LOG.md` pour le détail complet du développement (timestamps, commandes, débugage).

---

## License

MIT
