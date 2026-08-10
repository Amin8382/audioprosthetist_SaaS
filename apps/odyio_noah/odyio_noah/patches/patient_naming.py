# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe


def execute():
	"""Make the patient ID = first name + last name, searchable by that combination.

	1. Customers are named by their full name (`cust_master_name = "Customer
	   Name"`), so every module that links to Customer displays a name-based ID.
	   Duplicate full names get a " - 2" / " - 3" suffix (PG-safe, see
	   customer_controller.py).
	2. `customer_name` is added to the Customer `search_fields` so Link fields,
	   list view and global search match a name + last-name combination.
	"""
	frappe.db.set_single_value("Selling Settings", "cust_master_name", "Customer Name")
	frappe.db.set_default("cust_master_name", "Customer Name")

	doctype = frappe.get_doc("DocType", "Customer")
	search_fields = [
		f.strip() for f in (doctype.search_fields or "").split(",") if f.strip()
	]
	for field in ("customer_name", "name"):
		if field not in search_fields:
			search_fields.append(field)
	doctype.search_fields = ", ".join(search_fields)
	doctype.save(ignore_permissions=True)

	frappe.db.commit()
	frappe.clear_cache()
