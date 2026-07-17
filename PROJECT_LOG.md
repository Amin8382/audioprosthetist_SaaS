# Odyio (Audiosoin ERP) — Project Log

## Project Overview

Odyio is a SaaS clinic management system for a single audioprothésiste clinic in Tunisia, built on Frappe/ERPNext v15 with 3 custom Frappe apps (odyio_cnam, odyio_noah, FastAPI AI service).

---

## Infrastructure

- **Platform**: Frappe Framework v15 · ERPNext v15 · MariaDB 10.11 · Redis · bench 5.31.0
- **Environment**: WSL2 (Ubuntu 24.04) on Windows, served at `http://odyio.localhost:8000`
- **Python**: 3.12.3 · **Node.js**: 20.20.2
- **Bench user**: `odyio` (non‑root)
- **Site**: `odyio.localhost`, admin password: `admin`, MariaDB root password: `root`
- **Old codebase**: Archived under `archive/` (Spring Boot, React, FastAPI, Docker Compose)

---

## Timeline

### 2026-07-16 — Initial WSL2 + Frappe Setup

```
09:52:10 bench init odyio-bench --frappe-branch version-15
09:52:14 Cloning frappe/erpnext.git (version-15)
09:53:10 yarn install, bench build completed
09:54:02 Bench odyio-bench initialized
09:54:16 bench get-app erpnext --branch version-15
09:54:55 bench new-site odyio.localhost --admin-password admin
09:55:56 bench --site odyio.localhost install-app erpnext
         → ERPNext v15.117.0 installed
09:56:10-11 bench new-app odyio_cnam (failed — run as root)
09:56:41 bench new-app odyio_cnam (failed — run as root)
```

### 2026-07-17 — App Creation + Phase 1 Configuration

```
07:51:27 bench new-app odyio_cnam (4 failed attempts, then success as odyio user)
07:51:48 Installing odyio_cnam + building assets
07:51:50 bench new-app odyio_noah
07:51:51 Installing odyio_noah + building assets
07:52:16 bench start (serve:8000, socketio:9000, schedule, watch, worker)
08:01:22 bench --site odyio.localhost console — Phase 1 Setup
```

### Phase 1 Setup (executed via bench console @ 08:01:28)

```python
# 1. Company "Odyio Clinique" (Tunisia, TND)
# 2. Fiscal Year 2025
# 3. Naming Series:
#    - Delivery Note: BL-.YYYY.-.####
#    - Sales Invoice: FAC-.YYYY.-.####
#    - Purchase Order: BC-.YYYY.-.####
#    - Maintenance Visit: REP-.YYYY.-.####
# 4. Payment Mode: BON_ACHAT_CNAM
# 5. Item Groups: APPAREIL_AUDITIF, ACCESSOIRE, PILE, EMBOUT, AUTRE
# 6. Warehouse: Clinique Principale - OC
# 7. Role: Fournisseur (desk access)
# 8. Custom Fields on Customer (11 fields):
#    - cnam_number (Data)
#    - cnam_affiliation_type (Select: CNAM_ACTIVE/CNAM_RETIRED/PRIVATE/NONE)
#    - cnam_expiry (Date)
#    - audiogram_section (Section Break)
#    - audiogram_left (JSON)
#    - audiogram_right (JSON)
#    - ear_side (Select: LEFT/RIGHT/BILATERAL)
#    - noah_section (Section Break)
#    - noah_patient_id (Data)
#    - noah_last_sync (Datetime)
#    - noah_sync_status (Select: SYNCED/OUT_OF_SYNC/NEVER_SYNCED/SYNC_ERROR)
# 9. Custom Field on Delivery Note: bl_type (Select)
```

### Print Format Templates (written @ 08:04:20)

```
templates/odyio_cnam/print_format/
├── odyio_bl.html        — French Invoice-style template for Delivery Note
└── odyio_facture.html   — French Invoice-style template for Sales Invoice
```

### Module Def Creation (@ 08:04:31)

Created Module Def "Odyio CNAM" required for Print Format DocType linking.

### App Installation (@ 08:07:43 – 08:08:10)

```
08:07:43 bench list-apps → only frappe, erpnext
08:07:49 bench install-app odyio_cnam → DuplicateEntryError (Module Def existed)
08:07:49 bench install-app odyio_noah → success
08:08:02 bench install-app odyio_cnam --force → success
08:08:10 bench migrate
08:08:10 bench list-apps → frappe, erpnext, odyio_noah, odyio_cnam
```

### Print Format DocType Creation (@ 08:25:13)

```
Executed: odyio_cnam.commands.create_print_formats()
Created: Odyio BL (Delivery Note)
Created: Odyio Facture (Sales Invoice)
```

### DocType Creation (@ 08:26:22 – 08:26:33)

