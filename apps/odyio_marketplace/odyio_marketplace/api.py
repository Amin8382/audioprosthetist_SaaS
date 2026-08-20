import os
import re
import shutil
import subprocess

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate
from frappe.utils.file_manager import save_file
from frappe.utils.pdf import get_pdf

from odyio_marketplace.permissions import _allowed_values
from odyio_marketplace.navigation import INTERNAL_ROLES, marketplace_page_access


CATALOG_FIELDS = (
	"name",
	"item_code",
	"item_name",
	"item_group",
	"description",
	"image",
	"stock_uom",
	"marketplace_supplier",
	"supplier_reference",
	"ear_side",
	"technical_specs",
)

SUPPLIER_PRODUCT_FIELDS = (
	"name",
	"item_code",
	"item_name",
	"item_group",
	"description",
	"image",
	"stock_uom",
	"disabled",
	"marketplace_enabled",
	"marketplace_available",
	"marketplace_supplier",
	"supplier_reference",
	"ear_side",
	"technical_specs",
	"modified",
)
SUPPLIER_PRODUCT_ALLOWED_FIELDS = {
	"item_name",
	"item_group",
	"description",
	"technical_specs",
	"ear_side",
	"marketplace_available",
	"marketplace_enabled",
	"supplier_reference",
}
SUPPLIER_PRODUCT_PROTECTED_FIELDS = {
	"item_code",
	"name",
	"marketplace_supplier",
	"supplier",
	"standard_rate",
	"valuation_rate",
	"opening_stock",
	"stock_uom",
	"is_stock_item",
	"has_variants",
	"item_defaults",
	"taxes",
	"reorder_levels",
	"barcodes",
	"attributes",
	"uoms",
	"disabled",
}
PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024
PRODUCT_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DEVIS_CREATION_STATUSES = {"Sent", "Accepted"}
DEVIS_VIEW_STATUSES = {"Sent", "Accepted", "Rejected"}
DEVIS_TEMPLATES = (
	{"key": "classic", "label": _("Classic"), "description": _("Traditional professional quotation with bordered commercial table.")},
	{"key": "modern", "label": _("Modern"), "description": _("Polished B2B quotation with spacious header and lighter table styling.")},
	{"key": "compact", "label": _("Compact"), "description": _("Dense print-friendly quotation optimized for more item lines.")},
)
SUPPLIER_DEVIS_CONFIGURATION_FIELDS = {
	"default_template",
	"display_name",
	"logo",
	"address",
	"city",
	"country",
	"phone",
	"email",
	"identifiers",
	"footer_terms",
}
FULFILLMENT_LABELS = {"DELIVERY": _("Delivery"), "PICKUP": _("Pickup")}


@frappe.whitelist()
def get_marketplace_home_context():
	roles = set(frappe.get_roles(frappe.session.user))
	is_admin = frappe.session.user == "Administrator" or "System Manager" in roles
	is_clinic = not is_admin and "Clinic User" in roles
	is_supplier = not is_admin and "Fournisseur" in roles
	is_staff = not is_admin and not is_clinic and not is_supplier and bool(roles.intersection(INTERNAL_ROLES))
	if not is_admin and not is_clinic and not is_supplier and not is_staff:
		frappe.throw(_("You are not allowed to access Odyio Home."), frappe.PermissionError)

	context = {
		"is_admin": is_admin,
		"is_clinic": is_clinic,
		"is_supplier": is_supplier,
		"is_staff": is_staff,
		"primary_role": "admin" if is_admin else ("clinic" if is_clinic else ("supplier" if is_supplier else "staff")),
	}
	if context["is_clinic"]:
		context["clinic"] = _clinic_home_context()
	if context["is_supplier"]:
		context["supplier"] = _supplier_home_context()
	if not is_admin and not context["is_clinic"] and not context["is_supplier"]:
		context["staff"] = _staff_home_context()
	if is_admin:
		context["admin"] = _admin_home_context()
	return context


@frappe.whitelist()
def can_access_marketplace_page(page_name):
	return marketplace_page_access(page_name)


@frappe.whitelist()
def get_clinic_catalog_context():
	_validate_clinic_user()
	company = _get_single_allowed_company()
	return {
		"company": company,
		"company_name": _company_name(company),
		"default_delivery_address": _party_address_snapshot("Company", company),
	}


@frappe.whitelist()
def get_catalog_items(search=None, item_group=None, supplier=None, ear_side=None, limit_start=0, page_length=20):
	_validate_clinic_user()

	filters = {
		"marketplace_enabled": 1,
		"marketplace_available": 1,
		"disabled": 0,
	}
	if item_group:
		filters["item_group"] = item_group
	if supplier:
		filters["marketplace_supplier"] = supplier
	if ear_side:
		filters["ear_side"] = ear_side

	or_filters = None
	if search:
		like_value = f"%{search}%"
		or_filters = {
			"item_code": ["like", like_value],
			"item_name": ["like", like_value],
			"description": ["like", like_value],
			"supplier_reference": ["like", like_value],
		}

	items = frappe.get_list(
		"Item",
		fields=CATALOG_FIELDS,
		filters=filters,
		or_filters=or_filters,
		order_by="item_name asc",
		limit_start=cint(limit_start),
		limit_page_length=min(cint(page_length) or 20, 100),
	)

	return [_with_supplier_display(item) for item in items]


@frappe.whitelist()
def get_catalog_filters():
	_validate_clinic_user()
	items = frappe.get_list(
		"Item",
		fields=["item_group", "marketplace_supplier", "ear_side"],
		filters={"marketplace_enabled": 1, "marketplace_available": 1, "disabled": 0},
		limit_page_length=0,
	)

	suppliers = sorted({item.marketplace_supplier for item in items if item.marketplace_supplier})
	return {
		"item_groups": sorted({item.item_group for item in items if item.item_group}),
		"suppliers": [
			{"name": supplier, "supplier_name": frappe.db.get_value("Supplier", supplier, "supplier_name") or supplier}
			for supplier in suppliers
		],
		"ear_sides": sorted({item.ear_side for item in items if item.ear_side}),
	}


@frappe.whitelist()
def preview_catalog_request(items):
	_validate_clinic_user()
	lines = _normalize_request_items(items)
	preview = _build_request_preview(lines)
	company = _get_single_allowed_company()
	preview["default_delivery_address"] = _party_address_snapshot("Company", company)
	return preview


@frappe.whitelist()
def create_request_from_catalog(
	items,
	requested_delivery_date=None,
	clinic_notes=None,
	fulfillment_method=None,
	delivery_address=None,
):
	_validate_clinic_user()
	company = _get_single_allowed_company()
	lines = _normalize_request_items(items)
	preview = _build_request_preview(lines)

	if preview["supplier_count"] != 1:
		frappe.throw(_("Select items from one supplier to create a quotation request."))

	supplier = preview["suppliers"][0]["supplier"]
	fulfillment = _normalize_fulfillment_method(fulfillment_method)
	address_snapshot = _normalize_delivery_address_snapshot(fulfillment, delivery_address, company)
	request = frappe.get_doc(
		{
			"doctype": "Marketplace Quotation Request",
			"clinic": company,
			"supplier": supplier,
			"requested_delivery_date": requested_delivery_date,
			"fulfillment_method": fulfillment,
			**address_snapshot,
			"clinic_notes": clinic_notes,
			"items": [
				{
					"item": line["item"],
					"quantity": line["quantity"],
					"line_notes": line.get("line_notes"),
				}
				for line in lines
			],
		}
	)
	request.insert()
	request.send_request()

	return {
		"quotation_request": request.name,
		"status": request.status,
		"supplier": supplier,
		"supplier_name": frappe.db.get_value("Supplier", supplier, "supplier_name") or supplier,
		"company": company,
		"fulfillment": _fulfillment_snapshot(request),
	}


@frappe.whitelist()
def get_supplier_marketplace_context():
	supplier = _get_single_allowed_supplier()
	return {"supplier": supplier, "supplier_name": _supplier_name(supplier)}


@frappe.whitelist()
def get_supplier_product_filters():
	_validate_supplier_or_admin()
	item_groups = frappe.get_list(
		"Item Group",
		fields=["name", "item_group_name"],
		filters={"is_group": 0},
		order_by="item_group_name asc",
		limit_page_length=0,
	)
	return {"item_groups": item_groups}


@frappe.whitelist()
def get_supplier_products(search=None, item_group=None, availability=None, enabled_state=None, supplier=None):
	if _is_marketplace_admin():
		filters = {"marketplace_supplier": ["is", "set"]}
		if supplier:
			filters["marketplace_supplier"] = supplier
	else:
		supplier = _get_current_product_supplier()
		filters = {"marketplace_supplier": supplier}
	if item_group:
		filters["item_group"] = item_group
	if availability == "available":
		filters["marketplace_available"] = 1
	elif availability == "unavailable":
		filters["marketplace_available"] = 0
	if enabled_state == "enabled":
		filters["marketplace_enabled"] = 1
	elif enabled_state == "disabled":
		filters["marketplace_enabled"] = 0

	or_filters = None
	if search:
		like_value = f"%{search}%"
		or_filters = {
			"name": ["like", like_value],
			"item_code": ["like", like_value],
			"item_name": ["like", like_value],
			"supplier_reference": ["like", like_value],
			"description": ["like", like_value],
		}

	items = frappe.get_list(
		"Item",
		fields=SUPPLIER_PRODUCT_FIELDS,
		filters=filters,
		or_filters=or_filters,
		order_by="modified desc",
		limit_page_length=100,
	)
	return [_supplier_product_dto(item) for item in items]


@frappe.whitelist()
def get_supplier_product(item):
	doc = _get_supplier_product_doc(item)
	return _supplier_product_dto(doc)


@frappe.whitelist()
def create_supplier_product(data):
	supplier = _get_current_product_supplier()
	payload = _normalize_product_payload(data, creating=True)
	_validate_supplier_reference_unique(supplier, payload.get("supplier_reference"))

	item = frappe.new_doc("Item")
	item.item_code = _generate_supplier_item_code(supplier, payload.get("supplier_reference") or payload["item_name"])
	item.item_name = payload["item_name"]
	item.item_group = payload["item_group"]
	item.stock_uom = _default_stock_uom()
	item.is_stock_item = 0
	item.disabled = 0
	item.standard_rate = 0
	item.marketplace_supplier = supplier
	item.marketplace_enabled = cint(payload.get("marketplace_enabled", 1))
	item.marketplace_available = cint(payload.get("marketplace_available", 1))
	_apply_supplier_product_payload(item, payload)
	item.insert(ignore_permissions=True)
	return _supplier_product_dto(item)


@frappe.whitelist()
def update_supplier_product(item, data):
	doc = _get_supplier_product_doc(item, for_update=True)
	payload = _normalize_product_payload(data, creating=False)
	if "supplier_reference" in payload:
		_validate_supplier_reference_unique(doc.marketplace_supplier, payload.get("supplier_reference"), exclude_item=doc.name)
	_apply_supplier_product_payload(doc, payload)
	doc.save(ignore_permissions=True)
	return _supplier_product_dto(doc)


@frappe.whitelist()
def set_supplier_product_availability(item, marketplace_available=None, marketplace_enabled=None):
	doc = _get_supplier_product_doc(item, for_update=True)
	if marketplace_available is not None:
		doc.marketplace_available = cint(marketplace_available)
	if marketplace_enabled is not None:
		doc.marketplace_enabled = cint(marketplace_enabled)
	doc.save(ignore_permissions=True)
	return _supplier_product_dto(doc)


@frappe.whitelist()
def upload_supplier_product_image(item, filename=None, content=None):
	doc = _get_supplier_product_doc(item, for_update=True)
	file_name, file_content = _read_uploaded_product_image(filename, content)
	_validate_product_image(file_name, file_content)

	file_doc = save_file(file_name, file_content, "Item", doc.name, is_private=0, df="image")
	doc.image = file_doc.file_url
	doc.save(ignore_permissions=True)
	result = _supplier_product_dto(doc)
	result["image_file"] = file_doc.name
	return result


