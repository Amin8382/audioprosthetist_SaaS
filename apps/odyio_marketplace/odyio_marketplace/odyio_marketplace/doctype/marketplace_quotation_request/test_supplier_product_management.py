import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.api import (
	can_access_marketplace_page,
	create_supplier_product,
	get_catalog_items,
	get_supplier_product,
	get_supplier_products,
	remove_supplier_product_image,
	set_supplier_product_availability,
	update_supplier_product,
	upload_supplier_product_image,
)
from odyio_marketplace.setup.install import install_marketplace_foundation


test_ignore = ["Item", "Supplier", "UOM"]


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + (b"\x00" * 64)
WEBP_BYTES = b"RIFF" + (b"\x00" * 4) + b"WEBP" + (b"\x00" * 64)


class TestSupplierProductManagement(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		install_marketplace_foundation()
		cls.created = []
		cls.supplier = cls.create_supplier("_Test Product UX Supplier")
		cls.other_supplier = cls.create_supplier("_Test Product UX Other Supplier")
		cls.supplier_user = cls.create_user("marketplace.product.supplier@example.test", "Fournisseur")
		cls.other_supplier_user = cls.create_user("marketplace.product.other.supplier@example.test", "Fournisseur")
		cls.clinic_user = cls.create_user("marketplace.product.clinic@example.test", "Clinic User")
		cls.create_user_permission(cls.supplier_user, "Supplier", cls.supplier)
		cls.create_user_permission(cls.other_supplier_user, "Supplier", cls.other_supplier)
		cls.item_group = cls.get_item_group()
		cls.owned_item = cls.create_marketplace_item("_Test Product UX Owned", cls.supplier, "OWNED-1")
		cls.other_item = cls.create_marketplace_item("_Test Product UX Other", cls.other_supplier, "OTHER-1")

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		for doctype, name in reversed(cls.created):
			if frappe.db.exists(doctype, name):
				doc = frappe.get_doc(doctype, name)
				if getattr(doc, "docstatus", 0) == 1:
					doc.cancel()
				frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
		super().tearDownClass()

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

	@classmethod
	def create_marketplace_item(cls, item_code, supplier, reference, enabled=1, available=1):
		if frappe.db.exists("Item", item_code):
			return item_code
		item = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": item_code,
				"item_name": item_code,
				"item_group": cls.item_group,
				"stock_uom": cls.get_uom(),
				"is_stock_item": 0,
				"marketplace_enabled": enabled,
				"marketplace_available": available,
				"marketplace_supplier": supplier,
				"supplier_reference": reference,
				"standard_rate": 9999,
			}
		).insert(ignore_permissions=True)
		cls.created.append(("Item", item.name))
		return item.name

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

	def create_product_as_supplier(self, reference="SPM-REF"):
		frappe.set_user(self.supplier_user)
		product = create_supplier_product(
			{
				"item_name": f"Supplier Product {reference}",
				"supplier_reference": reference,
				"item_group": self.item_group,
				"description": "Supplier-managed product",
				"technical_specs": "Receiver-in-canal demo specification",
				"ear_side": "LEFT",
				"marketplace_enabled": 1,
				"marketplace_available": 1,
			}
		)
		self.created.append(("Item", product["name"]))
		return product

	def track_file_for_item(self, item):
		for file_name in frappe.get_all(
			"File",
			filters={"attached_to_doctype": "Item", "attached_to_name": item},
			pluck="name",
		):
			if ("File", file_name) not in self.created:
				self.created.append(("File", file_name))

	def test_supplier_my_products_page_and_navigation_are_role_specific(self):
		frappe.set_user(self.supplier_user)
		self.assertTrue(can_access_marketplace_page("supplier-my-products"))

		frappe.set_user(self.clinic_user)
		self.assertRaises(frappe.PermissionError, can_access_marketplace_page, "supplier-my-products")

		workspace = frappe.get_doc("Workspace", "Odyio Marketplace")
		shortcuts = {row.label: row for row in workspace.shortcuts}
		self.assertEqual(shortcuts["My Products"].type, "Page")
		self.assertEqual(shortcuts["My Products"].link_to, "supplier-my-products")

	def test_supplier_product_list_and_details_are_owned_only(self):
		frappe.set_user(self.supplier_user)
		products = get_supplier_products(search="Product UX")

		self.assertIn(self.owned_item, {row["name"] for row in products})
		self.assertNotIn(self.other_item, {row["name"] for row in products})
		self.assertEqual(get_supplier_product(self.owned_item)["supplier"], self.supplier)
		self.assertRaises(frappe.PermissionError, get_supplier_product, self.other_item)

	def test_supplier_product_visibility_and_availability_statuses_are_distinct(self):
		combinations = (
			("EA", 1, 1, "Listed", "Available"),
			("EU", 1, 0, "Listed", "Unavailable"),
			("HA", 0, 1, "Hidden", "Available"),
			("HU", 0, 0, "Hidden", "Unavailable"),
		)
		item_names = []
		for suffix, enabled, available, _visibility, _availability in combinations:
			item_names.append(
				self.create_marketplace_item(
					f"_Test Product UX Status {suffix}",
					self.supplier,
					f"STATUS-{suffix}",
					enabled=enabled,
					available=available,
				)
			)

		frappe.set_user(self.supplier_user)
		for item_name, (_suffix, _enabled, _available, visibility, availability) in zip(item_names, combinations):
			product = get_supplier_product(item_name)
			self.assertEqual(product["visibility_status"]["label"], visibility)
			self.assertEqual(product["availability_status"]["label"], availability)
			self.assertEqual(product["display_status"], visibility)
			self.assertNotEqual(product["visibility_status"]["label"], product["availability_status"]["label"])

	def test_supplier_creates_product_with_server_side_ownership_and_no_public_price(self):
		product = self.create_product_as_supplier("SPM-CREATE")
		item = frappe.get_doc("Item", product["name"])

		self.assertEqual(item.marketplace_supplier, self.supplier)
		self.assertTrue(item.item_code.startswith("ODY-"))
		self.assertEqual(item.standard_rate, 0)
		self.assertNotIn("standard_rate", product)
		self.assertRaises(
			frappe.ValidationError,
			create_supplier_product,
			{
				"item_name": "Illegal Supplier Override",
				"item_group": self.item_group,
				"marketplace_supplier": self.other_supplier,
			},
		)

	def test_supplier_edits_own_product_but_not_protected_or_foreign_fields(self):
		product = self.create_product_as_supplier("SPM-EDIT")
		frappe.set_user(self.supplier_user)

		updated = update_supplier_product(
			product["name"],
			{
				"item_name": "Supplier Edited Product",
				"description": "Updated safely",
				"marketplace_available": 0,
				"marketplace_enabled": 1,
			},
		)

		self.assertEqual(updated["item_name"], "Supplier Edited Product")
		self.assertEqual(updated["marketplace_available"], 0)
		self.assertRaises(frappe.ValidationError, update_supplier_product, product["name"], {"standard_rate": 1})
		self.assertRaises(frappe.ValidationError, update_supplier_product, product["name"], {"item_code": "UNSAFE"})
		self.assertRaises(frappe.PermissionError, update_supplier_product, self.other_item, {"item_name": "Not allowed"})

	def test_supplier_availability_toggle_updates_catalog_visibility(self):
		product = self.create_product_as_supplier("SPM-CATALOG")
		frappe.set_user(self.supplier_user)
		set_supplier_product_availability(product["name"], marketplace_available=0)

		frappe.set_user(self.clinic_user)
		self.assertNotIn(product["name"], {row.name for row in get_catalog_items(search="SPM-CATALOG")})

		frappe.set_user(self.supplier_user)
		set_supplier_product_availability(product["name"], marketplace_available=1)
		frappe.set_user(self.clinic_user)
		catalog = get_catalog_items(search="SPM-CATALOG")
		self.assertIn(product["name"], {row.name for row in catalog})
		self.assertNotIn("standard_rate", catalog[0])

	def test_product_image_upload_replacement_removal_and_failed_upload_preserves_previous_image(self):
		product = self.create_product_as_supplier("SPM-IMAGE")
		frappe.set_user(self.supplier_user)

		with_image = upload_supplier_product_image(product["name"], filename="product.png", content=PNG_BYTES)
		self.track_file_for_item(product["name"])
		first_image = with_image["image"]
		self.assertTrue(first_image)

		replaced = upload_supplier_product_image(product["name"], filename="product.webp", content=WEBP_BYTES)
		self.track_file_for_item(product["name"])
		self.assertTrue(replaced["image"])
		self.assertNotEqual(replaced["image"], first_image)

		self.assertRaises(frappe.ValidationError, upload_supplier_product_image, product["name"], "product.txt", b"not-image")
		self.assertEqual(frappe.db.get_value("Item", product["name"], "image"), replaced["image"])

		removed = remove_supplier_product_image(product["name"])
		self.assertFalse(removed["image"])

	def test_invalid_product_image_type_and_size_are_rejected(self):
		product = self.create_product_as_supplier("SPM-BAD-IMAGE")
		frappe.set_user(self.supplier_user)

		self.assertRaises(frappe.ValidationError, upload_supplier_product_image, product["name"], "product.gif", b"GIF89a")
		self.assertRaises(
			frappe.ValidationError,
			upload_supplier_product_image,
			product["name"],
			"too-large.png",
			b"\x89PNG\r\n\x1a\n" + (b"\x00" * (2 * 1024 * 1024 + 1)),
		)

	def test_duplicate_supplier_reference_is_rejected_within_supplier_namespace(self):
		self.create_product_as_supplier("SPM-DUP")
		frappe.set_user(self.supplier_user)

		self.assertRaises(
			frappe.ValidationError,
			create_supplier_product,
			{"item_name": "Duplicate Product", "item_group": self.item_group, "supplier_reference": "SPM-DUP"},
		)

	def test_raw_item_access_is_read_only_for_supplier_and_admin_retains_access(self):
		frappe.set_user(self.supplier_user)
		self.assertTrue(frappe.get_doc("Item", self.owned_item).has_permission("read"))
		self.assertFalse(frappe.get_doc("Item", self.owned_item).has_permission("write"))
		self.assertFalse(frappe.get_doc("Item", self.owned_item).has_permission("create"))
		self.assertFalse(frappe.get_doc("Item", self.other_item).has_permission("read"))

		frappe.set_user("Administrator")
		self.assertTrue(frappe.get_doc("Item", self.owned_item).has_permission("write"))

	def test_supplier_product_page_script_uses_drawer_file_input_and_no_raw_item_routes(self):
		path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"supplier_my_products",
			"supplier_my_products.js",
		)
		with open(path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("this.ui.drawer()", script)
		self.assertIn('type="file"', script)
		self.assertIn("image/jpeg,image/png,image/webp", script)
		self.assertIn("URL.createObjectURL", script)
		self.assertIn("visibility_status", script)
		self.assertIn("availability_status", script)
		self.assertIn("Listed in marketplace", script)
		self.assertIn('option value="enabled">${__("Listed")}', script)
		self.assertNotIn("standard_rate", script)
		self.assertNotIn("Form\", \"Item", script)
		self.assertNotIn("List\", \"Item", script)
