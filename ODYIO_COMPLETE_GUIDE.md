# Odyio — The Complete Story, Everything About This Project

> **How to use this file:** Paste this entire document into an AI tool (Gamma.app for slides, NotebookLM for video/audio explanations, Canva AI for animations, Claude artifacts for interactive demos). It contains the full history, every technology, every file, every bug, and every concept so the AI can teach you the project from zero to expert.

---

## CHAPTER 1 — THE PROJECT IDENTITY

### What is Odyio?

Odyio (originally "Audiosoin ERP") is a **SaaS clinic management system for a single audioprothésiste (hearing aid dispenser) clinic in Tunisia**. It is a web application that runs on a server and is used through the browser by clinic staff.

### What does an audioprothésiste clinic need?

1. **Patient records** — personal info, hearing history, CNAM insurance data
2. **Hearing tests** — audiograms (hearing curves drawn on a chart)
3. **Sales** — selling hearing aids, invoicing patients
4. **Stock management** — inventory of devices, batteries, accessories, ear molds
5. **Suppliers** — buying from device manufacturers
6. **Accounting** — treasury, payments, fiscal year
7. **CNAM (Tunisian national health insurance)** — claims for reimbursement (this was started, then removed)
8. **Future**: B2B marketplace, Noah ES synchronization (hearing aid fitting software)

### The product decisions made

- **No custom frontend**: Everything is inside **Frappe Desk** (the built-in web UI). A React frontend was started and then removed.
- **No AI service**: An AI feature for document analysis was started and then removed.
- **Frappe/ERPNext v15** as the foundation instead of building from scratch.
- **PostgreSQL instead of MariaDB** for better JSON support.
- **Self-hosted** instead of Frappe Cloud.
- **The entire CNAM module was removed** in the latest iteration to focus on the audiometry core.

### The final architecture (one diagram to rule them all)

```
                    USERS' BROWSERS
                          │
                          ▼
              ┌───────────────────────┐
              │    FAPPE DESK (UI)    │  ← forms, lists, the audiogram canvas
              │  JavaScript + CSS     │
              └──────────┬────────────┘
                         │  HTTP / REST
                         ▼
              ┌───────────────────────┐
              │  FAPPE FRAMEWORK v15  │  ← the engine
              │  Python 3.12          │
              │  DocTypes, ORM, API   │
              └──────────┬────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌────────┐ ┌──────────┐
        │PostgreSQL│ │ Redis  │ │ SocketIO │
        │ database │ │ cache/ │ │ realtime │
        │  16      │ │ queue  │ │          │
        └──────────┘ └────────┘ └──────────┘
                         │
              ┌───────────────────────┐
              │    ERPNext v15        │  ← business modules
              │ Customers, Sales,     │
              │ Stock, Accounts       │
              └───────────────────────┘
                         │
              ┌───────────────────────┐
              │   Odyio custom apps   │  ← OUR code
              │  odyio_audiometrie    │
              └───────────────────────┘
```

**The golden rule of the whole project:** nothing you write talks to the database directly. Your code talks to Frappe, Frappe talks to PostgreSQL.

---

## CHAPTER 2 — THE DEVELOPMENT ENVIRONMENT (WSL2)

### The problem

The software stack (PostgreSQL, Redis, Python web server) runs best on Linux, but development happens on Windows.

### The solution — WSL2

WSL2 (Windows Subsystem for Linux 2) runs a **real Linux kernel** inside Windows. We use **Ubuntu 24.04** as a WSL distribution.

```
Windows 10/11
  └── WSL2
       └── Ubuntu 24.04               ← a real Linux OS
            ├── PostgreSQL 16.14      ← the database
            ├── Redis 7               ← cache + background jobs + realtime
            ├── Python 3.12.3         ← Frappe runtime
            ├── Node.js 20.20.2 + Yarn← builds frontend assets
            └── /home/odyio/odyio-bench-pg   ← the LIVE installation
```

### Two separate copies of the code (CRITICAL concept)

- **Windows folder** `C:\Users\gasmi\Downloads\audioprosthetist_SaaS` = the **git repository** (clean source code, version controlled)
- **WSL folder** `/home/odyio/odyio-bench-pg/apps/...` = the **live installation** (where the server actually runs)

The flow: code in Windows → commit → push to GitHub → pull inside WSL → `bench migrate` → restart server. These two copies drift apart if you forget to sync. This happened with the CNAM removal (removed in git but still installed on the server).

