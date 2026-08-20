# Odyio Marketplace Demo Runbook

This demo is for local development only. It must use a clean PostgreSQL site
separate from the automated test site.

## Site Split

- `odyio.localhost`: automated tests
- `odyio-demo.localhost`: manual marketplace demo

Do not run automated tests against `odyio-demo.localhost`. Frappe and ERPNext
test setup can create `_Test` and `_T-` records that are not suitable for a
manual demo database.

## Install The Demo Site

From `/home/medsadek/projects/odyio-bench`:

```bash
bench new-site odyio-demo.localhost --db-type postgres --db-root-username postgres
bench --site odyio-demo.localhost install-app erpnext
bench --site odyio-demo.localhost install-app odyio_audiometrie
bench --site odyio-demo.localhost install-app odyio_noah
bench --site odyio-demo.localhost install-app odyio_marketplace
bench --site odyio-demo.localhost migrate
```

Enter PostgreSQL and Administrator passwords interactively when Bench prompts.
Do not store those passwords in source files.

## Seed Demo Data

```bash
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.setup_demo_data
```

The setup command is idempotent and local-development only. It creates:

- Company `Odyio Demo Clinic`
- Supplier `Odyio Demo Supplier`
- Supplier `Odyio Demo Supplier Two`
- Clinic user `clinic@odyio.local`
- Supplier user `supplier@odyio.local`
- Supplier user `supplier2@odyio.local`
- 15 marketplace Item records across hearing aids, accessories, and consumables
- Mixed ear-side values: `LEFT`, `RIGHT`, `BILATERAL`, and `NOT_APPLICABLE`
- Mixed enabled/availability states for list and fallback QA
- Public Frappe `File` records for most demo product images
- A few products without images to exercise fallback UI
- Representative quotation requests, offers, and one draft Purchase Order for list/dashboard QA
- Delivery and Pickup quotation requests with delivery address snapshots
- A submitted supplier offer suitable for Devis template preview
- Supplier Devis defaults: Modern template, demo logo, and demo footer terms

The source SVG illustrations are bundled in
`odyio_marketplace/public/images/demo-products/`. Demo setup copies them into
site public File storage and assigns the resulting `/files/...` URLs to
ERPNext `Item.image`.

The demo supplier logo is an original SVG bundled with the same local assets.
It is stored as a standard public Frappe `File` attached to the Supplier and
referenced by `Marketplace Supplier Devis Settings`.

Set local passwords interactively:

```bash
bench --site odyio-demo.localhost set-user-password clinic@odyio.local
bench --site odyio-demo.localhost set-user-password supplier@odyio.local
bench --site odyio-demo.localhost set-user-password supplier2@odyio.local
```

## Reset And Reseed Demo Data

Use these only on local `.localhost` sites. They target known Odyio demo
marketplace records and do not run broad table deletes.

```bash
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.reset_demo_data
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.reset_and_setup_demo_data
```

`reset_demo_data` removes the known demo workflow requests/offers/Purchase
Orders and known demo Items/File attachments. It leaves the demo Company,
Suppliers, Users, and standard ERPNext masters in place so setup can safely
repair or reuse them.

## Actor Linkage

A clinic is the ERPNext `Company`. No separate Clinic DocType, parent company,
holding company, subsidiary, or company hierarchy is introduced.

- `clinic@odyio.local` has role `Clinic User` and one standard Frappe `User Permission` for Company `Odyio Demo Clinic`.
- `supplier@odyio.local` has role `Fournisseur` and one standard Frappe `User Permission` for Supplier `Odyio Demo Supplier`.
- `supplier2@odyio.local` has role `Fournisseur` and one standard Frappe `User Permission` for Supplier `Odyio Demo Supplier Two`.

The second supplier exists for permission and filtering QA. Its products must
not appear in `supplier@odyio.local` product-management APIs or pages, and the
primary supplier's products must not appear for `supplier2@odyio.local`.

## Demo Workflow Records

The demo seed creates representative marketplace workflow records:

- one Sent quotation request without an offer;
- one Sent request with a Draft supplier offer;
- one Submitted supplier offer awaiting clinic decision;
- one Accepted offer with a draft ERPNext Purchase Order;
- one Rejected offer with no Purchase Order.

These records populate the clinic and supplier home dashboard counts and make
`My Requests`, `Incoming Requests`, and `My Offers` useful immediately after
seeding.

Some workflow records use Delivery with the request-level delivery snapshot.
Others use Pickup. No delivery fee is created; fulfillment is shown to supplier
and clinic as fulfillment context only.

## Page-Based Demo Flow

1. Start Bench with `bench start`.
2. Open `http://odyio-demo.localhost:8000/app`.
3. Log in as `clinic@odyio.local`.
4. Open the Odyio workspace.
5. Open `Catalogue`.
6. Browse or filter the demo products, select quantities, and review the request.
7. Create the quotation request from the catalogue. The request is sent automatically.
8. Log in as `supplier@odyio.local`.
9. Open the Odyio workspace, then `Incoming Requests`.
10. Open the request details and create the supplier offer.
11. Enter offer rates, review the generated offer lines, and submit the offer.
12. Create a Devis from the submitted offer, choose Classic, Modern, or Compact,
    review the single live preview, use `Configure` only when supplier
    presentation defaults need to change, and confirm.
13. Print or download the Devis PDF when the bench has a patched-Qt
    `wkhtmltopdf` build available.
14. Log in as `clinic@odyio.local`.
15. Open `My Requests`, open the request details, and view the supplier offer and Devis.
16. Accept or reject the offer from the marketplace page.
17. When accepted, open the marketplace-safe Purchase Order details from `My Requests` or `Purchase Orders`.

The normal clinic and supplier workflow does not require opening raw
Marketplace Quotation Request, Marketplace Supplier Offer, or ERPNext Purchase
Order forms.

Catalogue pages do not show public prices. Purchase Orders copy the accepted
supplier offer rates, not ERPNext Item defaults. Repeated acceptance must not
create a second Purchase Order. Negotiation and counter-offers are intentionally
excluded.

The Devis number is the Supplier Offer reference for the MVP. Confirmed Devis
snapshots preserve presentation/contact information historically; later changes
to Supplier or Company profile data do not silently alter existing Devis.
Submitted and accepted offers may create a Devis if none exists. A rejected
offer may only show an already confirmed historical Devis; it cannot create or
regenerate one after rejection.

Supplier Devis configuration is persistent per Supplier. Changing the selected
template in the builder affects only the current Devis until the supplier
explicitly saves a different default template in `Configure`.

Programmatic acceptance verification can be run without leaving request/offer/PO
records behind:

```bash
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.verify_demo_acceptance_flow
```
