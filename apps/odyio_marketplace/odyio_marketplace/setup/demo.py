import os

import frappe
from frappe.utils.file_manager import save_file

from odyio_marketplace.setup.install import install_marketplace_foundation


DEMO_COMPANY = "Odyio Demo Clinic"
DEMO_COMPANY_ABBR = "ODC"
DEMO_SUPPLIER = "Odyio Demo Supplier"
DEMO_SUPPLIER_TWO = "Odyio Demo Supplier Two"
DEMO_CLINIC_USER = "clinic@odyio.local"
DEMO_SUPPLIER_USER = "supplier@odyio.local"
DEMO_SUPPLIER_TWO_USER = "supplier2@odyio.local"
DEMO_AUDIO_USER = "audiometriste@odyio.local"
DEMO_OPERATIONS_USER = "operations@odyio.local"
DEMO_ITEM_GROUP_ROOT = "Odyio Demo Marketplace"
DEMO_ITEM_GROUPS = (
	"Odyio Demo Hearing Aids",
	"Odyio Demo Accessories",
	"Odyio Demo Consumables",
)
DEMO_SUPPLIER_LOGO_ASSET = "ody-demo-supplier-logo.svg"
REQUIRED_COMPANY_WAREHOUSE_TYPES = ("Transit",)
DEMO_TAG = "[Odyio Demo]"
LEGACY_DEMO_WORKFLOW_NOTES = (f"{DEMO_TAG} Rejected supplier offer",)

DEMO_ITEMS = (
	{
		"item_code": "ODY-DEMO-HA-LEFT",
		"item_name": "Odyio Demo Hearing Aid Left",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "LEFT",
		"supplier_reference": "ODS-LEFT-001",
		"description": "Lightweight left-side hearing aid for everyday clinical demonstrations.",
		"technical_specs": "Directional microphones, rechargeable module option, demo fitting profile.",
		"image_asset": "ody-demo-ha-left.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-HA-RIGHT",
		"item_name": "Odyio Demo Hearing Aid Right",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "RIGHT",
		"supplier_reference": "ODS-RIGHT-001",
		"description": "Right-side hearing aid with compact behind-the-ear housing.",
		"technical_specs": "Feedback suppression, speech enhancement, standard demo receiver.",
		"image_asset": "ody-demo-ha-right.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-BTE-RECHARGE",
		"item_name": "Rechargeable Behind-the-Ear Model",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "BILATERAL",
		"supplier_reference": "ODS-BTE-RECH-010",
		"description": "Rechargeable BTE demo model for long wearing sessions.",
		"technical_specs": "Lithium-ion battery, IP-rated shell, dual microphone processing.",
		"image_asset": "ody-demo-bte-recharge.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-RIC-LEFT",
		"item_name": "Receiver-in-Canal Model Left",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "LEFT",
		"supplier_reference": "ODS-RIC-L-020",
		"description": "Open-fit RIC product for left-side fittings.",
		"technical_specs": "Replaceable receiver, soft dome compatibility, Bluetooth-ready demo shell.",
		"image_asset": "ody-demo-ric-left.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-ITE-RIGHT",
		"item_name": "In-the-Ear Model Right",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "RIGHT",
		"supplier_reference": "ODS-ITE-R-030",
		"description": "Discrete in-the-ear demo model for right-side fittings.",
		"technical_specs": "Custom shell placeholder, telecoil option, moderate gain range.",
		"image_asset": "ody-demo-ite-right.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-BILATERAL-KIT",
		"item_name": "Bilateral Fitting Kit",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "BILATERAL",
		"supplier_reference": "ODS-BIL-KIT-040",
		"description": "Paired left/right demo kit prepared for bilateral quotation requests.",
		"technical_specs": "Matched pair, shared charger, synchronized program set.",
		"image_asset": "ody-demo-bilateral-kit.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-CHARGER",
		"item_name": "Desktop Charging Station",
		"item_group": "Odyio Demo Accessories",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-ACC-CHG-050",
		"description": "Compact charging station for rechargeable demo hearing aids.",
		"technical_specs": "USB-C power, two charging bays, magnetic retention wells.",
		"image_asset": "ody-demo-charger.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-CLEANING-KIT",
		"item_name": "Cleaning Kit",
		"item_group": "Odyio Demo Accessories",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-ACC-CLEAN-060",
		"description": "Clinic-friendly cleaning kit for hearing-aid maintenance demonstrations.",
		"technical_specs": "Brush, vent cleaner, microfiber cloth, storage pouch.",
		"image_asset": "ody-demo-cleaning-kit.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-DRYING-BOX",
		"item_name": "Drying Box",
		"item_group": "Odyio Demo Accessories",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-ACC-DRY-070",
		"description": "Electric drying box for overnight device care.",
		"technical_specs": "Low-temperature dry cycle, UV demo indicator, removable tray.",
		"image_asset": "ody-demo-drying-box.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-REMOTE-MIC",
		"item_name": "Remote Microphone",
		"item_group": "Odyio Demo Accessories",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-ACC-MIC-080",
		"description": "Remote microphone accessory for noisy-room demonstration scenarios.",
		"technical_specs": "Clip-on microphone, tabletop mode, wireless pairing indicator.",
		"image_asset": "ody-demo-remote-mic.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-BATTERY-312",
		"item_name": "Size 312 Batteries",
		"item_group": "Odyio Demo Consumables",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-CON-B312-090",
		"description": "Pack of size 312 batteries for non-rechargeable demo models.",
		"technical_specs": "Zinc-air battery pack, clinic demonstration quantity.",
		"image_asset": "ody-demo-battery-312.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-BATTERY-13",
		"item_name": "Size 13 Batteries",
		"item_group": "Odyio Demo Consumables",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-CON-B13-100",
		"description": "Pack of size 13 batteries for higher-capacity devices.",
		"technical_specs": "Zinc-air battery pack, longer runtime demonstration use.",
		"supplier_key": "primary",
		"marketplace_available": 0,
	},
	{
		"item_code": "ODY-DEMO-WAX-GUARDS",
		"item_name": "Wax Guards",
		"item_group": "Odyio Demo Consumables",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-CON-WAX-110",
		"description": "Replacement wax guards for receiver and in-ear demos.",
		"technical_specs": "Disposable guard sticks, universal demo compatibility.",
		"image_asset": "ody-demo-wax-guards.svg",
		"supplier_key": "primary",
	},
	{
		"item_code": "ODY-DEMO-DOMES",
		"item_name": "Domes and Ear Tips",
		"item_group": "Odyio Demo Consumables",
		"standard_rate": 0,
		"ear_side": "NOT_APPLICABLE",
		"supplier_reference": "ODS-CON-DOME-120",
		"description": "Assorted domes and ear tips for fitting demonstrations.",
		"technical_specs": "Open, closed, and power dome demo assortment.",
		"supplier_key": "primary",
		"marketplace_enabled": 0,
	},
	{
		"item_code": "ODY-DEMO-SUP2-RIC",
		"item_name": "Supplier Two RIC Model",
		"item_group": "Odyio Demo Hearing Aids",
		"standard_rate": 0,
		"ear_side": "BILATERAL",
		"supplier_reference": "ODS2-RIC-001",
		"description": "Second-supplier receiver-in-canal demo product for permission testing.",
		"technical_specs": "Alternative supplier demo shell with paired receiver options.",
		"supplier_key": "second",
	},
)