### The bench user

`bench` refuses to run as root. A dedicated user `odyio` owns the bench. Commands like `bench new-app` failed as root, then succeeded as the `odyio` user.

### Bench processes running during development

```
├── bench serve  --port 8000    → the web server (Werkzeug)
├── bench socketio              → real-time notifications
├── bench schedule              → background task scheduler
├── bench watch                 → file watcher (auto-restart on code change)
└── bench worker                → background job worker (RQ)
```

---

## CHAPTER 3 — THE TECHNOLOGIES, ONE BY ONE

### 3.1 PostgreSQL 16 — the database

**What it is:** A relational database. Data lives in **tables** (like Excel sheets), each column has a type.

**Why we use it:** Frappe's default is MariaDB, but PostgreSQL has **JSONB** — a native JSON column type with fast querying inside JSON. This matters for audiogram data and future Noah ES sync data.

**How Frappe uses it:** Every DocType gets a table automatically, named `tab<DocType>`. Example — the Audiogramme table:

```
tabAudiogramme
┌──────────────────┬───────────┬─────────────┬──────────┬─────────────────────────┬───────────┐
│ name             │ patient   │ date_examen │ type_…   │ audiogramme_json        │ creation  │
├──────────────────┼───────────┼─────────────┼──────────┼─────────────────────────┼───────────┤
│ AUD-CUS-00001-001│ CUS-00001 │ 2026-07-20  │ Tonale   │ {"right":{"CA":{"1000":40}}...} │ 2026-07-20│
└──────────────────┴───────────┴─────────────┴──────────┴─────────────────────────┴───────────┘
```

The audiogram data is stored as a JSON **string** — Frappe doesn't parse it, the browser does.

### 3.2 Redis 7 — the fast scratchpad

**What it is:** An in-memory database. Everything in RAM → extremely fast, lost on restart.

**Frappe's three separate Redis uses (three ports):**

| Port | Purpose |
|---|---|
| 6380 | **Cache** — frequently-read data (session, translations, query results) so PostgreSQL isn't hit every time |
| 6381 | **Queue** — background jobs (long tasks like emails) |
| 6382 | **SocketIO** — real-time notifications between browser and server |

**Analogy:** PostgreSQL is the filing cabinet (everything, permanent). Redis is sticky notes on the monitor (fast, temporary).

### 3.3 Python 3.12 — the server language

All Frappe framework code, all ERPNext code, all our app controllers are Python. Key library: **psycopg2-binary** (the PostgreSQL driver).

### 3.4 Node.js + Yarn — the asset builder

Frappe's web UI is compiled from modern JavaScript. Yarn downloads dependencies and `bench build` compiles everything into minified files under `public/dist/`.

### 3.5 Git + GitHub — version control

The whole project lives at `https://github.com/Amin8382/audioprosthetist_SaaS`. Every change is a commit with a message. 11 commits exist.

---

## CHAPTER 4 — THE FAPPE FRAMEWORK (the heart — learn this deeply)

### 4.1 The radical idea: your app is data

Frappe is a **meta-framework**. In normal web frameworks you write code for every feature (a model class, a migration, an HTML form, an API, permissions). Frappe **inverts this**: you *describe* what you want in JSON, and Frappe *generates* everything else.

```json
{
  "name": "Audiogramme",
  "fields": [
    {"fieldname": "patient", "fieldtype": "Link", "options": "Customer", "reqd": 1},
    {"fieldname": "date_examen", "fieldtype": "Date", "default": "Today"}
  ]
}
```

From this, Frappe automatically creates:
- ✅ the database table with correct column types
- ✅ the data entry form with correct input widgets
- ✅ the list view
- ✅ a REST API (`/api/resource/Audiogramme`)
- ✅ permission checks
- ✅ export, print, reporting

This is "convention over configuration" taken to the extreme.

### 4.2 The 8 words that explain 90% of Frappe

| Word | Meaning |
|---|---|
| **Bench** | CLI tool + folder managing everything (`odyio-bench-pg`) |
| **Site** | One Frappe installation with its own database (`odyio.localhost`) |
| **App** | A bundle of modules and code (`odyio_audiometrie`) |
| **Module** | A namespace inside an app (`Audiometrie`) |
| **DocType** | THE central concept — "a type of document" (Audiogramme, Customer) |
| **Document** | One actual record of a DocType (one filled audiogram) |
| **Hook** | Where your code plugs into Frappe's events |
| **Controller** | The Python class giving a DocType custom logic |

