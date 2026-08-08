# Odyio — Progrès Récent (Juillet 2026)

## Résumé

Projet de SaaS de gestion pour cabinet d'audioprothésiste en Tunisie. Stack : Frappe/ERPNext v15 + PostgreSQL 16 + Redis 7 sur WSL2 Ubuntu 24.04. Toute l'UI est dans Frappe Desk (pas de frontend séparé).

Les 4 dernières semaines ont livré : un outil d'audiogramme clinique complet, la suppression du module CNAM, et le nettoyage du référentiel.

---

## 1. Outil Audiogramme Clinique (odea_audiometrie)

### Objectif

Remplacer la saisie texte par un canvas graphique interactif respectant les normes cliniques d'audiologie — directement dans Frappe Desk, sans bibliothèque externe.

### Format de données

```json
{
  "right": {
    "CA": { "250": 10, "500": 20, "1000": 40, "2000": 60, "4000": 80, "8000": 100 },
    "CO": { "500": 25, "1000": 45 }
  },
  "left": {
    "CA": {},
    "CO": {}
  }
}
```

CA = conduction aérienne (air), CO = conduction osseuse (bone).
Stocké dans PostgreSQL comme texte JSON dans le champ `audiogramme_json`.

### Architecture client-serveur

| Couche | Technologie | Rôle |
|--------|-------------|------|
| DocType schema | `audiogramme.json` | Définit la structure (patient, date, type, JSON, HTML field) |
| Contrôleur serveur | `audiogramme.py` (14 lignes) | `validate()` → remplit `patient_name` depuis Customer ; `before_save()` → enregistre `created_by` |
| Moteur canvas | `audiogramme.js` (273 lignes) | Canvas 2D pur, exécuté dans Frappe Desk |
| Styles | `audiometrie.css` (153 lignes) | Mise en page table, barre d'outils, légendes |

### Fonctionnalités du canvas

**Deux toiles côte à côte** — OD (droite, bleue) + OG (gauche, rouge) :
- `<table>` avec `table-layout: fixed` + `min-width: 720px` (contourne les contraintes de largeur de Frappe)

**Axes cliniques :**
- dB inversé : 0 dB en haut → 130 dB en bas, pas de 10
- Fréquences : 250, 500, 1000, 2000, 4000, 8000 Hz en haut
- Zone verte (0-20 dB) pour l'audition normale
- Ligne de référence 20 dB en tirets

**Mode CA (conduction aérienne) :** cercles bleus `#2563EB`, ligne continue
**Mode CO (conduction osseuse) :** crochets rouges `#DC2626` `[ ]`, ligne tiretée

**Interaction :** clic sur la toile → placement au point de grille le plus proche (tolérance 30px → pas de placement accidentel)
**Barre d'outils :** boutons CA/CO (toggle), Sauvegarder (sérialise + `frm.save()`), Effacer (confirmation + reset)

**Migration :** l'ancien format `{od: [{f: 1000, d: 40}], og: []}` est automatiquement converti au nouveau format au chargement.

### Correction clé — bug d'affichage

Le `display: flex` ne fonctionnait pas dans le champ HTML de Frappe — la largeur du formulaire forçait le passage en colonne unique. Solution : passage à `<table>` avec `table-layout: fixed`, `min-width: 720px !important`, enveloppe avec débordement scrollable.

---

## 2. Suppression complète du module CNAM (odea_cnam)

### Ce qui a été supprimé

25 fichiers, 1333 lignes supprimées :
- App Frappe complète `apps/odyio_cnam/`
- DocTypes « CNAM Demande », « CNAM Document »
- Print formats personnalisés (odyio_bl.html, odyio_facture.html, odyio_cnam_dossier.html)
- Script `build_workspace.py` (création du workspace Odyio avec 9 cartes, 9 raccourcis, 45 liens)
- Workspace JSON pré-généré
- Commandes CLI (création de print formats, dossiers CNAM)
- Configuration du module, hooks, patches

### Mise à jour de la documentation

- README.md : retrait de l'architecture CNAM, de la section Phase 2, de la table des DocTypes, des champs personnalisés CNAM, des étapes d'installation CNAM, de la section de développement
- `setup/create_custom_apps.sh` : retrait de la création et installation de odyio_cnam

### Pourquoi

Décision de recentrer le MVP sur l'audiométrie. Le CNAM sera réintégré ultérieurement comme fonctionnalité indépendante ou via un workflow ERPNext standard.

---

## 3. État actuel du dépôt

### Commits récents (chronologique inverse)

| Hash | Message | Fichiers |
|------|---------|----------|
| `2a3f2a6` | refactor: remove entire odyio_cnam module | 25 fichiers supprimés |
| `4374c94` | chore: ignore Redis dump.rdb | .gitignore |
| `8a9096f` | refactor: rewrite audiogramme with clinical dual-ear format | 2 fichiers (+314/-325) |
| `978ee9b` | feat: add odyio_audiometrie app with Audiogramme DocType | 15 fichiers (création) |

