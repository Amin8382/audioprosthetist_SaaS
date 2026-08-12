# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


NOAH_CUSTOM_FIELDS = {
	"Customer": [
		{
			"fieldname": "noah_patient_id",
			"label": "Noah Patient ID",
			"fieldtype": "Data",
			"read_only": 1,
			"insert_after": "customer_name",
		},
		{
			"fieldname": "noah_sync_status",
			"label": "Noah Sync Status",
			"fieldtype": "Select",
			"options": "SYNCED\nOUT_OF_SYNC\nNEVER_SYNCED\nSYNC_ERROR",
			"default": "NEVER_SYNCED",
			"insert_after": "noah_patient_id",
		},
		{
			"fieldname": "noah_last_sync",
			"label": "Last Sync",
			"fieldtype": "Datetime",
			"read_only": 1,
			"insert_after": "noah_sync_status",
		},
		{
			"fieldname": "audiogram_left",
			"label": "Audiogram Left",
			"fieldtype": "JSON",
			"insert_after": "noah_last_sync",
		},
		{
			"fieldname": "audiogram_right",
			"label": "Audiogram Right",
			"fieldtype": "JSON",
			"insert_after": "audiogram_left",
		},
		{
			"fieldname": "ear_side",
			"label": "Ear Side",
			"fieldtype": "Select",
			"options": "LEFT\nRIGHT\nBILATERAL\nNA",
			"default": "NA",
			"insert_after": "audiogram_right",
		},
		{
			"fieldname": "dob",
			"label": "Date de naissance",
			"fieldtype": "Date",
			"insert_after": "ear_side",
		},
	]
}

# ─── Coherent patient format ─────────────────────────────────
# Identity fields on the Customer doctype, as documented in
# customer_controller.py. nss / npi are new custom fields; the rest are
# standard Customer fields unlocked (Property Setter) with French labels.

PATIENT_FORMAT_CUSTOM_FIELDS = {
	"Customer": [
		{
			"fieldname": "nss",
			"label": "N° de sécurité sociale",
			"fieldtype": "Data",
			"insert_after": "last_name",
		},
		{
			"fieldname": "npi",
			"label": "N° de pièce d'identité",
			"fieldtype": "Data",
			"insert_after": "nss",
		},
	]
}

PATIENT_SALUTATIONS = ["Mr", "Mme", "Mlle", "Enf"]

PATIENT_PROPERTY_SETTERS = [
	# (fieldname, property, value)
	("salutation", "label", "Civilité"),
	("customer_name", "label", "Nom complet (ID patient)"),
	("first_name", "label", "Prénom"),
	("first_name", "fieldtype", "Data"),
	("last_name", "label", "Nom"),
	("last_name", "fieldtype", "Data"),
	("mobile_no", "label", "Mobile"),
	("mobile_no", "fieldtype", "Data"),
	("email_id", "label", "E-mail"),
	("email_id", "fieldtype", "Data"),
]


def after_install():
	create_noah_custom_fields()
	setup_patient_format()


def create_noah_custom_fields():
	"""Create custom fields on Customer. Idempotent (patches/install)."""
	create_custom_fields(NOAH_CUSTOM_FIELDS)


def setup_patient_format():
	"""Idempotent: patient identity fields, salutations, labels, search.

	- creates the nss / npi custom fields
	- creates the civility Salutations Mr / Mme / Mlle / Enf
	- unlocks first_name / last_name / mobile_no / email_id and applies French
	  labels (Property Setters on standard Customer fields)
	- adds first_name / last_name to the Customer search_fields so patients
	  are found by prénom, nom or the full combination
	"""
	create_custom_fields(PATIENT_FORMAT_CUSTOM_FIELDS)

	for name in PATIENT_SALUTATIONS:
		if not frappe.db.exists("Salutation", name):
			salutation = frappe.new_doc("Salutation")
			salutation.salutation = name
			salutation.insert(ignore_permissions=True)

	_seed_patient_defaults()

	for fieldname, prop, value in PATIENT_PROPERTY_SETTERS:
		frappe.make_property_setter(
			{
				"doctype_or_field": "DocField",
				"doctype": "Customer",
				"fieldname": fieldname,
				"property": prop,
				"value": value,
				"property_type": "Data",
			},
			validate_fields_for_doctype=False,
		)

	doctype = frappe.get_doc("DocType", "Customer")
	search_fields = [
		f.strip() for f in (doctype.search_fields or "").split(",") if f.strip()
	]
	changed = False
	for field in ("first_name", "last_name"):
		if field not in search_fields:
			search_fields.append(field)
			changed = True
	if changed:
		doctype.search_fields = ", ".join(search_fields)
		doctype.save(ignore_permissions=True)

	frappe.db.commit()
	frappe.clear_cache()


def _seed_patient_defaults():
	"""Idempotent: restore the ERPNext default Customer Groups / Territories.

	The setup wizard never completed during install, so the standard
	Customer Group / Territory trees (which every Customer requires) are
	missing. Re-creates the standard roots + the Individual group and points
	the Selling Settings / global defaults at them.
	"""
	def _ensure_node(doctype, name, parent=None, is_group=0):
		if frappe.db.exists(doctype, name):
			return
		field_map = {
			"Customer Group": ("customer_group_name", "parent_customer_group"),
			"Territory": ("territory_name", "parent_territory"),
		}
		name_field, parent_field = field_map[doctype]
		doc = frappe.get_doc(
			{
				"doctype": doctype,
				name_field: name,
				"is_group": is_group,
				parent_field: parent or "",
			}
		)
		doc.insert(ignore_permissions=True)

	_ensure_node("Territory", "All Territories", is_group=1)
	_ensure_node("Territory", "Tunisia", parent="All Territories")
	_ensure_node("Territory", "Rest Of The World", parent="All Territories")

	_ensure_node("Customer Group", "All Customer Groups", is_group=1)
	_ensure_node("Customer Group", "Individual", parent="All Customer Groups")
	_ensure_node("Customer Group", "Commercial", parent="All Customer Groups")
	_ensure_node("Customer Group", "Government", parent="All Customer Groups")

	frappe.db.set_single_value("Selling Settings", "customer_group", "Individual")
	frappe.db.set_single_value("Selling Settings", "territory", "All Territories")
	frappe.db.set_default("customer_group", "Individual")
	frappe.db.set_default("territory", "All Territories")