@frappe.whitelist()
def remove_supplier_product_image(item):
	doc = _get_supplier_product_doc(item, for_update=True)
	doc.image = ""
	doc.save(ignore_permissions=True)
	return _supplier_product_dto(doc)


@frappe.whitelist()
def get_supplier_incoming_requests(status=None, offer_state=None, search=None, date_from=None, date_to=None):
	supplier = _get_single_allowed_supplier()
	filters = {
		"supplier": supplier,
		"docstatus": 1,
	}
	if status:
		filters["status"] = status
	else:
		filters["status"] = "Sent"
	if date_from:
		filters["creation"] = [">=", date_from]
	if date_to:
		filters["creation"] = ["<=", date_to]

	or_filters = None
	if search:
		like_value = f"%{search}%"
		or_filters = {"name": ["like", like_value], "clinic": ["like", like_value]}

	requests = frappe.get_list(
		"Marketplace Quotation Request",
		fields=[
			"name",
			"clinic",
			"status",
			"creation",
			"sent_at",
			"fulfillment_method",
			"item_count",
			"total_requested_quantity",
			"linked_supplier_offer",
		],
		filters=filters,
		or_filters=or_filters,
		order_by="sent_at desc, creation desc",
		limit_page_length=100,
	)
	if offer_state == "with_offer":
		requests = [request for request in requests if request.linked_supplier_offer]
	elif offer_state == "without_offer":
		requests = [request for request in requests if not request.linked_supplier_offer]

	return [_request_summary(request) for request in requests]


@frappe.whitelist()
def get_supplier_request_details(quotation_request):
	supplier = _get_single_allowed_supplier()
	request = frappe.get_doc("Marketplace Quotation Request", quotation_request)
	request.check_permission("read")
	_validate_supplier_request(request, supplier)

	items = []
	for row in request.items:
		item = frappe.db.get_value(
			"Item",
			row.item,
			("item_name", "item_code", "stock_uom", "marketplace_supplier", "supplier_reference"),
			as_dict=True,
		)
		if not item or item.marketplace_supplier != supplier:
			frappe.throw(_("Quotation request contains an item that is not available to your supplier."))

		items.append(
			{
				"item": row.item,
				"item_code": item.item_code,
				"item_name": row.item_name_snapshot or item.item_name,
				"supplier_reference": row.supplier_reference_snapshot or item.supplier_reference,
				"quantity": flt(row.quantity),
				"uom": item.stock_uom,
				"line_notes": row.line_notes,
			}
		)

	offer = _get_request_offer(request.name)
	status_view = _request_status_view(request, offer, actor="supplier")
	return {
		"name": request.name,
		"clinic": request.clinic,
		"clinic_name": _company_name(request.clinic),
		"status": request.status,
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"next_action": status_view["next_action"],
		"creation": request.creation,
		"sent_at": request.sent_at,
		"requested_delivery_date": request.requested_delivery_date,
		"fulfillment": _fulfillment_snapshot(request),
		"clinic_notes": request.clinic_notes,
		"item_count": len(items),
		"total_requested_quantity": sum(flt(item["quantity"]) for item in items),
		"offer": offer,
		"can_create_offer": not offer and request.status == "Sent",
		"items": items,
	}


@frappe.whitelist()
def create_supplier_offer_from_request(quotation_request, rates=None):
	supplier = _get_single_allowed_supplier()
	request = frappe.get_doc("Marketplace Quotation Request", quotation_request, for_update=True)
	request.check_permission("read")
	_validate_supplier_request(request, supplier)

	existing = _get_request_offer(request.name)
	if existing:
		frappe.throw(_("Quotation request {0} already has supplier offer {1}.").format(request.name, existing["name"]))

	offer = frappe.get_doc({"doctype": "Marketplace Supplier Offer", "quotation_request": request.name})
	offer.insert()
	if rates:
		_apply_offer_rates(offer, rates)
	return get_supplier_offer_details(offer.name)


@frappe.whitelist()
def get_supplier_my_offers(status=None, search=None):
	supplier = _get_single_allowed_supplier()
	filters = {"supplier": supplier, "docstatus": ["<", 2]}
	if status:
		filters["status"] = status

	or_filters = None
	if search:
		like_value = f"%{search}%"
		or_filters = {"name": ["like", like_value], "quotation_request": ["like", like_value], "clinic": ["like", like_value]}

	offers = frappe.get_list(
		"Marketplace Supplier Offer",
		fields=[
			"name",
			"quotation_request",
			"clinic",
			"status",
			"creation",
			"sent_at",
			"accepted_at",
			"rejected_at",
			"item_count",
			"total_quantity",
			"total_amount",
		],
		filters=filters,
		or_filters=or_filters,
		order_by="modified desc",
		limit_page_length=100,
	)
	return [_offer_summary(offer) for offer in offers]


@frappe.whitelist()
def get_supplier_offer_details(offer):
	supplier = _get_single_allowed_supplier()
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer)
	offer_doc.check_permission("read")
	if offer_doc.supplier != supplier:
		frappe.throw(_("You are not allowed to access this supplier offer."), frappe.PermissionError)

	return _offer_details(offer_doc)


@frappe.whitelist()
def submit_supplier_offer(offer, rates=None):
	supplier = _get_single_allowed_supplier()
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer)
	if rates:
		_apply_offer_rates(offer_doc, rates)
		offer_doc.reload()
	offer_doc.check_permission("submit")
	if offer_doc.supplier != supplier:
		frappe.throw(_("You are not allowed to submit this supplier offer."), frappe.PermissionError)
	if offer_doc.docstatus != 0 or offer_doc.status != "Draft":
		frappe.throw(_("Only Draft supplier offers can be submitted."))

	offer_doc.send_offer()
	return _offer_details(offer_doc)


@frappe.whitelist()
def get_clinic_marketplace_context():
	_validate_clinic_user()
	company = _get_single_allowed_company()
	return {"company": company, "company_name": _company_name(company)}


@frappe.whitelist()
def get_clinic_my_requests(
	status=None, supplier=None, offer_state=None, decision_state=None, search=None, date_from=None, date_to=None
):
	company = _get_single_allowed_company()
	filters = {"clinic": company}
	if status:
		filters["status"] = status
	if supplier:
		filters["supplier"] = supplier
	if date_from and date_to:
		filters["creation"] = ["between", [date_from, date_to]]
	elif date_from:
		filters["creation"] = [">=", date_from]
	elif date_to:
		filters["creation"] = ["<=", date_to]

	or_filters = None
	if search:
		like_value = f"%{search}%"
		or_filters = {"name": ["like", like_value], "supplier": ["like", like_value]}

	requests = frappe.get_list(
		"Marketplace Quotation Request",
		fields=[
			"name",
			"supplier",
			"status",
			"creation",
			"sent_at",
			"item_count",
			"total_requested_quantity",
			"linked_supplier_offer",
			"linked_purchase_order",
			"fulfillment_method",
		],
		filters=filters,
		or_filters=or_filters,
		order_by="modified desc",
		limit_page_length=100,
	)
	summaries = [_clinic_request_summary(request) for request in requests]
	if offer_state == "with_offer":
		summaries = [request for request in summaries if request["offer"]]
	elif offer_state == "without_offer":
		summaries = [request for request in summaries if not request["offer"]]
	if decision_state:
		summaries = [request for request in summaries if request["decision_state"] == decision_state]

	return summaries


@frappe.whitelist()
def get_clinic_request_details(quotation_request):
	company = _get_single_allowed_company()
	request = frappe.get_doc("Marketplace Quotation Request", quotation_request)
	request.check_permission("read")
	_validate_clinic_request(request, company)
	items = _request_marketplace_items(request)
	offer = _get_request_offer(request.name)
	purchase_order = _get_purchase_order_summary(request.linked_purchase_order)
	status_view = _request_status_view(request, offer, purchase_order, actor="clinic")

	return {
		"name": request.name,
		"company": request.clinic,
		"company_name": _company_name(request.clinic),
		"supplier": request.supplier,
		"supplier_name": _supplier_name(request.supplier),
		"status": request.status,
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"next_action": status_view["next_action"],
		"creation": request.creation,
		"sent_at": request.sent_at,
		"requested_delivery_date": request.requested_delivery_date,
		"fulfillment": _fulfillment_snapshot(request),
		"clinic_notes": request.clinic_notes,
		"item_count": len(items),
		"total_requested_quantity": sum(flt(item["quantity"]) for item in items),
		"offer": offer,
		"decision_state": _decision_state(offer),
		"purchase_order": purchase_order,
		"actions": _clinic_request_actions(request, offer, purchase_order),
		"items": items,
	}


@frappe.whitelist()
def get_clinic_offer_details(offer):
	company = _get_single_allowed_company()
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer)
	offer_doc.check_permission("read")
	_validate_clinic_offer(offer_doc, company)

	return _clinic_offer_details(offer_doc)


@frappe.whitelist()
def accept_supplier_offer_for_clinic(offer):
	company = _get_single_allowed_company()
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer, for_update=True)
	offer_doc.check_permission("write")
	_validate_clinic_offer(offer_doc, company)
	if offer_doc.docstatus != 1 or offer_doc.status != "Sent":
		frappe.throw(_("Only submitted supplier offers awaiting decision can be accepted."))

	offer_doc.accept_offer()
	offer_doc.reload()
	return {
		"offer": _clinic_offer_details(offer_doc),
		"purchase_order": _get_purchase_order_summary(offer_doc.purchase_order),
	}


@frappe.whitelist()
def reject_supplier_offer_for_clinic(offer):
	company = _get_single_allowed_company()
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer, for_update=True)
	offer_doc.check_permission("write")
	_validate_clinic_offer(offer_doc, company)
	if offer_doc.docstatus != 1 or offer_doc.status != "Sent":
		frappe.throw(_("Only submitted supplier offers awaiting decision can be rejected."))

	offer_doc.reject_offer()
	offer_doc.reload()
	return {"offer": _clinic_offer_details(offer_doc)}


@frappe.whitelist()
def get_devis_templates(offer):
	offer_doc = _get_authorized_devis_offer(offer)
	if not _can_supplier_manage_devis(offer_doc):
		frappe.throw(_("Only the supplier can choose a Devis template."), frappe.PermissionError)
	_validate_supplier_offer_for_devis(offer_doc, offer_doc.supplier if _is_marketplace_admin() else _get_single_allowed_supplier())
	_validate_devis_snapshot_not_confirmed(offer_doc)
	default_template = _get_supplier_devis_settings(offer_doc.supplier).get("default_template") or "classic"
	default_context = _build_devis_context(offer_doc, default_template, None)
	return {
		"default_template": default_template,
		"selected_template": default_template,
		"configuration": _supplier_devis_configuration_dto(offer_doc.supplier),
		"review": {
			"supplier": default_context["supplier"],
			"clinic": default_context["clinic"],
			"fulfillment": default_context["fulfillment"],
			"footer_terms": default_context.get("footer_terms"),
		},
		"templates": [
			{
				**template,
				"is_default": template["key"] == default_template,
				"selected": template["key"] == default_template,
			}
			for template in DEVIS_TEMPLATES
		],
		"preview": {
			"template": default_template,
			"html": _render_devis_html(default_context),
		},
	}


@frappe.whitelist()
def preview_devis_template(offer, template="classic", overrides=None):
	offer_doc = _get_authorized_devis_offer(offer)
	if not _can_supplier_manage_devis(offer_doc):
		frappe.throw(_("Only the supplier can preview Devis templates before confirmation."), frappe.PermissionError)
	_validate_supplier_offer_for_devis(offer_doc, offer_doc.supplier if _is_marketplace_admin() else _get_single_allowed_supplier())
	_validate_devis_snapshot_not_confirmed(offer_doc)
	return {
		"template": template,
		"html": _render_devis_html(_build_devis_context(offer_doc, template, overrides)),
	}


