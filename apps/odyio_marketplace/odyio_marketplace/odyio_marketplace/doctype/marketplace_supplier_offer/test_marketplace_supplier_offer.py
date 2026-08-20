import frappe
from frappe.tests.utils import FrappeTestCase

import odyio_marketplace.odyio_marketplace.doctype.marketplace_supplier_offer.marketplace_supplier_offer as offer_controller
from odyio_marketplace.setup.install import ERPNEXT_PARTY_CONTACT_CUSTOM_FIELDS, install_marketplace_foundation


test_ignore = ["Company", "Item", "Marketplace Quotation Request", "Purchase Order", "Supplier", "UOM"]


class TestMarketplaceSupplierOffer(FrappeTestCase):
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
				frappe.db.set_value(
					"Marketplace Quotation Request",
					doc.quotation_request,
					{"linked_supplier_offer": "", "linked_purchase_order": ""},
					update_modified=False,
				)
			if doctype == "Marketplace Supplier Offer" and doc.docstatus == 1 and doc.status in {"Accepted", "Rejected"}:
				doc.db_set("status", "Sent", update_modified=False)
				doc.reload()

			if doc.docstatus == 1:
				doc.cancel()

			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)

		super().tearDownClass()

	@classmethod
	def prepare_master_data(cls):
		cls.company_a = cls.create_company("_Test Marketplace Offer Clinic A", "MOA")
		cls.company_b = cls.create_company("_Test Marketplace Offer Clinic B", "MOB")
		cls.supplier_a = cls.create_supplier("_Test Marketplace Offer Supplier A")
		cls.supplier_b = cls.create_supplier("_Test Marketplace Offer Supplier B")
		cls.item_a = cls.create_item("_Test Marketplace Offer Item A", cls.supplier_a, 120)
		cls.item_b = cls.create_item("_Test Marketplace Offer Item B", cls.supplier_a, 80)
		cls.other_supplier_item = cls.create_item("_Test Marketplace Offer Other Supplier Item", cls.supplier_b, 90)
		cls.clinic_user_a = cls.create_user("marketplace.offer.clinic.a@example.test", "Clinic User")
		cls.clinic_user_b = cls.create_user("marketplace.offer.clinic.b@example.test", "Clinic User")
		cls.supplier_user_a = cls.create_user("marketplace.offer.supplier.a@example.test", "Fournisseur")
		cls.supplier_user_b = cls.create_user("marketplace.offer.supplier.b@example.test", "Fournisseur")
		cls.create_user_permission(cls.clinic_user_a, "Company", cls.company_a)
		cls.create_user_permission(cls.clinic_user_b, "Company", cls.company_b)
		cls.create_user_permission(cls.supplier_user_a, "Supplier", cls.supplier_a)
		cls.create_user_permission(cls.supplier_user_b, "Supplier", cls.supplier_b)

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
		if frappe.db.exists("Supplier", supplier_name):
			return supplier_name

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

	def make_request(self, clinic=None, supplier=None, item=None):
		frappe.set_user(self.clinic_user_a if clinic != self.company_b else self.clinic_user_b)
		request = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": clinic or self.company_a,
				"supplier": supplier or self.supplier_a,
				"fulfillment_method": "PICKUP",
				"items": [{"item": item or self.item_a, "quantity": 2}],
			}
		).insert()
		self.created.append((request.doctype, request.name))
		request.send_request()
		request.reload()
		return request

	def make_offer(self, request=None):
		request = request or self.make_request()
		frappe.set_user(self.supplier_user_a)
		offer = frappe.get_doc(
			{
				"doctype": "Marketplace Supplier Offer",
				"quotation_request": request.name,
			}
		).insert()
		self.created.append((offer.doctype, offer.name))
		return offer

	def send_offer(self, request=None):
		offer = self.make_offer(request)
		self.apply_offer_rates(offer)
		offer.send_offer()
		return frappe.get_doc(offer.doctype, offer.name)

	def apply_offer_rates(self, offer, rate_a=310, rate_b=410):
		for row in offer.items:
			if row.item == self.item_a:
				row.fixed_rate = rate_a
			elif row.item == self.item_b:
				row.fixed_rate = rate_b
			else:
				row.fixed_rate = 290
		offer.save()
		offer.reload()
		return offer

	def test_supplier_creates_draft_offer_without_catalog_prices(self):
		request = self.make_request()
		offer = self.make_offer(request)

		self.assertEqual(offer.status, "Draft")
		self.assertEqual(offer.supplier, self.supplier_a)
		self.assertEqual(offer.clinic, self.company_a)
		self.assertEqual(offer.items[0].fixed_rate, 0)
		self.assertEqual(offer.total_amount, 0)

	def test_erpnext_party_contact_custom_fields_match_postgresql_schema(self):
		for doctype, fields in ERPNEXT_PARTY_CONTACT_CUSTOM_FIELDS.items():
			for field in fields:
				fieldname = field["fieldname"]
				self.assertTrue(
					frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}),
					f"{doctype}.{fieldname} Custom Field is missing",
				)
				self.assertTrue(frappe.get_meta(doctype).has_field(fieldname), f"{doctype}.{fieldname} metadata is missing")
				self.assertTrue(frappe.db.has_column(doctype, fieldname), f"{doctype}.{fieldname} column is missing")

	def test_offer_requires_sent_quotation_request(self):
		frappe.set_user(self.clinic_user_a)
		request = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company_a,
				"supplier": self.supplier_a,
				"fulfillment_method": "PICKUP",
				"items": [{"item": self.item_a, "quantity": 1}],
			}
		).insert()
		self.created.append((request.doctype, request.name))

		frappe.set_user(self.supplier_user_a)
		offer = frappe.get_doc({"doctype": "Marketplace Supplier Offer", "quotation_request": request.name})
		self.assertRaises(frappe.ValidationError, offer.insert)

	def test_another_supplier_cannot_create_offer(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user_b)
		offer = frappe.get_doc({"doctype": "Marketplace Supplier Offer", "quotation_request": request.name})

		self.assertRaises(frappe.ValidationError, offer.insert)

	def test_only_one_offer_per_request(self):
		request = self.make_request()
		self.make_offer(request)
		frappe.set_user(self.supplier_user_a)
		duplicate = frappe.get_doc({"doctype": "Marketplace Supplier Offer", "quotation_request": request.name})

		self.assertRaises(frappe.ValidationError, duplicate.insert)

	def test_supplier_can_price_offer_but_cannot_override_request_lines(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user_a)
		offer = frappe.get_doc(
			{
				"doctype": "Marketplace Supplier Offer",
				"quotation_request": request.name,
				"items": [{"item": self.item_a, "quantity": 99, "fixed_rate": 1}],
			}
		).insert()
		self.created.append((offer.doctype, offer.name))

		self.assertEqual(offer.items[0].quantity, 2)
		self.assertEqual(offer.items[0].fixed_rate, 1)
		self.assertEqual(offer.total_amount, 2)

	def test_offer_requires_supplier_rates_before_submission(self):
		offer = self.make_offer()

		self.assertRaises(frappe.ValidationError, offer.send_offer)

	def test_supplier_sends_offer(self):
		offer = self.send_offer()

		self.assertEqual(offer.status, "Sent")
		self.assertEqual(offer.docstatus, 1)
		self.assertTrue(offer.sent_at)

	def test_draft_offer_is_invisible_to_clinic(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(offer.doctype, offer.name).check_permission, "read")

	def test_sent_offer_is_visible_to_request_clinic(self):
		offer = self.send_offer()
		frappe.set_user(self.clinic_user_a)

		self.assertTrue(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertTrue(frappe.get_doc(offer.doctype, offer.name).has_permission("read"))

	def test_frappe_client_api_access_respects_offer_permissions(self):
		offer = self.send_offer()
		client_get = frappe.get_attr("frappe.client.get")

		frappe.set_user(self.clinic_user_a)
		self.assertEqual(client_get(doctype=offer.doctype, name=offer.name).name, offer.name)

		frappe.set_user(self.clinic_user_b)
		self.assertRaises(frappe.PermissionError, client_get, doctype=offer.doctype, name=offer.name)

	def test_another_supplier_and_clinic_cannot_access_offer(self):
		offer = self.send_offer()

		frappe.set_user(self.supplier_user_b)
		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(offer.doctype, offer.name).check_permission, "read")

		frappe.set_user(self.clinic_user_b)
		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(offer.doctype, offer.name).check_permission, "read")

	def test_clinic_accepts_offer_and_creates_purchase_order(self):
		offer = self.send_offer()
		frappe.set_user(self.clinic_user_a)
		offer.accept_offer()
		offer.reload()
		self.created.append(("Purchase Order", offer.purchase_order))

		purchase_order = frappe.get_doc("Purchase Order", offer.purchase_order)
		request = frappe.get_doc("Marketplace Quotation Request", offer.quotation_request)
		self.assertEqual(offer.status, "Accepted")
		self.assertEqual(purchase_order.docstatus, 0)
		self.assertEqual(purchase_order.company, self.company_a)
		self.assertEqual(purchase_order.supplier, self.supplier_a)
		self.assertEqual(purchase_order.items[0].item_code, self.item_a)
		self.assertEqual(purchase_order.items[0].rate, 310)
		self.assertEqual(request.linked_supplier_offer, offer.name)
		self.assertEqual(request.linked_purchase_order, purchase_order.name)
		self.assertRaises(frappe.ValidationError, offer.accept_offer)

	def test_failed_purchase_order_insert_leaves_offer_request_consistent(self):
		offer = self.send_offer()
		request = frappe.get_doc("Marketplace Quotation Request", offer.quotation_request)
		before_count = frappe.db.count("Purchase Order", {"company": self.company_a, "supplier": self.supplier_a})
		original_get_doc = offer_controller.frappe.get_doc

		class FailingPurchaseOrder:
			name = None

			def insert(self, *args, **kwargs):
				frappe.throw("Simulated Purchase Order insert failure")

		def failing_get_doc(*args, **kwargs):
			if args and isinstance(args[0], dict) and args[0].get("doctype") == "Purchase Order":
				return FailingPurchaseOrder()
			return original_get_doc(*args, **kwargs)

		frappe.set_user(self.clinic_user_a)
		try:
			offer_controller.frappe.get_doc = failing_get_doc
			self.assertRaises(frappe.ValidationError, offer.accept_offer)
		finally:
			offer_controller.frappe.get_doc = original_get_doc

		offer.reload()
		request.reload()
		after_count = frappe.db.count("Purchase Order", {"company": self.company_a, "supplier": self.supplier_a})
		self.assertEqual(offer.status, "Sent")
		self.assertFalse(offer.purchase_order)
		self.assertFalse(request.linked_purchase_order)
		self.assertEqual(after_count, before_count)

	def test_clinic_rejects_offer_without_purchase_order(self):
		offer = self.send_offer()
		frappe.set_user(self.clinic_user_a)
		offer.reject_offer()
		offer.reload()

		self.assertEqual(offer.status, "Rejected")
		self.assertFalse(offer.purchase_order)
		self.assertRaises(frappe.ValidationError, offer.reject_offer)

	def test_supplier_cannot_accept_or_reject_offer(self):
		offer = self.send_offer()
		frappe.set_user(self.supplier_user_a)

		self.assertRaises(frappe.PermissionError, offer.accept_offer)
		self.assertRaises(frappe.PermissionError, offer.reject_offer)
