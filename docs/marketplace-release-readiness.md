# Marketplace Release Readiness Report

## Completed Functionality

- Clinic Company is resolved from the logged-in user's standard Frappe User
  Permission.
- Supplier is resolved from the logged-in user's standard Frappe User
  Permission.
- Clinic users can browse the catalogue, search/filter products, select
  quantities, review selections, and create sent quotation requests.
- Supplier users can view assigned incoming requests, create one generated
  offer, enter supplier offer rates, review lines, submit the offer, and track
  offer status.
- Clinic quotation requests capture Delivery or Pickup. Delivery stores a
  request-level address snapshot; Pickup stores no delivery address.
- Submitted supplier offers can generate one historical Devis presentation
  snapshot using Classic, Modern, or Compact templates.
- Confirmed Devis snapshots can be viewed by the supplier and linked clinic
  without changing the Supplier Offer commercial source of truth.
- Rejected offers cannot create a new Devis after rejection; already confirmed
  historical Devis snapshots remain viewable/printable.
- Supplier Devis configuration is saved per Supplier and used to autofill future
  Devis previews. The builder displays one selected template preview at a time.
- Clinic users can track requests, view related offers, accept or reject
  eligible offers, and view marketplace-created draft Purchase Orders.
- Acceptance creates exactly one draft ERPNext Purchase Order using accepted
  supplier offer rates.
- Rejection creates no Purchase Order.
- Demo catalogue Items have public File-backed product images assigned through
  ERPNext `Item.image`.
- Direct document access, list queries, REST access, and whitelisted methods
  enforce actor isolation server-side.

## Permission Matrix

| Capability | Clinic User | Fournisseur | Administrator/System Manager |
| --- | --- | --- | --- |
| Open Marketplace Catalogue | Allowed | Denied by API | Support/admin only |
| Browse enabled marketplace Items | Allowed | Own supplier Items via Item permissions | Allowed |
| Create request from catalogue | Allowed for own Company | Denied | Support/admin only |
| Read quotation requests | Own Company only | Sent requests for assigned Supplier only | Allowed |
| Create supplier offer | Denied | Allowed for assigned sent request only | Support/admin only |
| Submit supplier offer | Denied | Own Draft offer only | Support/admin only |
| Read supplier offers | Own Company, submitted/decided only | Assigned Supplier only | Allowed |
| Accept or reject offer | Own Company, Sent offer only | Denied | Support/admin only |
| Read marketplace Purchase Order | Own Company, linked request only | Denied | Allowed |
| Access another clinic/supplier records | Denied | Denied | Allowed |

## User-Ready Demo Gate

| Gate Item | Status |
| --- | --- |
| Clinic Marketplace workspace | Pass |
| Product catalogue with browse/search/filter/details | Pass |
| Clinic item and quantity selection | Pass |
| Clinic review before request creation | Pass |
| Request creation from catalogue | Pass |
| Company resolved securely from user | Pass |
| Supplier resolved securely from selected products | Pass |
| Multi-supplier selections handled deliberately | Pass |
| My Requests page | Pass |
| Request and offer status tracking | Pass |
| Offer accept/reject actions | Pass |
| Marketplace Purchase Order details | Pass |
| Supplier workspace entry points | Pass |
| Supplier assigned incoming requests only | Pass |
| Supplier request details view | Pass |
| Supplier offer creation through visible action | Pass |
| Public catalogue prices removed | Pass |
| Supplier-entered offer rates | Pass |
| Generated offer lines match the request | Pass |
| Protected submitted rates cannot be tampered with | Pass |
| Delivery/Pickup chosen before request creation | Pass |
| Delivery address snapshot stored on request | Pass |
| No delivery fee or freight calculation | Pass |
| Devis generated from submitted Supplier Offer | Pass |
| Three Devis templates installed idempotently | Pass |
| Devis snapshot preserves supplier/clinic presentation data | Pass |
| Devis permissions isolated by supplier and clinic | Pass |
| Complete acceptance flow | Pass |
| Complete rejection flow | Pass |
| Server-side permission matrix | Pass |
| Direct document, list, REST, and workflow isolation | Pass |
| Demo site seeded and clean | Pass |
| Demo product images through Item.image/File | Pass |
| ERPNext Contact/Address schema compatibility | Pass |
| PostgreSQL goal graph compatibility | Pass |
| Migrations, build, cache clear, tests | Pass |
| Windows/WSL source synchronization | Pass |

## Intentional Limitations

- Public catalogue prices are intentionally hidden.
- Supplier offer prices are fixed after submission.
- Delivery/Pickup is informational only. No delivery fee is generated.
- Tax/VAT identifiers are optional presentation data only. No tax calculation
  engine is introduced.
- Devis uses the Supplier Offer reference as its displayed number for the MVP.
- No negotiation.
- No counter-offers.
- One supplier offer per request.
- Purchase Orders are created as Draft only.
- No separate React frontend.
- No custom Clinic organization model.

## Future Enhancements

- Richer supplier product maintenance UX.
- Request grouping for deliberate multi-supplier checkout.
- Marketplace-specific notification preferences.
- Purchase Order downstream approval/submission workflow.
- Optional clinic rejection reasons and analytics.

## Verification Commands

```bash
bench --site odyio.localhost migrate
bench --site odyio.localhost run-tests --app odyio_marketplace
bench --site odyio.localhost run-tests --app odyio_marketplace --skip-test-records
bench build
bench --site odyio.localhost clear-cache
bench --site odyio-demo.localhost migrate
bench --site odyio-demo.localhost execute odyio_marketplace.setup.demo.setup_demo_data
bench --site odyio-demo.localhost clear-cache
```