@frappe.whitelist()
def get_supplier_devis_configuration(offer=None):
	supplier = _resolve_devis_settings_supplier(offer)
	return _supplier_devis_configuration_dto(supplier)


@frappe.whitelist()
def save_supplier_devis_configuration(data, offer=None):
	supplier = _resolve_devis_settings_supplier(offer, require_mutable_offer=bool(offer))
	values = _normalize_supplier_devis_configuration(data)
	settings = _save_supplier_devis_configuration(supplier, values)
	return _supplier_devis_configuration_dto(settings.supplier)


@frappe.whitelist()
def confirm_supplier_devis(
	offer,
	template="classic",
	overrides=None,
	save_as_default=0,
	save_profile_details=0,
):
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer, for_update=True)
	supplier = offer_doc.supplier if _is_marketplace_admin() else _get_single_allowed_supplier()
	snapshot_name = frappe.db.get_value("Marketplace Devis Snapshot", {"supplier_offer": offer_doc.name}, "name")
	if snapshot_name:
		if offer_doc.status == "Rejected":
			frappe.throw(_("Rejected offers can only show the already confirmed Devis. They cannot regenerate presentation."))
		return get_devis_snapshot(offer_doc.name)
	_validate_supplier_offer_for_devis(offer_doc, supplier)

	context = _build_devis_context(offer_doc, template, overrides)
	snapshot = frappe.get_doc(
		{
			"doctype": "Marketplace Devis Snapshot",
			"supplier_offer": offer_doc.name,
			"template": context["template"],
			"issue_date": context["issue_date"],
			"valid_until": context.get("valid_until"),
			"supplier_display_name": context["supplier"]["display_name"],
			"supplier_logo": context["supplier"].get("logo"),
			"supplier_address": context["supplier"].get("address"),
			"supplier_phone": context["supplier"].get("phone"),
			"supplier_email": context["supplier"].get("email"),
			"supplier_identifiers": context["supplier"].get("identifiers"),
			"clinic_display_name": context["clinic"]["display_name"],
			"clinic_address": context["clinic"].get("address"),
			"clinic_phone": context["clinic"].get("phone"),
			"clinic_email": context["clinic"].get("email"),
			"fulfillment_method": context["fulfillment"]["method"],
			"delivery_address": context["fulfillment"].get("delivery_address") or "",
			"supplier_notes": context.get("supplier_notes"),
			"footer_terms": context.get("footer_terms"),
		}
	)
	snapshot.insert(ignore_permissions=True)
	if cint(save_as_default):
		_update_supplier_devis_settings(supplier, template=context["template"], logo=context["supplier"].get("logo"), footer_terms=context.get("footer_terms"))
	if cint(save_profile_details):
		_save_supplier_profile_details(supplier, context["supplier"])
	return get_devis_snapshot(offer_doc.name)


@frappe.whitelist()
def get_devis_snapshot(offer):
	offer_doc = _get_authorized_devis_offer(offer)
	snapshot_name = frappe.db.get_value("Marketplace Devis Snapshot", {"supplier_offer": offer_doc.name}, "name")
	if not snapshot_name:
		frappe.throw(_("No confirmed Devis exists for supplier offer {0}.").format(offer_doc.name))
	snapshot = frappe.get_doc("Marketplace Devis Snapshot", snapshot_name)
	snapshot.check_permission("read")
	context = _build_devis_context_from_snapshot(snapshot, offer_doc)
	return {
		"name": snapshot.name,
		"offer": offer_doc.name,
		"template": snapshot.template,
		"html": _render_devis_html(context),
		"print_format": _print_format_for_template(snapshot.template),
		"can_print": True,
		"can_download_pdf": True,
	}


@frappe.whitelist()
def upload_devis_logo(offer, filename=None, content=None):
	offer_doc = _get_authorized_devis_offer(offer)
	if not _can_supplier_manage_devis(offer_doc):
		frappe.throw(_("Only the supplier can upload a Devis logo."), frappe.PermissionError)
	_validate_supplier_offer_for_devis(offer_doc, offer_doc.supplier if _is_marketplace_admin() else _get_single_allowed_supplier())
	_validate_devis_snapshot_not_confirmed(offer_doc)
	file_name, file_content = _read_uploaded_product_image(filename, content)
	_validate_product_image(file_name, file_content)
	file_doc = save_file(file_name, file_content, "Supplier", offer_doc.supplier, is_private=0)
	return {"file_url": file_doc.file_url, "file": file_doc.name}


@frappe.whitelist()
def download_devis_pdf(offer):
	offer_doc = _get_authorized_devis_offer(offer)
	snapshot_name = frappe.db.get_value("Marketplace Devis Snapshot", {"supplier_offer": offer_doc.name}, "name")
	if not snapshot_name:
		frappe.throw(_("Confirm the Devis before downloading PDF."))
	snapshot = frappe.get_doc("Marketplace Devis Snapshot", snapshot_name)
	snapshot.check_permission("read")
	diagnostics = _pdf_backend_diagnostics()
	if not diagnostics["valid"]:
		frappe.throw(diagnostics["message"])
	html = render_devis_print_format(snapshot.name)
	try:
		pdf = get_pdf(html)
	except Exception as exc:
		frappe.throw(_pdf_generation_error_message(exc))
	file_doc = save_file(f"{offer_doc.name}-devis.pdf", pdf, "Marketplace Devis Snapshot", snapshot.name, is_private=0)
	return {"file": file_doc.name, "file_url": file_doc.file_url}


@frappe.whitelist()
def get_pdf_backend_diagnostics():
	return _pdf_backend_diagnostics()


def _pdf_backend_diagnostics():
	path = shutil.which("wkhtmltopdf")
	if not path:
		return {
			"state": "missing",
			"valid": False,
			"path": None,
			"version_output": "",
			"message": _("PDF generation requires wkhtmltopdf with patched Qt. No wkhtmltopdf executable was found in the bench environment."),
		}

	try:
		output = subprocess.check_output([path, "--version"], stderr=subprocess.STDOUT, timeout=10).decode("utf-8", "replace").strip()
	except Exception as exc:
		return {
			"state": "execution_failed",
			"valid": False,
			"path": path,
			"version_output": "",
			"message": _("wkhtmltopdf was found at {0}, but Frappe could not execute it: {1}").format(path, exc),
		}

	if "qt" not in output.lower():
		return {
			"state": "unsupported_unpatched",
			"valid": False,
			"path": path,
			"version_output": output,
			"message": _(
				"wkhtmltopdf is installed at {0} ({1}), but this build does not report patched Qt. "
				"Frappe PDF generation requires a wkhtmltopdf build with patched Qt."
			).format(path, output),
		}

	return {
		"state": "valid",
		"valid": True,
		"path": path,
		"version_output": output,
		"message": _("wkhtmltopdf with patched Qt is available."),
	}


def _pdf_generation_error_message(exc):
	diagnostics = _pdf_backend_diagnostics()
	if not diagnostics["valid"]:
		return diagnostics["message"]
	return _("Frappe PDF generation failed even though wkhtmltopdf is available at {0}: {1}").format(
		diagnostics.get("path") or "wkhtmltopdf",
		exc,
	)


def render_devis_print_format(snapshot_name):
	snapshot = frappe.get_doc("Marketplace Devis Snapshot", snapshot_name)
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", snapshot.supplier_offer)
	context = _build_devis_context_from_snapshot(snapshot, offer_doc)
	return _render_devis_html(context, for_print=True)


@frappe.whitelist()
def get_clinic_purchase_order_details(purchase_order):
	company = _get_single_allowed_company()
	purchase_order_doc = frappe.get_doc("Purchase Order", purchase_order)
	purchase_order_doc.check_permission("read")
	if purchase_order_doc.company != company:
		frappe.throw(_("You are not allowed to access this Purchase Order."), frappe.PermissionError)

	request = frappe.db.get_value(
		"Marketplace Quotation Request",
		{"clinic": company, "linked_purchase_order": purchase_order_doc.name},
		("name", "linked_supplier_offer"),
		as_dict=True,
	)
	if not request:
		frappe.throw(_("This Purchase Order is not linked to your marketplace requests."), frappe.PermissionError)

	return _purchase_order_details(purchase_order_doc, request)


@frappe.whitelist()
def get_clinic_purchase_orders(search=None, supplier=None, status=None, date_from=None, date_to=None):
	company = _get_single_allowed_company()
	filters = {"clinic": company, "linked_purchase_order": ["!=", ""]}
	if supplier:
		filters["supplier"] = supplier
	if date_from and date_to:
		filters["creation"] = ["between", [date_from, date_to]]
	elif date_from:
		filters["creation"] = [">=", date_from]
	elif date_to:
		filters["creation"] = ["<=", date_to]

	requests = frappe.get_list(
		"Marketplace Quotation Request",
		fields=["name", "supplier", "linked_supplier_offer", "linked_purchase_order", "creation"],
		filters=filters,
		order_by="modified desc",
		limit_page_length=100,
	)
	rows = []
	for request in requests:
		purchase_order = _get_purchase_order_summary(request.linked_purchase_order)
		if not purchase_order:
			continue
		if status and purchase_order["status"] != status:
			continue
		if search:
			search_text = " ".join(
				[
					purchase_order["name"],
					request.name,
					request.linked_supplier_offer or "",
					purchase_order["supplier_name"],
				]
			).lower()
			if search.lower() not in search_text:
				continue
		rows.append(
			{
				**purchase_order,
				"quotation_request": request.name,
				"supplier_offer": request.linked_supplier_offer,
				"request_creation": request.creation,
			}
		)
	return rows


def _validate_supplier_or_admin():
	if _is_marketplace_admin():
		return
	_validate_supplier_user()


def _is_marketplace_admin():
	roles = frappe.get_roles(frappe.session.user)
	return frappe.session.user == "Administrator" or "System Manager" in roles


def _get_current_product_supplier():
	if _is_marketplace_admin():
		frappe.throw(_("Use a supplier marketplace user to manage supplier products."))
	return _get_single_allowed_supplier()


def _get_supplier_product_doc(item, for_update=False):
	doc = frappe.get_doc("Item", item, for_update=for_update)
	if _is_marketplace_admin():
		return doc

	supplier = _get_single_allowed_supplier()
	if doc.marketplace_supplier != supplier:
		frappe.throw(_("You are not allowed to access this product."), frappe.PermissionError)
	return doc


def _normalize_product_payload(data, creating=False):
	if isinstance(data, str):
		data = frappe.parse_json(data or "{}")
	data = data or {}
	if not isinstance(data, dict):
		frappe.throw(_("Product data must be an object."))

	protected = sorted(set(data) & SUPPLIER_PRODUCT_PROTECTED_FIELDS)
	if protected:
		frappe.throw(_("Protected product fields cannot be changed: {0}.").format(", ".join(protected)))

	unknown = sorted(set(data) - SUPPLIER_PRODUCT_ALLOWED_FIELDS)
	if unknown:
		frappe.throw(_("Unsupported product fields: {0}.").format(", ".join(unknown)))

	payload = {fieldname: data.get(fieldname) for fieldname in SUPPLIER_PRODUCT_ALLOWED_FIELDS if fieldname in data}
	for fieldname in ("marketplace_enabled", "marketplace_available"):
		if fieldname in payload:
			payload[fieldname] = cint(payload[fieldname])

	if creating:
		if not payload.get("item_name"):
			frappe.throw(_("Product name is required."))
		if not payload.get("item_group"):
			frappe.throw(_("Category is required."))
	if payload.get("item_group"):
		_validate_item_group(payload["item_group"])
	if payload.get("ear_side") and payload["ear_side"] not in {"LEFT", "RIGHT", "BILATERAL", "NOT_APPLICABLE"}:
		frappe.throw(_("Ear side must be Left, Right, Bilateral, or Not Applicable."))

	return payload