DEMO_WORKFLOWS = (
	{
		"key": "sent-no-offer",
		"note": f"{DEMO_TAG} Waiting for supplier response",
		"items": [{"item": "ODY-DEMO-RIC-LEFT", "quantity": 1}],
		"state": "sent_no_offer",
		"fulfillment_method": "DELIVERY",
	},
	{
		"key": "draft-offer",
		"note": f"{DEMO_TAG} Supplier draft offer in progress",
		"items": [{"item": "ODY-DEMO-BTE-RECHARGE", "quantity": 2}],
		"state": "draft_offer",
		"fulfillment_method": "PICKUP",
	},
	{
		"key": "submitted-offer",
		"note": f"{DEMO_TAG} Offer awaiting clinic decision",
		"items": [
			{"item": "ODY-DEMO-ITE-RIGHT", "quantity": 1},
			{"item": "ODY-DEMO-CLEANING-KIT", "quantity": 2},
		],
		"state": "submitted_offer",
		"rates": {"ODY-DEMO-ITE-RIGHT": 860, "ODY-DEMO-CLEANING-KIT": 75},
		"fulfillment_method": "DELIVERY",
	},
	{
		"key": "accepted-offer",
		"note": f"{DEMO_TAG} Accepted offer with draft purchase order",
		"items": [{"item": "ODY-DEMO-BILATERAL-KIT", "quantity": 1}],
		"state": "accepted_offer",
		"rates": {"ODY-DEMO-BILATERAL-KIT": 1850},
		"fulfillment_method": "PICKUP",
	},
	{
		"key": "rejected-offer",
		"note": f"{DEMO_TAG} Rejected supplier offer without Devis",
		"items": [{"item": "ODY-DEMO-DRYING-BOX", "quantity": 1}],
		"state": "rejected_offer",
		"rates": {"ODY-DEMO-DRYING-BOX": 160},
		"fulfillment_method": "DELIVERY",
	},
	{
		"key": "rejected-offer-with-devis",
		"note": f"{DEMO_TAG} Rejected supplier offer with historical Devis",
		"items": [{"item": "ODY-DEMO-REMOTE-MIC", "quantity": 1}],
		"state": "rejected_offer_with_devis",
		"rates": {"ODY-DEMO-REMOTE-MIC": 290},
		"fulfillment_method": "PICKUP",
	},
)


def setup_demo_data():
	_assert_local_site()
	frappe.set_user("Administrator")
	install_marketplace_foundation()
	ensure_demo_masters()
	ensure_demo_users()
	cleanup_legacy_demo_workflows()
	workflow_records = ensure_demo_workflows()
	frappe.db.commit()
	return {
		"company": DEMO_COMPANY,
		"supplier": get_demo_supplier_name(),
		"supplier_name": DEMO_SUPPLIER,
		"supplier_two": get_demo_supplier_two_name(),
		"supplier_two_name": DEMO_SUPPLIER_TWO,
		"clinic_user": DEMO_CLINIC_USER,
		"supplier_user": DEMO_SUPPLIER_USER,
		"supplier_two_user": DEMO_SUPPLIER_TWO_USER,
		"items": [item["item_code"] for item in DEMO_ITEMS],
		"workflows": workflow_records,
	}


