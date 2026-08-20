import os

import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.api import get_catalog_items, get_marketplace_home_context, get_supplier_products
from odyio_marketplace.setup.demo import (
	DEMO_CLINIC_USER,
	DEMO_ITEM_GROUPS,
	DEMO_ITEMS,
	DEMO_SUPPLIER_TWO_USER,
	DEMO_SUPPLIER_USER,
	DEMO_WORKFLOWS,
	reset_and_setup_demo_data,
	reset_demo_data,
	setup_demo_data,
)
from odyio_marketplace.setup.install import install_marketplace_foundation


test_ignore = [
	"Company",
	"File",
	"Item",
	"Item Group",
	"Marketplace Quotation Request",
	"Marketplace Supplier Offer",
	"Purchase Order",
	"Supplier",
	"Supplier Group",
	"UOM",
	"User",
	"User Permission",
	"Warehouse Type",
]


class TestMarketplaceDemoSetup(FrappeTestCase):
	def tearDown(self):
		frappe.set_user("Administrator")

	def test_demo_setup_is_idempotent_and_assigns_local_item_images(self):
		frappe.set_user("Administrator")
		install_marketplace_foundation()
		reset_demo_data()

		first_result = setup_demo_data()
		second_result = setup_demo_data()

		self.assertEqual(first_result, second_result)
		self.assertEqual(len(first_result["items"]), len(DEMO_ITEMS))
		for item_data in DEMO_ITEMS:
			item = frappe.get_doc("Item", item_data["item_code"])
			if item_data.get("image_asset"):
				self.assertTrue(item.image.startswith("/files/"))
				self.assertTrue(self.asset_exists(item.image))
				self.assertTrue(self.bundled_asset_exists(item_data["image_asset"]))

				files = frappe.get_all(
					"File",
					filters={
						"file_url": item.image,
						"attached_to_doctype": "Item",
						"attached_to_name": item.name,
						"attached_to_field": "image",
					},
					pluck="name",
				)
				self.assertEqual(len(files), 1)
			else:
				self.assertFalse(item.image)

	def test_demo_product_mix_has_categories_ear_sides_availability_and_fallbacks(self):
		frappe.set_user("Administrator")
		setup_demo_data()
		items = [frappe.get_doc("Item", item_data["item_code"]) for item_data in DEMO_ITEMS]

		self.assertGreaterEqual(len(items), 10)
		self.assertLessEqual(len(items), 15)
		self.assertTrue(set(DEMO_ITEM_GROUPS).issubset({item.item_group for item in items}))
		self.assertTrue({"LEFT", "RIGHT", "BILATERAL", "NOT_APPLICABLE"}.issubset({item.ear_side for item in items}))
		self.assertTrue(any(item.marketplace_available for item in items))
		self.assertTrue(any(not item.marketplace_available for item in items))
		self.assertTrue(any(item.marketplace_enabled for item in items))
		self.assertTrue(any(not item.marketplace_enabled for item in items))
		self.assertTrue(any(item.image for item in items))
		self.assertTrue(any(not item.image for item in items))

	def test_catalog_api_returns_demo_images_without_prices(self):
		frappe.set_user("Administrator")
		setup_demo_data()
		frappe.set_user(DEMO_CLINIC_USER)

		items = get_catalog_items(search="Odyio Demo Hearing Aid")

		self.assertGreaterEqual(len(items), 2)
		for item in items:
			if item.name not in {row["item_code"] for row in DEMO_ITEMS}:
				continue
			if next(row for row in DEMO_ITEMS if row["item_code"] == item.name).get("image_asset"):
				self.assertTrue(item.image)
				self.assertTrue(self.asset_exists(item.image))
			self.assertNotIn("standard_rate", item)
			self.assertNotIn("marketplace_rate", item)

	def test_demo_workflows_and_dashboard_counts_are_representative(self):
		frappe.set_user("Administrator")
		result = setup_demo_data()
		request_names = set(result["workflows"].values())

		self.assertEqual(len(request_names), len(DEMO_WORKFLOWS))
		offers = frappe.get_all(
			"Marketplace Supplier Offer",
			filters={"quotation_request": ["in", list(request_names)], "docstatus": ["<", 2]},
			fields=["name", "status", "purchase_order"],
		)
		statuses = {offer.status for offer in offers}
		self.assertTrue({"Draft", "Sent", "Accepted", "Rejected"}.issubset(statuses))
		self.assertTrue(any(offer.purchase_order for offer in offers if offer.status == "Accepted"))

		frappe.set_user(DEMO_CLINIC_USER)
		clinic_home = get_marketplace_home_context()["clinic"]["counts"]
		self.assertGreater(clinic_home["awaiting_supplier"], 0)
		self.assertGreater(clinic_home["awaiting_decision"], 0)
		self.assertGreater(clinic_home["accepted"], 0)
		self.assertGreater(clinic_home["purchase_orders"], 0)

		frappe.set_user(DEMO_SUPPLIER_USER)
		supplier_home = get_marketplace_home_context()["supplier"]["counts"]
		self.assertGreater(supplier_home["products"], 0)
		self.assertGreater(supplier_home["needs_offer"], 0)
		self.assertGreater(supplier_home["draft_offers"], 0)
		self.assertGreater(supplier_home["awaiting_decision"], 0)
		self.assertGreater(supplier_home["decided"], 0)

	def test_second_supplier_products_are_isolated(self):
		frappe.set_user("Administrator")
		setup_demo_data()

		frappe.set_user(DEMO_SUPPLIER_USER)
		primary_products = {row["name"] for row in get_supplier_products()}
		frappe.set_user(DEMO_SUPPLIER_TWO_USER)
		second_products = {row["name"] for row in get_supplier_products()}

		self.assertTrue(primary_products)
		self.assertTrue(second_products)
		self.assertFalse(primary_products.intersection(second_products))
		self.assertIn("ODY-DEMO-SUP2-RIC", second_products)

	def test_demo_reset_and_reseed_are_scoped_and_reproducible(self):
		frappe.set_user("Administrator")
		setup_demo_data()

		reset_result = reset_demo_data()
		self.assertTrue(reset_result["reset"])
		self.assertFalse(frappe.db.exists("Item", "ODY-DEMO-HA-LEFT"))
		self.assertFalse(frappe.get_all("Marketplace Quotation Request", filters={"clinic_notes": ["like", "[Odyio Demo]%"]}))

		first = reset_and_setup_demo_data()
		second = setup_demo_data()
		self.assertEqual(first, second)
		self.assertTrue(all(not item.startswith(("_Test", "_T-")) for item in first["items"]))

	def test_catalogue_page_script_has_image_and_fallback_ui_without_prices(self):
		page_path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"marketplace_catalogue",
			"marketplace_catalogue.js",
		)
		with open(page_path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("odyio-product-image", script)
		self.assertIn("odyio-detail-image", script)
		self.assertIn("attach_image_fallback", script)
		self.assertNotIn("standard_rate", script)

	def test_supplier_product_page_has_custom_accessible_upload_component(self):
		page_path = frappe.get_app_path(
			"odyio_marketplace",
			"odyio_marketplace",
			"page",
			"supplier_my_products",
			"supplier_my_products.js",
		)
		with open(page_path, encoding="utf-8") as handle:
			script = handle.read()

		self.assertIn("odyio-upload-card", script)
		self.assertIn("odyio-product-image-input sr-only", script)
		self.assertIn('type="file"', script)
		self.assertIn('accept="image/jpeg,image/png,image/webp"', script)
		self.assertIn("Choose product image", script)
		self.assertIn("Maximum 2 MB", script)
		self.assertIn("aria-label", script)
		self.assertIn("dragover", script)
		self.assertIn("drop", script)
		self.assertIn("$input.val(\"\")", script)
		self.assertIn("odyio-selected-file", script)
		self.assertIn("odyio-upload-pending", script)
		self.assertIn("odyio-upload-error", script)
		self.assertIn("Remove Image", script)
		self.assertNotIn("standard_rate", script)

	def asset_exists(self, file_url):
		if file_url.startswith("/files/"):
			return os.path.exists(frappe.get_site_path("public", file_url.lstrip("/")))
		if file_url.startswith("/assets/odyio_marketplace/images/demo-products/"):
			return self.bundled_asset_exists(file_url.rsplit("/", 1)[-1])
		return False

	def bundled_asset_exists(self, image_filename):
		image_path = frappe.get_app_path("odyio_marketplace", "public", "images", "demo-products", image_filename)
		return os.path.exists(image_path)
