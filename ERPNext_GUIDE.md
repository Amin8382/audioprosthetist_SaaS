# ERPNext — How Odyio Uses It, Taught Completely

> **How to use this file:** Paste into any AI tool (Gamma for slides, NotebookLM for audio, Claude for interactive teaching). It explains everything about ERPNext — the software, the concepts, and exactly how the Odyio clinic uses it.

---

## CHAPTER 1 — WHAT IS ERPNext?

### The one-paragraph answer

ERPNext is **open-source ERP (Enterprise Resource Planning) software** — a suite of business applications covering sales, purchasing, inventory, accounting, CRM, HR, and manufacturing. It is built **entirely on the Frappe framework**. Odyio chose it so we don't reinvent the wheel: instead of writing code for invoicing, stock, and accounting, we install ERPNext and configure it for a hearing-aid clinic.

### Why ERPNext and not "just Frappe"?

Frappe alone is a general-purpose app-building framework — it can build *anything* (a blog, a school system, a project tracker). ERPNext is **a finished product** built *with* Frappe: hundreds of pre-built DocTypes, forms, reports, workflows, and accounting logic.

| | Frappe Framework | ERPNext |
|---|---|---|
| What it is | Toolkit for building web apps | A complete ERP product |
| Contains | DocType engine, ORM, UI system | Customers, Invoices, Stock, Accounting, HR |
| Odyio's role | The engine under everything | The business system we configure |
| Customization | We write new DocTypes | We configure + extend |

**The key insight:** ERPNext is not a separate program. It's an app folder (`apps/erpnext/`) that plugs into the same bench, the same sites, the same database as our custom apps. When you open a "Customer" form in Odyio, you're running ERPNext's DocType `Customer`, whose code lives in `apps/erpnext/erpnext/selling/doctype/customer/`.

---

## CHAPTER 2 — ERPNext MODULE MAP

ERPNext organizes its DocTypes into **modules** (namespaces, just like ours). Odyio uses these:

```
erpnext/
├── accounts/        → Invoices, Payments, Journal Entries, Chart of Accounts
├── selling/         → Quotation, Sales Order, Customer
├── buying/          → Supplier, Purchase Order, Supplier Quotation
├── stock/           → Item, Item Group, Warehouse, Delivery Note, Stock Entry
├── crm/             → Lead, Opportunity, Contact, Address
└── setup/           → Company, Fiscal Year, Naming Series, Mode of Payment
```

The module name appears in the DocType JSON — `"module": "Accounts"` etc. This is exactly the same mechanism as our `"module": "Audiometrie"`.

---

## CHAPTER 3 — MASTER DATA (the foundation we configured)

"Master data" = the configuration and reference records everything else points to. Without it, invoices and stock movements have nothing to reference. Here's what Odyio set up in Phase 1 (via `bench console`):

### 3.1 Company — "Odyio Clinique"

- The legal entity everything belongs to
- Country: Tunisia
- **Default currency: TND** (Tunisian Dinar)
- In Frappe, the Company record links to: Chart of Accounts, Fiscal Year, default warehouse, default accounts

### 3.2 Fiscal Year — 2025

A fiscal year defines the accounting period (in Tunisia it aligns with the calendar year). Closing the fiscal year is how accountants finalize the books. In the future, `Fiscal Year` records allow year-end closing.

### 3.3 Naming Series — how documents get their numbers

We configured custom series so every business document is auto-numbered with a readable French prefix:

| Document | Series | Example |
|---|---|---|
| Sales Invoice (Facture) | `FAC-.YYYY.-.####` | FAC-2025-0001 |
| Delivery Note (Bon de livraison) | `BL-.YYYY.-.####` | BL-2025-0001 |
| Purchase Order (Commande achat) | `BC-.YYYY.-.####` | BC-2025-0001 |
| Maintenance Visit | `REP-.YYYY.-.####` | REP-2025-0001 |