def reset_demo_data():
	_assert_local_site()
	frappe.set_user("Administrator")
	delete_demo_workflows()
	delete_demo_items()
	frappe.db.commit()
	return {"reset": True, "items": [item["item_code"] for item in DEMO_ITEMS]}


def reset_and_setup_demo_data():
	reset_demo_data()
	return setup_demo_data()


def scan_for_test_fixtures():
	"""Return any obvious automated-test records on a manual demo site."""
	doctypes = (
		"Company",
		"Supplier",
		"Item",
		"Marketplace Quotation Request",
		"Marketplace Supplier Offer",
		"Marketplace Devis Snapshot",
		"Purchase Order",
		"Opportunity",
	)
	result = {}
	for doctype in doctypes:
		if not frappe.db.exists("DocType", doctype):
			continue
		names = frappe.get_all(
			doctype,
			filters={"name": ["like", "_Test%"]},
			pluck="name",
			limit_page_length=20,
			ignore_permissions=True,
		)
		names.extend(
			frappe.get_all(
				doctype,
				filters={"name": ["like", "_T-%"]},
				pluck="name",
				limit_page_length=20,
				ignore_permissions=True,
			)
		)
		if names:
			result[doctype] = sorted(set(names))

	return result


def verify_demo_navigation_setup():
	setup_demo_data()

	from odyio_marketplace.api import can_access_marketplace_page, get_marketplace_home_context
	from odyio_marketplace.navigation import get_marketplace_landing_page, get_workspace_sidebar_items

	result = {}
	for user in (DEMO_CLINIC_USER, DEMO_SUPPLIER_USER, DEMO_SUPPLIER_TWO_USER, "Administrator"):
		frappe.set_user(user)
		sidebar = get_workspace_sidebar_items()
		page_names = [page.get("name") for page in sidebar.get("pages", [])]
		context = get_marketplace_home_context()
		result[user] = {
			"landing_page": get_marketplace_landing_page(user),
			"workspace_pages": page_names,
			"primary_role": context["primary_role"],
			"can_access": {
				"marketplace-home": _can_access(can_access_marketplace_page, "marketplace-home"),
				"marketplace-catalogue": _can_access(can_access_marketplace_page, "marketplace-catalogue"),
				"clinic-my-requests": _can_access(can_access_marketplace_page, "clinic-my-requests"),
				"clinic-purchase-orders": _can_access(can_access_marketplace_page, "clinic-purchase-orders"),
				"supplier-my-products": _can_access(can_access_marketplace_page, "supplier-my-products"),
				"supplier-incoming-requests": _can_access(can_access_marketplace_page, "supplier-incoming-requests"),
				"supplier-my-offers": _can_access(can_access_marketplace_page, "supplier-my-offers"),
			},
		}

	frappe.set_user("Administrator")
	return result


def _can_access(method, page_name):
	try:
		return bool(method(page_name))
	except frappe.PermissionError:
		return False


def verify_demo_acceptance_flow():
	setup_demo_data()

	from odyio_marketplace.api import (
		accept_supplier_offer_for_clinic,
		create_request_from_catalog,
		create_supplier_offer_from_request,
		get_catalog_items,
		get_supplier_incoming_requests,
		submit_supplier_offer,
	)

	supplier = get_demo_supplier_name()
	offer_rates = {
		"ODY-DEMO-HA-LEFT": 1234,
		"ODY-DEMO-HA-RIGHT": 1278,
	}
	before_po_count = frappe.db.count("Purchase Order", {"company": DEMO_COMPANY, "supplier": supplier})

	try:
		frappe.set_user(DEMO_CLINIC_USER)
		catalog = get_catalog_items(search="Odyio Demo Hearing Aid")
		for item in catalog:
			if item.name in offer_rates and ("standard_rate" in item or "marketplace_rate" in item):
				frappe.throw("Catalogue API exposed a marketplace price.")

		request_result = create_request_from_catalog(
			[
				{"item": "ODY-DEMO-HA-LEFT", "quantity": 2},
				{"item": "ODY-DEMO-HA-RIGHT", "quantity": 1},
			],
			fulfillment_method="DELIVERY",
		)
		request = frappe.get_doc("Marketplace Quotation Request", request_result["quotation_request"])

		frappe.set_user(DEMO_SUPPLIER_USER)
		incoming = get_supplier_incoming_requests(search=request.name)
		if request.name not in {row["name"] for row in incoming}:
			frappe.throw("Demo supplier cannot see the submitted quotation request.")

		offer = create_supplier_offer_from_request(request.name)
		offer = submit_supplier_offer(
			offer["name"],
			[{"item": item, "fixed_rate": rate} for item, rate in offer_rates.items()],
		)

		frappe.set_user(DEMO_CLINIC_USER)
		accept_result = accept_supplier_offer_for_clinic(offer["name"])
		purchase_order = frappe.get_doc("Purchase Order", accept_result["purchase_order"]["name"])
		request.reload()
		offer_doc = frappe.get_doc("Marketplace Supplier Offer", offer["name"])
		after_po_count = frappe.db.count("Purchase Order", {"company": DEMO_COMPANY, "supplier": supplier})

		duplicate_acceptance_blocked = False
		try:
			accept_supplier_offer_for_clinic(offer["name"])
		except frappe.ValidationError:
			duplicate_acceptance_blocked = True
		if not duplicate_acceptance_blocked:
			frappe.throw("Repeated acceptance unexpectedly succeeded.")

		return {
			"quotation_request": request.name,
			"supplier_offer": offer_doc.name,
			"purchase_order": purchase_order.name,
			"purchase_order_docstatus": purchase_order.docstatus,
			"company": purchase_order.company,
			"supplier": purchase_order.supplier,
			"items": [
				{"item_code": row.item_code, "qty": row.qty, "rate": row.rate, "amount": row.amount}
				for row in purchase_order.items
			],
			"grand_total": purchase_order.grand_total,
			"request_linked_purchase_order": request.linked_purchase_order,
			"offer_purchase_order": offer_doc.purchase_order,
			"purchase_order_count_delta": after_po_count - before_po_count,
		}
	finally:
		frappe.db.rollback()
		frappe.set_user("Administrator")


