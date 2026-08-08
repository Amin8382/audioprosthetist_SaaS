# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe


def execute():
	"""Create Noah-related custom fields on Customer."""
	from odyio_noah.install import create_noah_custom_fields

	create_noah_custom_fields()
