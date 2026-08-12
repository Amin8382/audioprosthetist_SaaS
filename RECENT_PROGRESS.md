# Odyio — Progrès Récent (Août 2026)

## Résumé

Projet de SaaS de gestion pour cabinet d'audioprothésiste en Tunisie. Stack : Frappe/ERPNext v15 + PostgreSQL 16 + Redis 7 sur WSL2 Ubuntu 24.04. Toute l'UI est dans Frappe Desk (pas de frontend séparé).

Les dernières sessions ont livré : l'outil d'audiogramme clinique (point libre, gomme, déplacement, centrage plein écran), le module **odyio_noah** (intégration Noah Mobile REST API, déployé et testé) et la **filiation Patient ID = prénom + nom** (ID patient fondé sur le nom partout, recherche par combinaison nom + prénom).

---

## 1. Outil Audiogramme Clinique — évolutions (validées)

Suite aux retours utilisateur, l'outil a été finalisé :

- **Barre d'outils** : boutons `+ Point` / `Gomme` / `Effacer tout` / `Sauvegarder`
- **Placement libre** : clic pour poser un point n'importe où dans la grille (axe fréquence logarithmique continu), glisser pour déplacer un point existant
- **Gomme outil** : mode persistant — clic sur un point (survolé en rouge hachuré) pour le supprimer
- **Lecture hover** : ligne verticale + pastille `1000 Hz — 45 dB` (`readout-od`/`readout-og`, style `.ao-readout`)
- **Toiles agrandies** : 640×640, espace `.ao-gap` 12px, `min-width: 960px`
- **Centrage plein écran** : `fitWrap()` — `position: fixed`, `left: 50%`, `translateX(-50%)`, div spacer, repositionnement scroll/resize (contourne `overflow:hidden` de `.layout-main-section.frappe-card`)

Fichiers : `apps/odyio_audiometrie/.../audiogramme.js`, `public/css/audiometrie.css`.

---

## 2. Module odyio_noah — intégration Noah Mobile (déployé et testé)

### Architecture

| Fichier | Rôle |
|---------|------|
| `odyio_noah/doctype/noah_settings/` | Single — URL/clé API Noah Mobile + bouton « Tester la connexion » |
| `odyio_noah/doctype/noah_session/` | Historique des séances importées (autoname `noah_session_id`, permissions Sales) |
| `noah_mobile_client.py` | Client REST Bearer ; config : Noah Settings → `site_config.json` |
| `api.py` | Endpoints whitelistés `test_noah_connection`, `sync_from_noah`, `push_to_noah` |
| `public/js/customer_noah.js` | Boutons « Sync from Noah » / « Push to Noah », indicateur d'état, tableaux audiogramme |
| `install.py` + `patches/noah_custom_fields.py` | 7 champs custom Customer (idempotents) |
| `customer_controller.py` | Override du contrôleur Customer — `get_customer_name()` PostgreSQL-safe (ID patient = nom + prénom) |
| `patches/patient_naming.py` | `cust_master_name = "Customer Name"` + `search_fields` Customer (nom + prénom) |

### Champs personnalisés Customer

`noah_patient_id`, `noah_sync_status` (SYNCED/OUT_OF_SYNC/NEVER_SYNCED/SYNC_ERROR), `noah_last_sync`, `audiogram_left`, `audiogram_right`, `ear_side`, `dob`.

### Flux vérifié (mock Noah sur `:8843`)

1. `test_noah_connection` → succès (HTTP + console)
2. `push_to_noah` → création patient (firstName/lastName/dateOfBirth/phone/email), `noah_patient_id` renseigné, statut SYNCED
3. `sync_from_noah` → pull démographie + audiogramme (left/right, ear_side BILATERAL) + import sessions Noah Session (idempotent par `noah_session_id`)
4. Push audiogramme (JSON dicts PG) → succès

### Bugs corrigés en cours de route