The `.YYYY.` inserts the year, `.####` the counter. This is Frappe's *autoname series* — the same concept as our audiogram's `AUD-{patient}-{####}`.

### 3.4 Item Groups — the product taxonomy

ERPNext items (products) are organized in a **tree** of Item Groups. We created 5 top-level groups:

```
Item Groups
├── APPAREIL_AUDITIF   → hearing aids themselves (the big-ticket devices)
├── ACCESSOIRE         → accessories (cables, drying boxes, ...)
├── PILE               → batteries
├── EMBOUT             → ear molds
└── AUTRE              → everything else
```

Every Item (product) must belong to a group. This taxonomy powers reports ("all hearing aids sold this month") and the future marketplace.

### 3.5 Warehouse — "Clinique Principale - OC"

Stock lives in **Warehouses**. Odyio has one: the clinic's own storage. (A larger clinic would add: branch stores, technician bench, returned-goods area.) Stock is counted **per warehouse** — moving items between warehouses is itself an inventory transaction.

### 3.6 Mode of Payment — "BON_ACHAT_CNAM"

Payment methods list (cash, card, bank transfer, ...). We added **BON_ACHAT_CNAM**: the Tunisian state health-insurance voucher used as payment for covered patients. When an invoice is paid by CNAM voucher, the Payment Entry references this mode.

### 3.7 Role — "Fournisseur"

A custom role granting *suppliers* limited Desk access (so they can see purchase orders / submit quotations online in the future).

---

## CHAPTER 4 — PATIENTS = CUSTOMERS

### The design decision

In ERPNext, a Customer is a legal/billing entity you sell to. In Odyio, **the patient IS the Customer** record. This is the master integration decision: everything ERPNext offers for customers (sales, credit, contacts, addresses, ledger) applies directly to patients.

### ERPNext built-in Customer fields we rely on
- Customer Name (`customer_name`) — the display name we auto-fill into audiograms
- Customer Group, Territory — categorization
- Currency, credit limits
- Related Contacts (`Contact`) and Addresses (`Address`)

### Our custom fields added on top (13 fields)

We extended the Customer form with clinical/insurance data:

| Field | Type | Purpose |
|---|---|---|
| `cnam_number` | Data | National insurance number |
| `cnam_affiliation_type` | Select | CNAM_ACTIVE / CNAM_RETIRED / PRIVATE / NONE |
| `cnam_expiry` | Date | Insurance validity |
| `audiogram_section` | Section Break | UI grouping |
| `audiogram_left` | JSON | Old audiogram storage (right ear) |
| `audiogram_right` | JSON | Old audiogram storage (left ear) |
| `ear_side` | Select | LEFT / RIGHT / BILATERAL |
| `noah_section` | Section Break | UI grouping |
| `noah_patient_id` | Data | ID in Noah ES software |
| `noah_last_sync` | Datetime | Last sync timestamp |
| `noah_sync_status` | Select | SYNCED / OUT_OF_SYNC / NEVER_SYNCED / SYNC_ERROR |

**How custom fields work:** ERPNext (and Frappe) support `Custom Field` records — you add fields to *existing* DocTypes without touching ERPNext's code. `bench migrate` then runs `ALTER TABLE tabCustomer ADD COLUMN ...` automatically. This is the official, upgrade-safe extension path.

### The patient flow in the clinic
1. Reception creates a **Customer** for the new patient
2. Fill CNAM/Noah fields in the customer form
3. Audiometrist creates an **Audiogramme** linked to that Customer (our app)
4. Salesperson sells a hearing aid to that Customer → Sales flow (Chapter 5)

---

## CHAPTER 5 — THE SALES CYCLE (the clinic's money flow)

This is the most important business process. When the clinic sells a hearing aid to a patient, a chain of documents is created. Each one "submits" (docstatus 0 → 1) and triggers accounting/stock effects.