```sql
-- CNAM Document (child table)
CREATE TABLE `tabCNAM Document` (
    document_type VARCHAR(140),      -- Ordonnance/Audiogramme/Devis/...
    attach TEXT,                     -- File attachment
    extracted_data JSON,             -- AI-extracted data
    confidence DECIMAL(21,9),        -- AI confidence %
    source VARCHAR(140),
    is_required INT DEFAULT 1,       -- Checkbox
    is_uploaded INT DEFAULT 0,       -- Checkbox
    parent VARCHAR(140),             -- Link to CNAM Demande
    ...
);

-- CNAM Demande (main transaction, submittable)
CREATE TABLE `tabCNAM Demande` (
    customer VARCHAR(140),           -- Link to Customer
    customer_name VARCHAR(140),
    cnam_number VARCHAR(140),        -- Fetched from Customer
    cnam_affiliation_type VARCHAR(140),
    sales_invoice VARCHAR(140),      -- Link to Sales Invoice
    delivery_note VARCHAR(140),
    montant_total_ht DECIMAL(21,9),
    montant_total_ttc DECIMAL(21,9),
    montant_demande DECIMAL(21,9),   -- CNAM claim amount
    taux_remboursement DECIMAL DEFAULT 70,
    montant_approuve DECIMAL(21,9),
    status VARCHAR(140) DEFAULT 'Brouillon',  -- Brouillon/Soumise/En cours/Approuvee/Refusee/Annulee
    date_soumission DATE,
    date_reponse DATE,
    ai_probability DECIMAL(21,9),
    ai_prediction VARCHAR(140) DEFAULT 'Non evalue',
    rejection_reason TEXT,
    ai_request_id VARCHAR(140),
    ai_response JSON,
    ai_evaluated_at DATETIME,
    journal_entry VARCHAR(140),
    payment_entry VARCHAR(140),
    amended_from VARCHAR(140),
    ...
);
```

### Custom Field on Sales Invoice (@ 08:27:23)

```sql
ALTER TABLE `tabSales Invoice` ADD COLUMN `custom_cnam_eligible` INT DEFAULT 0;
```

### CNAM Dossier Print Format (@ 08:29:53)

```
Executed: odyio_cnam.commands.create_cnam_dossier_pf()
Created: Odyio CNAM Dossier (CNAM Demande)
```

### Final Migrate & Build (@ 08:31:06 – 08:31:24)

```
bench --site odyio.localhost migrate → all DocTypes synced
bench build → translations compiled for odyio_cnam, odyio_noah
```

---

## Current Runtime State

```
Bench processes running:
├── bench serve  --port 8000    → Werkzeug server (PID 20265)
├── bench socketio               → SocketIO (PID 18708)
├── bench schedule               → Background scheduler (PID 18719)
├── bench watch                  → File watcher (PID 18718)
└── bench worker                 → Background worker (PID 18722)
```

---

## Files Created/Modified

### WSL2 — `/home/odyio/odyio-bench/apps/odyio_cnam/odyio_cnam/`

```
├── ai_client.py                          — CnamAIClient (HTTP to FastAPI port 8001)
├── commands.py                           — create_print_formats(), create_cnam_dossier_pf()
├── hooks.py                              — doc_events (Sales Invoice on_submit), fixtures
├── hooks_handler.py                      — on_sales_invoice_submit()
├── modules.txt                           — "Odyio CNAM"
├── fixtures/
│   ├── print_format_odyio_bl.json
│   └── print_format_odyio_facture.json
├── templates/odyio_cnam/print_format/
│   ├── odyio_bl.html                     — Delivery Note BL template
│   ├── odyio_facture.html                — Sales Invoice template
│   └── odyio_cnam_dossier.html           — CNAM Demande dossier template
├── odyio_cnam/doctype/
│   ├── cnam_document/
│   │   ├── cnam_document.json
│   │   └── cnam_document.py
│   └── cnam_demande/
│       ├── cnam_demande.json
│       ├── cnam_demande.py               — Controller (validate, before_submit, trigger_ai_prediction)
│       ├── cnam_demande.js               — Form script (AI gauge, PDF btn)
│       └── test_cnam_demande.py
```

### Windows — Project Root (AI Service)

```
C:\Users\gasmi\Downloads\audioprosthetist_SaaS\ai-service\
├── main.py                               — FastAPI app (port 8001)
├── Dockerfile                            — python:3.11-slim
├── requirements.txt                      — fastapi, uvicorn, pydantic
├── docker-compose.yml                    — Service on port 8001
└── routers/
    ├── __init__.py
    ├── predict_claim.py                  — POST /ai/predict-claim
    └── extract_document.py               — POST /ai/extract-document
```

### Key Configuration Files

```
odyio-bench/sites/common_site_config.json:
{
  "db_host": "127.0.0.1",
  "db_port": 3306,
  "db_type": "mariadb",
  "developer_mode": 1,
  "redis_cache": "redis://127.0.0.1:6379",
  "redis_queue": "redis://127.0.0.1:6379",
  "redis_socketio": "redis://127.0.0.1:6379",
  "server_script_enabled": true
}

odyio-bench/sites/odyio.localhost/site_config.json:
{
  "db_name": "_03e75398efdd0e1e",
  "db_password": "XFBDRu9hAzgYPNTK",
  "db_type": "mariadb"
}
```

