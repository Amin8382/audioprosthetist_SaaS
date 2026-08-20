import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, now_datetime

from odyio_marketplace.permissions import _allowed_values


REQUEST_STATUSES = {"Draft", "Sent", "Cancelled", "Expired"}
FULFILLMENT_METHODS = {"DELIVERY", "PICKUP"}
ITEM_MARKETPLACE_FIELDS = (
	"marketplace_enabled",
	"marketplace_available",
	"marketplace_supplier",
	"supplier_reference",
)


class MarketplaceQuotationRequest(Document):
	def validate(self):
		self.set_default_status()
		self.validate_clinic_actor_permission()
		self.validate_status_state()
		self.validate_fulfillment()
		self.validate_items()
		self.set_summary_fields()

	def before_submit(self):
		if self.status != "Draft":
			frappe.throw(_("Only Draft quotation requests can be sent."))

		self.status = "Sent"
		self.sent_at = now_datetime()

	def on_submit(self):
		self.notify_supplier_users()

	def before_cancel(self):
		if self.status != "Sent":
			frappe.throw(_("Only Sent quotation requests can be cancelled with document cancellation."))

	def on_cancel(self):
		self.db_set("status", "Cancelled", update_modified=False)

	@frappe.whitelist()
	def send_request(self):
		self.check_permission("submit")

		if self.docstatus != 0 or self.status != "Draft":
			frappe.throw(_("Only Draft quotation requests can be sent."))

		self.submit()
		return self

	@frappe.whitelist()
	def cancel_request(self):
		if self.docstatus == 0 and self.status == "Draft":
			self.check_permission("write")
			self.flags.marketplace_cancel_requested = True
			self.status = "Cancelled"
			self.save()
			return self

		if self.docstatus == 1 and self.status == "Sent":
			self.check_permission("cancel")
			self.cancel()
			return self

		frappe.throw(_("Only Draft or Sent quotation requests can be cancelled."))

	def set_default_status(self):
		if not self.status:
			self.status = "Draft"

	def validate_clinic_actor_permission(self):
		if frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles(frappe.session.user):
			return

		if "Clinic User" not in frappe.get_roles(frappe.session.user):
			return

		allowed_companies = _allowed_values(frappe.session.user, "Company", self.doctype)
		if allowed_companies and self.clinic not in allowed_companies:
			frappe.throw(_("You are not allowed to create quotation requests for clinic {0}.").format(self.clinic))

	def validate_status_state(self):
		if self.status not in REQUEST_STATUSES:
			frappe.throw(_("Invalid marketplace quotation request status: {0}").format(self.status))

		is_submit_action = getattr(self, "_action", None) == "submit"
		if self.docstatus == 0 and self.status == "Sent":
			frappe.throw(_("Use the Send action to send a quotation request."))

		if self.status == "Cancelled" and self.docstatus == 0 and not self.flags.marketplace_cancel_requested:
			old_status = frappe.db.get_value(self.doctype, self.name, "status") if not self.is_new() else None
			if old_status != "Cancelled":
				frappe.throw(_("Use the Cancel action to cancel a draft quotation request."))

		if self.docstatus == 1 and self.status != "Sent" and not (is_submit_action and self.status == "Draft"):
			frappe.throw(_("Submitted quotation requests must remain Sent in this sprint."))

	def validate_fulfillment(self):
		if self.fulfillment_method not in FULFILLMENT_METHODS:
			frappe.throw(_("Choose Delivery or Pickup before sending the quotation request."))

		if self.fulfillment_method == "DELIVERY":
			if not (self.delivery_address_line1 and self.delivery_city and self.delivery_country):
				frappe.throw(_("Delivery requests require address line 1, city, and country."))
			return

		for fieldname in (
			"delivery_address_line1",
			"delivery_address_line2",
			"delivery_city",
			"delivery_postal_code",
			"delivery_country",
			"delivery_contact_name",
			"delivery_contact_phone",
		):
			self.set(fieldname, "")

	def validate_items(self):
		if not self.items:
			frappe.throw(_("A quotation request requires at least one item."))

		self.ensure_item_custom_fields_exist()

		for row in self.items:
			if not row.item:
				frappe.throw(_("Row {0}: Item is required.").format(row.idx))

			if flt(row.quantity) <= 0:
				frappe.throw(_("Row {0}: Quantity must be greater than zero.").format(row.idx))

			item = frappe.db.get_value(
				"Item",
				row.item,
				("item_name", "marketplace_enabled", "marketplace_available", "marketplace_supplier", "supplier_reference"),
				as_dict=True,
			)
			if not item:
				frappe.throw(_("Row {0}: Item {1} does not exist.").format(row.idx, row.item))

			if not cint(item.marketplace_enabled):
				frappe.throw(_("Row {0}: Item {1} is not marketplace-enabled.").format(row.idx, row.item))

			if not cint(item.marketplace_available):
				frappe.throw(_("Row {0}: Item {1} is not marketplace-available.").format(row.idx, row.item))

			if item.marketplace_supplier != self.supplier:
				frappe.throw(
					_("Row {0}: Item {1} belongs to supplier {2}, not {3}.").format(
						row.idx,
						row.item,
						item.marketplace_supplier or _("no supplier"),
						self.supplier,
					)
				)

			row.item_name_snapshot = item.item_name
			row.supplier_reference_snapshot = item.supplier_reference

	def ensure_item_custom_fields_exist(self):
		item_meta = frappe.get_meta("Item")
		missing_fields = [fieldname for fieldname in ITEM_MARKETPLACE_FIELDS if not item_meta.has_field(fieldname)]
		if missing_fields:
			frappe.throw(
				_("Marketplace Item custom fields are missing: {0}. Run migrate for odyio_marketplace.").format(
					", ".join(missing_fields)
				)
			)

	def set_summary_fields(self):
		self.item_count = len(self.items or [])
		self.total_requested_quantity = sum(flt(row.quantity) for row in self.items or [])

	def notify_supplier_users(self):
		for user in get_supplier_users(self.supplier):
			frappe.get_doc(
				{
					"doctype": "Notification Log",
					"type": "Alert",
					"for_user": user,
					"subject": _("Marketplace quotation request {0}").format(self.name),
					"email_content": _("A clinic sent a marketplace quotation request assigned to your supplier."),
					"document_type": self.doctype,
					"document_name": self.name,
				}
			).insert(ignore_permissions=True)


def get_supplier_users(supplier):
	users_with_role = frappe.get_all(
		"Has Role",
		filters={"role": "Fournisseur", "parenttype": "User"},
		pluck="parent",
	)
	users = []
	for user in users_with_role:
		if not frappe.db.get_value("User", user, "enabled"):
			continue
		if supplier in _allowed_values(user, "Supplier", "Marketplace Quotation Request"):
			users.append(user)

	return users