```
Quotation → Sales Order → Delivery Note → Sales Invoice → Payment Entry
  (devis)     (commande)    (bon de livraison)  (facture)    (encaissement)
```

### Step 1 — Quotation (Devis)
- A price quote for the patient
- Lists items (hearing aid model, battery, mold), quantities, prices
- Not binding; can be "Lost"/"Cancelled"
- **Status field**: Draft → Sent → Ordered / Lost

### Step 2 — Sales Order (Commande vente)
- The patient accepts → convert the Quotation to a Sales Order
- **Locks the commitment**: reserved items, delivery date, payment terms
- Optionally **reserves stock** (if "Update Stock" enabled) — items become "Ordered" qty
- **Status field**: Draft → To Deliver and Bill → Completed → Cancelled

### Step 3 — Delivery Note (Bon de livraison)
- Physical goods leave the clinic → **stock decreases** (creates Stock Ledger entries)
- Also creates **accounting entries** (removes items from inventory, recognizes cost)
- Per our config, numbered `BL-2025-XXXX`
- We customized this with a `bl_type` Select field (types of delivery) and a French print format "Odyio BL"

### Step 4 — Sales Invoice (Facture)
- The financial document: "patient owes this amount"
- Creates an **Accounts Receivable** — the patient now owes money
- If it's a CNAM voucher patient, our `custom_cnam_eligible` checkbox marks the invoice as insurance-covered
- Numbered `FAC-2025-XXXX`, printed via our "Odyio Facture" print format
- **When you submit a Sales Invoice, ERPNext writes accounting entries** (debit receivable, credit income + tax) — you do NOT write them by hand
- **Status field**: Draft → Unpaid → Overdue / Paid

### Step 5 — Payment Entry (Encaissement)
- Money actually arrives: cash, card, bank transfer, or **CNAM voucher** (our BON_ACHAT_CNAM mode)
- Links to the invoice(s) it settles → clears the receivable
- Can handle partial payments, advances, multi-invoice settlement

### The accounting side (what happens invisibly)

Every submitted document generates **Journal Entry-like GL entries** automatically:

```
Submitting a Sales Invoice of 100 TND:
  Debit   Accounts Receivable (patient)    100
  Credit  Sales Income                      100

Receiving the payment:
  Debit   Cash / Bank                       100
  Credit  Accounts Receivable (patient)    100
```

These flow into the **General Ledger** and the **Accounts Receivable report** — the clinic always knows who owes what.

---

## CHAPTER 6 — THE PURCHASE CYCLE (restocking the clinic)

The clinic buys devices and accessories from manufacturers.

```
Supplier → Purchase Order → Purchase Receipt → Purchase Invoice → Payment
            (commande achat)  (réception)      (facture fournisseur)
```

- **Supplier** — the manufacturer/supplier record (like Customer but for buying)
- **Purchase Order** — numbered `BC-2025-XXXX`, what we ordered at what price
- **Purchase Receipt** — goods arrive → **stock increases**
- **Purchase Invoice** — "we owe this supplier money" → creates **Accounts Payable**
- **Payment Entry** — paying the supplier → clears the payable

The **role "Fournisseur"** we created will let suppliers log in and see/manage their orders and quotations.

---

## CHAPTER 7 — STOCK MANAGEMENT

### The core DocTypes
- **Item** — a product master record: name, code, Item Group, unit (UOM), price lists, stock settings
- **Item Group** — the category tree (our 5 groups)
- **Warehouse** — a physical location ("Clinique Principale - OC")
- **Stock Entry** — any manual movement (receive, transfer, adjust, discard)
- **Delivery Note / Purchase Receipt** — the *source* of most stock movements
- **Stock Ledger Entry** — every single stock event (audit trail, like the GL for money)

### How stock actually works

Every item movement writes a **Stock Ledger Entry**: which item, which warehouse, quantity in/out, at what valuation. Reports roll these up into current **Stock Balance**.

