# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

import frappe
from erpnext.selling.doctype.customer.customer import Customer


class CustomerController(Customer):
	"""Patient controller override — coherent patient format on every module.

	Identity fields on the Customer doctype:
	- salutation      : Mr / Mme / Mlle / Enf (Link → Salutation)
	- first_name      : prénom (editable, source of the full name)
	- last_name       : nom (editable, source of the full name)
	- customer_name   : the patient ID, derived as "first_name last_name"
	  with a " - 2" / " - 3" suffix for homonyms.
	- mobile_no       : copied into the auto-created primary Contact
	- nss / npi       : N° de sécurité sociale / N° de pièce d'identité

	The full name is derived from prénom + nom at creation. Editing prénom /
	nom on an existing patient renames the Customer (and every linked
	Address, Contact, Noah Session...) so the ID stays coherent.
	"""

	# Identity fields are fetched from the primary Contact by ERPNext (the
	# field metadata carries fetch_from=customer_primary_contact.<field>).
	# The patient form edits them directly on the Customer, so that fetch must
	# not clobber the values — otherwise edits are silently discarded before
	# validate() even runs. The fetch_from is cleared for the duration of the
	# link validation (self.meta is the shared cached Meta instance).
	IDENTITY_FIELDS = ("first_name", "last_name", "mobile_no", "email_id")

	def before_insert(self):
		# Runs before autoname (set_new_name), so get_customer_name() sees the
		# derived full name and dedupes homonyms (PostgreSQL-safe).
		# Respect an explicitly provided customer_name (e.g. created from a
		# Contact/Lead where the mapper already set it).
		if not frappe.flags.get("in_import"):
			full_name = self._full_name()
			if full_name and not (self.customer_name or "").strip():
				self.customer_name = full_name

	def _validate_links(self):
		meta = self.meta
		fetched = {}
		for fname in self.IDENTITY_FIELDS:
			df = meta.get_field(fname)
			if df and df.fetch_from:
				fetched[fname] = df.fetch_from
				df.fetch_from = None
		try:
			return super()._validate_links()
		finally:
			for fname, value in fetched.items():
				meta.get_field(fname).fetch_from = value

	def get_customer_name(self):
		# PostgreSQL-safe dedup of homonyms: the ERPNext upstream version uses
		# MySQL-only syntax (SUBSTRING_INDEX / AS UNSIGNED) which crashes on PG.
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

	def validate(self):
		super().validate()
		if self.is_new() or frappe.flags.get("odyio_renaming"):
			return

		# Only derive/rename when prénom/nom actually changed (a no-op save
		# must not rename a customer whose name was explicitly set).
		saved = frappe.db.get_value(
			"Customer", self.name, ["first_name", "last_name", "mobile_no", "email_id"], as_dict=True
		) or {}
		changed = (
			(self.first_name or "").strip() != (saved.get("first_name") or "").strip()
			or (self.last_name or "").strip() != (saved.get("last_name") or "").strip()
		)
		if changed:
			full_name = self._full_name()
			if full_name and full_name != self.customer_name:
				self.customer_name = self._unique_name(full_name)
				self._odyio_rename_to = self.customer_name

		# Keep the auto-created primary Contact coherent when the patient
		# identity is edited on the Customer form.
		if any(
			(self.get(f) or "") != (saved.get(f) or "")
			for f in self.IDENTITY_FIELDS
		):
			self._sync_primary_contact()

	def on_update(self):
		super().on_update()
		rename_to = getattr(self, "_odyio_rename_to", None)
		if (
			rename_to
			and rename_to != self.name
			and not frappe.flags.get("odyio_renaming")
			and frappe.db.exists("Customer", self.name)
		):
			frappe.flags.odyio_renaming = True
			try:
				frappe.rename_doc(
					"Customer",
					self.name,
					rename_to,
					force=True,
					show_alert=False,
				)
				self.name = rename_to
			finally:
				frappe.flags.odyio_renaming = False

	def _full_name(self):
		parts = [
			str(getattr(self, "first_name", "") or "").strip(),
			str(getattr(self, "last_name", "") or "").strip(),
		]
		parts = [p for p in parts if p]
		return " ".join(parts) if parts else None

	def _unique_name(self, base):
		if base == self.name or not frappe.db.get_value("Customer", base):
			return base
		n = 2
		while frappe.db.exists("Customer", f"{base} - {n}") and f"{base} - {n}" != self.name:
			n += 1
		return f"{base} - {n}"

	def _sync_primary_contact(self):
		contact_name = self.get("customer_primary_contact")
		if not contact_name or not frappe.db.exists("Contact", contact_name):
			return
		contact = frappe.get_doc("Contact", contact_name)
		mapping = {
			"first_name": "first_name",
			"last_name": "last_name",
			"mobile_no": "mobile_no",
			"email_id": "email_id",
		}
		updated = False
		for fname, cfield in mapping.items():
			value = self.get(fname)
			if (contact.get(cfield) or "") != (value or ""):
				contact.set(cfield, value)
				updated = True
		if updated:
			contact.save(ignore_permissions=True)