1. **Patches.txt** : Frappe v15 exige un fichier de patch avec `def execute()` (`odyio_noah.patches.noah_custom_fields`), pas `module.function` nu
2. **Bug Frappe v15 + PostgreSQL** : `validate_link_filters` (`frappe/core/doctype/doctype/doctype.py`) fait `json.loads()` sur `link_filters` qui est déjà une liste (colonne `json`) → patche côté Frappe (accepte liste) — bloque sinon TOUTE création de Custom Field sur Customer
3. **`mobile_no`/`email_id` Customer** : champs `read_only` fetchés depuis le Contact primaire → `_sync_contact_info()` met à jour le Contact (avec gestion `is_primary` unique) + `frappe.db.set_value` après le `save()` (sinon TimestampMismatch)
4. **JSON fields PG** : `audiogram_left` revient en dict → `_to_dict()` partout
5. **`noah_mobile_url` `reqd`** retiré (fallback `site_config.json` possible sans erreur au save des Settings)
6. **Bug Frappe v15 + PostgreSQL (2)** : `get_valid_dict` (`frappe/model/base_document.py`) rejette toute valeur **liste** hors champ Table → sur PG, le champ JSON `link_filters` d'un DocType revient en liste et le `save()` d'un DocType standard (requis par le patch `patient_naming`) plantait sur « Value for Link Filters cannot be a list ». Patch Frappe : le contrôle « cannot be a list » ignore le fieldtype JSON, et les valeurs JSON dict **et** list sont sérialisées en `json.dumps` avant écriture (comme les dicts l'étaient déjà).
7. **Setup ERPNext incomplet à l'install d'origine** : l'install s'était faite pendant que le bug `link_filters` bloquait la création de Custom Fields → les champs install d'ERPNext manquaient (`Address.is_your_company_address`, `tax_category`, `Contact.is_billing_contact`, `Print Settings.compact_item_print`…, `Email Account.company`, `Communication.company`) et **aucun Address Template** n'existait → sauvegarde d'un Customer avec adresse plantait sur « No default Address Template found ». Corrigé via `patches/erpnext_setup_fields.py` (ré-exécute les fonctions idempotentes d'ERPNext + crée un Address Template « Tunisia »).

### Vérifications serveur

- `bench --site odyio.localhost migrate` OK (DocTypes + patch custom fields loggés dans Patch Log)
- `bench build` OK
- HTTP 200, endpoints whitelistés OK (session admin)
- `__js` du formulaire Customer contient `customer_noah.js` (vérifié via `frappe.desk.form.load.getdoctype`)

### Utilisation

```bash
# Config (priorité Noah Settings, puis site_config.json)
cd /home/odyio/odyio-bench-pg
nano sites/odyio.localhost/site_config.json   # noah_mobile_url, noah_mobile_api_key
# UI : Desk → Odyio Noah → Noah Settings → « Tester la connexion »
# Formulaire Customer → bouton « Noah » → Sync from Noah / Push to Noah
```

---

## 2bis. Patient ID = prénom + nom (recherche par combinaison nom + prénom)

Demande : l'ID patient sur **tous les modules** doit être une combinaison prénom + nom, et l'audioprothésiste doit pouvoir **rechercher par cette ID** en tapant une combinaison nom + prénom.

### Implémentation