def verify_demo_devis_flow():
	setup_demo_data()

	from odyio_marketplace.api import (
		confirm_supplier_devis,
		download_devis_pdf,
		get_pdf_backend_diagnostics,
		get_devis_snapshot,
		get_devis_templates,
		render_devis_print_format,
	)

	request_name = find_demo_request(f"{DEMO_TAG} Offer awaiting clinic decision")
	offer_name = frappe.db.get_value(
		"Marketplace Supplier Offer",
		{"quotation_request": request_name, "docstatus": 1},
		"name",
	)
	if not offer_name:
		frappe.throw("Demo submitted offer is missing.")

	frappe.set_user(DEMO_SUPPLIER_USER)
	templates = get_devis_templates(offer_name)
	devis = confirm_supplier_devis(offer_name, template=templates["default_template"], save_as_default=1)
	print_html = render_devis_print_format(devis["name"])
	if "860.000" not in print_html or "75.000" not in print_html:
		frappe.throw("Demo Devis did not render supplier-entered offer rates.")
	if "Delivery" not in print_html:
		frappe.throw("Demo Devis did not render fulfillment.")

	pdf_backend = get_pdf_backend_diagnostics()
	pdf_result = None
	if pdf_backend["valid"]:
		pdf_result = download_devis_pdf(offer_name)

	frappe.set_user(DEMO_CLINIC_USER)
	clinic_view = get_devis_snapshot(offer_name)

	frappe.set_user(DEMO_SUPPLIER_TWO_USER)
	blocked_other_supplier = False
	try:
		get_devis_snapshot(offer_name)
	except frappe.PermissionError:
		blocked_other_supplier = True

	frappe.set_user("Administrator")
	return {
		"request": request_name,
		"offer": offer_name,
		"devis": devis["name"],
		"templates": [row["key"] for row in templates["templates"]],
		"default_template": templates["default_template"],
		"supplier_logo": frappe.db.get_value("Marketplace Devis Snapshot", devis["name"], "supplier_logo"),
		"clinic_can_view": bool(clinic_view["html"]),
		"other_supplier_blocked": blocked_other_supplier,
		"pdf_generated": bool(pdf_result),
		"pdf_file_url": (pdf_result or {}).get("file_url"),
		"pdf_backend": pdf_backend,
	}


def ensure_demo_masters():
	ensure_uom()
	ensure_supplier_group()
	ensure_item_groups()
	ensure_address_template()
	ensure_company_warehouse_types()
	ensure_company()
	suppliers = {"primary": ensure_supplier(DEMO_SUPPLIER), "second": ensure_supplier(DEMO_SUPPLIER_TWO)}
	ensure_demo_party_profiles(suppliers)
	ensure_supplier_devis_defaults(suppliers["primary"])
	for item in DEMO_ITEMS:
		ensure_item(item, suppliers[item.get("supplier_key") or "primary"])


def ensure_uom():
	if not frappe.db.exists("UOM", "Nos"):
		frappe.get_doc({"doctype": "UOM", "uom_name": "Nos", "must_be_whole_number": 1}).insert(ignore_permissions=True)


def ensure_company_warehouse_types():
	for warehouse_type in REQUIRED_COMPANY_WAREHOUSE_TYPES:
		if not frappe.db.exists("Warehouse Type", warehouse_type):
			frappe.get_doc({"doctype": "Warehouse Type", "name": warehouse_type}).insert(ignore_permissions=True)


def ensure_address_template():
	if frappe.db.exists("Address Template", "Tunisia"):
		template = frappe.get_doc("Address Template", "Tunisia")
	else:
		template = frappe.get_doc({"doctype": "Address Template", "country": "Tunisia"})

	template.is_default = 1
	template.template = """{{ address_line1 }}<br>
{% if address_line2 %}{{ address_line2 }}<br>{% endif -%}
{{ city }}<br>
{% if pincode %}{{ pincode }}<br>{% endif -%}
{{ country }}<br>
{% if phone %}Phone: {{ phone }}<br>{% endif -%}
{% if email_id %}Email: {{ email_id }}<br>{% endif -%}"""
	if template.is_new():
		template.insert(ignore_permissions=True)
	else:
		template.save(ignore_permissions=True)