---

## Print Formats Registered (3 custom)

| Name | DocType | Type | Status |
|------|---------|------|--------|
| Odyio BL | Delivery Note | Jinja, Custom | Active |
| Odyio Facture | Sales Invoice | Jinja, Custom | Active |
| Odyio CNAM Dossier | CNAM Demande | Jinja, Custom | Active |

## Custom DocTypes (2)

| Name | Type | Submittable | Fields |
|------|------|------------|--------|
| CNAM Document | Child Table | No | document_type, attach, extracted_data, confidence, source, is_required, is_uploaded |
| CNAM Demande | Main | Yes | customer, sales_invoice, amounts, status, AI fields, documents (child table), accounting |

## Custom Fields (13 on standard DocTypes)

| DocType | Field | Type |
|---------|-------|------|
| Customer | cnam_number | Data |
| Customer | cnam_affiliation_type | Select |
| Customer | cnam_expiry | Date |
| Customer | audiogram_section | Section Break |
| Customer | audiogram_left | JSON |
| Customer | audiogram_right | JSON |
| Customer | ear_side | Select |
| Customer | noah_section | Section Break |
| Customer | noah_patient_id | Data |
| Customer | noah_last_sync | Datetime |
| Customer | noah_sync_status | Select |
| Delivery Note | bl_type | Select |
| Sales Invoice | custom_cnam_eligible | Check |

---

## Database Migration Log (DDL)

```sql
-- 2026-07-16 Phase 1 — ERPNext full schema creation
-- (300+ CREATE TABLE statements for all ERPNext DocTypes)

-- 2026-07-17 08:01 — Customer custom fields
ALTER TABLE `tabCustomer` ADD COLUMN `cnam_number` varchar(140);
ALTER TABLE `tabCustomer` ADD COLUMN `cnam_affiliation_type` varchar(140) DEFAULT 'NONE';
ALTER TABLE `tabCustomer` ADD COLUMN `cnam_expiry` date;
ALTER TABLE `tabCustomer` ADD COLUMN `audiogram_left` json;
ALTER TABLE `tabCustomer` ADD COLUMN `audiogram_right` json;
ALTER TABLE `tabCustomer` ADD COLUMN `ear_side` varchar(140);
ALTER TABLE `tabCustomer` ADD COLUMN `noah_patient_id` varchar(140);
ALTER TABLE `tabCustomer` ADD COLUMN `noah_last_sync` datetime(6);
ALTER TABLE `tabCustomer` ADD COLUMN `noah_sync_status` varchar(140) DEFAULT 'NEVER_SYNCED';

-- 2026-07-17 08:01 — Delivery Note custom field
ALTER TABLE `tabDelivery Note` ADD COLUMN `bl_type` varchar(140);

-- 2026-07-17 08:26 — Custom DocTypes
CREATE TABLE `tabCNAM Document` (...);   -- Child table
CREATE TABLE `tabCNAM Demande` (...);     -- Main transaction

-- 2026-07-17 08:27 — Sales Invoice custom field
ALTER TABLE `tabSales Invoice` ADD COLUMN `custom_cnam_eligible` int(1) NOT NULL DEFAULT 0;
```

---

## Bench Console Session History

### Session 1 — Phase 1 Setup (08:01:28)
- Created Company "Odyio Clinique", Fiscal Year 2025
- Set naming series for DN/SI/PO/Maintenance Visit
- Created Payment Mode BON_ACHAT_CNAM
- Created Item Groups (5), Warehouse, Fournisseur Role
- Created 11 Customer custom fields + 1 Delivery Note custom field

### Session 2 — Print Format Templates (08:04:20)
- Wrote odyio_bl.html (Delivery Note template)
- Wrote odyio_facture.html (Sales Invoice template)
- Attempted Print Format DocType creation → JSONDecodeError

### Session 3 — Module Def + Retry (08:04:31)
- Created Module Def "Odyio CNAM"
- Retried Print Format creation → still failed

### Session 4-6 — Troubleshooting attempts (08:10:51, 08:22:16)
- Checked Print Format meta fields
- Tried `bench execute` approach

### App Installations (08:07:43 – 08:08:10)
- Installed odyio_noah, odyio_cnam (force), migrated

---

## Pending / Low Priority

1. **Phase 3 — Marketplace**: `Catalogue Produit` DocType for B2B supplier catalog
2. **Phase 3 — Noah ES Sync**: Bi-directional sync with Noah ES hearing aid fitting software
3. **AI Service**: Docker Desktop needs to be started to run `ai-service/docker-compose up -d`
4. **Hosts file**: Add `172.26.222.190 odyio.localhost` to Windows hosts file for direct browser access
