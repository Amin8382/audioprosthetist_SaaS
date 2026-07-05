# Audiosoin ERP

**Plateforme de gestion complète pour cabinet d'audioprothésiste en Tunisie.**

Application ERP mono-clinique qui couvre l'ensemble du cycle de vie client : de la première consultation au suivi CNAM, en passant par la vente d'appareils auditifs, la facturation, la gestion de stock et la trésorerie.

---

## Architecture

```
audioprosthetist_SaaS/
├── backend/          # Spring Boot 3.2 / Java 21
├── frontend/         # React 18 + Tailwind CSS / Vite
├── ai-service/       # FastAPI / Python (service IA)
├── docker-compose.yml
└── .github/
```

### Stack technique

| Couche | Technologie |
|--------|------------|
| **Backend** | Spring Boot 3.2.5, Java 21, Maven |
| **Base de données** | PostgreSQL 16 (Docker, port 5444) |
| **Cache** | Redis 7 (Docker, port 6380) |
| **Migrations** | Flyway |
| **Auth** | JWT (access + refresh tokens) |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3 |
| **State** | Zustand + persist (localStorage) |
| **IA** | FastAPI (Python) — classification automatique des demandes CNAM |
| **Reverse proxy** | Nginx (production) |

---

## Modules fonctionnels

### 1. Authentification & Rôles
- JWT stateless, refresh token rotatif
- 4 rôles : **ADMIN**, **STAFF**, **DOCTOR**, **FOURNISSEUR**
- Inscription restreinte aux ADMIN

### 2. Clients (`/api/clients`)
- CRUD avec code auto-généré (`CLT-0001`)
- Informations CNAM (numéro, affiliation, expiration)
- Audiogrammes stockés en JSONB
- Historique des ventes, factures, demandes CNAM

### 3. Ventes / Bons de Livraison (`/api/bls`)
- BL avec lignes de vente, TVA 19%
- Workflow : **DRAFT → CONFIRMED → INVOICED**
- Confirmation = sortie de stock + mouvement
- Numérotation annuelle : `BL-{YEAR}-{SEQUENCE}`

### 4. Facturation (`/api/factures`)
- Création à partir de BLs confirmés
- Paiements multiples (ESPECES, VIREMENT, CHEQUE, BON_ACHAT_CNAM)
- Workflow : **EMISE → PARTIELLEMENT_PAYEE → PAYEE / ANNULEE**
- Trésorerie automatique : chaque paiement crée une RECETTE
- Numérotation annuelle : `FAC-{YEAR}-{SEQUENCE}`

### 5. Fournisseurs (`/api/fournisseurs`)
- Gestion des fournisseurs
- Bons de Commande (BC) : **DRAFT → ENVOYE → RECU → LIVRE → ANNULE**
- Réception BC = entrée en stock + mouvement + dépense trésorerie
- Tickets de réparation avec suivi SAV

### 6. Marketplace (B2B) (`/api/catalogue`, `/api/marketplace`)
- Catalogue produits géré par les fournisseurs
- Panier multi-fournisseurs → création d'un BC par fournisseur
- Réception automatique avec création de fiches de stock
- Portail fournisseur : catalogue + commandes reçues

### 7. Stock (`/api/stocks`)
- Articles avec référence, catégorie, TVA, seuil d'alerte
- Mouvements : ENTREE / SORTIE / RETOUR / REPARATION
- Alertes de stock minimum

### 8. Trésorerie (`/api/tresorerie`)
- Mouvements RECETTE / DEPENSE
- Bilan périodique, bordereau de caisse
- Catégories : PAIEMENT_FACTURE, ACHAT_STOCK, etc.

### 9. CNAM (`/api/cnam`)
- Demandes de prise en charge
- Délais légaux configurés dans `V1__init_schema.sql`
- Documents associés avec extraction automatique (IA)

### 10. Configuration
- Paramètres de la clinique (nom, adresse, TVA, préfixes documents)
- Gestion des utilisateurs (ADMIN uniquement)
- Séquenceurs annuels : BL, BC, FAC, CNAM

---

## Démarrage rapide

### Prérequis
- Java 21, Maven, Node.js 20+, Docker Desktop
- PostgreSQL 16 et Redis 7 sur Docker

### Lancer l'infrastructure
```bash
docker compose up -d postgres redis
```

### Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/audiosoin-backend-1.0.0-SNAPSHOT.jar --server.port=8081
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

### Compte admin par défaut
- Email : `admin@audiosoin.tn`
- Mot de passe : `admin123`

---

## Endpoints API

| Méthode | Endpoint | Rôle | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/login` | Tous | Connexion |
| POST | `/api/auth/register` | ADMIN | Créer un utilisateur |
| GET | `/api/clients` | STAFF+ | Liste clients |
| POST | `/api/bls` | STAFF+ | Créer un BL |
| POST | `/api/bls/{id}/confirm` | STAFF+ | Confirmer BL |
| POST | `/api/factures` | STAFF+ | Créer facture |
| POST | `/api/factures/{id}/paiement` | STAFF+ | Ajouter paiement |
| GET | `/api/catalogue` | Tous | Voir le catalogue |
| POST | `/api/catalogue` | STAFF, FOURNISSEUR | Ajouter produit |
| PUT | `/api/marketplace/commandes/{id}/livrer` | FOURNISSEUR | Marquer livré |
| GET | `/api/stocks` | STAFF+ | Liste des stocks |
| GET | `/api/tresorerie` | STAFF+ | Trésorerie |

Documentation Swagger : `http://localhost:8081/api/swagger-ui.html`

---

## Références

- [Spring Boot 3.2](https://spring.io/projects/spring-boot)
- [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [PostgreSQL 16](https://www.postgresql.org/)
- [Flyway](https://flywaydb.org/)