def ensure_item_groups():
	if not frappe.db.exists("Item Group", "All Item Groups"):
		frappe.get_doc({"doctype": "Item Group", "item_group_name": "All Item Groups", "is_group": 1}).insert(
			ignore_permissions=True
		)

	if not frappe.db.exists("Item Group", DEMO_ITEM_GROUP_ROOT):
		frappe.get_doc(
			{
				"doctype": "Item Group",
				"item_group_name": DEMO_ITEM_GROUP_ROOT,
				"parent_item_group": "All Item Groups",
				"is_group": 1,
			}
		).insert(ignore_permissions=True)

	for item_group in DEMO_ITEM_GROUPS:
		if not frappe.db.exists("Item Group", item_group):
			frappe.get_doc(
				{
					"doctype": "Item Group",
					"item_group_name": item_group,
					"parent_item_group": DEMO_ITEM_GROUP_ROOT,
					"is_group": 0,
				}
			).insert(ignore_permissions=True)


def ensure_supplier_group():
	if not frappe.db.exists("Supplier Group", "All Supplier Groups"):
		frappe.get_doc(
			{"doctype": "Supplier Group", "supplier_group_name": "All Supplier Groups", "is_group": 1}
		).insert(ignore_permissions=True)

	if not frappe.db.exists("Supplier Group", "Odyio Demo Supplier Group"):
		frappe.get_doc(
			{
				"doctype": "Supplier Group",
				"supplier_group_name": "Odyio Demo Supplier Group",
				"parent_supplier_group": "All Supplier Groups",
				"is_group": 0,
			}
		).insert(ignore_permissions=True)


def ensure_company():
	if frappe.db.exists("Company", DEMO_COMPANY):
		return

	frappe.get_doc(
		{
			"doctype": "Company",
			"company_name": DEMO_COMPANY,
			"abbr": DEMO_COMPANY_ABBR,
			"default_currency": "TND",
			"country": "Tunisia",
		}
	).insert(ignore_permissions=True)


def ensure_supplier(supplier_display_name):
	supplier_group = "Odyio Demo Supplier Group"
	supplier_name = get_supplier_name(supplier_display_name)

	if supplier_name:
		supplier = frappe.get_doc("Supplier", supplier_name)
		if supplier.supplier_group != supplier_group:
			supplier.supplier_group = supplier_group
			supplier.save(ignore_permissions=True)
		return supplier.name

	supplier = frappe.get_doc(
		{
			"doctype": "Supplier",
			"supplier_name": supplier_display_name,
			"supplier_type": "Company",
			"supplier_group": supplier_group,
		}
	).insert(ignore_permissions=True)
	return supplier.name


def ensure_demo_party_profiles(suppliers):
	ensure_party_address(
		"Company",
		DEMO_COMPANY,
		"Odyio Demo Clinic Address",
		"Odyio Demo Clinic, Avenue Habib Bourguiba",
		"Tunis",
		"1000",
		"Tunisia",
		"+216 71 000 100",
		"clinic@odyio.local",
	)
	ensure_party_address(
		"Supplier",
		suppliers["primary"],
		"Odyio Demo Supplier Address",
		"Odyio Demo Supplier, Rue des Instruments",
		"Tunis",
		"1053",
		"Tunisia",
		"+216 71 000 200",
		"supplier@odyio.local",
	)
	ensure_party_address(
		"Supplier",
		suppliers["second"],
		"Odyio Demo Supplier Two Address",
		"Odyio Demo Supplier Two, Route de la Clinique",
		"Sfax",
		"3000",
		"Tunisia",
		"+216 74 000 200",
		"supplier2@odyio.local",
	)


def ensure_party_address(link_doctype, link_name, title, line1, city, pincode, country, phone, email):
	address_name = frappe.db.get_value(
		"Dynamic Link",
		{"link_doctype": link_doctype, "link_name": link_name, "parenttype": "Address"},
		"parent",
	)
	address = frappe.get_doc("Address", address_name) if address_name else frappe.new_doc("Address")
	address.address_title = title
	address.address_type = "Billing"
	address.address_line1 = line1
	address.city = city
	address.pincode = pincode
	address.country = country
	address.phone = phone
	address.email_id = email
	if not any(row.link_doctype == link_doctype and row.link_name == link_name for row in address.links):
		address.append("links", {"link_doctype": link_doctype, "link_name": link_name})
	if address_name:
		address.save(ignore_permissions=True)
	else:
		address.insert(ignore_permissions=True)
	return address.name


def ensure_supplier_devis_defaults(supplier):
	logo_url = ensure_supplier_logo_file(supplier)
	settings_name = frappe.db.get_value("Marketplace Supplier Devis Settings", {"supplier": supplier}, "name")
	settings = (
		frappe.get_doc("Marketplace Supplier Devis Settings", settings_name)
		if settings_name
		else frappe.new_doc("Marketplace Supplier Devis Settings")
	)
	settings.supplier = supplier
	settings.default_template = "modern"
	settings.default_display_name = "Odyio Demo Supplier"
	settings.default_logo = logo_url
	settings.default_address = "Odyio Demo Supplier, Rue des Instruments"
	settings.default_city = "Tunis"
	settings.default_country = "Tunisia"
	settings.default_phone = "+216 71 000 200"
	settings.default_email = "supplier@odyio.local"
	settings.default_identifiers = "Demo supplier profile"
	settings.default_footer_terms = "Demo Devis valid for presentation purposes. Delivery cost is included in quoted line prices when applicable."
	if settings_name:
		settings.save(ignore_permissions=True)
	else:
		settings.insert(ignore_permissions=True)
	return settings.name


