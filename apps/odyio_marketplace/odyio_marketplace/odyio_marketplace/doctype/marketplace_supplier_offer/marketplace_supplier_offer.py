import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, now_datetime, today

from odyio_marketplace.permissions import _allowed_values


OFFER_STATUSES = {"Draft", "Sent", "Accepted", "Rejected", "Cancelled"}


class MarketplaceSupplierOffer(Document):
	def validate(self):
		self.set_default_status()
		self.load_request_context()
		self.validate_supplier_actor_permission()
		self.validate_status_state()
		self.validate_single_offer()
		self.validate_and_price_items()
		self.set_summary_fields()

	def before_submit(self):
		if self.status != "Draft":
			frappe.throw(_("Only Draft supplier offers can be sent."))

		self.validate_complete_offer_pricing()
		self.status = "Sent"
		self.sent_at = now_datetime()

	def on_submit(self):
		self.link_to_request()
		self.notify_clinic_owner()

	def before_cancel(self):
		if self.status not in {"Draft", "Sent"}:
			frappe.throw(_("Only Draft or Sent supplier offers can be cancelled."))

	def on_cancel(self):
		self.db_set("status", "Cancelled", update_modified=False)
		request_values = frappe.db.get_value(
			"Marketplace Quotation Request",
			self.quotation_request,
			("linked_supplier_offer", "linked_purchase_order"),
			as_dict=True,
		)
		if request_values and request_values.linked_supplier_offer == self.name and not request_values.linked_purchase_order:
			frappe.db.set_value(
				"Marketplace Quotation Request",
				self.quotation_request,
				"linked_supplier_offer",
				"",
				update_modified=False,
			)

	@frappe.whitelist()
	def send_offer(self):
		self.check_permission("submit")

		if self.docstatus != 0 or self.status != "Draft":
			frappe.throw(_("Only Draft supplier offers can be sent."))

		self.submit()
		return self

	@frappe.whitelist()
	def accept_offer(self):
		self.check_permission("write")
		self.validate_clinic_decision_actor()

		if self.docstatus != 1 or self.status != "Sent":
			frappe.throw(_("Only Sent supplier offers can be accepted."))

		purchase_order = self.create_purchase_order()
		self.db_set("status", "Accepted", update_modified=False)
		self.db_set("accepted_at", now_datetime(), update_modified=False)
		self.db_set("purchase_order", purchase_order.name, update_modified=False)
		frappe.db.set_value(
			"Marketplace Quotation Request",
			self.quotation_request,
			{
				"linked_supplier_offer": self.name,
				"linked_purchase_order": purchase_order.name,
			},
			update_modified=False,
		)
		return self

	@frappe.whitelist()
	def reject_offer(self):
		self.check_permission("write")
		self.validate_clinic_decision_actor()

		if self.docstatus != 1 or self.status != "Sent":
			frappe.throw(_("Only Sent supplier offers can be rejected."))

		self.db_set("status", "Rejected", update_modified=False)
		self.db_set("rejected_at", now_datetime(), update_modified=False)
		frappe.db.set_value(
			"Marketplace Quotation Request",
			self.quotation_request,
			"linked_supplier_offer",
			self.name,
			update_modified=False,
		)
		return self

	def set_default_status(self):
		if not self.status:
			self.status = "Draft"

	def load_request_context(self):
		if not self.quotation_request:
			return

		request = frappe.get_doc("Marketplace Quotation Request", self.quotation_request)
		if request.docstatus != 1 or request.status != "Sent":
			frappe.throw(_("Supplier offers can only be created for Sent quotation requests."))

		self.clinic = request.clinic
		self.supplier = request.supplier

		if not self.items:
			for request_item in request.items:
				self.append(
					"items",
					{
						"item": request_item.item,
						"quantity": request_item.quantity,
						"line_notes": request_item.line_notes,
					},
				)

	def validate_supplier_actor_permission(self):
		if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles(frappe.session.user):
			return

		if "Fournisseur" not in frappe.get_roles(frappe.session.user):
			return

		allowed_suppliers = _allowed_values(frappe.session.user, "Supplier", self.doctype)
		if allowed_suppliers and self.supplier not in allowed_suppliers:
			frappe.throw(_("You are not allowed to create supplier offers for supplier {0}.").format(self.supplier))

	def validate_clinic_decision_actor(self):
		if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles(frappe.session.user):
			return

		if "Clinic User" not in frappe.get_roles(frappe.session.user):
			frappe.throw(_("Only the requesting clinic can accept or reject supplier offers."), frappe.PermissionError)

		allowed_companies = _allowed_values(frappe.session.user, "Company", self.doctype) or _allowed_values(
			frappe.session.user, "Company"
		)
		if self.clinic not in allowed_companies:
			frappe.throw(_("Only the requesting clinic can accept or reject this supplier offer."), frappe.PermissionError)

	def validate_status_state(self):
		if self.status not in OFFER_STATUSES:
			frappe.throw(_("Invalid marketplace supplier offer status: {0}").format(self.status))

		is_submit_action = getattr(self, "_action", None) == "submit"
		if self.docstatus == 0 and self.status == "Sent":
			frappe.throw(_("Use the Send action to send a supplier offer."))

		if self.docstatus == 1 and self.status != "Sent" and not (is_submit_action and self.status == "Draft"):
			current_status = frappe.db.get_value(self.doctype, self.name, "status") if not self.is_new() else None
			if current_status not in {"Accepted", "Rejected"}:
				frappe.throw(_("Submitted supplier offers must be accepted or rejected through explicit actions."))

	def validate_single_offer(self):
		if not self.quotation_request:
			return

		existing = frappe.db.get_value(
			self.doctype,
			{
				"quotation_request": self.quotation_request,
				"name": ["!=", self.name or ""],
				"docstatus": ["<", 2],
			},
			"name",
		)
		if existing:
			frappe.throw(_("Quotation request {0} already has supplier offer {1}.").format(self.quotation_request, existing))

	def validate_and_price_items(self):
		if not self.items:
			frappe.throw(_("A supplier offer requires at least one item."))

		request_items = {
			row.item: row
			for row in frappe.get_doc("Marketplace Quotation Request", self.quotation_request).items
		}
		if len(request_items) != len(self.items):
			frappe.throw(_("Supplier offer lines must match the quotation request lines."))

		for row in self.items:
			if row.item not in request_items:
				frappe.throw(_("Item {0} is not part of quotation request {1}.").format(row.item, self.quotation_request))

			request_item = request_items[row.item]
			item = frappe.db.get_value(
				"Item",
				row.item,
				("item_name", "supplier_reference", "stock_uom", "marketplace_supplier"),
				as_dict=True,
			)
			if not item:
				frappe.throw(_("Item {0} does not exist.").format(row.item))

			if item.marketplace_supplier != self.supplier:
				frappe.throw(_("Item {0} does not belong to supplier {1}.").format(row.item, self.supplier))

			row.quantity = request_item.quantity
			row.item_name_snapshot = request_item.item_name_snapshot or item.item_name
			row.supplier_reference_snapshot = request_item.supplier_reference_snapshot or item.supplier_reference
			row.uom = item.stock_uom
			row.fixed_rate = flt(row.fixed_rate)
			row.amount = flt(row.quantity) * flt(row.fixed_rate)

	def validate_complete_offer_pricing(self):
		for row in self.items or []:
			if flt(row.fixed_rate) <= 0:
				frappe.throw(_("Enter a supplier offer rate for item {0} before submitting.").format(row.item))

	def set_summary_fields(self):
		self.item_count = len(self.items or [])
		self.total_quantity = sum(flt(row.quantity) for row in self.items or [])
		self.total_amount = sum(flt(row.amount) for row in self.items or [])

	def link_to_request(self):
		frappe.db.set_value(
			"Marketplace Quotation Request",
			self.quotation_request,
			"linked_supplier_offer",
			self.name,
			update_modified=False,
		)

	def create_purchase_order(self):
		if self.purchase_order:
			return frappe.get_doc("Purchase Order", self.purchase_order)

		request = frappe.get_doc("Marketplace Quotation Request", self.quotation_request)
		if request.linked_purchase_order:
			return frappe.get_doc("Purchase Order", request.linked_purchase_order)

		schedule_date = request.requested_delivery_date or today()
		company_currency = frappe.db.get_value("Company", self.clinic, "default_currency") or frappe.defaults.get_global_default("currency")
		current_user = frappe.session.user
		try:
			frappe.set_user("Administrator")
			purchase_order = frappe.get_doc(
				{
					"doctype": "Purchase Order",
					"company": self.clinic,
					"supplier": self.supplier,
					"transaction_date": today(),
					"schedule_date": schedule_date,
					"currency": company_currency,
					"conversion_rate": 1,
					"price_list_currency": company_currency,
					"plc_conversion_rate": 1,
					"items": [
						{
							"item_code": row.item,
							"item_name": row.item_name_snapshot,
							"description": row.item_name_snapshot or row.item,
							"schedule_date": schedule_date,
							"qty": row.quantity,
							"uom": row.uom,
							"stock_uom": row.uom,
							"conversion_factor": 1,
							"rate": row.fixed_rate,
						}
						for row in self.items
					],
				}
			)
			purchase_order.insert(ignore_permissions=True)
			return purchase_order
		finally:
			frappe.set_user(current_user)

	def notify_clinic_owner(self):
		request_owner = frappe.db.get_value("Marketplace Quotation Request", self.quotation_request, "owner")
		if not request_owner:
			return

		frappe.get_doc(
			{
				"doctype": "Notification Log",
				"type": "Alert",
				"for_user": request_owner,
				"subject": _("Marketplace supplier offer {0}").format(self.name),
				"email_content": _("A supplier sent a priced marketplace offer for your quotation request."),
				"document_type": self.doctype,
				"document_name": self.name,
			}
		).insert(ignore_permissions=True)
