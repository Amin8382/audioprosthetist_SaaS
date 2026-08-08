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


def after_install():
	create_noah_custom_fields()


def create_noah_custom_fields():
	"""Create custom fields on Customer. Idempotent (patches/install)."""
	create_custom_fields(NOAH_CUSTOM_FIELDS)
