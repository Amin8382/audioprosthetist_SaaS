from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace import hooks
import odyio_marketplace.api as marketplace_api
from odyio_marketplace.api import (
	accept_supplier_offer_for_clinic,
	can_access_marketplace_page,
	confirm_supplier_devis,
	create_request_from_catalog,
	create_supplier_offer_from_request,
	get_devis_snapshot,
	get_devis_templates,
	get_pdf_backend_diagnostics,
	get_supplier_devis_configuration,
	get_catalog_items,
	get_clinic_my_requests,
	get_clinic_offer_details,
	get_clinic_purchase_orders,
	get_clinic_purchase_order_details,
	get_clinic_request_details,
	get_marketplace_home_context,
	get_supplier_incoming_requests,
	get_supplier_offer_details,
	get_supplier_my_offers,
	get_supplier_request_details,
	download_devis_pdf,
	preview_devis_template,
	preview_catalog_request,
	reject_supplier_offer_for_clinic,
	render_devis_print_format,
	save_supplier_devis_configuration,
	submit_supplier_offer,
)
from odyio_marketplace.navigation import get_desktop_page, get_marketplace_landing_page, get_workspace_sidebar_items
from odyio_marketplace.setup.install import install_marketplace_foundation


test_ignore = [
	"Company",
	"Item",
	"Marketplace Quotation Request",
	"Marketplace Supplier Offer",
	"Purchase Order",
	"Supplier",
	"UOM",
]