def ensure_supplier_logo_file(supplier):
	existing = frappe.get_all(
		"File",
		filters={
			"attached_to_doctype": "Supplier",
			"attached_to_name": supplier,
			"file_name": DEMO_SUPPLIER_LOGO_ASSET,
			"is_private": 0,
		},
		fields=["name", "file_url"],
		limit=1,
	)
	if existing:
		return existing[0].file_url

	logo_path = frappe.get_app_path("odyio_marketplace", "public", "images", "demo-products", DEMO_SUPPLIER_LOGO_ASSET)
	if not os.path.exists(logo_path):
		frappe.throw(f"Demo supplier logo asset is missing: {logo_path}")
	with open(logo_path, "rb") as handle:
		file_doc = save_file(DEMO_SUPPLIER_LOGO_ASSET, handle.read(), "Supplier", supplier, is_private=0)
	return file_doc.file_url


def get_demo_supplier_name():
	return get_supplier_name(DEMO_SUPPLIER)


def get_demo_supplier_two_name():
	return get_supplier_name(DEMO_SUPPLIER_TWO)


def get_supplier_name(supplier_display_name):
	return frappe.db.exists("Supplier", supplier_display_name) or frappe.db.get_value(
		"Supplier", {"supplier_name": supplier_display_name}, "name"
	)


def ensure_item(item_data, supplier):
	values = {
		"item_name": item_data["item_name"],
		"item_group": item_data["item_group"],
		"stock_uom": "Nos",
		"is_stock_item": 0,
		"disabled": 0,
		"marketplace_enabled": item_data.get("marketplace_enabled", 1),
		"marketplace_available": item_data.get("marketplace_available", 1),
		"marketplace_supplier": supplier,
		"supplier_reference": item_data["supplier_reference"],
		"ear_side": item_data["ear_side"],
		"description": item_data["description"],
		"technical_specs": item_data["technical_specs"],
		"standard_rate": item_data.get("standard_rate", 0),
	}

	if frappe.db.exists("Item", item_data["item_code"]):
		item = frappe.get_doc("Item", item_data["item_code"])
		for fieldname, value in values.items():
			item.set(fieldname, value)
		item.save(ignore_permissions=True)
	else:
		item = frappe.get_doc({"doctype": "Item", "item_code": item_data["item_code"], **values}).insert(
			ignore_permissions=True
		)

	image_asset = item_data.get("image_asset")
	if image_asset:
		image_url = ensure_item_image_file(item, item_data)
		if item.image != image_url:
			item.image = image_url
			item.save(ignore_permissions=True)
	elif item.image:
		item.image = ""
		item.save(ignore_permissions=True)


def ensure_demo_image_asset(item_data):
	image_filename = item_data["image_asset"]
	image_path = frappe.get_app_path("odyio_marketplace", "public", "images", "demo-products", image_filename)
	if not os.path.exists(image_path):
		frappe.throw(f"Demo image asset is missing for {item_data['item_code']}: {image_path}")
	return image_path


def ensure_item_image_file(item, item_data):
	existing = frappe.get_all(
		"File",
		filters={
			"attached_to_doctype": "Item",
			"attached_to_name": item.name,
			"attached_to_field": "image",
			"is_private": 0,
		},
		fields=["name", "file_url"],
		limit=1,
	)
	if existing:
		return existing[0].file_url

	image_path = ensure_demo_image_asset(item_data)
	with open(image_path, "rb") as handle:
		file_doc = save_file(
			item_data["image_asset"],
			handle.read(),
			"Item",
			item.name,
			is_private=0,
			df="image",
		)
	return file_doc.file_url


def ensure_demo_users():
	ensure_user(DEMO_CLINIC_USER, "Clinic User")
	ensure_user(DEMO_SUPPLIER_USER, "Fournisseur")
	ensure_user(DEMO_SUPPLIER_TWO_USER, "Fournisseur")
	ensure_user(DEMO_AUDIO_USER, "Audiometriste")
	ensure_user(DEMO_OPERATIONS_USER, ["Purchase Manager", "Purchase User", "Item Manager", "Stock Manager", "Stock User"])
	reset_demo_user_permissions(DEMO_CLINIC_USER, "Company", DEMO_COMPANY)
	reset_demo_user_permissions(DEMO_SUPPLIER_USER, "Supplier", ensure_supplier(DEMO_SUPPLIER))
	reset_demo_user_permissions(DEMO_SUPPLIER_TWO_USER, "Supplier", ensure_supplier(DEMO_SUPPLIER_TWO))