def _apply_supplier_product_payload(item, payload):
	for fieldname in SUPPLIER_PRODUCT_ALLOWED_FIELDS:
		if fieldname in payload:
			item.set(fieldname, payload[fieldname])


def _validate_item_group(item_group):
	if not frappe.db.exists("Item Group", item_group):
		frappe.throw(_("Category {0} does not exist.").format(item_group))
	if cint(frappe.db.get_value("Item Group", item_group, "is_group")):
		frappe.throw(_("Select a product category, not a category group."))


def _validate_supplier_reference_unique(supplier, supplier_reference, exclude_item=None):
	if not supplier_reference:
		return
	filters = {"marketplace_supplier": supplier, "supplier_reference": supplier_reference}
	if exclude_item:
		filters["name"] = ["!=", exclude_item]
	if frappe.db.exists("Item", filters):
		frappe.throw(_("Supplier reference {0} is already used for one of your products.").format(supplier_reference))


def _generate_supplier_item_code(supplier, reference):
	supplier_slug = _slugify(supplier)[:32] or "SUPPLIER"
	reference_slug = _slugify(reference)[:48] or "PRODUCT"
	base_code = f"ODY-{supplier_slug}-{reference_slug}"
	code = base_code[:140]
	if not frappe.db.exists("Item", code):
		return code

	index = 2
	while True:
		suffix = f"-{index}"
		candidate = f"{base_code[:140 - len(suffix)]}{suffix}"
		if not frappe.db.exists("Item", candidate):
			return candidate
		index += 1


def _slugify(value):
	value = re.sub(r"[^A-Za-z0-9]+", "-", str(value or "").strip().upper())
	return value.strip("-")


def _default_stock_uom():
	uom = frappe.db.exists("UOM", "Nos") or frappe.db.get_value("UOM", {"enabled": 1}, "name") or frappe.db.get_value(
		"UOM", {}, "name"
	)
	if not uom:
		frappe.throw(_("Create at least one Unit of Measure before adding marketplace products."))
	return uom


def _supplier_product_dto(item):
	if hasattr(item, "as_dict") and callable(item.as_dict):
		item = frappe._dict(item.as_dict())
	else:
		item = frappe._dict(item)
	supplier = item.get("marketplace_supplier")
	visibility = _product_visibility_status_view(item)
	availability = _product_availability_status_view(item)
	return {
		"name": item.get("name"),
		"item_code": item.get("item_code"),
		"item_name": item.get("item_name"),
		"item_group": item.get("item_group"),
		"description": item.get("description"),
		"image": item.get("image"),
		"stock_uom": item.get("stock_uom"),
		"marketplace_enabled": cint(item.get("marketplace_enabled")),
		"marketplace_available": cint(item.get("marketplace_available")),
		"supplier_reference": item.get("supplier_reference"),
		"ear_side": item.get("ear_side"),
		"technical_specs": item.get("technical_specs"),
		"modified": item.get("modified"),
		"supplier": supplier,
		"supplier_name": _supplier_name(supplier) if supplier else "",
		"display_status": visibility["label"],
		"indicator": visibility["indicator"],
		"next_action": visibility["next_action"],
		"visibility_status": visibility,
		"availability_status": availability,
	}


def _read_uploaded_product_image(filename=None, content=None):
	if content is not None:
		file_name = filename or "product-image.png"
		if isinstance(content, str):
			file_content = content.encode("utf-8")
		else:
			file_content = content
		return file_name, file_content

	request = getattr(frappe.local, "request", None)
	uploaded = request.files.get("file") if request and getattr(request, "files", None) else None
	if not uploaded:
		frappe.throw(_("Choose an image file to upload."))
	return uploaded.filename, uploaded.stream.read()


def _validate_product_image(filename, content):
	if not filename:
		frappe.throw(_("Image filename is required."))
	extension = os.path.splitext(filename)[1].lower()
	if extension not in PRODUCT_IMAGE_EXTENSIONS:
		frappe.throw(_("Upload a JPEG, PNG, or WebP image."))
	if not content:
		frappe.throw(_("Image file is empty."))
	if len(content) > PRODUCT_IMAGE_MAX_BYTES:
		frappe.throw(_("Product image must be 2 MB or smaller."))
	if not _has_supported_image_signature(content, extension):
		frappe.throw(_("The uploaded file does not look like a supported image."))


def _has_supported_image_signature(content, extension):
	if extension in {".jpg", ".jpeg"}:
		return content.startswith(b"\xff\xd8\xff")
	if extension == ".png":
		return content.startswith(b"\x89PNG\r\n\x1a\n")
	if extension == ".webp":
		return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
	return False


def _validate_clinic_user():
	if "Clinic User" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only clinic users can use the marketplace catalog."), frappe.PermissionError)


def _validate_supplier_user():
	if "Fournisseur" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only supplier users can use supplier marketplace pages."), frappe.PermissionError)


def _get_single_allowed_company():
	_validate_clinic_user()
	companies = sorted(_allowed_values(frappe.session.user, "Company", "Marketplace Quotation Request"))
	if not companies:
		frappe.throw(_("Your user is not linked to a clinic Company. Contact an administrator."))
	if len(companies) > 1:
		frappe.throw(_("Your user is linked to multiple clinic Companies. Contact an administrator."))
	return companies[0]


def _get_single_allowed_supplier():
	_validate_supplier_user()
	suppliers = sorted(_allowed_values(frappe.session.user, "Supplier", "Marketplace Quotation Request"))
	if not suppliers:
		suppliers = sorted(_allowed_values(frappe.session.user, "Supplier", "Marketplace Supplier Offer"))
	if not suppliers:
		suppliers = sorted(_allowed_values(frappe.session.user, "Supplier", "Marketplace Devis Snapshot"))
	if not suppliers:
		suppliers = sorted(_allowed_values(frappe.session.user, "Supplier", "Marketplace Supplier Devis Settings"))
	if not suppliers:
		suppliers = sorted(_allowed_values(frappe.session.user, "Supplier", "Item"))
	if not suppliers:
		frappe.throw(_("Your user is not linked to a Supplier. Contact an administrator."))
	if len(suppliers) > 1:
		frappe.throw(_("Your user is linked to multiple Suppliers. Contact an administrator."))
	return suppliers[0]


def _normalize_request_items(items):
	if isinstance(items, str):
		items = frappe.parse_json(items or "[]")
	else:
		items = items or []
	if not isinstance(items, list) or not items:
		frappe.throw(_("Select at least one marketplace item."))

	lines = []
	seen = set()
	for row in items:
		item_code = row.get("item") or row.get("item_code")
		quantity = flt(row.get("quantity"))
		line_notes = row.get("line_notes")
		if not item_code:
			frappe.throw(_("Each selected line requires an Item."))
		if quantity <= 0:
			frappe.throw(_("Quantity for item {0} must be greater than zero.").format(item_code))
		if item_code in seen:
			frappe.throw(_("Item {0} is selected more than once.").format(item_code))
		seen.add(item_code)
		lines.append({"item": item_code, "quantity": quantity, "line_notes": line_notes})

	return lines


def _build_request_preview(lines):
	item_map = _get_catalog_item_map([line["item"] for line in lines])
	supplier_groups = {}
	preview_lines = []

	for line in lines:
		item = item_map.get(line["item"])
		if not item:
			frappe.throw(_("Item {0} is not available in the marketplace catalog.").format(line["item"]))

		preview_line = {
			"item": item.name,
			"item_name": item.item_name,
			"item_group": item.item_group,
			"supplier": item.marketplace_supplier,
			"supplier_name": frappe.db.get_value("Supplier", item.marketplace_supplier, "supplier_name")
			or item.marketplace_supplier,
			"supplier_reference": item.supplier_reference,
			"item_code": item.item_code,
			"image": item.image,
			"description": item.description,
			"technical_specs": item.technical_specs,
			"stock_uom": item.stock_uom,
			"quantity": line["quantity"],
			"line_notes": line.get("line_notes"),
			"ear_side": item.ear_side,
		}
		preview_lines.append(preview_line)
		supplier_groups.setdefault(item.marketplace_supplier, []).append(preview_line)

	return {
		"company": _get_single_allowed_company(),
		"supplier_count": len(supplier_groups),
		"can_create_request": len(supplier_groups) == 1,
		"message": _get_preview_message(supplier_groups),
		"suppliers": [
			{
				"supplier": supplier,
				"supplier_name": frappe.db.get_value("Supplier", supplier, "supplier_name") or supplier,
				"item_count": len(lines),
				"total_quantity": sum(flt(line["quantity"]) for line in lines),
			}
			for supplier, lines in supplier_groups.items()
		],
		"items": preview_lines,
	}


def _normalize_fulfillment_method(fulfillment_method):
	method = (fulfillment_method or "").strip().upper()
	if method not in FULFILLMENT_LABELS:
		frappe.throw(_("Choose Delivery or Pickup before creating the quotation request."))
	return method


def _normalize_delivery_address_snapshot(fulfillment_method, delivery_address, company):
	if fulfillment_method == "PICKUP":
		return {
			"delivery_address_line1": "",
			"delivery_address_line2": "",
			"delivery_city": "",
			"delivery_postal_code": "",
			"delivery_country": "",
			"delivery_contact_name": "",
			"delivery_contact_phone": "",
		}

	address = frappe.parse_json(delivery_address or {}) if isinstance(delivery_address, str) else (delivery_address or {})
	if not address:
		address = _party_address_snapshot("Company", company)
	snapshot = {
		"delivery_address_line1": address.get("address_line1") or address.get("delivery_address_line1") or "",
		"delivery_address_line2": address.get("address_line2") or address.get("delivery_address_line2") or "",
		"delivery_city": address.get("city") or address.get("delivery_city") or "",
		"delivery_postal_code": address.get("pincode") or address.get("postal_code") or address.get("delivery_postal_code") or "",
		"delivery_country": address.get("country") or address.get("delivery_country") or "",
		"delivery_contact_name": address.get("contact_name") or address.get("delivery_contact_name") or "",
		"delivery_contact_phone": address.get("phone") or address.get("delivery_contact_phone") or "",
	}
	if not (snapshot["delivery_address_line1"] and snapshot["delivery_city"] and snapshot["delivery_country"]):
		frappe.throw(_("Delivery requests require address line 1, city, and country."))
	return snapshot


def _fulfillment_snapshot(request):
	if request.fulfillment_method == "DELIVERY":
		address = {
			"address_line1": request.delivery_address_line1,
			"address_line2": request.delivery_address_line2,
			"city": request.delivery_city,
			"pincode": request.delivery_postal_code,
			"country": request.delivery_country,
			"contact_name": request.delivery_contact_name,
			"phone": request.delivery_contact_phone,
		}
		return {
			"method": "DELIVERY",
			"label": FULFILLMENT_LABELS["DELIVERY"],
			"delivery_address": {**address, "formatted": _format_address_snapshot(address)},
		}

	return {"method": "PICKUP", "label": FULFILLMENT_LABELS["PICKUP"], "delivery_address": None}


def _get_catalog_item_map(item_codes):
	items = frappe.get_list(
		"Item",
		fields=CATALOG_FIELDS,
		filters={
			"name": ["in", item_codes],
			"marketplace_enabled": 1,
			"marketplace_available": 1,
			"disabled": 0,
		},
		limit_page_length=0,
	)
	return {item.name: item for item in items}


def _with_supplier_display(item):
	item = frappe._dict(item)
	item.supplier_name = frappe.db.get_value("Supplier", item.marketplace_supplier, "supplier_name") or item.marketplace_supplier
	return item


def _get_preview_message(supplier_groups):
	if not supplier_groups:
		return _("Select marketplace items to prepare a quotation request.")
	if len(supplier_groups) > 1:
		return _("Selected items belong to multiple suppliers. Create one request per supplier.")
	return _("Selected items can be sent as one quotation request.")


