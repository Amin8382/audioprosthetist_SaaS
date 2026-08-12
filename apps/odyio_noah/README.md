### Odyio Noah

Synchronisation bidirectionnelle **Noah Mobile (REST API)** pour cabinet d'audioprothésiste (Tunisie, réseau local, port 8843). Aucune connexion Internet / HIMSA requise.

### Composants

| Fichier | Rôle |
|---------|------|
| `odyio_noah/doctype/noah_settings/` | DocType Single — URL, clé API, alias, bouton « Tester la connexion » |
| `odyio_noah/doctype/noah_session/` | DocType Noah Session — historique des séances importées (fitting, audiogramme, appareil) |
| `noah_mobile_client.py` | Client REST (Bearer auth), ops read/write patients + audiogrammes + sessions |
| `api.py` | Endpoints whitelistés `test_noah_connection`, `sync_from_noah`, `push_to_noah` |
| `public/js/customer_noah.js` | Boutons Sync/Push + indicateur d'état + tableaux audiogramme sur le formulaire Customer |
| `install.py` + `patches/noah_custom_fields.py` | Champs personnalisés Customer (idempotents) |
| `customer_controller.py` | Override contrôleur Customer — ID patient = nom + prénom (PG-safe, suffixe ` - 2`), identité éditable + auto-rename, synchro Contact |
| `patches/patient_naming.py` | `cust_master_name = "Customer Name"` + `search_fields` Customer (recherche par nom + prénom) |
| `patches/patient_format.py` | Format patient cohérent : civilité, prénom, nom, mobile, CNAM/NPI + seeds idempotents (Salutations, Customer Groups, Territories) |
| `patches/patient_cnam.py` | Migration `nss` → `cnam` (N° CNAM) + formulaire adresse minimal |
| `install.py` | `setup_patient_format()` : champs custom `cnam`/`npi`, seeds salutations/groupes/territoires, Property Setters (déverrouillage + labels FR), formulaire adresse minimal, `search_fields` étendu |

### Format patient (formulaire Customer)

Le formulaire patient (Customer) porte l'identité complète :
- **Civilité** : Link `Salutation` (Mr / Mme / Mlle / Enf), seeds idempotents (table vide à l'install d'origine)
- **Prénom / Nom** : champs standard déverrouillés (Property Setters) — ERPNext les fetch depuis le Contact primaire (`fetch_from`), l'override `_validate_links()` neutralise ce fetch sinon les edits sont écrasés avant `validate()`
- **N° CNAM / N° de pièce d'identité** : champs custom `cnam` (N° CNAM) et `npi` (N° de pièce d'identité)
- **Adresse** : formulaire adresse minimal — seuls **Adresse ligne 1**, **Ville** et **Région/État** restent visibles (champs `country` = Tunisie et `address_type` = Permanent par défaut, titre auto depuis le patient)
- **Mobile / E-mail** : champs standard déverrouillés, propagés au Contact primaire
- **Auto-rename** : éditer prénom/nom renomme le Customer via `frappe.rename_doc(force=True, show_alert=False)` — Address, Contact et Noah Session (liens dynamiques) suivent ; save sans changement = aucun rename
- **Recherche** : `search_fields` = `customer_group, territory, mobile_no, primary_address, customer_name, name, first_name, last_name`

### Identité patient (nom + prénom)

Le **Patient ID** sur tous les modules est la combinaison **prénom + nom** :
- `cust_master_name = "Customer Name"` → `name` du Customer = `customer_name`
- Homonymes → ` - 2`, ` - 3`… (`customer_controller.py` ; la version ERPNext utilise du SQL MySQL qui plante sur PG)
- Recherche par combinaison nom + prénom via `search_fields` (`customer_name` ajouté) → champs Link (audiogramme, Noah Session, OCR), recherche globale et vue liste

### Champs personnalisés Customer

`noah_patient_id`, `noah_sync_status` (SYNCED / OUT_OF_SYNC / NEVER_SYNCED / SYNC_ERROR), `noah_last_sync`, `audiogram_left`, `audiogram_right`, `ear_side`, `dob`.

### Configuration

Priorité : **Noah Settings** (Single) puis `site_config.json` (`noah_mobile_url`, `noah_mobile_api_key`).

### Endpoints REST Noah Mobile consommés

- `GET /noah/patients?search=` , `GET /noah/patients/{id}`
- `POST /noah/patients`, `PUT /noah/patients/{id}`
- `GET|POST /noah/patients/{id}/audiogram`
- `GET /noah/patients/{id}/sessions`

### Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app odyio_noah
bench --site odyio.localhost migrate
bench build
```

### Remarques PostgreSQL

- Les champs JSON sont des `json` (PostgreSQL) → dicts en Python, gérés par `_to_dict()`.
- Patch Frappe requis (v15 + PostgreSQL) : `validate_link_filters` dans `frappe/core/doctype/doctype/doctype.py` doit accepter une liste déjà parsée.
- Patch Frappe requis (v15 + PostgreSQL) : `get_valid_dict` dans `frappe/model/base_document.py` doit accepter et sérialiser les valeurs **list** des champs JSON (sinon « Value for Link Filters cannot be a list » à la sauvegarde d'un DocType).
- Patch `erpnext_setup_fields` : ré-exécute les champs personnalisés install d'ERPNext (bloqués à l'install d'origine par le bug `link_filters`) et crée un Address Template « Tunisia » (sinon « No default Address Template found » à la création d'un Customer avec adresse).

### License

mit
