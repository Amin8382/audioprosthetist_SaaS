# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe


def execute():
	"""Replace the nss field by the cnam (N° CNAM) field and slim the address
	form down to Address Line 1 + City + State/Province."""
	from odyio_noah.install import migrate_patient_cnam

	migrate_patient_cnam()