def ensure_user(email, role):
	roles = role if isinstance(role, list) else [role]
	if frappe.db.exists("User", email):
		user = frappe.get_doc("User", email)
		is_new_user = False
	else:
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"enabled": 1,
				"send_welcome_email": 0,
			}
		)
		user.flags.no_welcome_mail = True
		is_new_user = True

	changed = False
	for fieldname, value in {
		"enabled": 1,
		"user_type": "System User",
		"send_welcome_email": 0,
	}.items():
		if user.get(fieldname) != value:
			user.set(fieldname, value)
			changed = True

	allowed_roles = [row for row in user.roles if row.role not in {"System Manager", "Administrator"}]
	if len(allowed_roles) != len(user.roles):
		user.roles = allowed_roles
		changed = True

	existing_roles = {row.role for row in user.roles}
	for role_name in roles:
		if role_name not in existing_roles:
			user.append("roles", {"role": role_name})
			changed = True

	if is_new_user:
		user.insert(ignore_permissions=True)
	elif changed:
		user.save(ignore_permissions=True)


def reset_demo_user_permissions(user, allow, for_value):
	existing = frappe.get_all(
		"User Permission",
		filters={"user": user, "allow": allow},
		fields=["name", "for_value"],
		ignore_permissions=True,
	)
	if len(existing) == 1 and existing[0].for_value == for_value:
		frappe.clear_cache(user=user)
		return

	for permission in [row.name for row in existing]:
		frappe.delete_doc("User Permission", permission, ignore_permissions=True, force=True)

	frappe.get_doc(
		{
			"doctype": "User Permission",
			"user": user,
			"allow": allow,
			"for_value": for_value,
		}
	).insert(ignore_permissions=True)
	frappe.clear_cache(user=user)


def ensure_demo_workflows():
	from odyio_marketplace.api import (
		accept_supplier_offer_for_clinic,
		confirm_supplier_devis,
		create_supplier_offer_from_request,
		reject_supplier_offer_for_clinic,
		submit_supplier_offer,
	)

	results = {}
	for workflow in DEMO_WORKFLOWS:
		existing = find_demo_request(workflow["note"])
		if existing and workflow_state_is_ready(existing, workflow):
			results[workflow["key"]] = existing
			continue
		if existing:
			delete_demo_request(existing)

		request = create_demo_request(workflow)
		if workflow["state"] == "sent_no_offer":
			results[workflow["key"]] = request.name
			continue

		frappe.set_user(DEMO_SUPPLIER_USER)
		offer = create_supplier_offer_from_request(request.name)
		if workflow["state"] == "draft_offer":
			results[workflow["key"]] = request.name
			continue

		offer = submit_supplier_offer(
			offer["name"],
			[{"item": item, "fixed_rate": rate} for item, rate in workflow["rates"].items()],
		)
		if workflow["state"] == "submitted_offer":
			results[workflow["key"]] = request.name
			continue

		if workflow["state"] in {"accepted_offer", "rejected_offer_with_devis"}:
			confirm_supplier_devis(offer["name"], template="classic")

		frappe.set_user(DEMO_CLINIC_USER)
		if workflow["state"] == "accepted_offer":
			accept_supplier_offer_for_clinic(offer["name"])
		elif workflow["state"] == "rejected_offer":
			reject_supplier_offer_for_clinic(offer["name"])
		elif workflow["state"] == "rejected_offer_with_devis":
			reject_supplier_offer_for_clinic(offer["name"])
		results[workflow["key"]] = request.name

	frappe.set_user("Administrator")
	return results


def create_demo_request(workflow):
	frappe.set_user(DEMO_CLINIC_USER)
	fulfillment_method = workflow.get("fulfillment_method") or "PICKUP"
	address_snapshot = {}
	if fulfillment_method == "DELIVERY":
		address_snapshot = {
			"delivery_address_line1": "Odyio Demo Clinic, Avenue Habib Bourguiba",
			"delivery_city": "Tunis",
			"delivery_postal_code": "1000",
			"delivery_country": "Tunisia",
			"delivery_contact_name": "Odyio Demo Clinic",
			"delivery_contact_phone": "+216 71 000 100",
		}
	request = frappe.get_doc(
		{
			"doctype": "Marketplace Quotation Request",
			"clinic": DEMO_COMPANY,
			"supplier": get_demo_supplier_name(),
			"fulfillment_method": fulfillment_method,
			**address_snapshot,
			"clinic_notes": workflow["note"],
			"items": workflow["items"],
		}
	)
	request.insert()
	request.send_request()
	return request


def find_demo_request(note):
	return frappe.db.get_value("Marketplace Quotation Request", {"clinic": DEMO_COMPANY, "clinic_notes": note}, "name")


