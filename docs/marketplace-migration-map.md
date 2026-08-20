# Marketplace Migration Map

This document maps the archived Spring Boot/React marketplace reference to the
Frappe Framework v15 / ERPNext v15 marketplace foundation.

The archived code under `archive/` remains a reference only. It is not modified
by this sprint.

## Foundation Decisions

| Area | Decision |
| --- | --- |
| Negotiation | Deferred and intentionally not implemented. The agreed process has no negotiation or counter-offers. |
| Supplier pricing | Public catalogue prices are not exposed. The supplier enters pricing while preparing its offer. Submitted offer prices are fixed for clinic decision and Purchase Order creation. |
| Offers | One supplier-priced offer per quotation request is supported. |
| Accepted order | Accepting the supplier offer creates an ERPNext draft `Purchase Order`. No custom standalone order DocType is created. |
| Frontend | Frappe Desk is the UI. No separate React SPA is created. |

## ERPNext Reuse Strategy

| Business concept | Frappe / ERPNext target | Rationale |
| --- | --- | --- |
| Clinic actor | `Company` | A clinic is the buyer entity in the procurement flow, and ERPNext `Purchase Order` already requires a `Company`. Existing `Customer` records are patient/client records in this project, so using `Customer` for clinics would confuse clinical sales data with marketplace buyers. A custom Clinic DocType is deferred because it would duplicate ERPNext company and accounting context. |
| Supplier | `Supplier` | ERPNext already models supplier identity, contact/accounting integration, and buying permissions. |
| Product catalogue | `Item` with marketplace custom fields | ERPNext already models item name, group, description, image, and stock UOM. Marketplace-specific supplier and availability fields are added through custom fields. Public marketplace catalogue APIs do not expose `Item.standard_rate`. |
| Category | `Item Group` | Product categorization should use ERPNext's standard item grouping. |
| Product image | `Item.image` and `File` attachments | ERPNext already supports a primary item image and file attachment lifecycle. No custom image table is required in the foundation. |
| Order | `Purchase Order` | A future accepted supplier offer will create an ERPNext purchase order instead of a duplicate order table. |
| Notifications | `Notification Log` | Sent quotation requests can notify supplier users through Frappe's built-in notification records. |

## Object Mapping

| Archived Spring/React object | Frappe target | Standard vs custom | Migration notes | Deferred work |
| --- | --- | --- | --- | --- |
| `Clinic` | `Company` | Standard ERPNext | Map clinic name, address, phone/email, and tax number to company/contact data where available. User access should be scoped with `User Permission` on `Company`. | Any clinic-specific profile extension, only if ERPNext `Company` is insufficient. |
| `Supplier` | `Supplier` | Standard ERPNext | Map company name, contact details, address, website, and logo/file data to supplier/contact/file records. User access should be scoped with `User Permission` on `Supplier`. | Supplier onboarding workflow and verification flags. |
| `ProductCategory` | `Item Group` | Standard ERPNext | Map category names and hierarchy into ERPNext item groups. | Category-specific marketplace metadata, only if needed. |
| `Product` | `Item` plus custom fields | Standard ERPNext plus custom fields | Map product name to `item_name`, category to `item_group`, description to `description`, active/available to marketplace flags, supplier to `marketplace_supplier`, reference to `supplier_reference`, ear side to `ear_side`, and technical details to `technical_specs`. | Rich supplier catalogue moderation, inventory policy, supplier-specific price lists. |
| `ProductImage` | `Item.image` and `File` | Standard ERPNext | Use `Item.image` for the primary catalogue image and attached `File` records for additional assets. | Multi-image gallery conventions. |
| `QuotationRequest` | `Marketplace Quotation Request` | Custom | Keeps clinic, supplier, status, notes, requested delivery date, sent/expires timestamps, placeholder supplier offer reference, and future purchase order link. | Expiration automation and supplier offer link once the offer DocType exists. |
| `QuotationRequestLine` | `Marketplace Quotation Request Item` | Custom child DocType | Stores item, item name snapshot, supplier reference snapshot, quantity, and line notes. | Pricing snapshots when offer/order work begins. |
| `SupplierOffer` | `Marketplace Supplier Offer` | Custom | One supplier-priced offer can be created for a sent quotation request by the assigned supplier. Clinic accepts or rejects only. | Supplier offer expiry and richer supplier notes, if required. |
| `SupplierOfferLine` | `Marketplace Supplier Offer Item` | Custom child DocType | Mirrors quotation request lines. The supplier enters offer rates before submission; submitted rates are fixed and cannot be negotiated. | Supplier-side pricing policy, if later required. |
| `Order` | `Purchase Order` | Standard ERPNext | Accepted offers create a draft purchase order for the clinic `Company` and selected `Supplier` using accepted offer prices. | Submission, approval, receiving, and invoicing remain ERPNext workflow work. |
| `OrderLine` | `Purchase Order Item` | Standard ERPNext | Accepted offer lines map to ERPNext purchase order item rows, copying item, quantity, UOM, and supplier-entered offer rate. | Advanced taxes/warehouses/accounting defaults as deployment configuration requires. |
| `Notification` | `Notification Log` | Standard Frappe | Sent quotation requests create supplier-facing notification log records. | Email/push notification routing and digest preferences. |
| Roles | `Clinic User`, `Fournisseur`, `System Manager` | Standard `Role` records | Reuse existing `Fournisseur` when present. Create `Clinic User` only if absent. Scope users with `User Permission` records. | Fine-grained onboarding and role assignment workflow. |
| Status workflows | Quotation request: `Draft`, `Sent`, `Cancelled`, `Expired`; supplier offer: `Draft`, `Sent`, `Accepted`, `Rejected`, `Cancelled` | Custom DocType statuses plus Frappe `docstatus` | Draft quotation requests and offers are docstatus 0. Sending submits the document. Accepted/rejected offers remain submitted and update via explicit server actions. | Expiration scheduler. |
| File storage | `File` attachments and private/public file storage | Standard Frappe | Use existing Frappe file attachment behavior instead of custom filesystem tables. | Marketplace image gallery and supplier document upload policy. |
