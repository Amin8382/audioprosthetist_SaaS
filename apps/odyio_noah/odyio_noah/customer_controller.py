# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe
from erpnext.selling.doctype.customer.customer import Customer


class CustomerController(Customer):
	"""Customer controller override.

	The patient ID on every module is the patient's full name (first name +
	last name combined). This subclass makes `get_customer_name` PostgreSQL-safe:
	the ERPNext upstream version dedupes duplicates with MySQL-only syntax
	(SUBSTRING_INDEX / AS UNSIGNED) which crashes on PostgreSQL.
	"""

	def get_customer_name(self):
		self.customer_name = self.customer_name.strip()
		if (
			not frappe.flags.in_import
			and frappe.db.get_value("Customer", self.customer_name)
		):
			n = 2
			while frappe.db.exists("Customer", f"{self.customer_name} - {n}"):
				n += 1
			return f"{self.customer_name} - {n}"
		return self.customer_name
