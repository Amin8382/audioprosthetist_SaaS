# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

"""Whitelisted API endpoints for Noah Mobile integration.

Endpoints:
- odyio_noah.api.test_noah_connection
- odyio_noah.api.sync_from_noah
- odyio_noah.api.push_to_noah
"""

import json

import frappe
from frappe.utils import now_datetime

from .noah_mobile_client import NoahMobileClient


def _set_customer_status(customer, status):
	customer.noah_sync_status = status
	customer.noah_last_sync = now_datetime()
	customer.save(ignore_permissions=True)


def _to_dict(value):
	"""JSON custom fields return parsed dicts on PostgreSQL, strings elsewhere."""
	if value is None:
		return {}
	if isinstance(value, str):
		try:
			return json.loads(value) or {}
		except ValueError:
			return {}
	return value


def _sync_contact_info(customer, phone, email):
	"""Update Customer contact fields.

	On ERPNext, `mobile_no`/`email_id` are read-only fields fetched from the
	primary Contact, so we update the Contact when present and force-write the
	Customer columns so the sync value is visible immediately.
	"""
	if getattr(customer, "customer_primary_contact", None):
		contact = frappe.get_doc("Contact", customer.customer_primary_contact)
		if phone is not None:
			contact.mobile_no = phone
			if not any((r.phone or "").strip() == phone for r in contact.phone_nos):
				has_primary = any(r.is_primary_mobile_no for r in contact.phone_nos)
				contact.append(
					"phone_nos", {"phone": phone, "is_primary_mobile_no": 0 if has_primary else 1}
				)
		if email is not None:
			contact.email_id = email
			if not any((r.email_id or "").strip() == email for r in contact.email_ids):
				has_primary = any(r.is_primary for r in contact.email_ids)
				contact.append("email_ids", {"email_id": email, "is_primary": 0 if has_primary else 1})
		contact.save(ignore_permissions=True)

	if phone is not None:
		frappe.db.set_value("Customer", customer.name, "mobile_no", phone)
	if email is not None:
		frappe.db.set_value("Customer", customer.name, "email_id", email)


# ─── PULL FROM NOAH ─────────────────────────────────────────


@frappe.whitelist()
def sync_from_noah(customer_name):
	"""Pull patient data (demographics, audiogram, sessions) from Noah Mobile."""
	customer = frappe.get_doc("Customer", customer_name)

	if not customer.noah_patient_id:
		frappe.throw("Ce patient n'est pas lié à Noah.")

	client = NoahMobileClient()

	noah_patient = client.get_patient(customer.noah_patient_id)
	if noah_patient is None:
		frappe.throw("Impossible de récupérer les données Noah. Vérifiez la connexion.")

	# Update customer basic info (the controller derives customer_name and
	# renames the patient if prénom/nom changed).
	customer.first_name = noah_patient.get("firstName") or ""
	customer.last_name = noah_patient.get("lastName") or ""
	customer.dob = noah_patient.get("dateOfBirth")
	phone, email = noah_patient.get("phone"), noah_patient.get("email")

	# Audiogram
	audiogram = client.get_audiogram(customer.noah_patient_id)
	if audiogram:
		if audiogram.get("left"):
			customer.audiogram_left = audiogram["left"]
		if audiogram.get("right"):
			customer.audiogram_right = audiogram["right"]

		left_exists = bool(audiogram.get("left"))
		right_exists = bool(audiogram.get("right"))
		if left_exists and right_exists:
			customer.ear_side = "BILATERAL"
		elif left_exists:
			customer.ear_side = "LEFT"
		elif right_exists:
			customer.ear_side = "RIGHT"
		else:
			customer.ear_side = "NA"

	# Sessions
	sessions = client.get_sessions(customer.noah_patient_id)
	imported = 0
	for session_data in sessions:
		if _import_session(customer.name, session_data):
			imported += 1

	_set_customer_status(customer, "SYNCED")

	# Contact info must be force-written after the customer save (the fields
	# are read-only fetches from the primary Contact, and db_set() would
	# otherwise bump `modified` and trip the save's latest-check).
	_sync_contact_info(customer, phone, email)

	return {
		"status": "success",
		"message": "Synchronisation réussie",
		"patient": noah_patient,
		"sessions_count": len(sessions),
		"new_sessions_imported": imported,
	}


def _import_session(customer_name, session_data):
	"""Create a Noah Session if it does not already exist. Returns True if created."""
	session_id = session_data.get("id")
	if not session_id:
		return False

	existing = frappe.db.get_value(
		"Noah Session", {"noah_session_id": session_id}, "name"
	)
	if existing:
		return False

	session = frappe.new_doc("Noah Session")
	session.patient = customer_name
	session.noah_session_id = session_id
	session.session_date = session_data.get("date")
	session.session_type = session_data.get("type", "FITTING")

	device = session_data.get("device", {}) or {}
	session.device_brand = device.get("manufacturer", "")
	session.device_model = device.get("model", "")
	session.device_serial = device.get("serialNumber", "")

	session.audiogram_data = _to_dict(session_data.get("audiogram"))
	session.fitting_data = _to_dict(session_data.get("fitting"))
	session.synced_at = now_datetime()

	session.insert(ignore_permissions=True)
	return True


# ─── PUSH TO NOAH ───────────────────────────────────────────


@frappe.whitelist()
def push_to_noah(customer_name):
	"""Push patient demographics + audiogram to Noah Mobile."""
	customer = frappe.get_doc("Customer", customer_name)
	client = NoahMobileClient()

	try:
		if not customer.noah_patient_id:
			result = client.create_patient(customer)
			if not result or not result.get("id"):
				frappe.throw("Échec de la création du patient dans Noah.")
			customer.noah_patient_id = result.get("id")

		if client.update_patient(customer.noah_patient_id, customer) is None:
			raise Exception("Échec de la mise à jour du patient dans Noah.")

		if customer.audiogram_left or customer.audiogram_right:
			audiogram_data = {
				"left": _to_dict(customer.audiogram_left),
				"right": _to_dict(customer.audiogram_right),
				"date": now_datetime().date().isoformat(),
			}
			if client.create_audiogram(customer.noah_patient_id, audiogram_data) is None:
				raise Exception("Échec de l'envoi de l'audiogramme à Noah.")

		_set_customer_status(customer, "SYNCED")
		return {
			"status": "success",
			"message": "Push réussi",
			"noah_id": customer.noah_patient_id,
		}
	except Exception as e:
		_set_customer_status(customer, "SYNC_ERROR")
		frappe.log_error("Push to Noah failed: {}".format(str(e)), "Noah Push Error")
		return {"status": "error", "message": str(e)}


# ─── TEST CONNECTION ────────────────────────────────────────


@frappe.whitelist()
def test_noah_connection():
	"""Test connection to Noah Mobile and store the result on Noah Settings."""
	client = NoahMobileClient()
	try:
		result = client.search_patients("test")
		if result is not None:
			message = "Connecté à Noah Mobile ({})".format(client.base_url)
			status = "success"
		else:
			message = "Impossible de se connecter à Noah Mobile"
			status = "error"
	except Exception as e:
		message = str(e)
		status = "error"

	try:
		settings = frappe.get_single("Noah Settings")
		settings.last_connection_test = "{} — {}".format(now_datetime(), message)
		settings.save(ignore_permissions=True)
	except Exception:
		pass

	return {"status": status, "message": message}