### Structure actuelle

```
audioprosthetist_SaaS/
├── apps/
│   └── odyio_noah/              # Placeholder — sync Noah ES (phase 3)
├── apps/odyio_audiometrie/      # App active — Audiogramme
│   ├── odyio_audiometrie/
│   │   ├── hooks.py             # app_name, app_include_css
│   │   ├── modules.txt          # "Audiometrie"
│   │   ├── audiometrie/
│   │   │   └── doctype/audiogramme/
│   │   │       ├── audiogramme.json  # Schéma (patient, date, JSON, HTML field)
│   │   │       ├── audiogramme.py    # Contrôleur serveur
│   │   │       └── audiogramme.js    # Moteur canvas (273 lignes, coeur)
│   │   └── public/
│   │       ├── css/audiometrie.css   # Styles (153 lignes)
│   │       └── js/audiometrie.js     # Point d'entrée (stub)
│   ├── pyproject.toml
│   └── setup.py
├── archive/                      # Ancien codebase (référence)
├── setup/
│   └── create_custom_apps.sh     # Script d'installation
└── README.md
```

---

## 4. Environnement de développement (WSL2)

### Configuration

| Composant | Valeur |
|-----------|--------|
| WSL distro | Ubuntu 24.04 |
| Bench | `/home/odyio/odyio-bench-pg` |
| Utilisateur bench | `odyio` |
| PostgreSQL | user `odyio`, db `odyio_db`, port 5432 |
| Redis | cache=6380, queue=6381, socketio=6382 |
| Site | `http://odyio.localhost:8000` |
| Admin | `admin@odyio.tn` / `Odyio@2025!` |
| Apps installées | frappe, erpnext, odyio_noah, odyio_audiometrie |

### Problèmes résolus

1. **Workspace invisible** → `Workspace.__init__()` dans `frappe/desk/desktop.py` filtre par `allowed_modules`. Solution : ajout du rôle « Workspace Manager » à l'utilisateur.
2. **Permission Customer refusée** → les permissions par défaut du DocType Customer n'incluent pas System Manager. Solution : ajout de tous les rôles ERP (Sales, Accounts, Stock, Purchase).
3. **Module CNAM supprimé** → le workspace était lié au module « Odyio CNAM ». Après suppression, le workspace n'est plus accessible — à reconstruire.

### Actions restantes sur le serveur

```bash
# Supprimer l'ancienne app CNAM du site
bench --site odyio.localhost remove-app odyio_cnam
bench remove-app odyio_cnam

# Réinstaller l'app audiometrie
bench --site odyio.localhost install-app odyio_audiometrie
bench --site odyio.localhost migrate
bench build
```

---

## 5. Prochaines étapes

### Court terme

1. **Reconstruire le workspace Odyio** — le workspace JSON était dans odyio_cnam, supprimé. Besoin de le recréer dans odyio_audiometrie ou via l'UI Frappe.
2. **Créer le rôle « Audiometriste »** — présent dans les permissions du DocType mais pas encore créé sur le serveur.
3. **Responsive design mobile** — les toiles sont 340×480 fixes. À 768px, passage en colonne unique (au lieu du scroll horizontal actuel).
4. **Ajouter les champs CNAM restants sur Customer** — `cnam_number`, `cnam_affiliation_type`, `cnam_expiry` (si besoin métier).

### Moyen terme

5. **Noah ES Sync (Phase 3)** — app `odyio_noah` existante mais vide. Synchronisation bidirectionnelle avec Noah ES.
6. **Marketplace B2B** — Catalogue produits fournisseurs, panier multi-fournisseurs.
7. **Rapports d'audiogramme** — impression PDF de l'audiogramme avec les courbes et les données patient.
8. **Tests** — tests unitaires Frappe pour le contrôleur serveur, tests d'intégration pour l'API REST.

---

## 6. Métriques clés

| Métrique | Valeur |
|----------|--------|
| Lignes de code JS (canvas) | 273 |
| Lignes de code CSS | 153 |
| Lignes de code Python (serveur) | 14 |
| Fichiers supprimés (CNAM) | 25 |
| Lignes supprimées (CNAM) | 1333 |
| Commits sur master | 11 |
| Branche | `master` — à jour avec `origin/master` |
| Dépôt | `https://github.com/Amin8382/audioprosthetist_SaaS` |

---

## 7. Captures d'écran / URLs

- **Formulaire Audiogramme :** `http://odyio.localhost:8000/app/audiogramme` → cliquer « Commencer l'audiogramme »
- **Workspace Odyio :** `http://odyio.localhost:8000/app/workspace/odyio` (nécessite reconstruction)
- **Admin Desk :** `http://odyio.localhost:8000` login `admin@odyio.tn` / `Odyio@2025!`
