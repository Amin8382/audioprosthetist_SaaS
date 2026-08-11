# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe


def execute():
	"""Re-run ERPNext install-time custom fields + create a Tunisia Address Template.

	The original site install ran while the Frappe v15 + PostgreSQL
	`link_filters` bug (see RECENT_PROGRESS) was still breaking Custom Field
	creation, so several ERPNext `after_install` custom fields were never
	created (e.g. `Address.is_your_company_address`, missing at first). These
	ERPNext functions are idempotent, and the Address Template is required to
	render addresses (customers with an address failed to save otherwise).
	"""
	from erpnext.setup.install import (
		create_address_and_contact_custom_fields,
		create_custom_company_links,
		create_print_setting_custom_fields,
	)

	create_print_setting_custom_fields()
	create_address_and_contact_custom_fields()
	create_custom_company_links()

	template = (
		"{{ address_line1 }}{% if address_line2 %}<br>{{ address_line2 }}{% endif %}"
		"<br>{{ city }}{% if state %}, {{ state }}{% endif %}"
		"{% if pincode %} {{ pincode }}{% endif %}<br>{{ country }}"
	)
	if frappe.db.exists("Address Template", "Tunisia"):
		frappe.db.set_value(
			"Address Template", "Tunisia", {"is_default": 1, "template": template}
		)
	else:
		frappe.get_doc(
			dict(
				doctype="Address Template",
				country="Tunisia",
				is_default=1,
				template=template,
			)
		).insert()

	frappe.db.commit()
	frappe.clear_cache()