class TestMarketplaceUserReadyGate(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		install_marketplace_foundation()
		cls.created = []
		cls.prepare_master_data()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		for doctype, name in reversed(cls.created):
			if not frappe.db.exists(doctype, name):
				continue

			doc = frappe.get_doc(doctype, name)
			if doctype == "Marketplace Supplier Offer":
				for snapshot_name in frappe.get_all(
					"Marketplace Devis Snapshot",
					filters={"supplier_offer": doc.name},
					pluck="name",
					ignore_permissions=True,
				):
					frappe.delete_doc("Marketplace Devis Snapshot", snapshot_name, force=True, ignore_permissions=True)
				frappe.db.set_value(
					"Marketplace Quotation Request",
					doc.quotation_request,
					{"linked_supplier_offer": "", "linked_purchase_order": ""},
					update_modified=False,
				)
				if doc.docstatus == 1 and doc.status in {"Accepted", "Rejected"}:
					doc.db_set("status", "Sent", update_modified=False)
					doc.reload()

			if doc.docstatus == 1:
				doc.cancel()

			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)

		super().tearDownClass()

	@classmethod
	def prepare_master_data(cls):
		cls.company = cls.create_company("_Test Gate Clinic A", "TGA")
		cls.other_company = cls.create_company("_Test Gate Clinic B", "TGB")
		cls.supplier = cls.create_supplier("_Test Gate Supplier A")
		cls.other_supplier = cls.create_supplier("_Test Gate Supplier B")
		cls.item_left = cls.create_item("_Test Gate Hearing Aid Left", cls.supplier, 950)
		cls.item_right = cls.create_item("_Test Gate Hearing Aid Right", cls.supplier, 975)
		cls.other_supplier_item = cls.create_item("_Test Gate Other Supplier Item", cls.other_supplier, 1200)
		cls.clinic_user = cls.create_user("marketplace.gate.clinic@example.test", "Clinic User")
		cls.other_clinic_user = cls.create_user("marketplace.gate.other.clinic@example.test", "Clinic User")
		cls.supplier_user = cls.create_user("marketplace.gate.supplier@example.test", "Fournisseur")
		cls.other_supplier_user = cls.create_user("marketplace.gate.other.supplier@example.test", "Fournisseur")
		cls.erp_staff_user = cls.create_user("marketplace.gate.staff@example.test", "Audiometriste")
		cls.erp_ops_user = cls.create_user(
			"marketplace.gate.ops@example.test",
			["Purchase Manager", "Purchase User", "Item Manager", "Stock Manager", "Stock User"],
		)
		cls.create_user_permission(cls.clinic_user, "Company", cls.company)
		cls.create_user_permission(cls.other_clinic_user, "Company", cls.other_company)
		cls.create_user_permission(cls.supplier_user, "Supplier", cls.supplier)
		cls.create_user_permission(cls.other_supplier_user, "Supplier", cls.other_supplier)

	@classmethod
	def create_company(cls, company_name, abbr):
		if frappe.db.exists("Company", company_name):
			return company_name

		company = frappe.get_doc(
			{
				"doctype": "Company",
				"company_name": company_name,
				"abbr": abbr,
				"default_currency": "TND",
				"country": "Tunisia",
			}
		).insert(ignore_permissions=True)
		cls.created.append(("Company", company.name))
		return company.name

	@classmethod
	def create_supplier(cls, supplier_name):
		existing = frappe.db.get_value("Supplier", {"supplier_name": supplier_name}, "name")
		if existing:
			return existing

		supplier = frappe.get_doc(
			{
				"doctype": "Supplier",
				"supplier_name": supplier_name,
				"supplier_type": "Company",
				"supplier_group": cls.get_supplier_group(),
			}
		).insert(ignore_permissions=True)
		cls.created.append(("Supplier", supplier.name))
		return supplier.name

	@classmethod
	def create_item(cls, item_code, supplier, standard_rate):
		if frappe.db.exists("Item", item_code):
			return item_code

		item = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": item_code,
				"item_group": cls.get_item_group(),
				"stock_uom": cls.get_uom(),
				"is_stock_item": 0,
				"marketplace_enabled": 1,
				"marketplace_available": 1,
				"marketplace_supplier": supplier,
				"supplier_reference": f"REF-{item_code[-1]}",
				"standard_rate": standard_rate,
			}
		).insert(ignore_permissions=True)
		cls.created.append(("Item", item.name))
		return item.name

	@classmethod
	def create_user(cls, email, role):
		roles = role if isinstance(role, list) else [role]
		desired_roles = set(roles)
		if frappe.db.exists("User", email):
			user = frappe.get_doc("User", email)
			existing_roles = {row.role for row in user.roles}
			changed = False
			for row in list(user.roles):
				if row.role not in desired_roles:
					user.remove(row)
					changed = True
			for role_name in roles:
				if role_name not in existing_roles:
					user.append("roles", {"role": role_name})
					changed = True
			if changed:
				user.save(ignore_permissions=True)
				frappe.clear_cache(user=email)
			return email

		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"enabled": 1,
				"send_welcome_email": 0,
				"roles": [{"role": role_name} for role_name in roles],
			}
		)
		user.flags.no_welcome_mail = True
		user.insert(ignore_permissions=True)
		cls.created.append(("User", user.name))
		return user.name

	@classmethod
	def create_user_permission(cls, user, allow, for_value):
		if frappe.db.exists("User Permission", {"user": user, "allow": allow, "for_value": for_value}):
			return

		permission = frappe.get_doc(
			{
				"doctype": "User Permission",
				"user": user,
				"allow": allow,
				"for_value": for_value,
			}
		).insert(ignore_permissions=True)
		cls.created.append(("User Permission", permission.name))
		frappe.clear_cache(user=user)

	@staticmethod
	def get_supplier_group():
		return (
			frappe.db.get_value("Supplier Group", {"is_group": 0}, "name")
			or frappe.db.get_value("Supplier Group", {}, "name")
		)

	@staticmethod
	def get_item_group():
		return frappe.db.get_value("Item Group", {"is_group": 0}, "name") or frappe.db.get_value("Item Group", {}, "name")

	@staticmethod
	def get_uom():
		return frappe.db.exists("UOM", "Nos") or frappe.db.get_value("UOM", {}, "name")

	def tearDown(self):
		frappe.set_user("Administrator")

	def create_request_from_catalog_as_clinic(self, items=None, fulfillment_method="PICKUP", delivery_address=None):
		frappe.set_user(self.clinic_user)
		result = create_request_from_catalog(
			items
			or [
				{"item": self.item_left, "quantity": 2},
				{"item": self.item_right, "quantity": 1},
			],
			fulfillment_method=fulfillment_method,
			delivery_address=delivery_address,
		)
		self.created.append(("Marketplace Quotation Request", result["quotation_request"]))
		return frappe.get_doc("Marketplace Quotation Request", result["quotation_request"])

	def submit_offer_as_supplier(self, request):
		frappe.set_user(self.supplier_user)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		offer = submit_supplier_offer(offer["name"], self.offer_rates(request))
		return frappe.get_doc("Marketplace Supplier Offer", offer["name"])

	def offer_rates(self, request):
		rate_by_item = {
			self.item_left: 1110,
			self.item_right: 1125,
			self.other_supplier_item: 1300,
		}
		return [{"item": row.item, "fixed_rate": rate_by_item[row.item]} for row in request.items]

	def test_end_to_end_acceptance_flow_from_catalog_to_purchase_order(self):
		frappe.set_user(self.clinic_user)
		catalog = get_catalog_items(search="Gate Hearing")
		preview = preview_catalog_request(
			[
				{"item": self.item_left, "quantity": 2},
				{"item": self.item_right, "quantity": 1},
			]
		)

		request = self.create_request_from_catalog_as_clinic()
		frappe.set_user(self.supplier_user)
		incoming = get_supplier_incoming_requests()
		request_details = get_supplier_request_details(request.name)
		offer = self.submit_offer_as_supplier(request)
		offers = get_supplier_my_offers()

		frappe.set_user(self.clinic_user)
		clinic_request = get_clinic_request_details(request.name)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = frappe.get_doc("Purchase Order", result["purchase_order"]["name"])
		self.created.append(("Purchase Order", purchase_order.name))
		po_details = get_clinic_purchase_order_details(purchase_order.name)

		self.assertIn(self.item_left, {item.name for item in catalog})
		self.assertTrue(preview["can_create_request"])
		self.assertNotIn("standard_rate", catalog[0])
		self.assertNotIn("standard_rate", preview["items"][0])
		self.assertNotIn("amount", preview["items"][0])
		self.assertEqual(request.status, "Sent")
		self.assertIn(request.name, {row["name"] for row in incoming})
		self.assertNotIn("total_amount", request_details)
		self.assertNotIn("fixed_rate", request_details["items"][0])
		self.assertIn(offer.name, {row["name"] for row in offers})
		self.assertEqual(clinic_request["decision_state"], "awaiting_decision")
		self.assertEqual(purchase_order.docstatus, 0)
		self.assertEqual(purchase_order.company, self.company)
		self.assertEqual(purchase_order.supplier, self.supplier)
		self.assertEqual([row.item_code for row in purchase_order.items], [self.item_left, self.item_right])
		self.assertEqual([row.qty for row in purchase_order.items], [2, 1])
		self.assertEqual([row.rate for row in purchase_order.items], [1110, 1125])
		self.assertEqual(purchase_order.grand_total, 3345)
		self.assertEqual(po_details["quotation_request"], request.name)
		self.assertEqual(po_details["supplier_offer"], offer.name)
		self.assertIn(purchase_order.name, {row["name"] for row in get_clinic_purchase_orders(search=request.name)})

	def test_submitted_offer_generates_historical_devis_snapshot(self):
		request = self.create_request_from_catalog_as_clinic(
			fulfillment_method="DELIVERY",
			delivery_address={
				"address_line1": "Gate Clinic Delivery Desk",
				"city": "Tunis",
				"postal_code": "1000",
				"country": "Tunisia",
				"contact_name": "Gate Reception",
				"phone": "+216 71 111 222",
			},
		)
		offer = self.submit_offer_as_supplier(request)

		frappe.set_user(self.supplier_user)
		templates = get_devis_templates(offer.name)
		self.assertEqual({row["key"] for row in templates["templates"]}, {"classic", "modern", "compact"})
		self.assertTrue(templates["preview"]["html"])
		self.assertTrue(all("preview_html" not in row for row in templates["templates"]))
		preview = preview_devis_template(offer.name, template="modern")["html"]
		self.assertIn(offer.name, preview)
		self.assertIn(request.name, preview)
		self.assertIn("Gate Clinic Delivery Desk", preview)
		self.assertIn("1,110.000", preview)
		self.assertNotIn("950.000", preview)

		devis = confirm_supplier_devis(
			offer.name,
			template="compact",
			overrides={
				"supplier": {
					"display_name": "Gate Supplier Snapshot",
					"address": "Supplier snapshot address",
					"phone": "+216 71 333 444",
					"email": "supplier.snapshot@example.test",
				},
				"footer_terms": "Gate Devis terms",
			},
			save_as_default=1,
		)
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))
		snapshot = frappe.get_doc("Marketplace Devis Snapshot", devis["name"])
		self.assertEqual(snapshot.template, "compact")
		self.assertEqual(snapshot.supplier_display_name, "Gate Supplier Snapshot")
		self.assertEqual(snapshot.fulfillment_method, "DELIVERY")
		self.assertIn("Gate Clinic Delivery Desk", snapshot.delivery_address)

		original_supplier_name = frappe.db.get_value("Supplier", self.supplier, "supplier_name")
		original_company_name = frappe.db.get_value("Company", self.company, "company_name")
		try:
			frappe.db.set_value("Supplier", self.supplier, "supplier_name", "Changed Supplier Name", update_modified=False)
			frappe.db.set_value("Company", self.company, "company_name", "Changed Clinic Name", update_modified=False)
			snapshot.reload()
			self.assertEqual(snapshot.supplier_display_name, "Gate Supplier Snapshot")
			self.assertNotEqual(snapshot.clinic_display_name, "Changed Clinic Name")
		finally:
			frappe.db.set_value("Supplier", self.supplier, "supplier_name", original_supplier_name, update_modified=False)
			frappe.db.set_value("Company", self.company, "company_name", original_company_name, update_modified=False)

		frappe.set_user(self.clinic_user)
		clinic_view = get_devis_snapshot(offer.name)
		self.assertIn("Gate Devis terms", clinic_view["html"])
		self.assertIn("1,125.000", clinic_view["html"])

		frappe.set_user(self.other_clinic_user)
		self.assertRaises(frappe.PermissionError, get_devis_snapshot, offer.name)

		frappe.set_user(self.other_supplier_user)
		self.assertRaises(frappe.PermissionError, get_devis_snapshot, offer.name)

		frappe.set_user(self.clinic_user)
		self.assertRaises(frappe.PermissionError, get_devis_templates, offer.name)
		self.assertRaises(frappe.PermissionError, confirm_supplier_devis, offer.name, template="classic")

		frappe.set_user(self.supplier_user)
		self.assertEqual(confirm_supplier_devis(offer.name, template="classic")["name"], snapshot.name)
		self.assertIn(offer.name, render_devis_print_format(snapshot.name))
		diagnostics = get_pdf_backend_diagnostics()
		if diagnostics["valid"]:
			pdf_result = download_devis_pdf(offer.name)
			self.assertTrue(pdf_result["file_url"])
		else:
			with self.assertRaises(frappe.ValidationError) as failure:
				download_devis_pdf(offer.name)
			if diagnostics["state"] != "missing":
				self.assertNotIn("to be installed", str(failure.exception))

	def test_pdf_backend_diagnostics_distinguish_missing_unpatched_and_valid_backends(self):
		with patch.object(marketplace_api.shutil, "which", return_value=None):
			missing = get_pdf_backend_diagnostics()
		self.assertEqual(missing["state"], "missing")
		self.assertFalse(missing["valid"])

		with (
			patch.object(marketplace_api.shutil, "which", return_value="/usr/bin/wkhtmltopdf"),
			patch.object(marketplace_api.subprocess, "check_output", return_value=b"wkhtmltopdf 0.12.6\n"),
		):
			unpatched = get_pdf_backend_diagnostics()
		self.assertEqual(unpatched["state"], "unsupported_unpatched")
		self.assertFalse(unpatched["valid"])
		self.assertIn("/usr/bin/wkhtmltopdf", unpatched["message"])
		self.assertNotIn("No wkhtmltopdf executable", unpatched["message"])

		with (
			patch.object(marketplace_api.shutil, "which", return_value="/usr/local/bin/wkhtmltopdf"),
			patch.object(marketplace_api.subprocess, "check_output", return_value=b"wkhtmltopdf 0.12.6.1 (with patched qt)\n"),
		):
			valid = get_pdf_backend_diagnostics()
		self.assertEqual(valid["state"], "valid")
		self.assertTrue(valid["valid"])

	def test_pdf_download_delegates_to_frappe_native_generation_when_backend_is_valid(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)

		frappe.set_user(self.supplier_user)
		devis = confirm_supplier_devis(offer.name, template="classic")
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))
		with patch.object(
			marketplace_api,
			"_pdf_backend_diagnostics",
			return_value={
				"state": "valid",
				"valid": True,
				"path": "/tmp/wkhtmltopdf",
				"version_output": "wkhtmltopdf 0.12.6.1 (with patched qt)",
				"message": "ok",
			},
		), patch.object(marketplace_api, "get_pdf", return_value=b"%PDF-1.4\n% Odyio test PDF\n") as patched_pdf, patch.object(
			marketplace_api,
			"save_file",
			return_value=frappe._dict({"name": "Mock Devis PDF", "file_url": "/files/mock-devis.pdf"}),
		):
			result = download_devis_pdf(offer.name)

		self.assertTrue(result["file_url"])
		patched_pdf.assert_called_once()

	def test_draft_offer_cannot_create_official_devis(self):
		request = self.create_request_from_catalog_as_clinic()
		frappe.set_user(self.supplier_user)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))

		self.assertRaises(frappe.ValidationError, confirm_supplier_devis, offer["name"], template="classic")

	def test_supplier_devis_settings_persist_and_are_supplier_scoped(self):
		frappe.set_user(self.supplier_user)
		config = save_supplier_devis_configuration(
			{
				"default_template": "modern",
				"display_name": "Gate Supplier Devis Profile",
				"address": "42 Supplier Street",
				"city": "Tunis",
				"country": "Tunisia",
				"phone": "+216 71 555 000",
				"email": "devis.supplier@example.test",
				"identifiers": "Supplier ID 123",
				"footer_terms": "Saved supplier terms",
			}
		)
		self.assertEqual(config["default_template"], "modern")
		self.assertEqual(config["display_name"], "Gate Supplier Devis Profile")
		self.assertEqual(config["footer_terms"], "Saved supplier terms")

		frappe.set_user(self.other_supplier_user)
		other_config = get_supplier_devis_configuration()
		self.assertNotEqual(other_config["display_name"], "Gate Supplier Devis Profile")

		request = self.create_request_from_catalog_as_clinic(items=[{"item": self.other_supplier_item, "quantity": 1}])
		frappe.set_user(self.other_supplier_user)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		offer = submit_supplier_offer(offer["name"], self.offer_rates(request))

		frappe.set_user(self.supplier_user)
		self.assertRaises(
			frappe.PermissionError,
			save_supplier_devis_configuration,
			{"default_template": "classic"},
			offer["name"],
		)

		frappe.set_user(self.clinic_user)
		self.assertRaises(frappe.PermissionError, save_supplier_devis_configuration, {"default_template": "classic"})

	def test_devis_default_template_and_current_template_are_separate(self):
		frappe.set_user(self.supplier_user)
		save_supplier_devis_configuration({"default_template": "modern", "display_name": "Default Modern Supplier"})
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)

		frappe.set_user(self.supplier_user)
		templates = get_devis_templates(offer.name)
		self.assertEqual(templates["default_template"], "modern")
		self.assertEqual(templates["selected_template"], "modern")
		self.assertEqual(templates["preview"]["template"], "modern")
		self.assertIn("Default Modern Supplier", preview_devis_template(offer.name, template="compact")["html"])
		self.assertEqual(get_supplier_devis_configuration()["default_template"], "modern")

		devis = confirm_supplier_devis(offer.name, template="compact")
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))
		snapshot = frappe.get_doc("Marketplace Devis Snapshot", devis["name"])
		self.assertEqual(snapshot.template, "compact")
		self.assertEqual(get_supplier_devis_configuration()["default_template"], "modern")

	def test_saved_configuration_refreshes_new_previews_without_mutating_confirmed_snapshot(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)

		frappe.set_user(self.supplier_user)
		save_supplier_devis_configuration(
			{
				"default_template": "classic",
				"display_name": "Historical Supplier Name",
				"footer_terms": "Historical footer",
			},
			offer.name,
		)
		self.assertIn("Historical Supplier Name", preview_devis_template(offer.name, template="classic")["html"])
		devis = confirm_supplier_devis(offer.name, template="classic")
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))

		save_supplier_devis_configuration(
			{
				"default_template": "compact",
				"display_name": "Future Supplier Name",
				"footer_terms": "Future footer",
			}
		)
		historical = get_devis_snapshot(offer.name)
		self.assertIn("Historical Supplier Name", historical["html"])
		self.assertIn("Historical footer", historical["html"])
		self.assertNotIn("Future Supplier Name", historical["html"])
		self.assertEqual(confirm_supplier_devis(offer.name, template="modern")["template"], "classic")

	def test_accepted_offer_without_snapshot_can_create_devis(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)
		frappe.set_user(self.clinic_user)
		result = accept_supplier_offer_for_clinic(offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))

		frappe.set_user(self.supplier_user)
		details = get_supplier_offer_details(offer.name)
		self.assertTrue(details["can_create_devis"])
		devis = confirm_supplier_devis(offer.name, template="modern")
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))
		self.assertEqual(devis["template"], "modern")

	def test_rejected_offer_without_snapshot_cannot_create_devis_or_template_preview(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)
		frappe.set_user(self.clinic_user)
		reject_supplier_offer_for_clinic(offer.name)

		frappe.set_user(self.supplier_user)
		details = get_supplier_offer_details(offer.name)
		self.assertFalse(details["can_create_devis"])
		self.assertFalse(details["can_view_devis"])
		self.assertRaises(frappe.ValidationError, get_devis_templates, offer.name)
		self.assertRaises(frappe.ValidationError, preview_devis_template, offer.name, template="classic")
		self.assertRaises(frappe.ValidationError, confirm_supplier_devis, offer.name, template="classic")
		self.assertRaises(frappe.ValidationError, get_devis_snapshot, offer.name)

	def test_rejected_offer_keeps_existing_devis_visible_without_regeneration(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)

		frappe.set_user(self.supplier_user)
		devis = confirm_supplier_devis(offer.name, template="compact")
		self.created.append(("Marketplace Devis Snapshot", devis["name"]))

		frappe.set_user(self.clinic_user)
		reject_supplier_offer_for_clinic(offer.name)
		clinic_devis = get_devis_snapshot(offer.name)
		self.assertEqual(clinic_devis["template"], "compact")

		frappe.set_user(self.supplier_user)
		details = get_supplier_offer_details(offer.name)
		self.assertFalse(details["can_create_devis"])
		self.assertTrue(details["can_view_devis"])
		self.assertEqual(get_devis_snapshot(offer.name)["template"], "compact")
		self.assertRaises(frappe.ValidationError, get_devis_templates, offer.name)
		self.assertRaises(frappe.ValidationError, preview_devis_template, offer.name, template="modern")
		self.assertRaises(frappe.ValidationError, confirm_supplier_devis, offer.name, template="modern")
		snapshot = frappe.get_doc("Marketplace Devis Snapshot", devis["name"])
		self.assertEqual(snapshot.template, "compact")

	def test_devis_print_formats_are_installed_idempotently(self):
		frappe.set_user("Administrator")
		install_marketplace_foundation()
		install_marketplace_foundation()
		formats = frappe.get_all(
			"Print Format",
			filters={"name": ["in", ["Marketplace Devis Classic", "Marketplace Devis Modern", "Marketplace Devis Compact"]]},
			pluck="name",
		)

		self.assertEqual(set(formats), {"Marketplace Devis Classic", "Marketplace Devis Modern", "Marketplace Devis Compact"})
		self.assertEqual(len(formats), 3)

	def test_catalog_request_preserves_request_and_line_notes_from_review(self):
		frappe.set_user(self.clinic_user)
		result = create_request_from_catalog(
			[
				{"item": self.item_left, "quantity": 1, "line_notes": "Left side fitting priority"},
				{"item": self.item_right, "quantity": 2, "line_notes": "Right side backup option"},
			],
			clinic_notes="Please confirm receiver compatibility.",
			fulfillment_method="PICKUP",
		)
		self.created.append(("Marketplace Quotation Request", result["quotation_request"]))
		request = frappe.get_doc("Marketplace Quotation Request", result["quotation_request"])

		self.assertEqual(request.clinic_notes, "Please confirm receiver compatibility.")
		self.assertEqual([row.line_notes for row in request.items], ["Left side fitting priority", "Right side backup option"])

	def test_end_to_end_rejection_flow_creates_no_purchase_order(self):
		request = self.create_request_from_catalog_as_clinic([{"item": self.item_left, "quantity": 1}])
		offer = self.submit_offer_as_supplier(request)
		before_count = frappe.db.count("Purchase Order", {"company": self.company, "supplier": self.supplier})
		frappe.set_user(self.clinic_user)

		result = reject_supplier_offer_for_clinic(offer.name)
		request.reload()
		offer.reload()
		after_count = frappe.db.count("Purchase Order", {"company": self.company, "supplier": self.supplier})

		self.assertEqual(result["offer"]["status"], "Rejected")
		self.assertFalse(offer.purchase_order)
		self.assertFalse(request.linked_purchase_order)
		self.assertEqual(after_count, before_count)

	def test_permission_matrix_for_clinic_supplier_and_administrator(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)
		frappe.set_user(self.clinic_user)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = result["purchase_order"]["name"]
		self.created.append(("Purchase Order", purchase_order))
		client_get = frappe.get_attr("frappe.client.get")

		frappe.set_user(self.clinic_user)
		self.assertTrue(get_catalog_items(search="Gate"))
		self.assertTrue(get_clinic_my_requests(search=request.name))
		self.assertEqual(get_clinic_offer_details(offer.name)["name"], offer.name)
		self.assertEqual(client_get(doctype="Purchase Order", name=purchase_order).name, purchase_order)
		self.assertRaises(frappe.PermissionError, create_supplier_offer_from_request, request.name)

		frappe.set_user(self.supplier_user)
		self.assertTrue(get_supplier_my_offers(search=offer.name))
		self.assertEqual(get_supplier_request_details(request.name)["name"], request.name)
		self.assertRaises(frappe.PermissionError, get_clinic_request_details, request.name)
		self.assertRaises(frappe.PermissionError, get_clinic_purchase_order_details, purchase_order)
		self.assertRaises(frappe.PermissionError, reject_supplier_offer_for_clinic, offer.name)

		frappe.set_user("Administrator")
		self.assertTrue(frappe.get_doc("Marketplace Quotation Request", request.name).has_permission("read"))
		self.assertTrue(frappe.get_doc("Marketplace Supplier Offer", offer.name).has_permission("read"))
		self.assertTrue(frappe.get_doc("Purchase Order", purchase_order).has_permission("read"))

	def test_cross_tenant_direct_document_rest_and_list_isolation(self):
		request = self.create_request_from_catalog_as_clinic()
		offer = self.submit_offer_as_supplier(request)
		frappe.set_user(self.clinic_user)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = result["purchase_order"]["name"]
		self.created.append(("Purchase Order", purchase_order))
		client_get = frappe.get_attr("frappe.client.get")

		frappe.set_user(self.other_clinic_user)
		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": request.name}))
		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertFalse(frappe.get_list("Purchase Order", filters={"name": purchase_order}))
		self.assertRaises(frappe.PermissionError, client_get, doctype="Marketplace Quotation Request", name=request.name)
		self.assertRaises(frappe.PermissionError, client_get, doctype="Marketplace Supplier Offer", name=offer.name)
		self.assertRaises(frappe.PermissionError, client_get, doctype="Purchase Order", name=purchase_order)

		frappe.set_user(self.other_supplier_user)
		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": request.name}))
		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertRaises(frappe.PermissionError, get_supplier_request_details, request.name)
		self.assertRaises(frappe.PermissionError, get_supplier_offer_details, offer.name)

	def test_workflow_transitions_are_terminal_and_duplicate_safe(self):
		accept_request = self.create_request_from_catalog_as_clinic([{"item": self.item_left, "quantity": 1}])
		accept_offer = self.submit_offer_as_supplier(accept_request)
		frappe.set_user(self.clinic_user)
		result = accept_supplier_offer_for_clinic(accept_offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))
		self.assertRaises(frappe.ValidationError, accept_supplier_offer_for_clinic, accept_offer.name)
		self.assertRaises(frappe.ValidationError, reject_supplier_offer_for_clinic, accept_offer.name)

		reject_request = self.create_request_from_catalog_as_clinic([{"item": self.item_right, "quantity": 1}])
		reject_offer = self.submit_offer_as_supplier(reject_request)
		frappe.set_user(self.clinic_user)
		reject_supplier_offer_for_clinic(reject_offer.name)
		self.assertRaises(frappe.ValidationError, accept_supplier_offer_for_clinic, reject_offer.name)
		self.assertRaises(frappe.ValidationError, reject_supplier_offer_for_clinic, reject_offer.name)

	def test_role_aware_request_and_offer_status_labels(self):
		request = self.create_request_from_catalog_as_clinic([{"item": self.item_left, "quantity": 1}])

		frappe.set_user(self.clinic_user)
		clinic_request = get_clinic_request_details(request.name)
		self.assertEqual(clinic_request["status"], "Sent")
		self.assertEqual(clinic_request["display_status"], "Waiting for Supplier")
		self.assertEqual(clinic_request["next_action"], "Waiting for supplier response")

		frappe.set_user(self.supplier_user)
		supplier_request = get_supplier_request_details(request.name)
		self.assertEqual(supplier_request["status"], "Sent")
		self.assertEqual(supplier_request["display_status"], "Needs Response")
		self.assertNotEqual(supplier_request["display_status"], "Sent")
		self.assertEqual(supplier_request["next_action"], "Create Offer")

		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		self.assertEqual(offer["status"], "Draft")
		self.assertEqual(offer["display_status"], "Draft")

		supplier_request = get_supplier_request_details(request.name)
		self.assertEqual(supplier_request["display_status"], "Draft Offer")
		self.assertEqual(supplier_request["next_action"], "Complete and submit offer")

		submitted_offer = submit_supplier_offer(offer["name"], self.offer_rates(request))
		self.assertEqual(submitted_offer["status"], "Sent")
		self.assertEqual(submitted_offer["display_status"], "Awaiting Clinic Decision")
		self.assertEqual(submitted_offer["next_action"], "Waiting for clinic decision")

		supplier_request = get_supplier_request_details(request.name)
		self.assertEqual(supplier_request["display_status"], "Offer Submitted")
		self.assertEqual(supplier_request["next_action"], "Awaiting clinic decision")

		frappe.set_user(self.clinic_user)
		clinic_offer = get_clinic_offer_details(offer["name"])
		self.assertEqual(clinic_offer["display_status"], "Offer ready for review")
		self.assertEqual(clinic_offer["next_action"], "Accept or reject offer")
		clinic_request = get_clinic_request_details(request.name)
		self.assertEqual(clinic_request["display_status"], "Offer Received")
		self.assertEqual(clinic_request["next_action"], "Review supplier offer")

	def assert_home_sections(self, sections, expected):
		actual = {section["label"]: {entry["label"] for entry in section["entries"]} for section in sections}
		for section, labels in expected.items():
			self.assertIn(section, actual)
			self.assertTrue(labels.issubset(actual[section]), (section, actual[section]))

	def assert_no_empty_home_sections(self, sections):
		for section in sections:
			self.assertTrue(section.get("entries"), section.get("label"))

	def workspace_sections_for_current_user(self):
		sidebar = get_workspace_sidebar_items()
		workspace_page = next(
			page
			for page in sidebar.get("pages", [])
			if page.get("name") == "Odyio Marketplace" or page.get("title") == "Odyio Marketplace"
		)
		sections = []
		current_section = None
		for block in frappe.parse_json(workspace_page.get("content") or "[]"):
			if block.get("type") == "header":
				current_section = {
					"label": (block.get("data") or {}).get("text"),
					"shortcuts": [],
				}
				sections.append(current_section)
				continue

			if block.get("type") == "shortcut":
				shortcut_name = (block.get("data") or {}).get("shortcut_name")
				if current_section:
					current_section["shortcuts"].append(shortcut_name)

		return sections

	def assert_workspace_sections(self, expected):
		sections = self.workspace_sections_for_current_user()
		actual = {section["label"]: set(section["shortcuts"]) for section in sections}
		self.assertFalse(
			[section["label"] for section in sections if not section["shortcuts"]],
			sections,
		)
		self.assertEqual(set(actual), set(expected))
		for section, shortcuts in expected.items():
			self.assertEqual(actual[section], shortcuts)

	def test_page_workspace_metadata_has_role_aware_non_raw_entry_points(self):
		workspace = frappe.get_doc("Workspace", "Odyio Marketplace")
		shortcuts = {row.label: row for row in workspace.shortcuts}

		self.assertEqual(workspace.label, "Odyio Marketplace")
		self.assertEqual(workspace.title, "Odyio Marketplace")
		self.assertEqual(shortcuts["Home"].link_to, "marketplace-home")
		self.assertEqual(shortcuts["Catalogue"].type, "Page")
		self.assertEqual(shortcuts["My Requests"].link_to, "clinic-my-requests")
		self.assertEqual(shortcuts["Purchase Orders"].link_to, "clinic-purchase-orders")
		self.assertEqual(shortcuts["My Products"].type, "Page")
		self.assertEqual(shortcuts["My Products"].link_to, "supplier-my-products")
		self.assertEqual(shortcuts["Incoming Requests"].link_to, "supplier-incoming-requests")
		self.assertEqual(shortcuts["My Offers"].link_to, "supplier-my-offers")
		self.assertEqual(shortcuts["Items"].link_to, "Item")
		self.assertEqual(shortcuts["Suppliers"].link_to, "Supplier")
		self.assertEqual(shortcuts["ERP Purchase Orders"].link_to, "Purchase Order")
		self.assertEqual(shortcuts["Audiograms"].link_to, "Audiogramme")
		self.assertEqual(shortcuts["Patients"].link_to, "Customer")
		self.assertEqual(shortcuts["Users"].link_to, "User")
		self.assertNotIn("My Quotation Requests", shortcuts)
		self.assertNotIn("Incoming Quotation Requests", shortcuts)

		clinic_page_roles = {row.role for row in frappe.get_doc("Page", "clinic-my-requests").roles}
		supplier_page_roles = {row.role for row in frappe.get_doc("Page", "supplier-incoming-requests").roles}
		product_page_roles = {row.role for row in frappe.get_doc("Page", "supplier-my-products").roles}
		home_page_roles = {row.role for row in frappe.get_doc("Page", "marketplace-home").roles}
		order_page_roles = {row.role for row in frappe.get_doc("Page", "clinic-purchase-orders").roles}
		self.assertIn("Clinic User", clinic_page_roles)
		self.assertIn("Fournisseur", supplier_page_roles)
		self.assertIn("Fournisseur", product_page_roles)
		self.assertIn("Clinic User", home_page_roles)
		self.assertIn("Fournisseur", home_page_roles)
		self.assertIn("Audiometriste", home_page_roles)
		self.assertIn("Clinic User", order_page_roles)

		self.assertEqual(frappe.db.get_value("Role", "Clinic User", "home_page"), "app/marketplace-home")
		self.assertEqual(frappe.db.get_value("Role", "Fournisseur", "home_page"), "app/marketplace-home")

	def test_unified_home_route_references_existing_page_only(self):
		self.assertTrue(frappe.db.exists("Page", "marketplace-home"))
		self.assertFalse(frappe.db.exists("Page", "odyio"))

		for role in ("Clinic User", "Fournisseur"):
			home_page = frappe.db.get_value("Role", role, "home_page")
			self.assertEqual(home_page, "app/marketplace-home")
			route = home_page.removeprefix("app/")
			self.assertTrue(frappe.db.exists("Page", route))

		workspace = frappe.get_doc("Workspace", "Odyio Marketplace")
		for shortcut in workspace.shortcuts:
			if shortcut.type == "Page":
				self.assertNotEqual(shortcut.link_to, "odyio")
				self.assertTrue(frappe.db.exists("Page", shortcut.link_to), shortcut.link_to)
			if shortcut.type == "DocType":
				self.assertTrue(frappe.db.exists("DocType", shortcut.link_to), shortcut.link_to)

	def test_source_has_no_stale_odyio_page_route(self):
		paths = [
			frappe.get_app_path("odyio_marketplace", "navigation.py"),
			frappe.get_app_path("odyio_marketplace", "setup", "install.py"),
			frappe.get_app_path("odyio_marketplace", "hooks.py"),
			frappe.get_app_path("odyio_marketplace", "odyio_marketplace", "workspace", "odyio_marketplace", "odyio_marketplace.json"),
		]
		for path in paths:
			with open(path, encoding="utf-8") as handle:
				source = handle.read()
			self.assertNotIn("/app/odyio", source)
			self.assertNotIn('"app/odyio"', source)
			self.assertNotIn("'app/odyio'", source)
			self.assertNotIn('"link_to": "odyio"', source)
			self.assertNotIn("'link_to': 'odyio'", source)

		self.assertEqual(hooks.override_whitelisted_methods["frappe.desk.desktop.get_workspace_sidebar_items"], "odyio_marketplace.navigation.get_workspace_sidebar_items")

	def test_role_aware_marketplace_page_access_and_home_context(self):
		frappe.set_user(self.clinic_user)
		self.assertTrue(can_access_marketplace_page("marketplace-home"))
		self.assertTrue(can_access_marketplace_page("marketplace-catalogue"))
		self.assertTrue(can_access_marketplace_page("clinic-my-requests"))
		self.assertTrue(can_access_marketplace_page("clinic-purchase-orders"))
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-my-products")
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-incoming-requests")
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-my-offers")
		clinic_home = get_marketplace_home_context()
		self.assertTrue(clinic_home["is_clinic"])
		self.assertFalse(clinic_home["is_supplier"])
		self.assertEqual(clinic_home["clinic"]["company"], self.company)
		self.assertIn("patients", clinic_home["clinic"]["counts"])
		self.assertIn("audiogrammes", clinic_home["clinic"]["counts"])
		self.assert_home_sections(
			clinic_home["clinic"]["sections"],
			{
				"Marketplace": {"Browse Catalogue", "My Requests", "Purchase Orders"},
				"Audiology / Clinical": {"Patients", "Audiograms"},
			},
		)
		self.assert_no_empty_home_sections(clinic_home["clinic"]["sections"])
		self.assertNotIn("ERP / Operations", {section["label"] for section in clinic_home["clinic"]["sections"]})
		self.assertNotIn("Administration", {section["label"] for section in clinic_home["clinic"]["sections"]})
		self.assertEqual(get_marketplace_landing_page(self.clinic_user), "app/marketplace-home")

		frappe.set_user(self.supplier_user)
		self.assertTrue(can_access_marketplace_page("marketplace-home"))
		self.assertTrue(can_access_marketplace_page("supplier-my-products"))
		self.assertTrue(can_access_marketplace_page("supplier-incoming-requests"))
		self.assertTrue(can_access_marketplace_page("supplier-my-offers"))
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "marketplace-catalogue")
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "clinic-my-requests")
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "clinic-purchase-orders")
		supplier_home = get_marketplace_home_context()
		self.assertFalse(supplier_home["is_clinic"])
		self.assertTrue(supplier_home["is_supplier"])
		self.assertEqual(supplier_home["supplier"]["supplier"], self.supplier)
		supplier_sections = supplier_home.get("supplier", {}).get("sections", [])
		self.assertEqual(supplier_sections, [])
		self.assertEqual(get_marketplace_landing_page(self.supplier_user), "app/marketplace-home")

		frappe.set_user("Administrator")
		self.assertTrue(can_access_marketplace_page("marketplace-catalogue"))
		self.assertTrue(can_access_marketplace_page("clinic-purchase-orders"))
		self.assertTrue(can_access_marketplace_page("supplier-my-offers"))
		self.assertIsNone(get_marketplace_landing_page("Administrator"))
		admin_home = get_marketplace_home_context()
		self.assertTrue(admin_home["is_admin"])
		self.assert_home_sections(
			admin_home["admin"]["sections"],
			{
				"Marketplace": {"Catalogue", "Quotation Requests", "Supplier Offers", "Marketplace Purchase Orders"},
				"ERP / Operations": {"Products / Items", "Item Groups", "Suppliers", "Purchase Orders", "Warehouses", "Companies"},
				"Audiology / Clinical": {"Audiograms", "Patients"},
				"Administration": {"Users", "Roles", "ERPNext Settings"},
			},
		)
		self.assert_no_empty_home_sections(admin_home["admin"]["sections"])
		self.assertTrue(admin_home["admin"]["installed_integrations"])

		frappe.set_user(self.erp_staff_user)
		self.assertTrue(can_access_marketplace_page("marketplace-home"))
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "marketplace-catalogue")
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-my-products")
		staff_home = get_marketplace_home_context()
		self.assertTrue(staff_home["is_staff"])
		self.assertIn("purchase_orders", staff_home["staff"]["counts"])
		self.assert_home_sections(
			staff_home["staff"]["sections"],
			{
				"Audiology / Clinical": {"Audiograms"},
			},
		)
		self.assert_no_empty_home_sections(staff_home["staff"]["sections"])
		self.assertNotIn("Administration", {section["label"] for section in staff_home["staff"]["sections"]})

		frappe.set_user(self.erp_ops_user)
		self.assertTrue(can_access_marketplace_page("marketplace-home"))
		ops_home = get_marketplace_home_context()
		self.assertTrue(ops_home["is_staff"])
		self.assert_home_sections(
			ops_home["staff"]["sections"],
			{
				"ERP / Operations": {"Item Groups", "Suppliers", "Warehouses", "Companies"},
			},
		)
		self.assert_no_empty_home_sections(ops_home["staff"]["sections"])
		self.assertNotIn("Administration", {section["label"] for section in ops_home["staff"]["sections"]})

	def test_marketplace_workspace_sidebar_is_focused_for_normal_users(self):
		frappe.set_user(self.clinic_user)
		clinic_sidebar = get_workspace_sidebar_items()
		self.assertTrue(clinic_sidebar.get("pages"))
		self.assertEqual({page.get("name") for page in clinic_sidebar["pages"]}, {"Odyio Marketplace"})
		clinic_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		clinic_shortcuts = {row.get("label") for row in clinic_workspace["shortcuts"].get("items", [])}
		self.assertEqual(clinic_shortcuts, {"Home", "Catalogue", "My Requests", "Purchase Orders", "Patients", "Audiograms"})
		self.assert_workspace_sections(
			{
				"Marketplace": {"Home", "Catalogue", "My Requests", "Purchase Orders"},
				"Audiology / Clinical": {"Audiograms", "Patients"},
			}
		)

		frappe.set_user(self.supplier_user)
		supplier_sidebar = get_workspace_sidebar_items()
		self.assertTrue(supplier_sidebar.get("pages"))
		self.assertEqual({page.get("name") for page in supplier_sidebar["pages"]}, {"Odyio Marketplace"})
		supplier_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		supplier_shortcuts = {row.get("label") for row in supplier_workspace["shortcuts"].get("items", [])}
		self.assertEqual(supplier_shortcuts, {"Home", "My Products", "Incoming Requests", "My Offers"})
		self.assertNotIn("Audiograms", supplier_shortcuts)
		self.assertNotIn("Patients", supplier_shortcuts)
		self.assert_workspace_sections(
			{
				"Marketplace": {"Home", "My Products", "Incoming Requests", "My Offers"},
			}
		)

		frappe.set_user(self.erp_staff_user)
		staff_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		staff_shortcuts = {row.get("label") for row in staff_workspace["shortcuts"].get("items", [])}
		self.assertIn("Home", staff_shortcuts)
		self.assertIn("Audiograms", staff_shortcuts)
		self.assertNotIn("Users", staff_shortcuts)
		self.assert_workspace_sections(
			{
				"Marketplace": {"Home"},
				"Audiology / Clinical": {"Audiograms"},
			}
		)

		frappe.set_user(self.erp_ops_user)
		ops_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		ops_shortcuts = {row.get("label") for row in ops_workspace["shortcuts"].get("items", [])}
		self.assertIn("Home", ops_shortcuts)
		self.assertIn("Item Groups", ops_shortcuts)
		self.assertIn("Suppliers", ops_shortcuts)
		self.assertIn("Warehouses", ops_shortcuts)
		self.assertIn("Companies", ops_shortcuts)
		self.assertNotIn("Users", ops_shortcuts)
		self.assert_workspace_sections(
			{
				"Marketplace": {"Home"},
				"ERP / Operations": {"Item Groups", "Suppliers", "Warehouses", "Companies"},
			}
		)

		frappe.set_user("Administrator")
		admin_sidebar = get_workspace_sidebar_items()
		self.assertIn("Odyio Marketplace", {page.get("name") for page in admin_sidebar.get("pages", [])})
		admin_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		admin_shortcuts = {row.get("label") for row in admin_workspace["shortcuts"].get("items", [])}
		self.assertIn("Items", admin_shortcuts)
		self.assertIn("Suppliers", admin_shortcuts)
		self.assertIn("Audiograms", admin_shortcuts)
		self.assertIn("Users", admin_shortcuts)
		self.assert_workspace_sections(
			{
				"Marketplace": {
					"Home",
					"Catalogue",
					"My Requests",
					"Purchase Orders",
					"My Products",
					"Incoming Requests",
					"My Offers",
				},
				"ERP / Operations": {
					"Items",
					"Item Groups",
					"Suppliers",
					"ERP Purchase Orders",
					"Warehouses",
					"Companies",
				},
				"Audiology / Clinical": {"Audiograms", "Patients"},
				"Administration": {"Users", "Roles"},
			}
		)

	def test_normal_marketplace_users_do_not_have_admin_navigation_permissions(self):
		frappe.set_user(self.clinic_user)
		clinic_sidebar = get_workspace_sidebar_items()
		clinic_pages = {page.get("name") for page in clinic_sidebar.get("pages", [])}
		self.assertNotIn("Users", clinic_pages)
		self.assertNotIn("Accounting", clinic_pages)
		self.assertNotIn("ERPNext Settings", clinic_pages)

		frappe.set_user(self.supplier_user)
		supplier_sidebar = get_workspace_sidebar_items()
		supplier_pages = {page.get("name") for page in supplier_sidebar.get("pages", [])}
		self.assertNotIn("Users", supplier_pages)
		self.assertNotIn("Accounting", supplier_pages)
		self.assertNotIn("ERPNext Settings", supplier_pages)

		frappe.set_user("Administrator")
		self.assertTrue(frappe.has_permission("User", "read"))

	def test_clinic_role_has_intended_clinical_permissions_without_admin_access(self):
		frappe.set_user(self.clinic_user)
		self.assertTrue(frappe.has_permission("Customer", "read"))
		self.assertTrue(frappe.has_permission("Customer", "create"))
		self.assertTrue(frappe.has_permission("Audiogramme", "read"))
		self.assertTrue(frappe.has_permission("Audiogramme", "create"))
		self.assertNotIn("System Manager", frappe.get_roles(self.clinic_user))
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-my-products")

		clinic_home = get_marketplace_home_context()
		labels = {
			entry["label"]
			for section in clinic_home["clinic"]["sections"]
			for entry in section["entries"]
		}
		self.assertIn("Patients", labels)
		self.assertIn("Audiograms", labels)
		self.assertNotIn("Odyio Noah", labels)

		for section in clinic_home["clinic"]["sections"]:
			for entry in section["entries"]:
				if "Noah" in entry["label"]:
					self.assertTrue(frappe.db.exists(entry["type"], entry["target"]))

		frappe.set_user(self.supplier_user)
		self.assertRaises(frappe.PermissionError, lambda: frappe.has_permission("Audiogramme", "read", throw=True))
		supplier_workspace = get_desktop_page(frappe.get_doc("Workspace", "Odyio Marketplace").as_json())
		supplier_shortcuts = {row.get("label") for row in supplier_workspace["shortcuts"].get("items", [])}
		self.assertNotIn("Audiograms", supplier_shortcuts)
		self.assertNotIn("Patients", supplier_shortcuts)

	def test_page_scripts_do_not_route_normal_users_to_raw_marketplace_forms(self):
		page_paths = [
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"marketplace_catalogue",
				"marketplace_catalogue.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"clinic_my_requests",
				"clinic_my_requests.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"clinic_purchase_orders",
				"clinic_purchase_orders.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"clinic_purchase_orders",
				"clinic_purchase_orders.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_my_products",
				"supplier_my_products.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_incoming_requests",
				"supplier_incoming_requests.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_my_offers",
				"supplier_my_offers.js",
			),
		]

		for path in page_paths:
			with open(path, encoding="utf-8") as handle:
				script = handle.read()
			self.assertNotIn('frappe.set_route("Form", "Marketplace Quotation Request"', script)
			self.assertNotIn('frappe.set_route("Form", "Marketplace Supplier Offer"', script)
			self.assertNotIn('frappe.set_route("Form", "Purchase Order"', script)
			self.assertNotIn("odyio-details", script)

		drawer_pages = [
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"marketplace_catalogue",
				"marketplace_catalogue.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"clinic_my_requests",
				"clinic_my_requests.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_my_products",
				"supplier_my_products.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_incoming_requests",
				"supplier_incoming_requests.js",
			),
			frappe.get_app_path(
				"odyio_marketplace",
				"odyio_marketplace",
				"page",
				"supplier_my_offers",
				"supplier_my_offers.js",
			),
		]
		for path in drawer_pages:
			with open(path, encoding="utf-8") as handle:
				script = handle.read()
			self.assertIn("this.ui.drawer()", script)
			self.assertIn("this.drawer.open", script)

	def test_catalogue_review_uses_shared_drawer_and_preserves_state(self):
		page_path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"marketplace_catalogue",
			"marketplace_catalogue.js",
		)
		with open(page_path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("open_review_drawer", script)
		self.assertIn("render_review_drawer", script)
		self.assertIn("render_review_body", script)
		self.assertIn("this.ui.drawer()", script)
		self.assertIn("preview.message", script)
		self.assertIn("preview.can_create_request && !this.creating_request", script)
		self.assertIn("this.cart[item] = quantity", script)
		self.assertIn("delete this.cart[item]", script)
		self.assertIn("this.drawer.close(true)", script)
		self.assertIn("this.open_review_drawer({ preserve_focus: true })", script)
		self.assertIn("Supplier pricing is provided later", script)
		self.assertIn("this.show_success_feedback(result.quotation_request)", script)
		self.assertNotIn("odyio-catalogue-review", script)
		self.assertNotIn("this.$review", script)
		self.assertNotIn("render_review()", script)
		self.assertNotIn("format_currency", script)
		self.assertNotIn("standard_rate", script)

	def test_normal_user_pages_do_not_append_detail_or_review_panels_below_lists(self):
		page_dir = frappe.get_app_path("odyio_marketplace", "odyio_marketplace", "page")
		for page_name in (
			"marketplace_catalogue",
			"clinic_my_requests",
			"clinic_purchase_orders",
			"supplier_incoming_requests",
			"supplier_my_offers",
			"supplier_my_products",
			"marketplace_home",
		):
			path = frappe.get_app_path("odyio_marketplace", "odyio_marketplace", "page", page_name, f"{page_name}.js")
			with open(path, encoding="utf-8") as handle:
				script = handle.read()

			self.assertNotIn("odyio-details", script, page_name)
			self.assertNotIn("odyio-catalogue-review", script, page_name)
			self.assertNotIn("detail-panel", script, page_name)
			self.assertNotIn("selected-request", script, page_name)
			self.assertNotIn("offer-details", script, page_name)
			self.assertNotIn("po-details", script, page_name)

	def test_shared_drawer_helper_has_accessibility_and_focus_behavior(self):
		helper_path = frappe.get_app_path("odyio_marketplace", "public", "js", "marketplace_ui.js")
		with open(helper_path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn('role="dialog"', script)
		self.assertIn('aria-label="${this.ui.escape(__("Close details"))}"', script)
		self.assertIn('event.key === "Escape"', script)
		self.assertIn("this.previous_focus.focus()", script)
		self.assertIn("odyio-drawer-body", script)

	def test_page_scripts_use_shared_actor_status_helpers(self):
		helper_path = frappe.get_app_path("odyio_marketplace", "public", "js", "marketplace_ui.js")
		with open(helper_path, encoding="utf-8") as handle:
			helper = handle.read()
		self.assertIn("status_view(record)", helper)
		self.assertIn('class="indicator ${this.escape(color)}"', helper)
		self.assertNotIn("odyio-badge", helper)

		for page_name in (
			"clinic_my_requests",
			"clinic_purchase_orders",
			"supplier_incoming_requests",
			"supplier_my_offers",
			"supplier_my_products",
			"marketplace_home",
		):
			path = frappe.get_app_path("odyio_marketplace", "odyio_marketplace", "page", page_name, f"{page_name}.js")
			with open(path, encoding="utf-8") as handle:
				script = handle.read()
			self.assertIn("this.ui.status_view", script, page_name)
			self.assertNotIn("status_badge(request.status)", script, page_name)
			self.assertNotIn("status_badge(offer.status)", script, page_name)
			self.assertNotIn("status: request.status", script, page_name)
			self.assertNotIn("status: offer.status", script, page_name)

		supplier_requests = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"supplier_incoming_requests",
			"supplier_incoming_requests.js",
		)
		with open(supplier_requests, encoding="utf-8") as handle:
			script = handle.read()
		self.assertNotIn("status_badge(request.status)", script)
		self.assertIn("request.next_action", script)

	def test_supplier_devis_builder_uses_single_preview_and_separate_configuration(self):
		path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"supplier_my_offers",
			"supplier_my_offers.js",
		)
		with open(path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("odyio-template-selector", script)
		self.assertIn("odyio-configure-devis", script)
		self.assertIn("open_devis_configuration", script)
		self.assertIn("save_supplier_devis_configuration", script)
		self.assertIn("get_supplier_devis_configuration", script)
		self.assertIn("preview_devis_template", script)
		self.assertIn("upload_devis_logo", script)
		self.assertIn("odyio-devis-logo-input sr-only", script)
		self.assertIn("Default", script)
		self.assertIn("this.devis_builder.selected_template", script)
		self.assertIn("this.devis_builder.default_template", script)
		self.assertIn("this.devis_configuration_dialog = null", script)
		self.assertIn("this.devis_configuration_opening = false", script)
		self.assertIn('$wrapper.off("click.odyioDevisBuilder", ".odyio-template-option")', script)
		self.assertIn('$wrapper.off("click.odyioDevisBuilder", ".odyio-configure-devis")', script)
		self.assertIn('$wrapper.on("click.odyioDevisBuilder", ".odyio-template-option"', script)
		self.assertIn('$wrapper.on("click.odyioDevisBuilder", ".odyio-configure-devis"', script)
		self.assertIn("hidden.bs.modal.odyioDevisConfig", script)
		self.assertNotIn('$wrapper.find(".odyio-configure-devis").on("click"', script)
		self.assertNotIn('$wrapper.find(".odyio-template-option").on("click"', script)
		self.assertNotIn("preview_html", script)
		self.assertNotIn("save_as_default", script)
		self.assertNotIn("supplier_display_name", script)
		self.assertNotIn("result.templates.map((template) => `<h4>", script)

	def test_marketplace_home_defensively_skips_empty_sections(self):
		path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"marketplace_home",
			"marketplace_home.js",
		)
		with open(path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("filter((section) => (section.entries || []).length)", script)