def _validate_supplier_request(request, supplier):
	if request.docstatus != 1 or request.status != "Sent":
		frappe.throw(_("Only sent quotation requests are visible to suppliers."), frappe.PermissionError)
	if request.supplier != supplier:
		frappe.throw(_("You are not allowed to access this quotation request."), frappe.PermissionError)


def _request_summary(request):
	offer = _get_request_offer(request.name)
	status_view = _request_status_view(request, offer, actor="supplier")
	return {
		"name": request.name,
		"clinic": request.clinic,
		"clinic_name": _company_name(request.clinic),
		"status": request.status,
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"next_action": status_view["next_action"],
		"creation": request.creation,
		"sent_at": request.sent_at,
		"fulfillment_method": request.fulfillment_method,
		"fulfillment_label": FULFILLMENT_LABELS.get(request.fulfillment_method, request.fulfillment_method or ""),
		"item_count": cint(request.item_count),
		"total_requested_quantity": flt(request.total_requested_quantity),
		"offer": offer,
		"offer_created": bool(offer),
		"available_action": _("View Offer") if offer else _("Create Offer"),
	}


def _offer_summary(offer):
	result = "pending"
	if offer.status == "Accepted":
		result = "accepted"
	elif offer.status == "Rejected":
		result = "rejected"

	status_view = _offer_status_view(offer, actor="supplier")
	return {
		"name": offer.name,
		"quotation_request": offer.quotation_request,
		"clinic": offer.clinic,
		"clinic_name": _company_name(offer.clinic),
		"status": offer.status,
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"next_action": status_view["next_action"],
		"result": result,
		"creation": offer.creation,
		"sent_at": offer.sent_at,
		"accepted_at": offer.accepted_at,
		"rejected_at": offer.rejected_at,
		"item_count": cint(offer.item_count),
		"total_quantity": flt(offer.total_quantity),
		"total_amount": flt(offer.total_amount),
	}


def _offer_details(offer_doc):
	has_complete_pricing = _offer_has_complete_pricing(offer_doc)
	request = frappe.get_doc("Marketplace Quotation Request", offer_doc.quotation_request)
	devis = _get_devis_summary_for_offer(offer_doc.name)
	return {
		**_offer_summary(offer_doc),
		"supplier": offer_doc.supplier,
		"supplier_name": _supplier_name(offer_doc.supplier),
		"can_submit": offer_doc.docstatus == 0 and offer_doc.status == "Draft",
		"can_create_devis": offer_doc.docstatus == 1 and offer_doc.status in DEVIS_CREATION_STATUSES and not devis,
		"can_view_devis": bool(devis),
		"devis": devis,
		"fulfillment": _fulfillment_snapshot(request),
		"requires_pricing": not has_complete_pricing,
		"items": [
			{
				"item": row.item,
				"item_name": row.item_name_snapshot,
				"supplier_reference": row.supplier_reference_snapshot,
				"quantity": flt(row.quantity),
				"uom": row.uom,
				"fixed_rate": flt(row.fixed_rate),
				"amount": flt(row.amount),
				"line_notes": row.line_notes,
			}
			for row in offer_doc.items
		],
	}


def _apply_offer_rates(offer_doc, rates):
	supplier = _get_single_allowed_supplier()
	if offer_doc.supplier != supplier:
		frappe.throw(_("You are not allowed to price this supplier offer."), frappe.PermissionError)
	if offer_doc.docstatus != 0 or offer_doc.status != "Draft":
		frappe.throw(_("Only Draft supplier offers can be priced."))

	rate_map = _normalize_offer_rates(rates)
	offer_items = {row.item for row in offer_doc.items}
	missing_items = [row.item for row in offer_doc.items if row.item not in rate_map]
	if missing_items:
		frappe.throw(_("Enter an offer rate for every requested item."))
	extra_items = sorted(set(rate_map) - offer_items)
	if extra_items:
		frappe.throw(_("Offer prices can only be provided for requested items."))

	for row in offer_doc.items:
		row.fixed_rate = rate_map[row.item]

	offer_doc.save()


def _get_authorized_devis_offer(offer):
	offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer)
	offer_doc.check_permission("read")
	if _is_marketplace_admin():
		return offer_doc
	roles = set(frappe.get_roles(frappe.session.user))
	if "Fournisseur" in roles:
		supplier = _get_single_allowed_supplier()
		_validate_supplier_offer_for_devis(offer_doc, supplier, read_only=True)
		return offer_doc
	if "Clinic User" in roles:
		company = _get_single_allowed_company()
		_validate_clinic_offer(offer_doc, company)
		if offer_doc.status not in {"Sent", "Accepted", "Rejected"}:
			frappe.throw(_("This Devis is not available to the clinic yet."), frappe.PermissionError)
		return offer_doc
	frappe.throw(_("You are not allowed to access this Devis."), frappe.PermissionError)


def _validate_supplier_offer_for_devis(offer_doc, supplier, read_only=False):
	if offer_doc.supplier != supplier:
		frappe.throw(_("You are not allowed to access this supplier offer."), frappe.PermissionError)
	if offer_doc.docstatus != 1 or offer_doc.status not in DEVIS_VIEW_STATUSES:
		frappe.throw(_("A Devis is available only for submitted supplier offers."))
	if not read_only and offer_doc.status not in DEVIS_CREATION_STATUSES:
		frappe.throw(_("This supplier offer is not eligible for Devis generation."))


def _can_supplier_manage_devis(offer_doc):
	if _is_marketplace_admin():
		return True
	if "Fournisseur" not in frappe.get_roles(frappe.session.user):
		return False
	return offer_doc.supplier == _get_single_allowed_supplier()


def _get_devis_summary_for_offer(offer):
	snapshot = frappe.db.get_value(
		"Marketplace Devis Snapshot",
		{"supplier_offer": offer},
		("name", "template", "issue_date"),
		as_dict=True,
	)
	return dict(snapshot) if snapshot else None


def _get_supplier_devis_settings(supplier):
	settings = frappe.db.get_value(
		"Marketplace Supplier Devis Settings",
		{"supplier": supplier},
		(
			"name",
			"default_template",
			"default_display_name",
			"default_logo",
			"default_address",
			"default_city",
			"default_country",
			"default_phone",
			"default_email",
			"default_identifiers",
			"default_footer_terms",
		),
		as_dict=True,
	)
	return dict(settings or {"default_template": "classic"})


def _resolve_devis_settings_supplier(offer=None, require_mutable_offer=False):
	if offer:
		offer_doc = _get_authorized_devis_offer(offer)
		if not _can_supplier_manage_devis(offer_doc):
			frappe.throw(_("Only the supplier can manage Devis configuration."), frappe.PermissionError)
		_validate_supplier_offer_for_devis(offer_doc, offer_doc.supplier if _is_marketplace_admin() else _get_single_allowed_supplier())
		if require_mutable_offer:
			_validate_devis_snapshot_not_confirmed(offer_doc)
		return offer_doc.supplier

	if _is_marketplace_admin():
		frappe.throw(_("Open a supplier offer before managing supplier Devis configuration."))
	if "Fournisseur" not in frappe.get_roles(frappe.session.user):
		frappe.throw(_("Only the supplier can manage Devis configuration."), frappe.PermissionError)
	return _get_single_allowed_supplier()


def _supplier_devis_configuration_dto(supplier):
	settings = _get_supplier_devis_settings(supplier)
	address = _party_address_snapshot("Supplier", supplier)
	contact = _party_contact_snapshot("Supplier", supplier)
	logo = _supplier_devis_logo(supplier, settings)
	footer_terms = settings.get("default_footer_terms") or _default_devis_footer_terms()
	return {
		"supplier": supplier,
		"supplier_name": _supplier_name(supplier),
		"default_template": settings.get("default_template") or "classic",
		"display_name": settings.get("default_display_name") or _supplier_name(supplier),
		"logo": logo,
		"address": settings.get("default_address") or address.get("address_line1") or "",
		"city": settings.get("default_city") or address.get("city") or "",
		"country": settings.get("default_country") or address.get("country") or "",
		"phone": settings.get("default_phone") or contact.get("phone") or address.get("phone") or "",
		"email": settings.get("default_email") or contact.get("email") or address.get("email_id") or "",
		"identifiers": settings.get("default_identifiers") or "",
		"footer_terms": footer_terms,
	}


def _normalize_supplier_devis_configuration(data):
	data = frappe.parse_json(data or {}) if isinstance(data, str) else (data or {})
	unexpected = sorted(set(data) - SUPPLIER_DEVIS_CONFIGURATION_FIELDS)
	if unexpected:
		frappe.throw(_("Devis configuration contains unsupported fields: {0}").format(", ".join(unexpected)))

	template = (data.get("default_template") or "classic").strip().lower()
	if template not in {row["key"] for row in DEVIS_TEMPLATES}:
		frappe.throw(_("Choose a valid default Devis template."))

	values = {"default_template": template}
	for source, target in {
		"display_name": "default_display_name",
		"logo": "default_logo",
		"address": "default_address",
		"city": "default_city",
		"country": "default_country",
		"phone": "default_phone",
		"email": "default_email",
		"identifiers": "default_identifiers",
		"footer_terms": "default_footer_terms",
	}.items():
		if source in data:
			values[target] = (data.get(source) or "").strip() if isinstance(data.get(source), str) else data.get(source)
	return values


def _save_supplier_devis_configuration(supplier, values):
	name = frappe.db.get_value("Marketplace Supplier Devis Settings", {"supplier": supplier}, "name")
	doc = frappe.get_doc("Marketplace Supplier Devis Settings", name) if name else frappe.new_doc("Marketplace Supplier Devis Settings")
	doc.supplier = supplier
	for fieldname, value in values.items():
		doc.set(fieldname, value)
	if name:
		doc.save(ignore_permissions=True)
	else:
		doc.insert(ignore_permissions=True)
	return doc


def _update_supplier_devis_settings(supplier, template=None, logo=None, footer_terms=None):
	name = frappe.db.get_value("Marketplace Supplier Devis Settings", {"supplier": supplier}, "name")
	doc = frappe.get_doc("Marketplace Supplier Devis Settings", name) if name else frappe.new_doc("Marketplace Supplier Devis Settings")
	doc.supplier = supplier
	if template:
		doc.default_template = template
	if logo:
		doc.default_logo = logo
	if footer_terms:
		doc.default_footer_terms = footer_terms
	if name:
		doc.save(ignore_permissions=True)
	else:
		doc.insert(ignore_permissions=True)
	return doc


def _save_supplier_profile_details(supplier, supplier_snapshot):
	values = {}
	display_name = supplier_snapshot.get("display_name")
	if display_name:
		values["supplier_name"] = display_name
	if values:
		frappe.db.set_value("Supplier", supplier, values, update_modified=True)


def _validate_devis_snapshot_not_confirmed(offer_doc):
	if frappe.db.exists("Marketplace Devis Snapshot", {"supplier_offer": offer_doc.name}):
		frappe.throw(_("This supplier offer already has a confirmed Devis. View the historical Devis instead."))


def _default_devis_footer_terms():
	return _("Prices are supplier-entered quotation prices and exclude any tax calculation not explicitly shown.")


def _build_devis_context(offer_doc, template, overrides=None):
	template = (template or "classic").strip().lower()
	if template not in {row["key"] for row in DEVIS_TEMPLATES}:
		frappe.throw(_("Choose a valid Devis template."))
	overrides = frappe.parse_json(overrides or {}) if isinstance(overrides, str) else (overrides or {})
	request = frappe.get_doc("Marketplace Quotation Request", offer_doc.quotation_request)
	settings = _get_supplier_devis_settings(offer_doc.supplier)
	supplier_snapshot = _supplier_devis_profile(offer_doc.supplier, settings)
	clinic_snapshot = _clinic_devis_profile(offer_doc.clinic)
	supplier_snapshot.update(overrides.get("supplier") or {})
	clinic_snapshot.update(overrides.get("clinic") or {})
	footer_terms = overrides.get("footer_terms") or settings.get("default_footer_terms") or _default_devis_footer_terms()
	return {
		"template": template,
		"template_label": next(row["label"] for row in DEVIS_TEMPLATES if row["key"] == template),
		"devis_no": offer_doc.name,
		"offer": _offer_details_without_devis(offer_doc),
		"request": request.name,
		"issue_date": overrides.get("issue_date") or nowdate(),
		"valid_until": overrides.get("valid_until"),
		"supplier": supplier_snapshot,
		"clinic": clinic_snapshot,
		"fulfillment": _devis_fulfillment_context(request),
		"supplier_notes": overrides.get("supplier_notes") or offer_doc.supplier_notes,
		"footer_terms": footer_terms,
	}


