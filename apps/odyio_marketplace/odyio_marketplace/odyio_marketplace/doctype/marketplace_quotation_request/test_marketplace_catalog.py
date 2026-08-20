import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.api import (
	create_request_from_catalog,
	get_catalog_items,
	get_clinic_catalog_context,
	preview_catalog_request,
)
from odyio_marketplace.setup.install import install_marketplace_foundation


test_ignore = ["Company", "Item", "Marketplace Quotation Request", "Supplier", "UOM"]


class TestMarketplaceCatalog(FrappeTestCase):
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
		cls.company = cls.create_company("_Test Marketplace Catalog Clinic", "TMC")
		cls.other_company = cls.create_company("_Test Marketplace Catalog Other Clinic", "TMO")
		cls.supplier = cls.create_supplier("_Test Marketplace Catalog Supplier")
		cls.other_supplier = cls.create_supplier("_Test Marketplace Catalog Other Supplier")
		cls.item = cls.create_item("_Test Marketplace Catalog Item", cls.supplier, 150)
		cls.second_item = cls.create_item("_Test Marketplace Catalog Second Item", cls.supplier, 175)
		cls.other_supplier_item = cls.create_item(
			"_Test Marketplace Catalog Other Supplier Item", cls.other_supplier, 200
		)
		cls.unavailable_item = cls.create_item(
			"_Test Marketplace Catalog Unavailable Item", cls.supplier, 90, available=0
		)
		cls.clinic_user = cls.create_user("marketplace.catalog.clinic@example.test", "Clinic User")
		cls.other_clinic_user = cls.create_user("marketplace.catalog.other.clinic@example.test", "Clinic User")
		cls.supplier_user = cls.create_user("marketplace.catalog.supplier@example.test", "Fournisseur")
		cls.create_user_permission(cls.clinic_user, "Company", cls.company)
		cls.create_user_permission(cls.other_clinic_user, "Company", cls.other_company)
		cls.create_user_permission(cls.supplier_user, "Supplier", cls.supplier)

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
	def create_item(cls, item_code, supplier, standard_rate, available=1):
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

	def test_catalog_context_resolves_company_from_user_permission(self):
		frappe.set_user(self.clinic_user)

		context = get_clinic_catalog_context()

		self.assertEqual(context["company"], self.company)

	def test_catalog_lists_only_enabled_available_items(self):
		frappe.set_user(self.clinic_user)

		items = get_catalog_items(search="Catalog")
		item_names = {item.name for item in items}

		self.assertIn(self.item, item_names)
		self.assertIn(self.second_item, item_names)
		self.assertNotIn(self.unavailable_item, item_names)
		for item in items:
			self.assertNotIn("standard_rate", item)

	def test_preview_handles_multi_supplier_selection_deliberately(self):
		frappe.set_user(self.clinic_user)

		preview = preview_catalog_request(
			[
				{"item": self.item, "quantity": 1},
				{"item": self.other_supplier_item, "quantity": 1},
			]
		)

		self.assertFalse(preview["can_create_request"])
		self.assertEqual(preview["supplier_count"], 2)
		self.assertNotIn("standard_rate", preview["items"][0])
		self.assertNotIn("amount", preview["items"][0])
		self.assertNotIn("total_amount", preview["suppliers"][0])

	def test_catalog_request_creates_sent_request_without_client_company_or_supplier(self):
		frappe.set_user(self.clinic_user)

		result = create_request_from_catalog(
			[
				{"item": self.item, "quantity": 2},
				{"item": self.second_item, "quantity": 1},
			],
			fulfillment_method="PICKUP",
		)
		self.created.append(("Marketplace Quotation Request", result["quotation_request"]))

		request = frappe.get_doc("Marketplace Quotation Request", result["quotation_request"])
		self.assertEqual(request.clinic, self.company)
		self.assertEqual(request.supplier, self.supplier)
		self.assertEqual(request.status, "Sent")
		self.assertEqual(request.docstatus, 1)
		self.assertEqual(request.total_requested_quantity, 3)
		self.assertEqual(request.fulfillment_method, "PICKUP")
		self.assertFalse(request.delivery_address_line1)

	def test_catalog_request_requires_fulfillment_choice(self):
		frappe.set_user(self.clinic_user)

		self.assertRaises(frappe.ValidationError, create_request_from_catalog, [{"item": self.item, "quantity": 1}])

	def test_delivery_requires_and_stores_request_address_snapshot(self):
		frappe.set_user(self.clinic_user)
		address = {
			"address_line1": "Clinic delivery entrance",
			"address_line2": "Second floor",
			"city": "Tunis",
			"postal_code": "1002",
			"country": "Tunisia",
			"contact_name": "Demo Reception",
			"phone": "+216 71 222 333",
		}

		result = create_request_from_catalog(
			[{"item": self.item, "quantity": 1}],
			fulfillment_method="DELIVERY",
			delivery_address=address,
		)
		self.created.append(("Marketplace Quotation Request", result["quotation_request"]))
		request = frappe.get_doc("Marketplace Quotation Request", result["quotation_request"])

		self.assertEqual(request.fulfillment_method, "DELIVERY")
		self.assertEqual(request.delivery_address_line1, "Clinic delivery entrance")
		self.assertEqual(request.delivery_city, "Tunis")
		self.assertEqual(request.delivery_country, "Tunisia")
		self.assertEqual(result["fulfillment"]["delivery_address"]["formatted"].split("\n")[0], "Clinic delivery entrance")

	def test_delivery_rejects_missing_address_snapshot(self):
		frappe.set_user(self.clinic_user)

		self.assertRaises(
			frappe.ValidationError,
			create_request_from_catalog,
			[{"item": self.item, "quantity": 1}],
			fulfillment_method="DELIVERY",
			delivery_address={},
		)

	def test_catalog_request_rejects_mixed_supplier_items(self):
		frappe.set_user(self.clinic_user)

		self.assertRaises(
			frappe.ValidationError,
			create_request_from_catalog,
			[
				{"item": self.item, "quantity": 1},
				{"item": self.other_supplier_item, "quantity": 1},
			],
		)

	def test_catalog_request_rejects_unavailable_item(self):
		frappe.set_user(self.clinic_user)

		self.assertRaises(
			frappe.ValidationError,
			create_request_from_catalog,
			[{"item": self.unavailable_item, "quantity": 1}],
		)

	def test_catalog_request_rejects_duplicate_item(self):
		frappe.set_user(self.clinic_user)

		self.assertRaises(
			frappe.ValidationError,
			create_request_from_catalog,
			[
				{"item": self.item, "quantity": 1},
				{"item": self.item, "quantity": 2},
			],
		)

	def test_supplier_user_cannot_use_clinic_catalog_api(self):
		frappe.set_user(self.supplier_user)

		self.assertRaises(frappe.PermissionError, get_catalog_items)

	def test_other_clinic_request_uses_other_clinic_company(self):
		frappe.set_user(self.other_clinic_user)

		result = create_request_from_catalog([{"item": self.item, "quantity": 1}], fulfillment_method="PICKUP")
		self.created.append(("Marketplace Quotation Request", result["quotation_request"]))

		request = frappe.get_doc("Marketplace Quotation Request", result["quotation_request"])
		self.assertEqual(request.clinic, self.other_company)
		self.assertNotEqual(request.clinic, self.company)
