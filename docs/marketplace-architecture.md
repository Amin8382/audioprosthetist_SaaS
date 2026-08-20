# Odyio Marketplace Architecture

## Overview

`odyio_marketplace` is a Frappe Framework v15 / ERPNext v15 app that implements
the local B2B marketplace MVP. It reuses ERPNext master and transaction
DocTypes instead of recreating standard ERPNext behavior.

The archived Spring Boot and React marketplace remains a read-only business and
UX reference. The active implementation is Frappe Desk pages, server-side
controllers, whitelisted APIs, User Permissions, fixtures, and idempotent setup
code.

## ERPNext Reuse

| Concept | Implementation |
| --- | --- |
| Clinic | ERPNext `Company` |
| Clinic user linkage | Frappe `User Permission` for one `Company` |
| Supplier | ERPNext `Supplier` |
| Supplier user linkage | Frappe `User Permission` for one `Supplier` |
| Product catalogue | ERPNext `Item` plus marketplace custom fields |
| Category | ERPNext `Item Group` |
| Product image | ERPNext `Item.image` and `File` |
| Accepted order | ERPNext `Purchase Order` in Draft |
| Notifications | Frappe `Notification Log` |

No custom Clinic DocType, parent-company hierarchy, negotiation model,
counter-offer model, or separate React frontend is introduced.

## Custom DocTypes

| DocType | Purpose |
| --- | --- |
| `Marketplace Quotation Request` | Clinic request sent to one Supplier. |
| `Marketplace Quotation Request Item` | Requested item lines and snapshots. |
| `Marketplace Supplier Offer` | One supplier-priced response for a sent request. |
| `Marketplace Supplier Offer Item` | Generated offer lines priced by the supplier before submission. |
| `Marketplace Devis Snapshot` | One presentation snapshot for a submitted supplier offer. Commercial lines remain on the offer. |
| `Marketplace Supplier Devis Settings` | One supplier-specific default Devis template/logo/terms setting. |

## Item Custom Fields

The app adds idempotent custom fields to ERPNext `Item`:

- `marketplace_section`
- `marketplace_enabled`
- `marketplace_available`
- `marketplace_supplier`
- `supplier_reference`
- `ear_side`
- `technical_specs`

The standard `Item.image`, `item_name`, `item_group`, `description`, and
`disabled` fields are reused. `Item.standard_rate` remains an ERPNext Item field
but is not a public marketplace catalogue price and is not used to price
supplier offers or marketplace Purchase Orders.

## Page Hierarchy

| Page | Role | Purpose |
| --- | --- | --- |
| `marketplace-catalogue` | Clinic User | Browse, search, filter, select items, review, and create sent requests. |
| `clinic-my-requests` | Clinic User | Track requests, offers, decisions, and marketplace Purchase Orders. |
| `supplier-incoming-requests` | Fournisseur | See assigned sent requests and create offers. |
| `supplier-my-offers` | Fournisseur | Track submitted, accepted, and rejected offers. |

Normal users use these pages through the Odyio Marketplace workspace. Raw
DocType forms remain support/admin surfaces, not the normal marketplace flow.

## API Structure

`odyio_marketplace.api` exposes narrow whitelisted methods:

- Clinic catalogue: `get_clinic_catalog_context`, `get_catalog_items`,
  `get_catalog_filters`, `preview_catalog_request`,
  `create_request_from_catalog`
- Supplier request/offer UX: `get_supplier_marketplace_context`,
  `get_supplier_incoming_requests`, `get_supplier_request_details`,
  `create_supplier_offer_from_request`, `get_supplier_my_offers`,
  `get_supplier_offer_details`, `submit_supplier_offer`
- Clinic tracking/decision UX: `get_clinic_marketplace_context`,
  `get_clinic_my_requests`, `get_clinic_request_details`,
  `get_clinic_offer_details`, `accept_supplier_offer_for_clinic`,
  `reject_supplier_offer_for_clinic`, `get_clinic_purchase_order_details`
- Devis: `get_devis_templates`, `preview_devis_template`,
  `get_supplier_devis_configuration`, `save_supplier_devis_configuration`,
  `confirm_supplier_devis`, `get_devis_snapshot`, `download_devis_pdf`,
  `upload_devis_logo`

Browser-supplied Company, Supplier, item identity, and quantity overrides are
not trusted during protected transitions. Supplier offer rates are accepted only
from the assigned supplier while the offer is Draft, must cover the request
lines exactly, and become fixed after submission.

## Fulfillment

Marketplace quotation requests require a fulfillment method:

- `DELIVERY`: clinic request review captures a request-level delivery address
  snapshot. The address is autofilled from the clinic Company Address where
  available and may be overridden for that request only.
- `PICKUP`: no delivery address is required or stored.

Fulfillment is informational. There is no delivery fee, freight line, VAT/tax
engine, or shipping workflow in this sprint. Suppliers account for delivery
costs in their submitted offer unit prices where applicable.

The supplier sees the selected fulfillment method and delivery address before
pricing the offer but cannot modify them. Supplier Offer and Devis views carry
the same fulfillment snapshot from the request.

## Devis Presentation

The existing `Marketplace Supplier Offer` remains the commercial source of
truth. A Devis is a printable presentation snapshot of a submitted offer; it is
not a second pricing/order document and does not introduce a new workflow.