### 4.3 Bench — the command center (you type these daily)

```bash
bench init odyio-bench-pg --frappe-branch version-15   # create installation
bench new-site odyio.localhost --db-type postgres      # create a site+DB
bench get-app erpnext --branch version-15              # download app
bench new-app odyio_cnam                               # scaffold app
bench --site X install-app Y                           # install into site
bench migrate                                          # ★ sync schemas to DB
bench build                                            # compile JS/CSS
bench start                                            # run dev server
bench --site X console                                 # Python shell in site
bench --site X execute path.to.function                # run a Python function
bench --site X remove-app Y                            # remove app from site
bench --site X clear-cache                             # flush Redis cache
bench list-apps                                        # list installed apps
```

**★ `bench migrate` is the most important command.** Editing a DocType JSON does nothing until you run `bench migrate`. It reads every DocType JSON in every app and syncs the database to match.

### 4.4 The anatomy of an app (required folder structure)

```
odyio_audiometrie/
├── pyproject.toml              # Python packaging metadata
├── setup.py                    # legacy install config
├── README.md, license.txt
└── odyio_audiometrie/          # ← Python package (name matches app)
    ├── __init__.py             # version number
    ├── hooks.py                # ★ app declaration + hooks
    ├── modules.txt             # ★ lists modules ("Audiometrie")
    ├── audiometrie/            # ← module folder
    │   └── doctype/
    │       └── audiogramme/    # ← one folder per DocType
    │           ├── __init__.py
    │           ├── audiogramme.json  # ★ schema
    │           ├── audiogramme.py    # ★ server controller
    │           └── audiogramme.js    # ★ client form script
    └── public/
        ├── css/                # global CSS (loaded everywhere)
        └── js/                 # global JS
```

**Strict rule:** DocType `Audiogramme` MUST live at `.../doctype/audiogramme/audiogramme.json` (lowercase). Break this and Frappe won't find it.

### 4.5 The DocType JSON decoded (our real file)

**Top-level metadata:**
- `"module": "Audiometrie"` — which module owns it
- `"autoname": "format:AUD-{patient}-{####}"` — auto IDs like `AUD-CUS-00001-0001`
- `"is_submittable": 0` — not submittable = always editable (a clinical record choice)
- `"sort_field": "creation", "sort_order": "DESC"` — list newest-first

**The fields array** — each field:
```json
{
  "fieldname": "patient",       // internal name, snake_case
  "fieldtype": "Link",          // widget type
  "label": "Patient",           // French display label
  "options": "Customer",        // for Link: which DocType it points to
  "reqd": 1,                    // required
  "in_list_view": 1             // show in list
}
```

### The fieldtypes you will use (cheat sheet)

| Fieldtype | What it is |
|---|---|
| `Data` | one line of text |
| `Small Text` | multi-line text |
| `Int` / `Float` / `Currency` | numbers |
| `Date` / `Datetime` | dates/times |
| `Select` | dropdown; options separated by `\n` in the JSON string |
| `Link` | dropdown listing records of another DocType |
| `Check` | checkbox |
| `HTML` | **blank slate — you inject any HTML/JS. This is where our canvas lives** |
| `Code` | code editor; `"options": "JSON"` adds JSON validation |
| `Column Break` / `Section Break` | form layout controls |

### `is_submittable` and `docstatus`

Some documents (invoices) must be frozen. Frappe gives submittable documents a `docstatus`: 0 = draft (editable), 1 = submitted (locked), 2 = cancelled. Our Audiogramme is NOT submittable (always editable) — deliberate clinical choice.

### 4.6 The controller (Python, server side)

The JSON gives structure; the controller gives **behavior**. Frappe's `Document` base class defines a **lifecycle** that runs automatically:

```
validate() → before_insert() → before_save() → DB write → on_update()
```

Our real controller (14 lines) teaches the 3 core skills:

```python
class Audiogramme(Document):
    def validate(self):                       # every save
        self.set_patient_name()

    def before_save(self):                    # just before DB write
        if not self.created_by:
            self.created_by = frappe.session.user

    def set_patient_name(self):
        if self.patient and not self.patient_name:
            self.patient_name = frappe.db.get_value("Customer", self.patient, "customer_name")
```

