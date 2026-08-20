import frappe
from frappe import _
from frappe.model.document import Document


class MarketplaceSupplierDevisSettings(Document):
	def validate(self):
		if self.default_template not in {"classic", "modern", "compact"}:
			frappe.throw(_("Choose a valid default Devis template."))