`Marketplace Devis Snapshot` stores presentation data that should remain
historical:

- selected template: Classic, Modern, or Compact;
- supplier display name, logo, address, phone, email, optional identifiers;
- clinic display name, address, phone, email;
- fulfillment method and delivery-address snapshot;
- issue date, validity date, notes, and footer terms.

The snapshot references the immutable submitted offer for commercial lines:
items, quantities, unit prices, line totals, and total. It never reads
`Item.standard_rate`. Later changes to Supplier/Company profile data or default
template settings do not alter confirmed Devis snapshots.

`Marketplace Supplier Devis Settings` stores each supplier's persistent
presentation preferences for future Devis: default template, display name,
logo, address/city/country, phone, email, optional identifiers, and footer
terms. New Devis previews autofill from ERPNext Supplier Address/Contact/Profile
data when a setting is blank, then apply saved settings as overrides. The
supplier may change the template selected for one current Devis without changing
the saved default template. The builder shows one full live preview at a time;
template selectors do not render three full Devis documents simultaneously.

Three native Frappe Print Formats are installed idempotently:

- `Marketplace Devis Classic`
- `Marketplace Devis Modern`
- `Marketplace Devis Compact`

PDF generation uses Frappe's standard PDF path. The bench must have
`wkhtmltopdf` with patched Qt available for PDF download; print HTML and Print
Format rendering remain app-level and migration-safe. The marketplace delegates
actual PDF rendering to Frappe and reports whether the backend is missing,
present but unpatched, failing to execute, or failing during native generation.
A rejected offer without a confirmed historical Devis cannot create or preview
one after rejection.

## Workflow

```text
Clinic catalogue selection
  -> Marketplace Quotation Request: Sent / docstatus 1
  -> Supplier Incoming Requests
  -> Marketplace Supplier Offer: Draft / docstatus 0
  -> Supplier enters offer rates
  -> Supplier submits offer
  -> Marketplace Supplier Offer: Sent / docstatus 1
  -> Supplier confirms Devis presentation snapshot
  -> Clinic accepts
  -> Marketplace Supplier Offer: Accepted
  -> Draft ERPNext Purchase Order created exactly once
```

```text
Clinic catalogue selection
  -> Marketplace Quotation Request: Sent / docstatus 1
  -> Supplier submits offer
  -> Clinic rejects
  -> Marketplace Supplier Offer: Rejected
  -> No Purchase Order
```

Terminal states do not transition backward. Repeated acceptance and repeated
rejection are rejected server-side.

## Permission Model

| Area | Clinic User | Fournisseur | Administrator/System Manager |
| --- | --- | --- | --- |
| Catalogue | Read enabled and available marketplace Items | No clinic catalogue API access | Technical support access |
| Requests | Own Company only | Sent requests for assigned Supplier only | Full support access |
| Offers | Sent/accepted/rejected offers for own Company only | Offers for assigned Supplier only | Full support access |
| Devis | View/print/download confirmed Devis for own Company offers only | Create/view/print/download Devis for assigned Supplier offers only | Full support access |
| Purchase Orders | Marketplace-created POs linked to own Company requests only | No marketplace PO access | Full support access |
| Decisions | Accept/reject own eligible offers | Not allowed | Support access |

Permissions are enforced with custom DocPerms, User Permissions,
`permission_query_conditions`, `has_permission`, and server-side API checks.

## PostgreSQL Compatibility

The project runs on PostgreSQL. The app does not use MariaDB-specific SQL.
Permission query conditions quote PostgreSQL identifiers explicitly. A temporary
compatibility override for the Frappe goal graph aggregation is registered in
`hooks.py` until the framework behavior is updated locally.

ERPNext v15 also expects install-time Custom Fields on `Address` and `Contact`
for party/contact resolution. Marketplace setup verifies those official ERPNext
fields and recreates missing metadata idempotently when a local site has drifted
from the ERPNext install-time schema.

## Demo Setup

Use separate sites:

- `odyio.localhost`: automated tests
- `odyio-demo.localhost`: clean local demo

Seed local demo data with:

```bash
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.setup_demo_data
```

Set local passwords interactively:

```bash
bench --site odyio-demo.localhost set-user-password clinic@odyio.local
bench --site odyio-demo.localhost set-user-password supplier@odyio.local
```

Demo setup is idempotent, local-development only, and does not create `_Test`
or `_T-` fixtures. Demo product images are bundled under
`odyio_marketplace/public/images/demo-products/`, copied into standard public
Frappe `File` records, and assigned through ERPNext `Item.image`.

## Developer Onboarding

1. Edit the Windows checkout.
2. Sync only `apps/odyio_marketplace` to the WSL checkout with exact-path
   `rsync`.
3. Run tests on `odyio.localhost`.
4. Run demo setup and cache clear on `odyio-demo.localhost`.
5. Do not commit credentials, site config, databases, logs, caches, or bench
   runtime folders.

## Known Limitations

- One Supplier per request.
- Public catalogue prices are not exposed.
- One supplier-priced offer per request.
- No negotiation or counter-offers.
- Accepted offers create Draft Purchase Orders from the accepted offer rates
  only; downstream procurement submission/approval is left to ERPNext.
- Supplier product maintenance is minimal and remains a support/admin-oriented
  surface.