def _build_devis_context_from_snapshot(snapshot, offer_doc):
	request = frappe.get_doc("Marketplace Quotation Request", offer_doc.quotation_request)
	return {
		"template": snapshot.template,
		"template_label": next(row["label"] for row in DEVIS_TEMPLATES if row["key"] == snapshot.template),
		"devis_no": offer_doc.name,
		"offer": _offer_details_without_devis(offer_doc),
		"request": request.name,
		"issue_date": snapshot.issue_date,
		"valid_until": snapshot.valid_until,
		"supplier": {
			"display_name": snapshot.supplier_display_name,
			"logo": snapshot.supplier_logo,
			"address": snapshot.supplier_address,
			"phone": snapshot.supplier_phone,
			"email": snapshot.supplier_email,
			"identifiers": snapshot.supplier_identifiers,
		},
		"clinic": {
			"display_name": snapshot.clinic_display_name,
			"address": snapshot.clinic_address,
			"phone": snapshot.clinic_phone,
			"email": snapshot.clinic_email,
		},
		"fulfillment": {
			"method": snapshot.fulfillment_method,
			"label": FULFILLMENT_LABELS.get(snapshot.fulfillment_method, snapshot.fulfillment_method),
			"delivery_address": snapshot.delivery_address,
		},
		"supplier_notes": snapshot.supplier_notes,
		"footer_terms": snapshot.footer_terms,
	}


def _offer_details_without_devis(offer_doc):
	return {
		"name": offer_doc.name,
		"quotation_request": offer_doc.quotation_request,
		"status": offer_doc.status,
		"sent_at": offer_doc.sent_at,
		"accepted_at": offer_doc.accepted_at,
		"rejected_at": offer_doc.rejected_at,
		"total_amount": flt(offer_doc.total_amount),
		"items": [
			{
				"item": row.item,
				"item_name": row.item_name_snapshot,
				"supplier_reference": row.supplier_reference_snapshot,
				"quantity": flt(row.quantity),
				"uom": row.uom,
				"fixed_rate": flt(row.fixed_rate),
				"amount": flt(row.amount),
				"line_notes": row.line_notes,
			}
			for row in offer_doc.items
		],
	}


def _supplier_devis_profile(supplier, settings=None):
	settings = settings or _get_supplier_devis_settings(supplier)
	address = _party_address_snapshot("Supplier", supplier)
	contact = _party_contact_snapshot("Supplier", supplier)
	configured_address = _configured_devis_address(settings)
	return {
		"display_name": settings.get("default_display_name") or _supplier_name(supplier),
		"logo": _supplier_devis_logo(supplier, settings),
		"address": configured_address or _format_address_snapshot(address),
		"phone": settings.get("default_phone") or contact.get("phone") or address.get("phone") or "",
		"email": settings.get("default_email") or contact.get("email") or address.get("email_id") or "",
		"identifiers": settings.get("default_identifiers") or "",
	}


def _supplier_devis_logo(supplier, settings=None):
	settings = settings or _get_supplier_devis_settings(supplier)
	logo = settings.get("default_logo") or ""
	if logo:
		return logo

	supplier_meta = frappe.get_meta("Supplier")
	for fieldname in ("image", "supplier_logo"):
		if supplier_meta.has_field(fieldname):
			logo = frappe.db.get_value("Supplier", supplier, fieldname) or ""
			if logo:
				return logo
	return ""


def _configured_devis_address(settings):
	lines = [
		settings.get("default_address"),
		settings.get("default_city"),
		settings.get("default_country"),
	]
	return "\n".join(line.strip() for line in lines if isinstance(line, str) and line.strip())


def _clinic_devis_profile(company):
	address = _party_address_snapshot("Company", company)
	contact = _party_contact_snapshot("Company", company)
	return {
		"display_name": _company_name(company),
		"address": _format_address_snapshot(address),
		"phone": contact.get("phone") or address.get("phone") or "",
		"email": contact.get("email") or address.get("email_id") or "",
	}


def _devis_fulfillment_context(request):
	fulfillment = _fulfillment_snapshot(request)
	return {
		"method": fulfillment["method"],
		"label": fulfillment["label"],
		"delivery_address": (fulfillment.get("delivery_address") or {}).get("formatted") if fulfillment.get("delivery_address") else "",
	}


def _print_format_for_template(template):
	return {
		"classic": "Marketplace Devis Classic",
		"modern": "Marketplace Devis Modern",
		"compact": "Marketplace Devis Compact",
	}.get(template or "classic", "Marketplace Devis Classic")


def _render_devis_html(context, for_print=False):
	template_class = f"odyio-devis-{context['template']}"
	rows = "".join(
		f"""
		<tr>
			<td>{frappe.utils.escape_html(row['item_name'] or row['item'])}<br><small>{frappe.utils.escape_html(row['item'])}</small></td>
			<td>{frappe.utils.escape_html(row.get('uom') or '')}</td>
			<td class="text-right">{row['quantity']:g}</td>
			<td class="text-right">{row['fixed_rate']:,.3f}</td>
			<td class="text-right">{row['amount']:,.3f}</td>
		</tr>
		"""
		for row in context["offer"]["items"]
	)
	logo = f"<img class='odyio-devis-logo' src='{frappe.utils.escape_html(context['supplier'].get('logo'))}'>" if context["supplier"].get("logo") else ""
	delivery = ""
	if context["fulfillment"]["method"] == "DELIVERY":
		delivery = f"<pre>{frappe.utils.escape_html(context['fulfillment'].get('delivery_address') or '')}</pre>"
	compact = context["template"] == "compact"
	return f"""
	<style>
		.odyio-devis {{ font-family: Inter, Arial, sans-serif; color: #1f272e; font-size: {'11px' if compact else '12px'}; }}
		.odyio-devis-header {{ display:flex; justify-content:space-between; gap:24px; border-bottom:1px solid #d1d8dd; padding-bottom:{'8px' if compact else '16px'}; margin-bottom:{'10px' if compact else '18px'}; }}
		.odyio-devis-modern .odyio-devis-header {{ border-bottom:3px solid #2490ef; }}
		.odyio-devis-logo {{ max-height:{'42px' if compact else '72px'}; max-width:180px; object-fit:contain; }}
		.odyio-devis h1 {{ margin:0 0 8px; font-size:{'20px' if compact else '26px'}; }}
		.odyio-devis h2 {{ margin:14px 0 6px; font-size:14px; }}
		.odyio-devis-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
		.odyio-devis-box {{ border:1px solid #d1d8dd; padding:{'8px' if compact else '12px'}; border-radius:4px; }}
		.odyio-devis table {{ width:100%; border-collapse:collapse; margin-top:10px; }}
		.odyio-devis th, .odyio-devis td {{ border:1px solid #d1d8dd; padding:{'5px' if compact else '8px'}; vertical-align:top; }}
		.odyio-devis-modern th {{ background:#f7fafc; border-color:#e2e8f0; }}
		.odyio-devis-classic th, .odyio-devis-compact th {{ background:#f4f5f6; }}
		.text-right {{ text-align:right; }}
		pre {{ white-space:pre-wrap; margin:0; font-family:inherit; }}
		.odyio-devis-total {{ text-align:right; font-size:15px; font-weight:700; margin-top:12px; }}
		.odyio-devis-footer {{ margin-top:18px; color:#6b7280; border-top:1px solid #d1d8dd; padding-top:10px; }}
	</style>
	<div class="odyio-devis {template_class}">
		<div class="odyio-devis-header">
			<div>
				{logo}
				<h2>{frappe.utils.escape_html(context['supplier']['display_name'])}</h2>
				<pre>{frappe.utils.escape_html(context['supplier'].get('address') or '')}</pre>
				<div>{frappe.utils.escape_html(context['supplier'].get('phone') or '')}</div>
				<div>{frappe.utils.escape_html(context['supplier'].get('email') or '')}</div>
			</div>
			<div class="text-right">
				<h1>{_('Devis')}</h1>
				<div><b>{_('Devis No.')}</b> {frappe.utils.escape_html(context['devis_no'])}</div>
				<div><b>{_('Request')}</b> {frappe.utils.escape_html(context['request'])}</div>
				<div><b>{_('Issue Date')}</b> {frappe.utils.escape_html(str(context['issue_date'] or ''))}</div>
				{f"<div><b>{_('Valid Until')}</b> {frappe.utils.escape_html(str(context['valid_until']))}</div>" if context.get('valid_until') else ""}
			</div>
		</div>
		<div class="odyio-devis-grid">
			<div class="odyio-devis-box">
				<h2>{_('Clinic')}</h2>
				<b>{frappe.utils.escape_html(context['clinic']['display_name'])}</b>
				<pre>{frappe.utils.escape_html(context['clinic'].get('address') or '')}</pre>
				<div>{frappe.utils.escape_html(context['clinic'].get('phone') or '')}</div>
				<div>{frappe.utils.escape_html(context['clinic'].get('email') or '')}</div>
			</div>
			<div class="odyio-devis-box">
				<h2>{_('Fulfillment')}</h2>
				<div>{frappe.utils.escape_html(context['fulfillment']['label'])}</div>
				{delivery}
			</div>
		</div>
		<h2>{_('Commercial Offer')}</h2>
		<table>
			<thead><tr><th>{_('Item')}</th><th>{_('UOM')}</th><th class="text-right">{_('Qty')}</th><th class="text-right">{_('Unit Price')}</th><th class="text-right">{_('Amount')}</th></tr></thead>
			<tbody>{rows}</tbody>
		</table>
		<div class="odyio-devis-total">{_('Total')}: {context['offer']['total_amount']:,.3f}</div>
		{f"<h2>{_('Notes')}</h2><div>{context.get('supplier_notes') or ''}</div>" if context.get('supplier_notes') else ""}
		<div class="odyio-devis-footer">{frappe.utils.escape_html(context.get('footer_terms') or '')}</div>
	</div>
	"""


def _normalize_offer_rates(rates):
	if isinstance(rates, str):
		rates = frappe.parse_json(rates or "[]")

	if isinstance(rates, dict):
		rates = [{"item": item, "fixed_rate": fixed_rate} for item, fixed_rate in rates.items()]

	if not isinstance(rates, list) or not rates:
		frappe.throw(_("Enter offer rates before submitting."))

	rate_map = {}
	for row in rates:
		item = row.get("item") or row.get("item_code")
		rate = flt(row.get("fixed_rate") if row.get("fixed_rate") is not None else row.get("rate"))
		if not item:
			frappe.throw(_("Each offer price line requires an Item."))
		if rate <= 0:
			frappe.throw(_("Offer rate for item {0} must be greater than zero.").format(item))
		if item in rate_map:
			frappe.throw(_("Offer rate for item {0} is supplied more than once.").format(item))
		rate_map[item] = rate

	return rate_map


def _offer_has_complete_pricing(offer_doc):
	return bool(offer_doc.items) and all(flt(row.fixed_rate) > 0 for row in offer_doc.items)


def _get_request_offer(quotation_request):
	offer_name = frappe.db.get_value(
		"Marketplace Supplier Offer",
		{"quotation_request": quotation_request, "docstatus": ["<", 2]},
		"name",
	)
	if not offer_name:
		return None

	offer = frappe.db.get_value(
		"Marketplace Supplier Offer",
		offer_name,
		("name", "status", "docstatus", "sent_at", "accepted_at", "rejected_at", "total_amount"),
		as_dict=True,
	)
	return {
		"name": offer.name,
		"status": offer.status,
		"docstatus": offer.docstatus,
		"sent_at": offer.sent_at,
		"accepted_at": offer.accepted_at,
		"rejected_at": offer.rejected_at,
		"total_amount": flt(offer.total_amount),
	}


