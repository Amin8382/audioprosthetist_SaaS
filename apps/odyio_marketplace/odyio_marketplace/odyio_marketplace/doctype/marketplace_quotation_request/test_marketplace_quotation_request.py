import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.setup.install import install_marketplace_foundation


class TestMarketplaceQuotationRequest(FrappeTestCase):
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
		cls.company_a = cls.create_company("_Test Marketplace Clinic A", "TMA")
		cls.company_b = cls.create_company("_Test Marketplace Clinic B", "TMB")
		cls.supplier_a = cls.create_supplier("_Test Marketplace Supplier A")
		cls.supplier_b = cls.create_supplier("_Test Marketplace Supplier B")
		cls.item_a = cls.create_item("_Test Marketplace Item A", cls.supplier_a, available=1)
		cls.item_b = cls.create_item("_Test Marketplace Item B", cls.supplier_b, available=1)
		cls.unavailable_item = cls.create_item("_Test Marketplace Item Unavailable", cls.supplier_a, available=0)
		cls.clinic_user_a = cls.create_user("marketplace.clinic.a@example.test", "Clinic User")
		cls.clinic_user_b = cls.create_user("marketplace.clinic.b@example.test", "Clinic User")
		cls.supplier_user_a = cls.create_user("marketplace.supplier.a@example.test", "Fournisseur")
		cls.supplier_user_b = cls.create_user("marketplace.supplier.b@example.test", "Fournisseur")
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
	def create_item(cls, item_code, supplier, available=1):
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
				"marketplace_available": available,
				"marketplace_supplier": supplier,
				"supplier_reference": f"REF-{item_code[-1]}",
				"standard_rate": 120,
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

	def make_request(self, item=None, supplier=None):
		frappe.set_user(self.clinic_user_a)
		doc = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company_a,
				"supplier": supplier or self.supplier_a,
				"items": [{"item": item or self.item_a, "quantity": 2}],
			}
		)
		doc.insert()
		self.created.append((doc.doctype, doc.name))
		return doc

	def send_request(self):
		doc = self.make_request()
		doc.send_request()
		return frappe.get_doc(doc.doctype, doc.name)

	def test_clinic_creates_draft_request(self):
		doc = self.make_request()

		self.assertEqual(doc.status, "Draft")
		self.assertEqual(doc.docstatus, 0)
		self.assertEqual(doc.item_count, 1)
		self.assertEqual(doc.total_requested_quantity, 2)

	def test_request_requires_at_least_one_line(self):
		frappe.set_user(self.clinic_user_a)
		doc = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company_a,
				"supplier": self.supplier_a,
			}
		)

		self.assertRaises(frappe.ValidationError, doc.insert)

	def test_mixed_supplier_items_are_rejected(self):
		frappe.set_user(self.clinic_user_a)
		doc = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company_a,
				"supplier": self.supplier_a,
				"items": [
					{"item": self.item_a, "quantity": 1},
					{"item": self.item_b, "quantity": 1},
				],
			}
		)

		self.assertRaises(frappe.ValidationError, doc.insert)

	def test_unavailable_item_is_rejected(self):
		frappe.set_user(self.clinic_user_a)
		doc = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": self.company_a,
				"supplier": self.supplier_a,
				"items": [{"item": self.unavailable_item, "quantity": 1}],
			}
		)

		self.assertRaises(frappe.ValidationError, doc.insert)

	def test_draft_request_is_invisible_to_supplier(self):
		doc = self.make_request()
		frappe.set_user(self.supplier_user_a)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": doc.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(doc.doctype, doc.name).check_permission, "read")

	def test_sent_request_is_visible_to_assigned_supplier(self):
		doc = self.send_request()
		frappe.set_user(self.supplier_user_a)

		self.assertTrue(frappe.get_list("Marketplace Quotation Request", filters={"name": doc.name}))
		self.assertTrue(frappe.get_doc(doc.doctype, doc.name).has_permission("read"))

	def test_another_supplier_cannot_access_sent_request(self):
		doc = self.send_request()
		frappe.set_user(self.supplier_user_b)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": doc.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(doc.doctype, doc.name).check_permission, "read")

	def test_another_clinic_cannot_access_request(self):
		doc = self.make_request()
		frappe.set_user(self.clinic_user_b)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": doc.name}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(doc.doctype, doc.name).check_permission, "read")

	def test_only_draft_can_be_sent(self):
		doc = self.send_request()
		frappe.set_user(self.clinic_user_a)

		self.assertRaises(frappe.ValidationError, doc.send_request)

	def test_valid_cancellation_rules_are_enforced(self):
		draft = self.make_request()
		draft.cancel_request()
		draft.reload()
		self.assertEqual(draft.status, "Cancelled")
		self.assertEqual(draft.docstatus, 0)
		self.assertRaises(frappe.ValidationError, draft.cancel_request)

		sent = self.send_request()
		frappe.set_user(self.clinic_user_a)
		sent.cancel_request()
		sent.reload()
		self.assertEqual(sent.status, "Cancelled")
		self.assertEqual(sent.docstatus, 2)
		self.assertRaises(frappe.ValidationError, sent.cancel_request)