Skills: (1) `self.fieldname` read/write your fields, (2) `frappe.session.user` = logged-in user, (3) `frappe.db.get_value(DocType, name, field)` = fetch one value from another table.

### 4.7 The form script (JavaScript, client side)

A `.js` file named after the DocType is **auto-loaded** when that form opens. Entry pattern:

```javascript
frappe.ui.form.on("Audiogramme", {
  refresh(frm) { ... }   // runs on every load
});
```

The `frm` object is the open form:
- `frm.doc.patient` — read a field
- `frm.doc.patient = "x"` — set a field
- `frm.save()` — save the document
- `frm.fields_dict.audiogramme_html.$wrapper` — the DOM element of an HTML field

**Design principle:** client = UI interaction only; server = authoritative logic. Our audiogram tool is unusual: it does ALL work client-side (drawing + building data) and hands Frappe a JSON string to store.

### 4.8 Hooks — plug-in points

`hooks.py` declares the app and subscribes to events:

```python
app_name = "odyio_audiometrie"
app_title = "Odyio Audiometrie"
app_include_css = "/assets/odyio_audiometrie/css/audiometrie.css"
```

The CSS line = "load this stylesheet on every page of the system." There are hundreds of hook points (`app_include_js`, `doc_events`, `on_login`...). **Rule: write custom behavior in hooks, never edit Frappe's own code.**

### 4.9 Modules — the namespace layer

`modules.txt` contains one line: `Audiometrie`. Modules namespace DocTypes and control visibility. **This caused a real bug in this project** — see Chapter 6.

### 4.10 Workspace — the dashboard

A Workspace is itself a DocType. Cards + shortcuts stored in a Workspace record. **Critical gotcha discovered:** a Workspace references a `module`; if that module is NOT in the logged-in user's *allowed modules*, Frappe silently hides the workspace from the sidebar. When we deleted the "Odyio CNAM" module, the Odyio workspace vanished.

### 4.11 Roles & permissions

```
User ← has → Roles ← control → DocType permissions
```

- **Role** = label (System Manager, Sales User, Audiometriste)
- **User** = login account with roles
- **DocType permissions** = array in the DocType JSON:

```json
{
  "role": "Audiometriste",
  "read": 1, "write": 1, "create": 1,
  "delete": 0, "submit": 0
}
```

Right flags: `read, write, create, delete, submit, cancel, amend, report, export, import, print, email`. No matching permission row = "Not permitted" error. (This is the exact bug we fixed on Customer.)

### 4.12 The REST API (auto-generated)

```
GET/POST   /api/resource/Audiogramme              # list/create
GET/PUT/DELETE /api/resource/Audiogramme/NAME     # read/update/delete one
POST       /api/method/app.path.function          # call any Python function
POST       /api/method/login  (usr=...&pwd=...)
```

This is how a future mobile app or the Noah ES sync will talk to Odyio.

### 4.13 Print formats (Jinja templates → PDF)

```
templates/print_format/odyio_facture.html   ← Jinja with {{ doc.field }}
```

Frappe renders HTML → PDF for printing invoices (we had these in the now-deleted CNAM app).

### 4.14 The DocType = five things glued by convention

| Piece | File | Tech |
|---|---|---|
| Schema | `audiogramme.json` | JSON |
| Server logic | `audiogramme.py` | Python |
| Form UI | `audiogramme.js` | JavaScript |
| DB table | `tabAudiogramme` | SQL (auto) |
| REST API | `/api/resource/Audiogramme` | auto |

---

## CHAPTER 5 — ERPNext (business software on top of Frappe)

ERPNext is **a very large Frappe app** with business modules already built. Same framework, same conventions. When you use a Customer form, you use ERPNext's DocType `Customer`, whose files live in `apps/erpnext/erpnext/accounts/doctype/customer/`.

### Phase 1 configuration (executed via bench console)

| Business need | ERPNext DocTypes | Configured |
|---|---|---|
| Company | Company, Fiscal Year | "Odyio Clinique", FY 2025, currency TND |
| Patients | Customer (+ Contact, Address) | Configured |
| Selling | Quotation, Sales Order, Sales Invoice, Delivery Note, Payment Entry | Naming series: `FAC-.YYYY.-.####` (factures), `BL-.YYYY.-.####` (bons de livraison), `BC-.YYYY.-.####` (commandes achat) |
| Stock | Item, Item Group, Warehouse, Stock Entry | 5 item groups (APPAREIL_AUDITIF, ACCESSOIRE, PILE, EMBOUT, AUTRE), warehouse "Clinique Principale" |
| Buying | Supplier, Purchase Order, Purchase Invoice | Role "Fournisseur" created |
| Accounting | Journal Entry, Account, Bank Account | Configured |
| Payments | Mode of Payment | "BON_ACHAT_CNAM" created |

