# Odyio — Plateforme de Gestion pour Audioprothésiste

SaaS mono-clinique de gestion complète pour cabinet d'audioprothésiste en Tunisie. Couvre le cycle de vie complet du patient : consultation, vente d'appareils auditifs, facturation, suivi CNAM, gestion de stock, trésorerie et marketplace B2B.

---

## Architecture

```
audioprosthetist_SaaS/
├── apps/
│   └── odyio_noah/          # App Frappe — sync Noah ES (phase 3)
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
| **Framework** | Frappe Framework v15 | MVC complet — DocTypes, ORM, API REST, UI Desk |
| **ERP** | ERPNext v15 | Modules standards (ventes, achats, stock, comptabilité) |
| **Backend** | Python 3.12 | Controllers, hooks, API whitelisted |
| **Frontend** | Frappe Desk (JS + Jinja2) | Desk SPA, formulaires, listes, workspace |
| **Base de données** | PostgreSQL 16 | Données (JSONB pour audiogrammes, schéma auto-généré) |
| **Cache / Queue** | Redis 7 | Cache, SocketIO, background jobs (RQ) |
| **OS** | WSL2 Ubuntu 24.04 | Environnement de développement |

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
bench --site odyio.localhost install-app odyio_noah

# 6. Lancer le serveur
bench start
```

### Accès

- **Desk :** http://odyio.localhost:8000
- **Admin :** `Administrator` / `admin`

---

---

## Développement

### Commandes utiles

```bash
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
