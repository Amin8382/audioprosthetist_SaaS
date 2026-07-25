import frappe
from frappe.model.document import Document

class Audiogramme(Document):
    def validate(self):
        self.set_patient_name()

    def before_save(self):
        if not self.created_by:
            self.created_by = frappe.session.user

    def set_patient_name(self):
        if self.patient and not self.patient_name:
            self.patient_name = frappe.db.get_value("Customer", self.patient, "customer_name")
