import frappe
from frappe.tests.utils import FrappeTestCase

from odyio_marketplace.api import (
	accept_supplier_offer_for_clinic,
	create_supplier_offer_from_request,
	get_clinic_marketplace_context,
	get_clinic_my_requests,
	get_clinic_offer_details,
	get_clinic_purchase_order_details,
	get_clinic_request_details,
	reject_supplier_offer_for_clinic,
	submit_supplier_offer,
)
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


class TestClinicMarketplaceUX(FrappeTestCase):
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
				if doc.docstatus == 1 and doc.status in {"Accepted", "Rejected"}:
					doc.db_set("status", "Sent", update_modified=False)
					doc.reload()

			if doc.docstatus == 1:
				doc.cancel()

			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)

		super().tearDownClass()

	@classmethod
	def prepare_master_data(cls):
		cls.company_a = cls.create_company("_Test Clinic UX Company A", "TCX")
		cls.company_b = cls.create_company("_Test Clinic UX Company B", "TCY")
		cls.supplier_a = cls.create_supplier("_Test Clinic UX Supplier A")
		cls.supplier_b = cls.create_supplier("_Test Clinic UX Supplier B")
		cls.item_a = cls.create_item("_Test Clinic UX Item A", cls.supplier_a, 150)
		cls.item_b = cls.create_item("_Test Clinic UX Item B", cls.supplier_a, 175)
		cls.supplier_b_item = cls.create_item("_Test Clinic UX Supplier B Item", cls.supplier_b, 225)
		cls.clinic_user_a = cls.create_user("marketplace.clinic.ux.a@example.test", "Clinic User")
		cls.clinic_user_b = cls.create_user("marketplace.clinic.ux.b@example.test", "Clinic User")
		cls.supplier_user_a = cls.create_user("marketplace.clinic.ux.supplier.a@example.test", "Fournisseur")
		cls.supplier_user_b = cls.create_user("marketplace.clinic.ux.supplier.b@example.test", "Fournisseur")
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

	def make_request(self, company=None, supplier=None, items=None, submit=True):
		company = company or self.company_a
		supplier = supplier or self.supplier_a
		frappe.set_user(self.clinic_user_b if company == self.company_b else self.clinic_user_a)
		request = frappe.get_doc(
			{
				"doctype": "Marketplace Quotation Request",
				"clinic": company,
				"supplier": supplier,
				"fulfillment_method": "PICKUP",
				"items": items
				or [
					{"item": self.item_a, "quantity": 2},
					{"item": self.item_b, "quantity": 1},
				],
			}
		).insert()
		self.created.append(("Marketplace Quotation Request", request.name))
		if submit:
			request.send_request()
			request.reload()
		return request

	def make_offer(self, request=None, submit=True):
		request = request or self.make_request()
		frappe.set_user(self.supplier_user_b if request.supplier == self.supplier_b else self.supplier_user_a)
		offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", offer["name"]))
		if submit:
			offer = submit_supplier_offer(offer["name"], self.offer_rates(request))
		return frappe.get_doc("Marketplace Supplier Offer", offer["name"])

	def offer_rates(self, request, first_rate=210, second_rate=235, other_rate=260):
		rates = []
		for row in request.items:
			if row.item == self.item_a:
				rate = first_rate
			elif row.item == self.item_b:
				rate = second_rate
			else:
				rate = other_rate
			rates.append({"item": row.item, "fixed_rate": rate})
		return rates

	def test_clinic_context_resolves_correct_company(self):
		frappe.set_user(self.clinic_user_a)

		context = get_clinic_marketplace_context()

		self.assertEqual(context["company"], self.company_a)

	def test_clinic_sees_only_own_requests(self):
		own_request = self.make_request()
		other_request = self.make_request(
			company=self.company_b,
			supplier=self.supplier_b,
			items=[{"item": self.supplier_b_item, "quantity": 1}],
		)
		frappe.set_user(self.clinic_user_a)

		requests = get_clinic_my_requests()

		self.assertIn(own_request.name, {row["name"] for row in requests})
		self.assertNotIn(other_request.name, {row["name"] for row in requests})

	def test_supplier_cannot_use_clinic_tracking_apis(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user_a)

		self.assertRaises(frappe.PermissionError, get_clinic_marketplace_context)
		self.assertRaises(frappe.PermissionError, get_clinic_my_requests)
		self.assertRaises(frappe.PermissionError, get_clinic_request_details, request.name)

	def test_my_requests_filters_offer_and_decision_state(self):
		waiting_request = self.make_request()
		offered_request = self.make_request()
		offer = self.make_offer(offered_request)
		frappe.set_user(self.clinic_user_a)

		with_offer = {row["name"] for row in get_clinic_my_requests(offer_state="with_offer")}
		without_offer = {row["name"] for row in get_clinic_my_requests(offer_state="without_offer")}
		awaiting_decision = {row["name"] for row in get_clinic_my_requests(decision_state="awaiting_decision")}

		self.assertIn(offered_request.name, with_offer)
		self.assertNotIn(waiting_request.name, with_offer)
		self.assertIn(waiting_request.name, without_offer)
		self.assertIn(offered_request.name, awaiting_decision)
		self.assertEqual(offer.status, "Sent")

	def test_clinic_cannot_access_another_clinic_request_details(self):
		other_request = self.make_request(
			company=self.company_b,
			supplier=self.supplier_b,
			items=[{"item": self.supplier_b_item, "quantity": 1}],
		)
		frappe.set_user(self.clinic_user_a)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": other_request.name}))
		self.assertRaises(frappe.PermissionError, get_clinic_request_details, other_request.name)

	def test_request_details_return_authorized_data_only(self):
		request = self.make_request()
		frappe.set_user(self.clinic_user_a)

		details = get_clinic_request_details(request.name)

		self.assertEqual(details["company"], self.company_a)
		self.assertEqual(details["supplier"], self.supplier_a)
		self.assertEqual(details["item_count"], 2)
		self.assertNotIn("total_amount", details)
		self.assertNotIn("fixed_rate", details["items"][0])
		self.assertFalse(details["actions"]["can_accept_offer"])

	def test_clinic_sees_only_offers_for_own_requests(self):
		own_offer = self.make_offer()
		other_request = self.make_request(
			company=self.company_b,
			supplier=self.supplier_b,
			items=[{"item": self.supplier_b_item, "quantity": 1}],
		)
		other_offer = self.make_offer(other_request)
		frappe.set_user(self.clinic_user_a)

		own_details = get_clinic_offer_details(own_offer.name)

		self.assertEqual(own_details["name"], own_offer.name)
		self.assertRaises(frappe.PermissionError, get_clinic_offer_details, other_offer.name)

	def test_supplier_cannot_call_clinic_decision_apis(self):
		offer = self.make_offer()
		frappe.set_user(self.supplier_user_a)

		self.assertRaises(frappe.PermissionError, accept_supplier_offer_for_clinic, offer.name)
		self.assertRaises(frappe.PermissionError, reject_supplier_offer_for_clinic, offer.name)

	def test_clinic_cannot_decide_another_clinic_offer(self):
		request = self.make_request(
			company=self.company_b,
			supplier=self.supplier_b,
			items=[{"item": self.supplier_b_item, "quantity": 1}],
		)
		offer = self.make_offer(request)
		frappe.set_user(self.clinic_user_a)

		self.assertRaises(frappe.PermissionError, accept_supplier_offer_for_clinic, offer.name)
		self.assertRaises(frappe.PermissionError, reject_supplier_offer_for_clinic, offer.name)

	def test_eligible_offer_acceptance_creates_draft_purchase_order(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = frappe.get_doc("Purchase Order", result["purchase_order"]["name"])
		self.created.append(("Purchase Order", purchase_order.name))

		self.assertEqual(result["offer"]["status"], "Accepted")
		self.assertEqual(purchase_order.docstatus, 0)

	def test_purchase_order_company_supplier_items_rates_and_links(self):
		request = self.make_request()
		offer = self.make_offer(request)
		frappe.set_user(self.clinic_user_a)

		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = frappe.get_doc("Purchase Order", result["purchase_order"]["name"])
		request.reload()
		offer.reload()
		self.created.append(("Purchase Order", purchase_order.name))

		self.assertEqual(purchase_order.company, self.company_a)
		self.assertEqual(purchase_order.supplier, self.supplier_a)
		self.assertEqual([row.item_code for row in purchase_order.items], [self.item_a, self.item_b])
		self.assertEqual([row.qty for row in purchase_order.items], [2, 1])
		self.assertEqual([row.rate for row in purchase_order.items], [210, 235])
		self.assertEqual(request.linked_purchase_order, purchase_order.name)
		self.assertEqual(request.linked_supplier_offer, offer.name)
		self.assertEqual(offer.purchase_order, purchase_order.name)

	def test_repeated_acceptance_creates_no_duplicate_purchase_order(self):
		offer = self.make_offer()
		before_count = frappe.db.count("Purchase Order", {"company": self.company_a, "supplier": self.supplier_a})
		frappe.set_user(self.clinic_user_a)

		result = accept_supplier_offer_for_clinic(offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))
		after_first_count = frappe.db.count("Purchase Order", {"company": self.company_a, "supplier": self.supplier_a})

		self.assertRaises(frappe.ValidationError, accept_supplier_offer_for_clinic, offer.name)
		after_second_count = frappe.db.count("Purchase Order", {"company": self.company_a, "supplier": self.supplier_a})

		self.assertEqual(after_first_count, before_count + 1)
		self.assertEqual(after_second_count, after_first_count)

	def test_rejection_creates_no_purchase_order(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		result = reject_supplier_offer_for_clinic(offer.name)
		offer.reload()

		self.assertEqual(result["offer"]["status"], "Rejected")
		self.assertFalse(offer.purchase_order)
		self.assertFalse(frappe.db.get_value("Marketplace Quotation Request", offer.quotation_request, "linked_purchase_order"))

	def test_rejected_offer_cannot_later_be_accepted(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		reject_supplier_offer_for_clinic(offer.name)

		self.assertRaises(frappe.ValidationError, accept_supplier_offer_for_clinic, offer.name)

	def test_repeated_rejection_is_rejected(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		reject_supplier_offer_for_clinic(offer.name)

		self.assertRaises(frappe.ValidationError, reject_supplier_offer_for_clinic, offer.name)

	def test_accepted_offer_cannot_later_be_rejected(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)

		result = accept_supplier_offer_for_clinic(offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))

		self.assertRaises(frappe.ValidationError, reject_supplier_offer_for_clinic, offer.name)

	def test_clinic_purchase_order_details_are_permission_safe(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)
		result = accept_supplier_offer_for_clinic(offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))

		details = get_clinic_purchase_order_details(result["purchase_order"]["name"])

		self.assertEqual(details["company"], self.company_a)
		self.assertEqual(details["supplier"], self.supplier_a)
		self.assertEqual(details["supplier_offer"], offer.name)
		self.assertEqual(details["items"][0]["rate"], 210)

	def test_another_clinic_cannot_access_purchase_order(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = result["purchase_order"]["name"]
		self.created.append(("Purchase Order", purchase_order))
		frappe.set_user(self.clinic_user_b)

		self.assertFalse(frappe.get_list("Purchase Order", filters={"name": purchase_order}))
		self.assertRaises(frappe.PermissionError, get_clinic_purchase_order_details, purchase_order)

	def test_direct_document_and_list_permission_isolation(self):
		request = self.make_request()
		offer = self.make_offer(request)
		frappe.set_user(self.clinic_user_a)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = result["purchase_order"]["name"]
		self.created.append(("Purchase Order", purchase_order))
		frappe.set_user(self.clinic_user_b)

		self.assertFalse(frappe.get_list("Marketplace Quotation Request", filters={"name": request.name}))
		self.assertFalse(frappe.get_list("Marketplace Supplier Offer", filters={"name": offer.name}))
		self.assertFalse(frappe.get_list("Purchase Order", filters={"name": purchase_order}))
		self.assertRaises(frappe.PermissionError, frappe.get_doc(request.doctype, request.name).check_permission, "read")
		self.assertRaises(frappe.PermissionError, frappe.get_doc(offer.doctype, offer.name).check_permission, "read")
		self.assertRaises(frappe.PermissionError, frappe.get_doc("Purchase Order", purchase_order).check_permission, "read")

	def test_state_dependent_actions_are_returned_correctly(self):
		request = self.make_request()
		frappe.set_user(self.clinic_user_a)

		waiting = get_clinic_request_details(request.name)
		self.assertFalse(waiting["actions"]["can_view_offer"])
		self.assertIn("Waiting", waiting["actions"]["state_label"])

		offer = self.make_offer(request)
		frappe.set_user(self.clinic_user_a)
		awaiting_decision = get_clinic_request_details(request.name)

		self.assertTrue(awaiting_decision["actions"]["can_view_offer"])
		self.assertTrue(awaiting_decision["actions"]["can_accept_offer"])
		self.assertTrue(awaiting_decision["actions"]["can_reject_offer"])

		result = accept_supplier_offer_for_clinic(offer.name)
		self.created.append(("Purchase Order", result["purchase_order"]["name"]))
		accepted = get_clinic_request_details(request.name)

		self.assertFalse(accepted["actions"]["can_accept_offer"])
		self.assertFalse(accepted["actions"]["can_reject_offer"])
		self.assertTrue(accepted["actions"]["can_view_purchase_order"])

	def test_invalid_or_stale_transitions_are_rejected(self):
		request = self.make_request()
		frappe.set_user(self.supplier_user_a)
		draft_offer = create_supplier_offer_from_request(request.name)
		self.created.append(("Marketplace Supplier Offer", draft_offer["name"]))
		frappe.set_user(self.clinic_user_a)

		self.assertRaises(frappe.PermissionError, get_clinic_offer_details, draft_offer["name"])
		self.assertRaises(frappe.PermissionError, accept_supplier_offer_for_clinic, draft_offer["name"])
		self.assertRaises(frappe.PermissionError, reject_supplier_offer_for_clinic, draft_offer["name"])

	def test_rest_api_access_respects_clinic_purchase_order_permissions(self):
		offer = self.make_offer()
		frappe.set_user(self.clinic_user_a)
		result = accept_supplier_offer_for_clinic(offer.name)
		purchase_order = result["purchase_order"]["name"]
		self.created.append(("Purchase Order", purchase_order))
		client_get = frappe.get_attr("frappe.client.get")

		self.assertEqual(client_get(doctype="Purchase Order", name=purchase_order).name, purchase_order)

		frappe.set_user(self.clinic_user_b)
		self.assertRaises(frappe.PermissionError, client_get, doctype="Purchase Order", name=purchase_order)