**Custom fields added to ERPNext DocTypes (13 total):**
- On Customer: `cnam_number`, `cnam_affiliation_type`, `cnam_expiry`, `audiogram_left` (JSON), `audiogram_right` (JSON), `ear_side`, `noah_patient_id`, `noah_last_sync`, `noah_sync_status`
- On Delivery Note: `bl_type`
- On Sales Invoice: `custom_cnam_eligible`

**The integration skill:** your custom DocType connects to ERPNext via ONE Link field: `{"fieldtype": "Link", "options": "Customer"}` — and your feature is now integrated into the ERP.

---

## CHAPTER 6 — THE BUGS WE FOUGHT (every one is a lesson)

### Bug 1: `bench new-app` fails — "run as root" (then root fails too)
**Symptom:** creating an app failed.
**Root cause:** bench must run as a non-root user; as root it refuses, as root-user sessions it had permission problems.
**Fix:** use the dedicated `odyio` user.

### Bug 2: DuplicateEntryError when installing odyio_cnam
**Symptom:** `bench install-app odyio_cnam` → error "Module Def already exists".
**Root cause:** the Module Def was created manually before install.
**Fix:** `bench install-app odyio_cnam --force`.

### Bug 3: Print format creation → JSONDecodeError
**Symptom:** creating Print Format DocTypes failed.
**Root cause:** malformed JSON in the fixture/template payload.
**Fix:** wrote a `create_print_formats()` command in the app's `commands.py` and executed it via `bench --site odyio.localhost execute odyio_cnam.commands.create_print_formats`.

### Bug 4: Connection refused after environment changes
**Symptom:** the site was unreachable.
**Fix:** restarted `bench start`.

### Bug 5: The Odyio workspace disappeared from the sidebar
**Symptom:** workspace with all cards not visible.
**Root cause:** In `frappe/desk/desktop.py`, `Workspace.__init__()` checks that the workspace's `module` is in the user's `allowed_modules`. If not, it raises `PermissionError` and Frappe silently drops the workspace. The module "Odyio CNAM" wasn't in the user's allowed modules.
**Fix:** added the "Workspace Manager" role to the user (this role bypasses the module check).
**Lesson:** Workspaces are tied to modules; user module access is role-driven.

### Bug 6: "No permission" on Customer DocType
**Symptom:** opening Customers returned "Not permitted".
**Root cause:** ERPNext's Customer DocType default role permissions don't include System Manager.
**Fix:** added all ERP operational roles (Sales, Accounts, Stock, Purchase) to the admin user.
**Lesson:** permissions come from the DocType's `permissions` array, not from being admin.

