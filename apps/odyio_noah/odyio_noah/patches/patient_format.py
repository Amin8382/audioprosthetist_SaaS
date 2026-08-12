# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe


def execute():
	"""Coherent patient format: identity fields, civility, CNAM/NPI, search."""
	from odyio_noah.install import setup_patient_format

	setup_patient_format()