def _supplier_name(supplier):
	return frappe.db.get_value("Supplier", supplier, "supplier_name") or supplier


def _company_name(company):
	return frappe.db.get_value("Company", company, "company_name") or company


def _party_address_snapshot(link_doctype, link_name):
	address_name = frappe.db.get_value(
		"Dynamic Link",
		{
			"link_doctype": link_doctype,
			"link_name": link_name,
			"parenttype": "Address",
		},
		"parent",
		order_by="idx asc",
	)
	if not address_name:
		return {}
	address = frappe.db.get_value(
		"Address",
		address_name,
		("address_line1", "address_line2", "city", "pincode", "country", "phone", "email_id"),
		as_dict=True,
	)
	return dict(address or {})


def _party_contact_snapshot(link_doctype, link_name):
	contact_name = frappe.db.get_value(
		"Dynamic Link",
		{
			"link_doctype": link_doctype,
			"link_name": link_name,
			"parenttype": "Contact",
		},
		"parent",
		order_by="idx asc",
	)
	if not contact_name:
		return {}
	contact = frappe.get_doc("Contact", contact_name)
	return {
		"email": (contact.email_ids[0].email_id if contact.email_ids else "") or contact.email_id,
		"phone": (contact.phone_nos[0].phone if contact.phone_nos else "") or contact.phone,
		"name": contact.full_name,
	}


def _format_address_snapshot(address):
	parts = [
		address.get("address_line1"),
		address.get("address_line2"),
		" ".join(filter(None, [address.get("pincode"), address.get("city")])),
		address.get("country"),
	]
	return "\n".join(part for part in parts if part)


def _validate_clinic_request(request, company):
	if request.clinic != company:
		frappe.throw(_("You are not allowed to access this marketplace request."), frappe.PermissionError)


def _validate_clinic_offer(offer_doc, company):
	if offer_doc.clinic != company:
		frappe.throw(_("You are not allowed to access this supplier offer."), frappe.PermissionError)
	request_company = frappe.db.get_value("Marketplace Quotation Request", offer_doc.quotation_request, "clinic")
	if request_company != company:
		frappe.throw(_("This supplier offer is not linked to your clinic request."), frappe.PermissionError)


def _request_marketplace_items(request):
	items = []
	for row in request.items:
		item = frappe.db.get_value(
			"Item",
			row.item,
			("item_name", "item_code", "stock_uom", "supplier_reference"),
			as_dict=True,
		)
		if not item:
			frappe.throw(_("Item {0} no longer exists.").format(row.item))

		items.append(
			{
				"item": row.item,
				"item_code": item.item_code,
				"item_name": row.item_name_snapshot or item.item_name,
				"supplier_reference": row.supplier_reference_snapshot or item.supplier_reference,
				"quantity": flt(row.quantity),
				"uom": item.stock_uom,
				"line_notes": row.line_notes,
			}
		)
	return items


def _clinic_request_summary(request):
	offer = _get_request_offer(request.name)
	purchase_order = _get_purchase_order_summary(request.linked_purchase_order)
	items = _request_marketplace_items(frappe.get_doc("Marketplace Quotation Request", request.name))
	status_view = _request_status_view(request, offer, purchase_order, actor="clinic")
	return {
		"name": request.name,
		"supplier": request.supplier,
		"supplier_name": _supplier_name(request.supplier),
		"status": request.status,
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"next_action": status_view["next_action"],
		"creation": request.creation,
		"sent_at": request.sent_at,
		"fulfillment_method": request.fulfillment_method,
		"fulfillment_label": FULFILLMENT_LABELS.get(request.fulfillment_method, request.fulfillment_method or ""),
		"item_count": cint(request.item_count),
		"total_requested_quantity": flt(request.total_requested_quantity),
		"offer_count": 1 if offer else 0,
		"offer": offer,
		"decision_state": _decision_state(offer),
		"purchase_order": purchase_order,
		"purchase_order_state": purchase_order["status"] if purchase_order else None,
		"empty_state": _clinic_empty_state(request, offer, purchase_order),
		"actions": _clinic_request_actions(request, offer, purchase_order),
		"items": items,
	}


def _clinic_offer_details(offer_doc):
	details = _offer_details(offer_doc)
	status_view = _offer_status_view(offer_doc, actor="clinic")
	details.update(
		{
			"display_status": status_view["label"],
			"indicator": status_view["indicator"],
			"next_action": status_view["next_action"],
			"can_accept": offer_doc.docstatus == 1 and offer_doc.status == "Sent",
			"can_reject": offer_doc.docstatus == 1 and offer_doc.status == "Sent",
			"decision_state": _decision_state({"status": offer_doc.status}),
			"purchase_order": _get_purchase_order_summary(offer_doc.purchase_order),
		}
	)
	return details


def _get_purchase_order_summary(purchase_order):
	if not purchase_order:
		return None
	values = frappe.db.get_value(
		"Purchase Order",
		purchase_order,
		("name", "supplier", "company", "docstatus", "status", "transaction_date", "grand_total"),
		as_dict=True,
	)
	if not values:
		return None
	status_view = _purchase_order_status_view(values)
	return {
		"name": values.name,
		"supplier": values.supplier,
		"supplier_name": _supplier_name(values.supplier),
		"company": values.company,
		"company_name": _company_name(values.company),
		"docstatus": values.docstatus,
		"status": values.status or ("Draft" if values.docstatus == 0 else "Submitted"),
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"transaction_date": values.transaction_date,
		"grand_total": flt(values.grand_total),
	}


def _purchase_order_details(purchase_order_doc, request):
	status_view = _purchase_order_status_view(purchase_order_doc)
	return {
		"name": purchase_order_doc.name,
		"docstatus": purchase_order_doc.docstatus,
		"status": purchase_order_doc.status or ("Draft" if purchase_order_doc.docstatus == 0 else "Submitted"),
		"display_status": status_view["label"],
		"indicator": status_view["indicator"],
		"company": purchase_order_doc.company,
		"company_name": _company_name(purchase_order_doc.company),
		"supplier": purchase_order_doc.supplier,
		"supplier_name": _supplier_name(purchase_order_doc.supplier),
		"quotation_request": request.name,
		"supplier_offer": request.linked_supplier_offer,
		"transaction_date": purchase_order_doc.transaction_date,
		"schedule_date": purchase_order_doc.schedule_date,
		"grand_total": flt(purchase_order_doc.grand_total),
		"items": [
			{
				"item_code": row.item_code,
				"item_name": row.item_name,
				"quantity": flt(row.qty),
				"uom": row.uom,
				"rate": flt(row.rate),
				"amount": flt(row.amount),
			}
			for row in purchase_order_doc.items
		],
	}


def _decision_state(offer):
	if not offer:
		return "no_offer"
	status = offer.get("status") if isinstance(offer, dict) else offer.status
	if status == "Accepted":
		return "accepted"
	if status == "Rejected":
		return "rejected"
	if status == "Sent":
		return "awaiting_decision"
	if status == "Draft":
		return "offer_draft"
	return "no_offer"


def _request_status_view(request, offer=None, purchase_order=None, actor="clinic"):
	status = request.get("status") if isinstance(request, dict) else request.status
	if purchase_order:
		return {"label": _("Accepted - Purchase Order created"), "indicator": "green", "next_action": _("View Purchase Order")}
	if offer:
		offer_status = offer.get("status") if isinstance(offer, dict) else offer.status
		if offer_status == "Draft":
			if actor == "supplier":
				return {"label": _("Draft Offer"), "indicator": "orange", "next_action": _("Complete and submit offer")}
			return {"label": _("Waiting for supplier response"), "indicator": "orange", "next_action": _("Supplier is preparing an offer")}
		if offer_status == "Sent":
			if actor == "supplier":
				return {"label": _("Offer Submitted"), "indicator": "blue", "next_action": _("Awaiting clinic decision")}
			return {"label": _("Offer Received"), "indicator": "blue", "next_action": _("Review supplier offer")}
		if offer_status == "Accepted":
			return {
				"label": _("Accepted by Clinic") if actor == "supplier" else _("Accepted"),
				"indicator": "green",
				"next_action": _("Purchase Order created"),
			}
		if offer_status == "Rejected":
			return {
				"label": _("Rejected by Clinic") if actor == "supplier" else _("Rejected"),
				"indicator": "red",
				"next_action": _("No Purchase Order was created"),
			}
	if status == "Draft":
		return {"label": _("Draft"), "indicator": "orange", "next_action": _("Review and send request")}
	if status == "Sent":
		if actor == "supplier":
			return {"label": _("Needs Response"), "indicator": "blue", "next_action": _("Create Offer")}
		return {"label": _("Waiting for Supplier"), "indicator": "blue", "next_action": _("Waiting for supplier response")}
	if status == "Cancelled":
		return {"label": _("Cancelled"), "indicator": "red", "next_action": _("No further action")}
	if status == "Expired":
		return {"label": _("Expired"), "indicator": "red", "next_action": _("No further action")}
	return {"label": _(status or "Open"), "indicator": "gray", "next_action": ""}


def _offer_status_view(offer, actor="supplier"):
	status = offer.get("status") if isinstance(offer, dict) else offer.status
	if status == "Draft":
		return {"label": _("Draft"), "indicator": "orange", "next_action": _("Enter pricing and submit")}
	if status == "Sent":
		if actor == "clinic":
			return {"label": _("Offer ready for review"), "indicator": "blue", "next_action": _("Accept or reject offer")}
		return {"label": _("Awaiting Clinic Decision"), "indicator": "blue", "next_action": _("Waiting for clinic decision")}
	if status == "Accepted":
		return {"label": _("Accepted"), "indicator": "green", "next_action": _("Purchase Order created")}
	if status == "Rejected":
		return {"label": _("Rejected"), "indicator": "red", "next_action": _("No Purchase Order was created")}
	if status == "Cancelled":
		return {"label": _("Cancelled"), "indicator": "red", "next_action": _("No further action")}
	return {"label": _(status or "Open"), "indicator": "gray", "next_action": ""}


def _purchase_order_status_view(purchase_order):
	status = purchase_order.get("status") if isinstance(purchase_order, dict) else purchase_order.status
	docstatus = purchase_order.get("docstatus") if isinstance(purchase_order, dict) else purchase_order.docstatus
	if docstatus == 0:
		return {"label": _("Draft Purchase Order"), "indicator": "orange"}
	if status == "Completed":
		return {"label": _("Completed"), "indicator": "green"}
	if status == "Cancelled":
		return {"label": _("Cancelled"), "indicator": "red"}
	return {"label": _(status or "Submitted"), "indicator": "blue"}


def _product_status_view(item):
	return _product_visibility_status_view(item)


def _product_visibility_status_view(item):
	enabled = cint(item.get("marketplace_enabled"))
	if not enabled:
		return {"label": _("Hidden"), "indicator": "gray", "next_action": _("Enable to show in catalogue")}
	return {"label": _("Listed"), "indicator": "blue", "next_action": _("Visible in catalogue")}


def _product_availability_status_view(item):
	available = cint(item.get("marketplace_available"))
	if not available:
		return {"label": _("Unavailable"), "indicator": "orange", "next_action": _("Mark available when ready")}
	return {"label": _("Available"), "indicator": "green", "next_action": _("Available for quotation requests")}


def _clinic_request_actions(request, offer, purchase_order):
	decision_state = _decision_state(offer)
	return {
		"can_view_offer": bool(offer),
		"can_accept_offer": decision_state == "awaiting_decision",
		"can_reject_offer": decision_state == "awaiting_decision",
		"can_view_purchase_order": bool(purchase_order),
		"state_label": _clinic_empty_state(request, offer, purchase_order),
	}


