import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate


DEVIS_TEMPLATES = {"classic", "modern", "compact"}


class MarketplaceDevisSnapshot(Document):
	def validate(self):
		self.validate_template()
		self.validate_offer()
		self.set_defaults()

	def validate_template(self):
		if self.template not in DEVIS_TEMPLATES:
			frappe.throw(_("Choose a valid Devis template."))

	def validate_offer(self):
		if not self.supplier_offer:
			frappe.throw(_("Supplier Offer is required."))

		offer = frappe.get_doc("Marketplace Supplier Offer", self.supplier_offer)
		if offer.docstatus != 1 or offer.status not in {"Sent", "Accepted", "Rejected"}:
			frappe.throw(_("A Devis can only be confirmed for a submitted or accepted supplier offer."))
		if self.is_new() and offer.status == "Rejected":
			frappe.throw(_("A rejected supplier offer can only show an already confirmed historical Devis."))

		self.quotation_request = offer.quotation_request
		self.supplier = offer.supplier
		self.clinic = offer.clinic

		existing = frappe.db.get_value(
			self.doctype,
			{
				"supplier_offer": self.supplier_offer,
				"name": ["!=", self.name or ""],
				"docstatus": ["<", 2],
			},
			"name",
		)
		if existing:
			frappe.throw(_("Supplier offer {0} already has Devis snapshot {1}.").format(self.supplier_offer, existing))

	def set_defaults(self):
		if not self.issue_date:
			self.issue_date = nowdate()