### Bug 7: The audiogram canvases wouldn't stay side-by-side
**Symptom:** flexbox `display: flex` inside Frappe's HTML field collapsed to a single column.
**Root cause:** Frappe's form layout constrains column width aggressively; flexbox can't keep two canvases side by side.
**Fixes tried in order:**
1. Single canvas with mode toggle (rejected)
2. Two canvases + flexbox (rejected — collapsed)
3. Flexbox + min-widths + scroll (rejected — still breaks)
4. **`<table>` with `table-layout: fixed` + `min-width: 720px !important` (accepted — Frappe can't break it)**
**Lesson:** inside Frappe's form system, tables are the reliable layout primitive, not flexbox.

---

## CHAPTER 7 — THE AUDIOMETRIE APP (our masterpiece, fully explained)

### 7.1 The domain problem

A hearing test produces a curve showing hearing loss per frequency. Clinically:
- **Air conduction (CA)** — sound through air → drawn as **blue circles with a solid line**
- **Bone conduction (CO)** — sound through bone → drawn as **red brackets with a dashed line**
- **Each ear gets its own chart** (OD = right, OG = left)
- **dB scale is inverted**: 0 dB at top (perfect hearing), 130 dB at bottom (profound loss)
- **Frequencies**: 250, 500, 1000, 2000, 4000, 8000 Hz (on top)
- **0–20 dB zone = normal hearing** (shaded green, 20 dB reference dashed line)

### 7.2 The data format

```json
{
  "right": {
    "CA": { "250": 10, "500": 20, "1000": 40, "2000": 60, "4000": 80, "8000": 100 },
    "CO": { "500": 25, "1000": 45 }
  },
  "left": { "CA": {}, "CO": {} }
}
```

CA/CO per ear, each mapping frequency → dB. Stored as JSON string in `audiogramme_json`. This format matches the Noah ES standard for future sync.

**Data migration (`migrate()` function):** the tool must read 3 input shapes:
1. New format `{right:{CA,CO}, left:{CA,CO}}` — detected by `right.CA` existing
2. Legacy format `{od:[{f:1000,d:40}], og:[]}` — auto-converted
3. Corrupt/missing — fall back to empty structure

### 7.3 The three-layer implementation

| Layer | File | Responsibility |
|---|---|---|
| Schema | `audiogramme.json` | DocType with HTML field + hidden JSON field |
| Server | `audiogramme.py` (14 lines) | auto-fill patient_name, stamp created_by |
| Client | `audiogramme.js` (273 lines) | the entire canvas engine |
| Styles | `audiometrie.css` (153 lines) | layout, toolbar, colors |

### 7.4 How the canvas engine works (the JS, function by function)

**`refresh(frm)`** — entry point. Two paths:
- No data → show a "Commencer l'audiogramme" button; on click initialize empty JSON `{right:{CA:{},CO:{}}, left:{CA:{},CO:{}}}` and render
- Has data → render immediately

**`render_audiogramme(frm)`** — builds an HTML string:
- Toolbar (CA/CO mode buttons + Effacer + Sauvegarder)
- A `<table>` with two `<td class="ao-cell">` separated by a `<td class="ao-gap">` (24px)
- Each cell: colored title (blue OD / red OG), `<canvas width="340" height="480">`, legend
- Injects into the HTML field's `$wrapper`
- Uses `setTimeout(50ms)` to let the DOM render, then draws + binds events

**`draw(id, ear)`** — renders one canvas:
1. White background
2. Green normal-hearing zone (top 2 of 14 rows)
3. Vertical grid lines at each frequency (6)
4. Horizontal grid lines at each dB step (14: 0→130)
5. Border, Hz labels on top, dB labels on left, rotated "dB HL" label
6. Dashed 20 dB reference line
7. **CA curve**: blue solid polyline + open circles (radius 5)
8. **CO curve**: red dashed polyline + bracket symbols `[ ]`
9. If no data → centered "Aucune donnée disponible"
10. Saves layout constants on the canvas DOM node (`c._L, c._T, c._pW, c._pH`) for the click handler

**Coordinate math (`xy(f, db)`):**
```
x = LEFT + (freqIndex / 5) * plotWidth
y = TOP  + (dbIndex  / 13) * plotHeight
```
Linear mapping by index; nearest dB match if not exact (e.g. 45 → 40).

**`click(frm, id, key, st)`** — places a point:
1. Get mouse position relative to canvas, correcting for CSS scaling (`canvas.width / rect.width`)
2. Loop all 6×14 = 84 grid intersections, find the nearest
3. If distance < 30px (tolerance, prevents accidental clicks), set `st.data[ear][mode][freq] = dB`
4. Redraw that ear

**`toolbar(frm, st)`** — wires buttons:
- CA/CO buttons → change `st.type` (the active mode), highlight via `setbtn()`
- Sauvegarder → `frm.doc.audiogramme_json = JSON.stringify(st.data); frm.save();` + green toast
- Effacer → confirm dialog → reset both ears → save → redraw

**`setbtn(st)`** — toggles CSS classes for active mode styling.

### 7.5 The CSS strategy

- `.ao-wrap { min-width: 720px !important }` — overrides Frappe's width constraints
- `.ao-table { table-layout: fixed }` — forces two equal columns
- `.ao-cell { width: 50% }` — half width each ear
- `.ao-btn.active.ao-ca` → blue highlight; `.ao-btn.active.ao-co` → red highlight
- canvas `cursor: crosshair` — signals "click to draw"
- Color coding: OD blue `#2563EB`, OG red `#DC2626`; CA blue, CO red — consistent clinical convention

### 7.6 What happens on "Sauvegarder" — full request lifecycle

```
1. Browser JS: st.data[ear][mode][freq] = dB     (in memory)
2. User clicks Sauvegarder:
   frm.doc.audiogramme_json = JSON.stringify(st.data)
   frm.save()
3. Frappe JS → POST /api/resource/Audiogramme/AUD-...-0001
   (session cookie = who is the user)
4. Frappe framework:
   a. authenticate session
   b. check "write" permission for user's roles
   c. load existing document from PostgreSQL
5. Frappe merges submitted values
   → Audiogramme.validate()        [Python: fills patient_name]
   → Audiogramme.before_save()     [Python: stamps created_by]
6. Frappe writes row to tabAudiogramme (PostgreSQL), commits
7. Response → browser shows green toast "Audiogramme sauvegardé"
8. Redis cache invalidated for that record
```

**THE critical mental model:** steps 1–2 are JavaScript in YOUR browser; steps 4–6 are Python on the SERVER; they talk only via HTTP JSON. **The client never touches the database.**

---

## CHAPTER 8 — THE CNAM MODULE: born, grew, removed (the full story)

### Why it existed
CNAM is Tunisia's national health insurance. Clinics submit reimbursement claims for patient treatments. Odyio planned a full claims workflow.

### What was built
- **CNAM Demande** (submittable DocType): the claim — customer, linked Sales Invoice / Delivery Note, amounts (HT/TTC/demande/remboursement/approuve), status workflow (Brouillon/Soumise/En cours/Approuvee/Refusee/Annulee), AI fields (probability, prediction, rejection reason), accounting links
- **CNAM Document** (child table): attached documents per claim (Ordonnance/Audiogramme/Devis) with AI-extracted data and confidence
- **Print formats**: Odyio BL (delivery note), Odyio Facture (invoice), Odyio CNAM Dossier (claim dossier)
- **`custom_cnam_eligible`** checkbox on Sales Invoice
- **AI integration**: fields to store AI prediction of approval probability (the AI service itself was removed earlier)
- **Workspace**: 9 cards, 9 shortcuts, 45 French links

### Why it was removed (latest decision)
To focus the MVP on the audiometry core. Removed as a clean refactor:
- **25 files deleted, 1,333 lines removed**
- README updated (removed Phase 2 CNAM section, DocTypes, custom fields, install steps)
- `setup/create_custom_apps.sh` updated
- **Side effect (still pending on server):** the Odyio workspace was tied to module "Odyio CNAM", so it must be rebuilt after removing the app.

### What remains on the server to do (manual)
```bash
bench --site odyio.localhost remove-app odyio_cnam
bench remove-app odyio_cnam
bench --site odyio.localhost migrate
bench build
```

---

## CHAPTER 9 — GIT HISTORY (the whole story in 11 commits)

| # | Commit | What it means |
|---|---|---|
| 1 | `ac63d9c` Initial commit: Audiosoin ERP | First scaffold — old name |
| 2 | `728deb3` Migrate to Frappe/ERPNext v15 — Odyio SaaS architecture | Big switch: from Spring Boot/React to Frappe |
| 3 | `d1f0b1f` Remove binary artifacts | Clean junk from archive |
| 4 | `65ce948` chore: switch from MariaDB to PostgreSQL | New bench `odyio-bench-pg` |
| 5 | `1bf4526` feat: scaffold React frontend (Vite + Tailwind) | Attempt at custom frontend |
| 6 | `7bc7517` refactor: remove AI service entirely | Killed the AI feature |
| 7 | `f685e86` refactor: remove React frontend, back to Frappe Desk only | Killed custom frontend — Desk UI wins |
| 8 | `978ee9b` feat: add odyio_audiometrie app with Audiogramme DocType | The audiogram feature is born |
| 9 | `8a9096f` refactor: rewrite audiogramme with clinical dual-ear format | Final canvas (CA+CO, inverted dB, table layout) |
| 10 | `4374c94` chore: ignore Redis dump.rdb | Git hygiene |
| 11 | `2a3f2a6` refactor: remove entire odyio_cnam module | CNAM removed |

**The architectural evolution visible in git:**
Spring Boot + React + FastAPI (old, archived) → Frappe/ERPNext v15 Desk-only → + Postgres → + Audiometrie app → − CNAM → = current clean state.

---

## CHAPTER 10 — THE CURRENT STATE (exactly where we stand)

### Repo structure
```
audioprosthetist_SaaS/
├── apps/
│   ├── odyio_audiometrie/        # ACTIVE app — the audiogram tool
│   └── odyio_noah/               # placeholder for future Noah ES sync
├── archive/                      # old Spring Boot/React code (reference)
├── setup/
│   └── create_custom_apps.sh     # install script (Noah only now)
├── README.md                     # full docs (French)
├── PROJECT_LOG.md                # dev journal with timestamps
├── RECENT_PROGRESS.md            # short summary for presentations
└── THIS_FILE                     # you're reading it
```

### Environment (WSL2)
| Item | Value |
|---|---|
| Bench | `/home/odyio/odyio-bench-pg` |
| Site | `odyio.localhost` |
| Admin | `admin@odyio.tn` / `Odyio@2025!` |
| Apps installed | frappe, erpnext, odyio_noah, odyio_audiometrie (+ odyio_cnam until removed) |
| PostgreSQL | user `odyio`, db `odyio_db`, port 5432 |
| Redis ports | cache 6380, queue 6381, socketio 6382 |
| URL | `http://odyio.localhost:8000` |
| Audiogram form | `http://odyio.localhost:8000/app/audiogramme` |

### Role "Audiometriste" — referenced but not yet created
The Audiogramme DocType grants read/write/create (no delete) to role "Audiometriste". This role must still be created on the server and assigned to the audiometrist user.

### Known remaining tasks
1. Remove odyio_cnam from the live bench (`remove-app`)
2. Rebuild the Odyio workspace (it was tied to the deleted module)
3. Create the "Audiometriste" role
4. Responsive: canvases are fixed 340×480; on screens <768px they should stack instead of scroll
5. Future phases: Noah ES sync, B2B marketplace, audiogram PDF printing, tests

---

## CHAPTER 11 — QUICK REFERENCE CARDS

### Command cheat sheet
```bash
# every change to a DocType JSON requires
bench --site odyio.localhost migrate

# run a Python function from an app
bench --site odyio.localhost execute myapp.module.function

# rebuild UI assets after JS/CSS changes in apps
bench build

# clear cache after changes
bench --site odyio.localhost clear-cache

# interactive Python against live data
bench --site odyio.localhost console
#   → frappe.get_list("Audiogramme")
#   → frappe.get_doc("Audiogramme", "AUD-CUS-00001-0001")
#   → frappe.db.get_value("Customer", "CUS-00001", "customer_name")
```

### Glossary (memorize these)
- **Meta-framework**: a framework that generates apps for you
- **DocType**: a data + form + API definition in one JSON
- **Document**: one record of a DocType
- **Controller**: Python class = DocType's server behavior
- **Form script**: JS = DocType's client behavior
- **Hook**: an event you subscribe to in hooks.py
- **Module**: namespace = folder = one line in modules.txt
- **Site**: one database + one URL + its config
- **Bench**: the CLI + folder that orchestrates everything
- **docstatus**: 0 draft / 1 submitted / 2 cancelled (only for submittable docs)
- **ORM**: Object-Relational Mapping — Python objects instead of raw SQL
- **JSONB**: PostgreSQL's queryable JSON column type

### The fieldtype decisions in our DocType (why each choice)
| Field | Type | Why |
|---|---|---|
| patient | Link → Customer | reuse ERPNext patients |
| patient_name | Data + fetch_from | display convenience |
| date_examen | Date, default Today | one click |
| type_audiogramme | Select | fixed clinical types |
| oreille_droite/gauche | Select | quick severity labels |
| audiogramme_json | Code/JSON, hidden | machine storage |
| audiogramme_html | HTML | the canvas container |
| notes | Small Text | free text |
| created_by | Data, read-only | audit trail |

---

## CHAPTER 12 — SUGGESTED LEARNING PLAN (if you want to go deeper yourself)

1. **Read `audiogramme.js` with Chapter 7 open** — trace each function
2. **Explore the bench console** — `bench --site odyio.localhost console`, run `frappe.get_list("Audiogramme")`, then `frappe.db.sql("SELECT * FROM tabAudiogramme")` to see the actual table
3. **Inspect the live table** — `sudo -u postgres psql odyio_db -c "\d tabAudiogramme"` (see what your JSON became)
4. **Build a second DocType by hand** — e.g. a "Séance" with a Link to Audiogramme (learns relationships + child tables)
5. **Break it on purpose** — change a fieldtype, `bench migrate`, see what happens to the form

---

*Generated as the definitive single source of truth for teaching Odyio. Feed to any AI presentation/video tool as-is.*
