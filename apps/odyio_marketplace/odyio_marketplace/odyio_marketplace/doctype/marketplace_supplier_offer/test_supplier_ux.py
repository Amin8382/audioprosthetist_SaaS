import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.api import (
	create_supplier_offer_from_request,
	get_supplier_incoming_requests,
	get_supplier_marketplace_context,
	get_supplier_my_offers,
	get_supplier_offer_details,
	get_supplier_request_details,
	submit_supplier_offer,
)
from odyio_marketplace.setup.install import install_marketplace_foundation


test_ignore = ["Company", "Item", "Marketplace Quotation Request", "Marketplace Supplier Offer", "Supplier", "UOM"]


class TestSupplierMarketplaceUX(FrappeTestCase):
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
			if frappe.db.exists(doctype, name):
				doc = frappe.get_doc(doctype, name)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		super().tearDownClass()

	@classmethod
	def prepare_master_data(cls):
		cls.company = cls.create_company("_Test Supplier UX Clinic", "TSU")
		cls.other_company = cls.create_company("_Test Supplier UX Other Clinic", "TSV")
		cls.supplier = cls.create_supplier("_Test Supplier UX Supplier")
		cls.other_supplier = cls.create_supplier("_Test Supplier UX Other Supplier")
		cls.item = cls.create_item("_Test Supplier UX Item", cls.supplier, 150)
		cls.second_item = cls.create_item("_Test Supplier UX Second Item", cls.supplier, 175)
		cls.other_supplier_item = cls.create_item("_Test Supplier UX Other Supplier Item", cls.other_supplier, 225)
		cls.clinic_user = cls.create_user("marketplace.supplier.ux.clinic@example.test", "Clinic User")
		cls.other_clinic_user = cls.create_user("marketplace.supplier.ux.other.clinic@example.test", "Clinic User")
		cls.supplier_user = cls.create_user("marketplace.supplier.ux.supplier@example.test", "Fournisseur")
		cls.other_supplier_user = cls.create_user("marketplace.supplier.ux.other.supplier@example.test", "Fournisseur")
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
		if frappe.db.exists("User", email):
			return email

		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": email,
				"first_name": email.split("@")[0],
				"enabled": 1,
				"send_welcome_email": 0,
				"roles": [{"role": role}],
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

	def make_request(self, supplier=None, items=None, submit=True):
		frappe.set_user(self.clinic_user)
		request = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company,
				"supplier": supplier or self.supplier,
				"fulfillment_method": "PICKUP",
				"items": items
				or [
					{"item": self.item, "quantity": 2},
					{"item": self.second_item, "quantity": 1},
				],
			}
		)
		request.insert()
		self.created.append(("Marketplace Quotation Request", request.name))
		if submit:
			request.send_request()
		return request

	def make_offer(self, request=None, submit=False):
		request = request or self.make_request()
		frappe.set_user(self.supplier_user)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		if submit:
			offer = submit_supplier_offer(offer["name"], self.offer_rates())
		return frappe.get_doc("Marketplace Supplier Offer", offer["name"])

	def offer_rates(self, first_rate=210, second_rate=235):
		return [
			{"item": self.item, "fixed_rate": first_rate},
			{"item": self.second_item, "fixed_rate": second_rate},
		]

	def test_supplier_context_resolves_supplier_docname(self):
		frappe.set_user(self.supplier_user)

		context = get_supplier_marketplace_context()

		self.assertEqual(context["supplier"], self.supplier)

	def test_supplier_sees_sent_assigned_requests(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user)

		requests = get_supplier_incoming_requests()

		self.assertIn(request.name, {row["name"] for row in requests})

	def test_supplier_does_not_see_draft_requests(self):
		request = self.make_request(submit=False)
		frappe.set_user(self.supplier_user)

		requests = get_supplier_incoming_requests()

		self.assertNotIn(request.name, {row["name"] for row in requests})
		self.assertRaises(frappe.PermissionError, get_supplier_request_details, request.name)

	def test_supplier_does_not_see_another_supplier_requests(self):
		request = self.make_request(
			supplier=self.other_supplier,
			items=[{"item": self.other_supplier_item, "quantity": 1}],
		)
		frappe.set_user(self.supplier_user)

		requests = get_supplier_incoming_requests()

		self.assertNotIn(request.name, {row["name"] for row in requests})
		self.assertRaises(frappe.PermissionError, get_supplier_request_details, request.name)

	def test_request_details_return_only_authorized_marketplace_data(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user)

		details = get_supplier_request_details(request.name)

		self.assertEqual(details["name"], request.name)
		self.assertEqual(details["clinic"], self.company)
		self.assertEqual(details["item_count"], 2)
		self.assertNotIn("fixed_rate", details["items"][0])
		self.assertNotIn("total_amount", details)

	def test_offer_is_generated_from_request(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user)

		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))

		self.assertEqual(offer["quotation_request"], request.name)
		self.assertEqual(offer["clinic"], self.company)
		self.assertEqual(offer["supplier"], self.supplier)
		self.assertEqual(offer["status"], "Draft")

	def test_offer_lines_copy_items_and_quantities_without_catalog_prices(self):
		offer = self.make_offer()

		self.assertEqual([row.item for row in offer.items], [self.item, self.second_item])
		self.assertEqual([row.quantity for row in offer.items], [2, 1])
		self.assertEqual([row.fixed_rate for row in offer.items], [0, 0])
		self.assertEqual(offer.total_amount, 0)

	def test_supplier_entered_offer_rates_are_preserved(self):
		offer = self.make_offer()
		frappe.set_user(self.supplier_user)
		offer.items[0].fixed_rate = 333
		offer.save()
		offer.reload()

		self.assertEqual(offer.items[0].fixed_rate, 333)
		self.assertEqual(offer.items[0].amount, 666)

	def test_api_rejects_rates_for_items_outside_request(self):
		offer = self.make_offer()
		frappe.set_user(self.supplier_user)

		self.assertRaises(
			frappe.ValidationError,
			submit_supplier_offer,
			offer.name,
			self.offer_rates() + [{"item": self.other_supplier_item, "fixed_rate": 999}],
		)

	def test_client_supplied_supplier_change_is_overridden_or_rejected(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user)
		offer_doc = frappe.get_doc(
			{
				"doctype": "Marketplace Supplier Offer",
				"quotation_request": request.name,
				"supplier": self.other_supplier,
				"clinic": self.other_company,
			}
		)
		try:
			offer_doc.insert()
		except frappe.PermissionError:
			return

		self.created.append(("Marketplace Supplier Offer", offer_doc.name))
		self.assertEqual(offer_doc.supplier, self.supplier)
		self.assertEqual(offer_doc.clinic, self.company)

	def test_second_offer_creation_is_rejected(self):
		request = self.make_request()
		self.make_offer(request)
		frappe.set_user(self.supplier_user)

		self.assertRaises(frappe.ValidationError, create_supplier_offer_from_request, request.name)

	def test_clinic_user_cannot_call_supplier_offer_api(self):
		request = self.make_request()
		frappe.set_user(self.clinic_user)

		self.assertRaises(frappe.PermissionError, create_supplier_offer_from_request, request.name)

	def test_supplier_cannot_submit_another_supplier_offer(self):
		request = self.make_request(
			supplier=self.other_supplier,
			items=[{"item": self.other_supplier_item, "quantity": 1}],
		)
		frappe.set_user(self.other_supplier_user)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		frappe.set_user(self.supplier_user)

		self.assertRaises(
			frappe.PermissionError,
			submit_supplier_offer,
			offer["name"],
			[{"item": self.other_supplier_item, "fixed_rate": 310}],
		)

	def test_submitted_offer_is_immutable_for_supplier(self):
		offer = self.make_offer(submit=True)
		frappe.set_user(self.supplier_user)
		offer.reload()
		offer.supplier_notes = "Changed after submit"

		self.assertRaises(frappe.UpdateAfterSubmitError, offer.save)

	def test_supplier_cannot_accept_or_reject_offer(self):
		offer = self.make_offer(submit=True)
		frappe.set_user(self.supplier_user)

		self.assertRaises(frappe.PermissionError, offer.accept_offer)
		self.assertRaises(frappe.PermissionError, offer.reject_offer)

	def test_my_offers_lists_only_supplier_offers(self):
		offer = self.make_offer(submit=True)
		request = self.make_request(
			supplier=self.other_supplier,
			items=[{"item": self.other_supplier_item, "quantity": 1}],
		)
		frappe.set_user(self.other_supplier_user)
		other_offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", other_offer["name"]))
		frappe.set_user(self.supplier_user)

		offers = get_supplier_my_offers()

		self.assertIn(offer.name, {row["name"] for row in offers})
		self.assertNotIn(other_offer["name"], {row["name"] for row in offers})

	def test_list_query_and_direct_document_permission_isolation(self):
		request = self.make_request()
		frappe.set_user(self.other_supplier_user)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": request.name}))
		doc = frappe.get_doc("Marketplace Quotation Request", request.name)
		self.assertRaises(frappe.PermissionError, doc.check_permission, "read")
