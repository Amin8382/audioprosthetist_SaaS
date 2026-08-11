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
| `customer_controller.py` | Override contrôleur Customer — `get_customer_name()` PostgreSQL-safe (ID patient = nom + prénom, suffixe ` - 2` sur homonyme) |
| `patches/patient_naming.py` | `cust_master_name = "Customer Name"` + `search_fields` Customer (recherche par nom + prénom) |

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
