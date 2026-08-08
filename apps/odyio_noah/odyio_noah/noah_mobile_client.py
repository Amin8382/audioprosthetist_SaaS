# Copyright (c) 2026, Odyio Technologies
# For license information, please see license.txt

"""Client for the Noah Mobile REST API (port 8843, local network)."""

import requests

import frappe


def get_noah_config():
	"""Resolve Noah Mobile connection settings.

	Priority: Noah Settings (Single) DocType, then site_config.json keys
	`noah_mobile_url` / `noah_mobile_api_key`.
	"""
	try:
		settings = frappe.get_single("Noah Settings")
		url = (settings.get("noah_mobile_url") or "").strip() or frappe.conf.get("noah_mobile_url")
		api_key = (settings.get("api_key") or "").strip() or frappe.conf.get("noah_mobile_api_key")
		return url, api_key
	except Exception:
		return frappe.conf.get("noah_mobile_url"), frappe.conf.get("noah_mobile_api_key")


class NoahMobileClient:
	def __init__(self):
		self.base_url, self.api_key = get_noah_config()
		self.base_url = (self.base_url or "http://localhost:8843/noah").rstrip("/")

		if not self.api_key:
			frappe.log_error("Noah Mobile API key not configured", "Noah Integration")

	def _headers(self):
		return {
			"Authorization": "Bearer {}".format(self.api_key or ""),
			"Content-Type": "application/json",
		}

	def _request(self, method, endpoint, **kwargs):
		"""Make an authenticated request to Noah Mobile.

		Returns parsed JSON on success, None on any failure (already logged).
		"""
		url = "{}/{}".format(self.base_url, endpoint.lstrip("/"))
		try:
			response = requests.request(
				method,
				url,
				headers=self._headers(),
				timeout=kwargs.get("timeout", 30),
				json=kwargs.get("json"),
				params=kwargs.get("params"),
			)
			response.raise_for_status()
			return response.json() if response.content else {}
		except requests.exceptions.ConnectionError:
			frappe.log_error(
				"Impossible de se connecter a Noah Mobile a {}".format(self.base_url),
				"Noah Connection",
			)
			return None
		except requests.exceptions.Timeout:
			frappe.log_error("La requete Noah a expire", "Noah Timeout")
			return None
		except requests.exceptions.HTTPError as e:
			if e.response is not None and e.response.status_code == 401:
				frappe.log_error("Cle API Noah invalide", "Noah HTTP Error")
			elif e.response is not None and e.response.status_code == 404:
				frappe.log_error("Ressource non trouvee dans Noah ({})".format(url), "Noah HTTP Error")
			else:
				frappe.log_error("Erreur Noah HTTP: {}".format(str(e)), "Noah HTTP Error")
			return None
		except requests.exceptions.RequestException as e:
			frappe.log_error("Erreur Noah: {}".format(str(e)), "Noah Integration Error")
			return None

	# ─── READ OPERATIONS ───

	def get_patient(self, noah_patient_id):
		"""Get patient from Noah Mobile."""
		return self._request("GET", "patients/{}".format(noah_patient_id))

	def search_patients(self, query):
		"""Search patients by name."""
		return self._request("GET", "patients", params={"search": query})

	def get_audiogram(self, noah_patient_id):
		"""Get latest audiogram."""
		return self._request("GET", "patients/{}/audiogram".format(noah_patient_id))

	def get_sessions(self, noah_patient_id):
		"""Get all fitting sessions."""
		result = self._request("GET", "patients/{}/sessions".format(noah_patient_id))
		return result if isinstance(result, list) else []

	# ─── WRITE OPERATIONS ───

	@staticmethod
	def _split_name(customer_name):
		name = (customer_name or "").strip()
		if not name:
			return "", ""
		parts = name.split()
		return parts[0], " ".join(parts[1:])

	def create_patient(self, customer):
		"""Create patient in Noah."""
		first, last = self._split_name(customer.customer_name)
		payload = {
			"firstName": first,
			"lastName": last,
			"dateOfBirth": str(customer.dob) if customer.dob else None,
			"phone": customer.mobile_no,
			"email": customer.email_id,
		}
		return self._request("POST", "patients", json=payload)

	def update_patient(self, noah_patient_id, customer):
		"""Update patient in Noah."""
		first, last = self._split_name(customer.customer_name)
		payload = {
			"firstName": first,
			"lastName": last,
			"dateOfBirth": str(customer.dob) if customer.dob else None,
			"phone": customer.mobile_no,
			"email": customer.email_id,
		}
		return self._request("PUT", "patients/{}".format(noah_patient_id), json=payload)

	def create_audiogram(self, noah_patient_id, audiogram_data):
		"""Create audiogram in Noah."""
		from frappe.utils import now_datetime

		payload = {
			"left": audiogram_data.get("left", {}),
			"right": audiogram_data.get("right", {}),
			"date": audiogram_data.get("date", now_datetime().date().isoformat()),
		}
		return self._request("POST", "patients/{}/audiogram".format(noah_patient_id), json=payload)