def workflow_state_is_ready(request_name, workflow):
	state = workflow["state"]
	request = frappe.get_doc("Marketplace Quotation Request", request_name)
	if request.fulfillment_method != (workflow.get("fulfillment_method") or "PICKUP"):
		return False
	request_items = {row.item: row.quantity for row in request.items}
	expected_items = {row["item"]: row["quantity"] for row in workflow["items"]}
	if request_items != expected_items:
		return False
	offer_name = request.linked_supplier_offer or frappe.db.get_value(
		"Marketplace Supplier Offer", {"quotation_request": request_name, "docstatus": ["<", 2]}, "name"
	)
	if state == "sent_no_offer":
		return request.docstatus == 1 and request.status == "Sent" and not offer_name
	if not offer_name:
		return False
	offer = frappe.get_doc("Marketplace Supplier Offer", offer_name)
	if state == "draft_offer":
		return offer.docstatus == 0 and offer.status == "Draft"
	if state == "submitted_offer":
		has_devis = frappe.db.exists("Marketplace Devis Snapshot", {"supplier_offer": offer.name})
		return offer.docstatus == 1 and offer.status == "Sent" and not has_devis and offer_rates_match_workflow(offer, workflow)
	if state == "accepted_offer":
		has_devis = frappe.db.exists("Marketplace Devis Snapshot", {"supplier_offer": offer.name})
		return (
			offer.docstatus == 1
			and offer.status == "Accepted"
			and bool(offer.purchase_order)
			and bool(has_devis)
			and offer_rates_match_workflow(offer, workflow)
		)
	if state == "rejected_offer":
		has_devis = frappe.db.exists("Marketplace Devis Snapshot", {"supplier_offer": offer.name})
		return (
			offer.docstatus == 1
			and offer.status == "Rejected"
			and not offer.purchase_order
			and not has_devis
			and offer_rates_match_workflow(offer, workflow)
		)
	if state == "rejected_offer_with_devis":
		has_devis = frappe.db.exists("Marketplace Devis Snapshot", {"supplier_offer": offer.name})
		return (
			offer.docstatus == 1
			and offer.status == "Rejected"
			and not offer.purchase_order
			and bool(has_devis)
			and offer_rates_match_workflow(offer, workflow)
		)
	return False


def offer_rates_match_workflow(offer, workflow):
	expected_rates = workflow.get("rates") or {}
	if not expected_rates:
		return True
	actual_rates = {row.item: row.fixed_rate for row in offer.items}
	return actual_rates == expected_rates


def delete_demo_workflows():
	cleanup_legacy_demo_workflows()
	for workflow in DEMO_WORKFLOWS:
		request_name = find_demo_request(workflow["note"])
		if request_name:
			delete_demo_request(request_name)


def cleanup_legacy_demo_workflows():
	for note in LEGACY_DEMO_WORKFLOW_NOTES:
		request_name = find_demo_request(note)
		if request_name:
			delete_demo_request(request_name)


def delete_demo_request(request_name):
	frappe.set_user("Administrator")
	request = frappe.get_doc("Marketplace Quotation Request", request_name)
	frappe.db.set_value(
		"Marketplace Quotation Request",
		request.name,
		{"linked_supplier_offer": "", "linked_purchase_order": ""},
		update_modified=False,
	)
	offer_names = frappe.get_all(
		"Marketplace Supplier Offer",
		filters={"quotation_request": request_name},
		pluck="name",
		ignore_permissions=True,
	)
	for offer_name in offer_names:
		offer = frappe.get_doc("Marketplace Supplier Offer", offer_name)
		delete_offer_devis_snapshots(offer.name)
		if offer.purchase_order and frappe.db.exists("Purchase Order", offer.purchase_order):
			delete_demo_purchase_order(offer.purchase_order)
		if offer.docstatus == 1:
			offer.db_set("status", "Sent", update_modified=False)
			offer.flags.ignore_permissions = True
			offer.cancel()
		frappe.delete_doc("Marketplace Supplier Offer", offer.name, ignore_permissions=True, force=True)

	if request.linked_purchase_order and frappe.db.exists("Purchase Order", request.linked_purchase_order):
		delete_demo_purchase_order(request.linked_purchase_order)
	if request.docstatus == 1:
		request.db_set("status", "Sent", update_modified=False)
		request.flags.ignore_permissions = True
		request.cancel()
	frappe.delete_doc("Marketplace Quotation Request", request.name, ignore_permissions=True, force=True)


def delete_offer_devis_snapshots(offer_name):
	for snapshot_name in frappe.get_all(
		"Marketplace Devis Snapshot",
		filters={"supplier_offer": offer_name},
		pluck="name",
		ignore_permissions=True,
	):
		frappe.delete_doc("Marketplace Devis Snapshot", snapshot_name, ignore_permissions=True, force=True)


def delete_demo_purchase_order(purchase_order_name):
	purchase_order = frappe.get_doc("Purchase Order", purchase_order_name)
	if purchase_order.docstatus == 1:
		purchase_order.cancel()
	frappe.delete_doc("Purchase Order", purchase_order.name, ignore_permissions=True, force=True)


def delete_demo_items():
	for item_data in DEMO_ITEMS:
		item_code = item_data["item_code"]
		if not frappe.db.exists("Item", item_code):
			continue
		delete_item_files(item_code)
		frappe.delete_doc("Item", item_code, ignore_permissions=True, force=True)


def delete_item_files(item_code):
	for file_name in frappe.get_all(
		"File",
		filters={"attached_to_doctype": "Item", "attached_to_name": item_code},
		pluck="name",
		ignore_permissions=True,
	):
		frappe.delete_doc("File", file_name, ignore_permissions=True, force=True)


def _assert_local_site():
	site = getattr(frappe.local, "site", "") or ""
	if not site.endswith(".localhost"):
		frappe.throw("Demo data setup/reset is only allowed on local .localhost sites.")