The ledger makes everything auditable: "when did 5 Phonak devices enter, and when did each leave?"

### Stock valuation (worth understanding)
ERPNext values stock automatically (FIFO or Moving Average). When a delivery happens, the item's cost flows into the invoice's accounting — that's how the **Gross Profit report** works: Selling Price − Cost of Goods = Gross Profit.

---

## CHAPTER 8 — ACCOUNTING EXPLAINED (the part everyone fears)

### The big idea: double-entry bookkeeping

Every financial event writes to **at least two accounts**: money moves *out of* one and *into* another. The **Chart of Accounts** is the list of all accounts (Assets, Liabilities, Income, Expenses), and the **General Ledger** is the running history of every entry.

### The accounting modules Odyio uses

| DocType | What it does |
|---|---|
| **Chart of Accounts** | The account tree; set up automatically when the Company was created |
| **Journal Entry** | Manual adjustments (opening balance, corrections, internal transfers) |
| **General Ledger** | The full history of every account movement |
| **Accounts Receivable** | Report: how much each patient owes, aged by days |
| **Accounts Payable** | Report: how much Odyio owes each supplier |
| **Gross Profit** | Report: revenue − cost per invoice |
| **Bank Account** | Bank accounts for reconciliation |

### The 5 reports in the Odyio "Rapports" card
1. **Livre Grand Livre** (General Ledger) — everything, account by account
2. **Clients - Recevoir** (Accounts Receivable) — what patients owe
3. **Fournisseurs - Payer** (Accounts Payable) — what we owe suppliers
4. **Balance Stock** (Stock Balance) — what's in the warehouse
5. **Marge Brute** (Gross Profit) — margin per sale

---

## CHAPTER 9 — ROLES & PERMISSIONS IN PRACTICE

### The hierarchy
```
User ──has──▶ Roles ──control──▶ DocType permissions
```

### Odyio's roles today
| Role | Who has it | Why |
|---|---|---|
| Administrator | system owner | root access |
| System Manager | admin@odyio.tn | technical management |
| **Workspace Manager** | admin@odyio.tn | **fixes the workspace visibility bug** (bypasses the allowed_modules check) |
| Sales User / Manager | staff | customers, quotations, invoices |
| Accounts User / Manager | staff | payments, journal entries |
| Stock User / Manager | staff | items, warehouse |
| Purchase User / Manager | staff | suppliers, purchase orders |
| **Audiometriste** | audiometrist (to create) | our custom role: read/write/create on Audiogramme, **no delete** |
| **Fournisseur** | suppliers (to create) | limited access for supplier portal |

### The bug that taught us permissions
ERPNext's `Customer` DocType default permissions don't include System Manager — so even the admin got "Not permitted" on Customers. **Fix:** assign the operational roles (Sales, Accounts, Stock, Purchase) to the admin user.

**Lesson:** in Frappe, rights come from the DocType's `permissions` array matched against your *roles* — being Administrator does NOT grant access to a DocType that doesn't list a role you have.

---

## CHAPTER 10 — HOW ODYIO'S CUSTOM APPS INTEGRATE WITH ERPNext

### 10.1 The Audiogramme ↔ Customer link (done)

In `audiogramme.json`:
```json
{
  "fieldname": "patient",
  "fieldtype": "Link",
  "options": "Customer",
  "reqd": 1
}
```

- The form shows a dropdown of ERPNext Customers
- `"fetch_from": "patient.customer_name"` auto-fills the display name
- `frappe.db.get_value("Customer", self.patient, "customer_name")` in the controller is a backup

**Result:** every audiogram is a document that belongs to a Customer record — you can list all audiograms of a patient, and (in the future) link audiograms to their Sales Invoice.

### 10.2 The CNAM fields (removed but instructive)
Custom fields on Customer (`cnam_number`, `cnam_affiliation_type`, `cnam_expiry`) and on Sales Invoice (`custom_cnam_eligible`) showed the pattern for extending ERPNext's own DocTypes. If CNAM returns, the fields come back with the same mechanism.

