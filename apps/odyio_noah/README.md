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

### License

mit
