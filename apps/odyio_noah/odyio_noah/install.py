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
# customer_controller.py. cnam / npi are new custom fields; the rest are
# standard Customer fields unlocked (Property Setter) with French labels.

PATIENT_FORMAT_CUSTOM_FIELDS = {
	"Customer": [
		{
			"fieldname": "cnam",
			"label": "N° CNAM",
			"fieldtype": "Data",
			"insert_after": "last_name",
		},
		{
			"fieldname": "npi",
			"label": "N° de pièce d'identité",
			"fieldtype": "Data",
			"insert_after": "cnam",
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

# Minimal patient address form: only Address Line 1 + City + State/Province
# remain visible; everything else is hidden (with safe defaults).
PATIENT_ADDRESS_FIELDS = [
	# (fieldname, property, value)
	("address_title", "hidden", 1),
	("address_type", "hidden", 1),
	("address_type", "default", "Permanent"),
	("address_line2", "hidden", 1),
	("address_line3", "hidden", 1),
	("county", "hidden", 1),
	("zip_code", "hidden", 1),
	("country", "hidden", 1),
	("country", "default", "Tunisia"),
	("email_id", "hidden", 1),
	("fax", "hidden", 1),
	("phone", "hidden", 1),
	("is_primary_address", "hidden", 1),
	("is_primary_address", "default", 1),
	("is_shipping_address", "hidden", 1),
	("display", "hidden", 1),
]


def after_install():
	create_noah_custom_fields()
	setup_patient_format()


def create_noah_custom_fields():
	"""Create custom fields on Customer. Idempotent (patches/install)."""
	create_custom_fields(NOAH_CUSTOM_FIELDS)


def setup_patient_format():
	"""Idempotent: patient identity fields, salutations, labels, search.

	- creates the cnam / npi custom fields
	- creates the civility Salutations Mr / Mme / Mlle / Enf
	- unlocks first_name / last_name / mobile_no / email_id and applies French
	  labels (Property Setters on standard Customer fields)
	- hides the address fields the patient form does not need (only Address
	  Line 1 + City + State/Province stay visible)
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
	_setup_address_form()

	for fieldname, prop, value in PATIENT_PROPERTY_SETTERS:
		_make_property_setter("Customer", fieldname, prop, value)

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


def _make_property_setter(doctype, fieldname, prop, value):
	frappe.make_property_setter(
		{
			"doctype_or_field": "DocField",
			"doctype": doctype,
			"fieldname": fieldname,
			"property": prop,
			"value": value,
			"property_type": "Data",
		},
		validate_fields_for_doctype=False,
	)


def _setup_address_form():
	"""Idempotent: keep only Address Line 1 + City + State/Province visible
	on the patient address form (the rest is hidden with safe defaults)."""
	for fieldname, prop, value in PATIENT_ADDRESS_FIELDS:
		_make_property_setter("Address", fieldname, prop, value)


def migrate_patient_cnam():
	"""Migrate the older nss (N° de sécurité sociale) field to cnam (N° CNAM).

	The first patient-format version created a nss custom field; the field is
	replaced by cnam. Any existing values are copied over, the nss field and
	column are dropped, then the full patient format is re-applied
	(idempotent)."""
	setup_patient_format()

	if frappe.db.exists("Custom Field", {"fieldname": "nss", "dt": "Customer"}):
		if frappe.db.has_column("Customer", "cnam") and frappe.db.has_column("Customer", "nss"):
			frappe.db.sql(
				"update `tabCustomer` set cnam = nss where nss is not null and nss != ''"
			)
		frappe.delete_doc("Custom Field", "Customer-nss", ignore_permissions=True, force=True)
		frappe.db.sql("alter table `tabCustomer` drop column if exists nss")
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