def _clinic_empty_state(request, offer, purchase_order):
	if purchase_order:
		return _("Request accepted. Draft Purchase Order is available.")
	if offer:
		if offer["status"] == "Sent":
			return _("Supplier offer received. Awaiting clinic decision.")
		if offer["status"] == "Accepted":
			return _("Offer accepted.")
		if offer["status"] == "Rejected":
			return _("Offer rejected.")
		return _("Supplier is preparing an offer.")
	if request.status == "Sent":
		return _("Request sent. Waiting for supplier offer.")
	if request.status == "Draft":
		return _("Draft request. Review before sending.")
	return _("No supplier offer is available for this request.")


def _clinic_home_context():
	company = _get_single_allowed_company()
	requests = get_clinic_my_requests()
	return {
		"company": company,
		"company_name": _company_name(company),
		"counts": {
			"awaiting_supplier": len([row for row in requests if row["decision_state"] == "no_offer"]),
			"awaiting_decision": len([row for row in requests if row["decision_state"] == "awaiting_decision"]),
			"accepted": len([row for row in requests if row["decision_state"] == "accepted"]),
			"purchase_orders": len([row for row in requests if row["purchase_order"]]),
			"patients": frappe.db.count("Customer") if frappe.has_permission("Customer", "read") else 0,
			"audiogrammes": frappe.db.count("Audiogramme") if frappe.db.exists("DocType", "Audiogramme") and frappe.has_permission("Audiogramme", "read") else 0,
		},
		"sections": _non_empty_sections(_clinic_sections()),
		"recent_requests": requests[:5],
	}


def _clinic_sections():
	sections = []
	marketplace_entries = _verified_entries(
		[
			{
				"label": _("Browse Catalogue"),
				"route": "marketplace-catalogue",
				"type": "Page",
				"target": "marketplace-catalogue",
				"description": _("Find supplier products and create quotation requests."),
			},
			{
				"label": _("My Requests"),
				"route": "clinic-my-requests",
				"type": "Page",
				"target": "clinic-my-requests",
				"count": len(get_clinic_my_requests()),
				"description": _("Track requests, offers, and decisions."),
			},
			{
				"label": _("Purchase Orders"),
				"route": "clinic-purchase-orders",
				"type": "Page",
				"target": "clinic-purchase-orders",
				"description": _("View marketplace Purchase Orders for your clinic."),
			},
		]
	)
	if marketplace_entries:
		sections.append({"label": _("Marketplace"), "entries": marketplace_entries})

	clinical_entries = _verified_entries(
		[
			{
				"label": _("Patients"),
				"route": "List/Customer/List",
				"type": "DocType",
				"target": "Customer",
				"count": frappe.db.count("Customer"),
				"description": _("Clinic patient records used by audiometry."),
			},
			{
				"label": _("Audiograms"),
				"route": "List/Audiogramme/List",
				"type": "DocType",
				"target": "Audiogramme",
				"count": frappe.db.count("Audiogramme") if frappe.db.exists("DocType", "Audiogramme") else 0,
				"description": _("Create and review patient audiograms."),
			},
		]
	)
	if clinical_entries:
		sections.append({"label": _("Audiology / Clinical"), "entries": clinical_entries})

	return _non_empty_sections(sections)


def _supplier_home_context():
	supplier = _get_single_allowed_supplier()
	incoming = get_supplier_incoming_requests()
	offers = get_supplier_my_offers()
	products = get_supplier_products()
	return {
		"supplier": supplier,
		"supplier_name": _supplier_name(supplier),
		"counts": {
			"products": len(products),
			"available_products": len([row for row in products if row["marketplace_available"] and row["marketplace_enabled"]]),
			"needs_offer": len([row for row in incoming if not row["offer_created"]]),
			"draft_offers": len([row for row in offers if row["status"] == "Draft"]),
			"awaiting_decision": len([row for row in offers if row["status"] == "Sent"]),
			"decided": len([row for row in offers if row["status"] in {"Accepted", "Rejected"}]),
		},
		"recent_requests": incoming[:5],
		"recent_offers": offers[:5],
	}


def _admin_home_context():
	sections = _odyio_internal_sections(include_admin=True)
	return {
		"counts": {
			"requests": frappe.db.count("Marketplace Quotation Request"),
			"offers": frappe.db.count("Marketplace Supplier Offer"),
			"purchase_orders": frappe.db.count(
				"Marketplace Quotation Request",
				{"linked_purchase_order": ["!=", ""]},
			),
			"marketplace_products": frappe.db.count("Item", {"marketplace_enabled": 1}),
			"items": frappe.db.count("Item"),
			"suppliers": frappe.db.count("Supplier"),
			"open_purchase_orders": frappe.db.count("Purchase Order", {"docstatus": 0}),
			"warehouses": frappe.db.count("Warehouse"),
			"companies": frappe.db.count("Company"),
			"customers": frappe.db.count("Customer"),
			"users": frappe.db.count("User", {"enabled": 1}),
			"audiogrammes": frappe.db.count("Audiogramme") if frappe.db.exists("DocType", "Audiogramme") else 0,
		},
		"sections": sections,
		"installed_integrations": _installed_odyio_integrations(),
	}


def _staff_home_context():
	counts = {
		"items": frappe.db.count("Item"),
		"suppliers": frappe.db.count("Supplier"),
		"purchase_orders": frappe.db.count("Purchase Order"),
		"marketplace_requests": frappe.db.count("Marketplace Quotation Request"),
		"marketplace_offers": frappe.db.count("Marketplace Supplier Offer"),
	}
	if frappe.db.exists("DocType", "Audiogramme"):
		counts["audiogrammes"] = frappe.db.count("Audiogramme")
	return {"counts": counts, "sections": _non_empty_sections(_odyio_internal_sections(include_admin=False))}


def _odyio_internal_sections(include_admin=False):
	sections = []
	marketplace_entries = _verified_entries(
		[
			{
				"label": _("Catalogue"),
				"route": "marketplace-catalogue",
				"type": "Page",
				"target": "marketplace-catalogue",
				"count": frappe.db.count("Item", {"marketplace_enabled": 1}),
				"description": _("Marketplace products visible to clinics."),
			},
			{
				"label": _("Quotation Requests"),
				"route": "List/Marketplace Quotation Request/List",
				"type": "DocType",
				"target": "Marketplace Quotation Request",
				"count": frappe.db.count("Marketplace Quotation Request"),
				"description": _("Clinic quotation requests."),
			},
			{
				"label": _("Supplier Offers"),
				"route": "List/Marketplace Supplier Offer/List",
				"type": "DocType",
				"target": "Marketplace Supplier Offer",
				"count": frappe.db.count("Marketplace Supplier Offer"),
				"description": _("Supplier pricing responses and clinic decisions."),
			},
			{
				"label": _("Marketplace Purchase Orders"),
				"route": "List/Purchase Order/List",
				"type": "DocType",
				"target": "Purchase Order",
				"count": frappe.db.count("Marketplace Quotation Request", {"linked_purchase_order": ["!=", ""]}),
				"description": _("Draft Purchase Orders created from accepted offers."),
			},
		]
	)
	if marketplace_entries:
		sections.append({"label": _("Marketplace"), "entries": marketplace_entries})

	erp_entries = _verified_entries(
		[
			{
				"label": _("Products / Items"),
				"route": "List/Item/List",
				"type": "DocType",
				"target": "Item",
				"count": frappe.db.count("Item"),
				"description": _("ERPNext Item master used by marketplace products."),
			},
			{
				"label": _("Item Groups"),
				"route": "List/Item Group/List",
				"type": "DocType",
				"target": "Item Group",
				"count": frappe.db.count("Item Group"),
				"description": _("Product categories and catalogue grouping."),
			},
			{
				"label": _("Suppliers"),
				"route": "List/Supplier/List",
				"type": "DocType",
				"target": "Supplier",
				"count": frappe.db.count("Supplier"),
				"description": _("Supplier master records linked to marketplace users."),
			},
			{
				"label": _("Purchase Orders"),
				"route": "List/Purchase Order/List",
				"type": "DocType",
				"target": "Purchase Order",
				"count": frappe.db.count("Purchase Order"),
				"description": _("ERP purchasing documents created from accepted offers."),
			},
			{
				"label": _("Warehouses"),
				"route": "List/Warehouse/List",
				"type": "DocType",
				"target": "Warehouse",
				"count": frappe.db.count("Warehouse"),
				"description": _("Stock locations required by ERPNext purchasing setup."),
			},
			{
				"label": _("Companies"),
				"route": "List/Company/List",
				"type": "DocType",
				"target": "Company",
				"count": frappe.db.count("Company"),
				"description": _("Clinic Company records used as marketplace buyers."),
			},
		]
	)
	if erp_entries:
		sections.append({"label": _("ERP / Operations"), "entries": erp_entries})

	audiology_entries = _verified_entries(
		[
			{
				"label": _("Audiograms"),
				"route": "List/Audiogramme/List",
				"type": "DocType",
				"target": "Audiogramme",
				"count": frappe.db.count("Audiogramme") if frappe.db.exists("DocType", "Audiogramme") else 0,
				"description": _("Patient-linked audiogram drawing and analysis."),
			},
			{
				"label": _("Patients"),
				"route": "List/Customer/List",
				"type": "DocType",
				"target": "Customer",
				"count": frappe.db.count("Customer"),
				"description": _("ERPNext Customer records used by audiometry as patients."),
			},
		]
	)
	if audiology_entries:
		sections.append({"label": _("Audiology / Clinical"), "entries": audiology_entries})

	if include_admin:
		admin_entries = _verified_entries(
			[
				{
					"label": _("Users"),
					"route": "List/User/List",
					"type": "DocType",
					"target": "User",
					"count": frappe.db.count("User", {"enabled": 1}),
					"description": _("User accounts and role assignments."),
				},
				{
					"label": _("Roles"),
					"route": "List/Role/List",
					"type": "DocType",
					"target": "Role",
					"count": frappe.db.count("Role"),
					"description": _("Permission roles used across Odyio."),
				},
				{
					"label": _("ERPNext Settings"),
					"route": "Workspaces/ERPNext Settings",
					"type": "Workspace",
					"target": "ERPNext Settings",
					"description": _("ERPNext system configuration."),
				},
			]
		)
		if admin_entries:
			sections.append({"label": _("Administration"), "entries": admin_entries})

	return _non_empty_sections(sections)


def _non_empty_sections(sections):
	return [
		section
		for section in (sections or [])
		if section.get("entries") and len(section.get("entries") or []) > 0
	]


def _verified_entries(entries):
	return [entry for entry in entries if _route_target_exists(entry) and _can_read_route_entry(entry)]


def _route_target_exists(entry):
	target_type = entry.get("type")
	target = entry.get("target")
	if target_type == "Page":
		return bool(frappe.db.exists("Page", target))
	if target_type == "DocType":
		return bool(frappe.db.exists("DocType", target))
	if target_type == "Workspace":
		return bool(frappe.db.exists("Workspace", target))
	return False


def _can_read_route_entry(entry):
	roles = set(frappe.get_roles(frappe.session.user))
	if frappe.session.user == "Administrator" or "System Manager" in roles:
		return True
	if entry.get("type") == "DocType":
		return frappe.has_permission(entry.get("target"), "read")
	if entry.get("type") == "Page":
		try:
			return bool(marketplace_page_access(entry.get("target")))
		except frappe.PermissionError:
			return False
	if entry.get("type") == "Workspace":
		return False
	return False


def _installed_odyio_integrations():
	integrations = []
	if frappe.db.exists("Module Def", "Odyio Noah"):
		integrations.append(
			{
				"label": _("Odyio Noah"),
				"status": _("Installed"),
				"description": _("No active Desk page, Workspace, DocType, Report, or Dashboard is installed for this module yet."),
			}
		)
	return integrations