### 10.3 Custom roles for ERPNext workflows
`Audiometriste` and `Fournisseur` are Frappe roles — they can be attached to ERPNext DocTypes too (e.g., give Audiometriste read on Customer, give Fournisseur write on their own Purchase Orders).

### 10.4 Future: Noah ES sync
The future Noah ES sync will write patient data back into ERPNext's `Customer` via the REST API (`/api/resource/Customer`) — the fields `noah_patient_id`, `noah_last_sync`, `noah_sync_status` already exist for it.

---

## CHAPTER 11 — THE ODYIO WORKSPACE vs ERPNext MODULES

The Odyio workspace is our **dashboard layer** over ERPNext — it groups the ERPNext DocTypes the clinic actually uses, with French labels:

| Odyio Card | Links to (ERPNext DocTypes) |
|---|---|
| Patients & Dossiers | Customer, Contact, Address |
| Ventes & Facturation | Quotation, Sales Order, Sales Invoice, Payment Entry, Mode of Payment |
| Articles & Stock | Item, Item Group, Warehouse, Stock Entry, Delivery Note |
| Achats & Fournisseurs | Supplier, Purchase Order, Purchase Invoice |
| Tresorerie | Journal Entry, Account, Bank Account |
| Rapports | General Ledger, AR, AP, Stock Balance, Gross Profit |
| Marketplace | Item, Item Group, Supplier (future B2B) |
| Configuration | Company, Fiscal Year, Warehouse, Mode of Payment, User, Role, Print Format, Naming Settings |
| Audiometrie | **Audiogramme** (our custom DocType) |

Plus 9 shortcuts: Patients, Factures, Articles, Bon de Livraison, Fournisseurs, Commande Vente, Commande Achat, Encaissement, Audiogrammes.

**Note:** this workspace currently needs rebuilding because it was tied to the deleted "Odyio CNAM" module.

---

## CHAPTER 12 — DAY IN THE LIFE (putting it all together)

### Morning — new patient "Mme Ben Salah" walks in

1. **Reception**: User → "Patients" → New Customer → name + phone + CNAM number (`cnam_number`). 
2. **Audiometrist**: opens "Audiogrammes" → New → selects the patient → clicks "Commencer l'audiogramme" → draws CA and CO curves for OD and OG → Sauvegarder. Record `AUD-CUS-00001-0001` saved with JSON data.
3. **Seller**: creates a **Quotation** for a hearing aid + 1 battery + 1 mold, based on the audiogram result. Patient agrees → convert to **Sales Order**.
4. **Seller**: creates **Delivery Note** → stock of that hearing aid decreases → prints "Odyio BL".
5. **Seller**: creates **Sales Invoice** (FAC-2025-0001, marked `custom_cnam_eligible` if CNAM-covered) → patient owes money → prints "Odyio Facture".
6. **Accountant**: patient pays with CNAM voucher → **Payment Entry** using mode **BON_ACHAT_CNAM** → receivable cleared.
7. **Manager** checks "Clients - Recevoir" and "Marge Brute" reports at end of day.

### When stock runs low
1. Create **Purchase Order** (BC-2025-0001) to a manufacturer (Supplier)
2. On delivery, **Purchase Receipt** → stock increases
3. **Purchase Invoice** → we owe the supplier
4. Pay → **Payment Entry**

### All documents connected
```
Customer (Mme Ben Salah)
  ├── Audiogramme AUD-CUS-00001-0001     (our app)
  ├── Quotation → Sales Order → Delivery Note (BL-2025-0001)
  │       └── Sales Invoice (FAC-2025-0001) → Payment Entry (CNAM)
  └── (future) Noah ES sync of her fittings
```

---

## CHAPTER 13 — QUICK REFERENCE CARDS