1. **Nommage Customer = nom complet** : `cust_master_name = "Customer Name"` (global default, via Selling Settings). Le `name` du Customer devient `customer_name` (ex. `Amina Ben Salah`).
2. **Dédoublonnage PostgreSQL-safe** : le `get_customer_name()` d'ERPNext utilise du SQL MySQL (`SUBSTRING_INDEX`, `AS UNSIGNED`) qui plante sur PG → override `CustomerController.get_customer_name()` (`customer_controller.py`) qui ajoute ` - 2`, ` - 3`, … quand le nom exact existe déjà.
3. **Recherche par nom + prénom** : `customer_name` (+ `name`) ajoutés à `search_fields` du DocType Customer → les champs Link (Patient de l'audiogramme, Patient du Noah Session, OCR), la recherche globale Desk et la vue liste trouvent le patient en tapant une combinaison (« Amina Ben », « Ben Salah », « Trabelsi »…). `title_field` restait déjà `customer_name`.

### Vérifié (console + HTTP API)

- `Amina Ben Salah` (×2) → `Amina Ben Salah` puis `Amina Ben Salah - 2` ; `Karim Trabelsi` → `Karim Trabelsi`
- `search_link("Customer", "amina ben")` → `[Amina Ben Salah, Amina Ben Salah - 2]` ; `"trabelsi"` → `[Karim Trabelsi]`
- API REST : `POST /api/resource/Customer {"customer_name": "Test Alpha Beta"}` → `name: "Test Alpha Beta"` puis `"Test Alpha Beta - 2"` ; `GET search_link?txt=alpha bet` → les 2
- Patch `odyio_noah.patches.patient_naming` loggé (Patch Log) ; migrate exit 0 ; données de test nettoyées (6 customers + 1 session + 5 contacts mock)

**Remarque** : ce nommage s'applique à toute création de Customer (UI, API, import Noah) ; ERPNext demande un `customer_name` unique — les homonymes réels reçoivent ` - 2` automatiquement. Le champ `noah_patient_id` reste l'ID numérique Noah (utilisé pour les appels API) ; l'identité affichée/cherchée sur tous les modules est le nom + prénom.

---

## 2ter. Module patient au format cohérent (prénom + nom + civilité + NSS/NPI)

Demande : « mettre tout le module patient dans un certain format » — l'ID patient (= prénom + nom) doit être accompagné de la **civilité** (Mr/Mme/Mlle/Enf), du **prénom**, du **nom**, du **mobile**, de l'**adresse** et des **NSS / NPI** (N° de sécurité sociale / N° de pièce d'identité), tous dans le formulaire Customer, avec recherche par n'importe laquelle de ces valeurs.

### Implémentation

1. **Formulaire patient** : le Customer (filtre `Customer` = liste des patients partout) expose `salutation` (« Civilité »), `first_name` (« Prénom »), `last_name` (« Nom »), `mobile_no` (« Mobile »), `email_id` (« E-mail »), `customer_name` (« Nom complet (ID patient) »), + les nouveaux champs `nss` / `npi` après le nom. `nss`/`npi` sont créés par `setup_patient_format()` (`install.py`), patch `odyio_noah.patches.patient_format` (4e entrée `patches.txt`).
2. **Déverrouillage des champs standard** : `first_name`/`last_name`/`mobile_no`/`email_id` sont `read_only` côté ERPNext → 10 Property Setters passent leur fieldtype en `Data` + relabel FR. ⚠️ Le fieldtype seul ne suffit pas : le métadata DocType porte `fetch_from = customer_primary_contact.<field>` et `_validate_links()` (Frappe) re-écrase les valeurs depuis le Contact primaire **avant** `validate()` → l'override `CustomerController._validate_links()` neutralise le `fetch_from` des 4 champs pendant la validation des liens (méta partagée = `cached_property`/`frappe.get_meta`, restauré ensuite).
3. **Auto-rename à l'édition** : éditer prénom/nom d'un patient existant → `validate()` recalcule `customer_name` unique (suffixe ` - 2`…) + `_odyio_rename_to` → `on_update()` appelle `frappe.rename_doc("Customer", old, new, force=True, show_alert=False)` (pas de kwarg `ignore_permissions` dans cette version Frappe) → les liens dynamiques (Address, Contact, Noah Session) suivent. Garde `odyio_renaming` anti-récursion ; un save sans changement ne renomme pas.
4. **Synchro Contact** : les modifications d'identité (prénom/nom/mobile/e-mail) sont propagées au Contact primaire auto-créé (`_sync_primary_contact()`), qui reste cohérent après renommage.
5. **Civilité** : Link standard `Salutation`, seeds idempotents `Mr`/`Mme`/`Mlle`/`Enf` (table vide à l'install d'origine).
6. **Recherche** : `search_fields` Customer étendu → `customer_group, territory, mobile_no, primary_address, customer_name, name, first_name, last_name` ; la recherche Link/globale matche prénom seul, nom seul ou combinaison.
7. **`_seed_patient_defaults()`** : l'install d'origine n'ayant jamais fait le setup wizard, les Customer Groups (`Individual`/`Commercial`/`Government` + `All Customer Groups`) et Territories (`Tunisia`/`Rest Of The World` + `All Territories`) manquaient → recréation idempotente + Selling Settings (customer_group = Individual, territoire = All Territories). Sans ça : `LinkValidationError: Could not find Customer Group: Individual, Territory: All Territories` à la création de tout patient.
8. **Noah** : `api.py sync_from_noah` renseigne `first_name`/`last_name` (plus `customer_name` en bloc) ; `noah_mobile_client._patient_payload` utilise prénom/nom s'ils existent, sinon `_split_name(customer_name)` ; `customer_noah.js` recopie prénom + nom → `customer_name` à la saisie.

### Bugs Frappe rencontrés (cette version)

- `frappe.make_property_setter` attend un **dict d'args** (`TypeError ... unexpected keyword argument 'for_doctype'`) → `frappe.make_property_setter({...}, validate_fields_for_doctype=False)`.
- `frappe.rename_doc` n'accepte **pas** `ignore_permissions` ici : signature `rename_doc(doctype, old, new, force=False, merge=False, *, ignore_if_exists=False, show_alert=True, rebuild_search=True)`.
- `frappe.search_link` n'existe pas → `from frappe.desk.search import search_link`.

### Vérifié (console Frappe, données nettoyées ensuite)

- Création complète : `Amina Ben Salah` (Mme, mobile, nss, npi) + Contact primaire auto-créé (prénom/nom/mobile recopiés).
- Homonymes : `Amina Ben Salah - 2`. Recherche : `search_link("Customer","amina ben")` et `"amin"` → les 2.
- **Édition + rename** : `Ben Salah` → `Trabelsi` renomme le Customer, l'Address (lien dynamique), le Contact primaire et le Noah Session pointant dessus ; save sans changement = pas de rename ; collision gérée (`Amina Trabelsi` déjà pris → rename sans collision).

---

## 3. Prochaines étapes

1. **Test réel Noah 4.9.1+** — pointer `noah_mobile_url` vers la machine Noah (port 8843, réseau local) et valider les payloads réels (format exact des endpoints Noah Mobile à confirmer)
2. **Recherche Noah côté Odyio** — endpoint `search_noah_patient(kw)` (recherche nom/prénom dans Noah via REST) + UI de liaison patient depuis le formulaire Customer (recherche par combinaison nom + prénom)
3. **Workspace Odyio** — reconstruire après suppression de odyio_cnam
4. **Impression PDF audiogramme** — courbes + données patient

---

## 4. État du dépôt

| Hash | Message |
|------|---------|
| *(en cours)* | feat: coherent patient format (civility, first/last name, NSS/NPI, editable identity + auto-rename) |
| `ad0777d` | feat: patient ID = name + lastname combination across modules (PG-safe naming + search) (poussé) |
| `790e71a` | feat: add odyio_noah Noah Mobile REST sync + audiogramme eraser/move/centering (poussé) |
| `799f3e6` | feat: add odyio_ocr module + audiogramme free placement (poussé) |
| `2a3f2a6` | refactor: remove entire odyio_cnam module |
| `4374c94` | chore: ignore Redis dump.rdb |
| `8a9096f` | refactor: rewrite audiogramme with clinical dual-ear format |

Branche : `master`. Le travail « format patient » (section 2ter) est **non commité** à ce jour.

---

## 5. Environnement de développement (WSL2)

| Composant | Valeur |
|-----------|--------|
| WSL distro | Ubuntu 24.04 |
| Bench | `/home/odyio/odyio-bench-pg` |
| Utilisateur bench | `odyio` |
| PostgreSQL | user `odyio`, db `odyio_db`, port 5432 |
| Redis | cache=6380, queue=6381, socketio=6382 (6379 = daemon, ne pas toucher) |
| Site | `http://odyio.localhost:8000` |
| Admin | `Administrator` / `admin` |
| Apps | frappe, erpnext, odyio_noah, odyio_audiometrie, odyio_ocr |

### Problèmes résolus (rappel)

1. **Workspace invisible** → ajouter le rôle « Workspace Manager » à l'utilisateur.
2. **Permission Customer refusée** → ajouter les rôles ERP (Sales, Accounts, Stock, Purchase).
3. **`link_filters` PostgreSQL** → patch Frappe requis (voir section 2).
4. **`get_valid_dict` PostgreSQL (JSON list)** → patch Frappe requis (voir section 2, bug 6).
5. **Erreur « No default Address Template found » / `is_your_company_address` manquant** → patch `odyio_noah.patches.erpnext_setup_fields` (voir section 2, bug 7).

---

## 6. URLs utiles

- **Audiogramme :** `http://odyio.localhost:8000/app/audiogramme`
- **Noah Settings :** `http://odyio.localhost:8000/app/noah-settings`
- **Admin Desk :** `http://odyio.localhost:8000` login `Administrator` / `admin`
