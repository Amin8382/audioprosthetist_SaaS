# Odyio Marketplace

Frappe Framework v15 app for the initial Odyio B2B marketplace foundation.

This app reuses ERPNext master and transaction DocTypes wherever possible:

- `Supplier` for suppliers
- `Item` and `Item Group` for the supplier catalogue
- `Company` for the clinic buyer actor
- `Purchase Order` for accepted supplier-priced offers
- `File`, `Item.image`, and `Notification Log` for media and notifications

Marketplace setup also verifies the official ERPNext install-time Address and
Contact Custom Fields required by party/contact resolution, repairing missing
metadata idempotently on drifted local sites.

The archived Spring Boot and React marketplace remains a business and UX
reference only.

## Supplier Offer Sprint

`Marketplace Supplier Offer` adds the supplier response flow for sent quotation
requests. Public catalogue prices are not exposed. Suppliers enter offer prices
while preparing one offer for their assigned request. Clinics can accept or
reject that offer. Acceptance creates a draft ERPNext `Purchase Order` from the
accepted offer prices; negotiation and counter-offers remain intentionally
excluded.

## Local Demo Setup

Use a clean PostgreSQL site for manual demo browsing, separate from the automated
test site. The demo setup is explicit and local-development only; it is not run
during app installation or migration.

Recommended site split:

- `odyio.localhost`: automated test site
- `odyio-demo.localhost`: manual demo site

Seed the demo data:

```bash
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.setup_demo_data
```

Set local passwords interactively:

```bash
bench --site odyio-demo.localhost set-user-password clinic@odyio.local
bench --site odyio-demo.localhost set-user-password supplier@odyio.local
```

Role linkage model:

- Clinic user `clinic@odyio.local` has role `Clinic User` and a standard Frappe
  `User Permission` allowing only Company `Odyio Demo Clinic`.
- Supplier user `supplier@odyio.local` has role `Fournisseur` and a standard
  Frappe `User Permission` allowing only Supplier `Odyio Demo Supplier`.

The demo does not introduce a separate Clinic DocType, parent company,
subsidiary, holding company, or organization hierarchy. The clinic is the
ERPNext `Company`.

Demo product illustrations are bundled with the app and copied into standard
public Frappe `File` records. Demo Items reference those files through
ERPNext `Item.image`.