### The 12 ERPNext DocTypes Odyio actively uses
| DocType | French label | Module | Purpose |
|---|---|---|---|
| Customer | Patient | CRM | the patient |
| Contact / Address | Contact / Adresse | CRM | patient details |
| Quotation | Devis | Selling | price quote |
| Sales Order | Commande Vente | Selling | order commitment |
| Delivery Note | Bon de Livraison | Stock | goods out |
| Sales Invoice | Facture | Accounts | money owed |
| Payment Entry | Encaissement | Accounts | money received |
| Item | Article | Stock | product master |
| Item Group | Groupe d'Articles | Stock | product categories |
| Warehouse | Entrepot | Stock | location |
| Supplier | Fournisseur | Buying | supplier |
| Purchase Order | Commande Achat | Buying | purchase order |
| Purchase Invoice | Facture Fournisseur | Accounts | money we owe |
| Journal Entry | Ecriture Comptable | Accounts | manual adjustments |
| Company / Fiscal Year | Entreprise / Exercice | Setup | legal + period |

### The status (docstatus) cycle
- **0 Draft** → editable
- **1 Submitted** → locked, accounting/stock effects applied
- **2 Cancelled** → reversed

### Key reports (French labels we use)
- General Ledger → Livre Grand Livre
- Accounts Receivable → Clients - Recevoir
- Accounts Payable → Fournisseurs - Payer
- Stock Balance → Balance Stock
- Gross Profit → Marge Brute

### The extension patterns (memorize)
1. **Link to Customer** → `{"fieldtype": "Link", "options": "Customer"}`
2. **Add field to ERPNext DocType** → Custom Field record + `bench migrate` (auto `ALTER TABLE`)
3. **Custom role** → Role record → assign to User → reference in any DocType `permissions`
4. **Custom print format** → Jinja template in app's `templates/print_format/` + Print Format record
5. **Custom naming** → Naming Series settings (e.g., `FAC-.YYYY.-.####`)
6. **Custom reports** → Script Report (SQL) registered in an app

---

## CHAPTER 14 — CONCEPTS MOST PEOPLE CONFUSE (set these straight)

| Confusion | Reality |
|---|---|
| "Sales Order and Sales Invoice are the same" | No. Order = commitment; Invoice = financial obligation. They can be combined with the "Make Invoice" shortcut but remain separate documents. |
| "Submitting = saving" | No. Saving = Draft. **Submitting** = finalize + trigger accounting/stock + lock. |
| "I must write accounting entries myself" | No. ERPNext generates them from business documents. Manual entries are for exceptions. |
| "Deleting a submitted document" | Not possible. You must **Cancel** (docstatus 2) to reverse it, keeping the audit trail. |
| "Custom Field = editing ERPNext code" | No. Custom Fields are data records — upgrade-safe. |
| "Items and Item Groups are the same" | No. Groups = categories; Items = actual products. |
| "Warehouse = the whole clinic" | A warehouse is one stocking location. You can have many. |

---

## CHAPTER 15 — SUGGESTED EXERCISES (learn by doing)

1. **Create a test patient** → Customer with a CNAM number
2. **Create a Quotation** for 1 hearing aid item → submit → convert to Sales Order
3. **Create a Delivery Note** → check Stock Balance report (quantity decreased)
4. **Create a Sales Invoice** → check Accounts Receivable report (patient owes)
5. **Create a Payment Entry** (cash) → check AR report again (cleared) + General Ledger
6. **Buy stock back** → Purchase Order → Purchase Receipt → check Stock Balance increased
7. **Open the GL** → find every entry created automatically by your steps
8. **Create a Journal Entry** for a manual adjustment
9. **Add a Custom Field** to Customer (e.g., `blood_type`) → `bench migrate` → inspect `tabCustomer` in psql
10. **Try to delete a submitted invoice** → see the Cancel/Amend behavior

---

*Definitive reference: ERPNext in the Odyio context. Feed to any AI tool as-is.*
