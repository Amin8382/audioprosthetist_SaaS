# Odyio — Plateforme de Gestion pour Audioprothésiste

SaaS mono-clinique de gestion complète pour cabinet d'audioprothésiste en Tunisie. Couvre le cycle de vie complet du patient : consultation, vente d'appareils auditifs, facturation, suivi CNAM, gestion de stock, trésorerie et marketplace B2B.

---

## Architecture

```
audioprosthetist_SaaS/
├── apps/
│   ├── odyio_cnam/          # App Frappe principale — config, workspace, print formats
│   └── odyio_noah/          # App Frappe — sync Noah ES (phase 3)
├── ai-service/              # FastAPI — microservice IA (prédiction CNAM, OCR)
├── archive/                 # Ancien codebase Spring Boot/React (référence)
├── setup/                   # Scripts d'installation WSL2 + bench
├── PROJECT_LOG.md           # Journal de développement détaillé
└── README.md
```

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    Bureau / Navigateur                   │
│              http://odyio.localhost:8000                 │
│                                                         │
│    ┌───────────────────────────────────────────────┐    │
│    │         Frappe Desk (UI monolithique)         │    │
│    │   Workspace "Odyio" — 8 modules, 8 raccourcis│    │
│    │   Formulaires, listes, rapports, print formats│    │
│    └───────────────────┬───────────────────────────┘    │
│                        │                                │
│    ┌───────────────────▼───────────────────────────┐    │
│    │           Frappe Framework (Python)           │    │
│    │    DocTypes, Controllers, Hooks, Whitelisted   │    │
│    └──────┬──────────────────────────┬─────────────┘    │
│           │                          │                  │
│  ┌────────▼────────┐      ┌─────────▼──────────┐      │
│  │    MariaDB       │      │      Redis          │      │
│  │   (données)      │      │  (cache, queue)     │      │
│  └─────────────────┘      └────────────────────┘      │
│                                                         │
│    ┌───────────────────────────────────────────────┐    │
│    │     ERPNext v15 (modules standard)             │    │
│    │  Ventes, Achats, Stock, Comptabilité, RH      │    │
│    └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Microservice IA (port 8001)                 │
│                                                         │
│    FastAPI — Docker                                    │
│    ├── POST /ai/predict-claim   (prédiction CNAM)      │
│    ├── POST /ai/extract-document (OCR documents)       │
│    └── GET  /health                                    │
└─────────────────────────────────────────────────────────┘
```

### Stack technique

| Couche | Technologie | Rôle |
|--------|------------|------|
| **Framework** | Frappe Framework v15 | MVC complet — DocTypes, ORM, API REST, UI Desk |
| **ERP** | ERPNext v15 | Modules standards (ventes, achats, stock, comptabilité) |
| **Backend** | Python 3.12 | Controllers, hooks, API whitelisted |
| **Frontend** | Frappe UI (JS + Jinja2) | Desk SPA, formulaires, listes, workspace |
| **Base de données** | MariaDB 10.11 | Données (schéma auto-généré par les DocTypes) |
| **Cache / Queue** | Redis 7 | Cache, SocketIO, background jobs (RQ) |
| **IA** | FastAPI (Python 3.11) | Microservice Docker — prédiction, OCR |
| **OS** | WSL2 Ubuntu 24.04 | Environnement de développement |
| **Build** | bench CLI + Webpack | Compilation assets JS/CSS |

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

### Phase 1 (en cours) — Configuration ERPNext

| Module | Odyio | ERPNext Standard | Statut |
|--------|-------|-----------------|--------|
| Patients / Clients | Customer + custom fields (CNAM, audiogramme, Noah) | Customer | Configuré |
| Ventes / Facturation | Sales Invoice, Delivery Note, Payment Entry | Standards | Configuré |
| Articles / Stock | Item, Item Group, Warehouse, Stock Entry | Standards | Configuré |
| Achats / Fournisseurs | Supplier, Purchase Order, Purchase Invoice | Standards | Configuré |
| Trésorerie | Journal Entry, Account, Bank Account | Standards | Configuré |
| Rapports | General Ledger, AR, AP, Stock Balance, Gross Profit | Standards | Configuré |
| Configuration | Company, Fiscal Year, User, Role, Print Format | Standards | Configuré |

**Print formats personnalisés :**
- `Odyio BL` — Bon de livraison (Delivery Note)
- `Odyio Facture` — Facture client (Sales Invoice)

**Workspace :** `Odyio` — 8 cartes, 8 raccourcis, labels en français.

### Phase 2 (à venir) — CNAM + IA

| Fonctionnalité | Description |
|----------------|-------------|
| CNAM Demande | DocType submittable — demande de prise en charge |
| CNAM Document | Child table — documents joints (ordonnance, audiogramme, devis) |
| Prédiction IA | FastAPI endpoint — probabilité d'approbation CNAM |
| Extraction OCR | FastAPI endpoint — extraction automatique de documents |

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

### Configuration WSL2

```bash
# 1. Créer l'utilisateur odyio
sudo adduser odyio
sudo usermod -aG sudo odyio

# 2. Installer les dépendances système
sudo apt update && sudo apt install -y python3-dev python3-pip python3-venv \
    mariadb-server redis-server git curl build-essential

# 3. Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Installer Yarn
npm install -g yarn
```

### Initialiser le bench

```bash
# 5. Initialiser le bench Frappe v15
sudo -u odyio bench init odyio-bench --frappe-branch version-15

# 6. Installer ERPNext
cd odyio-bench
sudo -u odyio bench get-app erpnext --branch version-15

# 7. Créer le site
sudo -u odyio bench new-site odyio.localhost --admin-password admin

# 8. Installer ERPNext sur le site
sudo -u odyio bench --site odyio.localhost install-app erpnext

# 9. Installer les apps Odyio
sudo -u odyio bench get-app $URL_DU_REPO --branch main
sudo -u odyio bench --site odyio.localhost install-app odyio_cnam
sudo -u odyio bench --site odyio.localhost install-app odyio_noah

# 10. Configurer le workspace
sudo -u odyio bench --site odyio.localhost execute odyio_cnam.build_workspace.execute

# 11. Lancer le serveur
sudo -u odyio bench start
```

### Accès

- **Desk :** http://odyio.localhost:8000
- **Admin :** `Administrator` / `admin`

### Lancer le microservice IA

```bash
cd ai-service
docker compose up -d
# Accessible sur http://localhost:8001
```

---

## Microservice IA

Le microservice FastAPI tourne en Docker sur le port 8001.

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/ai/predict-claim` | Prédire la probabilité d'approbation d'une demande CNAM |
| `POST` | `/ai/extract-document` | Extraire les données d'un document (OCR) |
| `GET` | `/health` | Health check |

### Exemple d'utilisation

```bash
curl -X POST http://localhost:8001/ai/predict-claim \
  -H "Content-Type: application/json" \
  -d '{
    "montant_demande": 1500,
    "montant_total_ttc": 2000,
    "taux_remboursement": 70,
    "cnam_affiliation_type": "CNAM_ACTIVE",
    "customer_name": "Ahmed Ben Ali"
  }'
```

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
