import frappe
from frappe.utils import cint


READ_PERMISSIONS = {"read", "select", "print", "email", "export", "report"}


def marketplace_quotation_request_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	conditions = []
	if _has_role(user, "Clinic User"):
		allowed_companies = _allowed_values(user, "Company", "Marketplace Quotation Request") or _allowed_values(user, "Company")
		if allowed_companies:
			conditions.append(f"{_column('Marketplace Quotation Request', 'clinic')} in ({_sql_list(allowed_companies)})")

	if _has_role(user, "Fournisseur"):
		allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Quotation Request")
		if allowed_suppliers:
			conditions.append(
				f"{_column('Marketplace Quotation Request', 'status')} = {frappe.db.escape('Sent')} "
				f"and {_column('Marketplace Quotation Request', 'supplier')} in ({_sql_list(allowed_suppliers)})"
			)

	return f"({' or '.join(f'({condition})' for condition in conditions)})" if conditions else "1 = 0"


def has_marketplace_quotation_request_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return True

	if permission_type == "create":
		return _has_role(user, "Clinic User")

	if not doc:
		return False

	return _clinic_request_permission(doc, user, permission_type) or _supplier_request_permission(
		doc, user, permission_type
	)


def marketplace_supplier_offer_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	conditions = []
	if _has_role(user, "Fournisseur"):
		allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Supplier Offer")
		if allowed_suppliers:
			conditions.append(f"{_column('Marketplace Supplier Offer', 'supplier')} in ({_sql_list(allowed_suppliers)})")

	if _has_role(user, "Clinic User"):
		allowed_companies = _allowed_values(user, "Company", "Marketplace Supplier Offer") or _allowed_values(user, "Company")
		if not allowed_companies:
			return "1 = 0"
		conditions.append(
			f"{_column('Marketplace Supplier Offer', 'status')} in ({_sql_list({'Sent', 'Accepted', 'Rejected'})}) "
			f"and {_column('Marketplace Supplier Offer', 'clinic')} in ({_sql_list(allowed_companies)})"
		)

	return f"({' or '.join(f'({condition})' for condition in conditions)})" if conditions else "1 = 0"


def has_marketplace_supplier_offer_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return True

	if permission_type == "create":
		return _has_role(user, "Fournisseur")

	if not doc:
		return False

	return _supplier_offer_permission(doc, user, permission_type) or _clinic_offer_permission(
		doc, user, permission_type
	)


def marketplace_devis_snapshot_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	conditions = []
	if _has_role(user, "Fournisseur"):
		allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Devis Snapshot") or _allowed_values(user, "Supplier")
		if allowed_suppliers:
			conditions.append(f"{_column('Marketplace Devis Snapshot', 'supplier')} in ({_sql_list(allowed_suppliers)})")

	if _has_role(user, "Clinic User"):
		allowed_companies = _allowed_values(user, "Company", "Marketplace Devis Snapshot") or _allowed_values(user, "Company")
		if allowed_companies:
			conditions.append(f"{_column('Marketplace Devis Snapshot', 'clinic')} in ({_sql_list(allowed_companies)})")

	return f"({' or '.join(f'({condition})' for condition in conditions)})" if conditions else "1 = 0"


def has_marketplace_devis_snapshot_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return True

	if not doc:
		return False

	if _has_role(user, "Fournisseur"):
		allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Devis Snapshot") or _allowed_values(user, "Supplier")
		if doc.supplier in allowed_suppliers:
			return permission_type in READ_PERMISSIONS or permission_type in {"create", "write"}

	if _has_role(user, "Clinic User"):
		allowed_companies = _allowed_values(user, "Company", "Marketplace Devis Snapshot") or _allowed_values(user, "Company")
		if doc.clinic in allowed_companies:
			return permission_type in READ_PERMISSIONS

	return False


def marketplace_supplier_devis_settings_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	if not _has_role(user, "Fournisseur"):
		return "1 = 0"

	allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Supplier Devis Settings") or _allowed_values(user, "Supplier")
	if not allowed_suppliers:
		return "1 = 0"
	return f"{_column('Marketplace Supplier Devis Settings', 'supplier')} in ({_sql_list(allowed_suppliers)})"


def has_marketplace_supplier_devis_settings_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return True
	if not _has_role(user, "Fournisseur"):
		return False
	if permission_type not in READ_PERMISSIONS and permission_type not in {"create", "write"}:
		return False
	if not doc:
		return True
	allowed_suppliers = _allowed_values(user, "Supplier", "Marketplace Supplier Devis Settings") or _allowed_values(user, "Supplier")
	return doc.supplier in allowed_suppliers


def marketplace_item_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	conditions = []
	has_marketplace_role = False
	if _has_role(user, "Clinic User"):
		has_marketplace_role = True
		conditions.append(
			f"coalesce({_column('Item', 'marketplace_enabled')}, 0) = 1 "
			f"and coalesce({_column('Item', 'marketplace_available')}, 0) = 1"
		)

	if _has_role(user, "Fournisseur"):
		has_marketplace_role = True
		allowed_suppliers = _allowed_values(user, "Supplier", "Item")
		if allowed_suppliers:
			conditions.append(f"{_column('Item', 'marketplace_supplier')} in ({_sql_list(allowed_suppliers)})")

	if conditions:
		return f"({' or '.join(f'({condition})' for condition in conditions)})"

	return "1 = 0" if has_marketplace_role else None


def marketplace_purchase_order_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	if not _has_role(user, "Clinic User"):
		return None

	allowed_companies = _allowed_values(user, "Company", "Purchase Order") or _allowed_values(user, "Company")
	if not allowed_companies:
		return "1 = 0"

	return (
		f"{_column('Purchase Order', 'name')} in ("
		f"select {_column('Marketplace Quotation Request', 'linked_purchase_order')} "
		f"from {_table('Marketplace Quotation Request')} "
		f"where {_column('Marketplace Quotation Request', 'clinic')} in ({_sql_list(allowed_companies)}) "
		f"and {_column('Marketplace Quotation Request', 'linked_purchase_order')} is not null "
		f"and {_column('Marketplace Quotation Request', 'linked_purchase_order')} != ''"
		f")"
	)


def has_marketplace_item_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return None

	if _has_role(user, "Clinic User"):
		if permission_type in {"read", "select", "report"}:
			return cint(doc.get("marketplace_enabled")) and cint(doc.get("marketplace_available"))
		return False

	if _has_role(user, "Fournisseur"):
		if permission_type in {"read", "select", "report"}:
			return doc.get("marketplace_supplier") in _allowed_values(user, "Supplier", "Item")
		return False

	return None


def has_marketplace_purchase_order_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	permission_type = permission_type or "read"

	if _is_unrestricted(user):
		return None

	if not _has_role(user, "Clinic User"):
		return None

	if permission_type not in READ_PERMISSIONS:
		return False

	if not doc:
		return False

	allowed_companies = _allowed_values(user, "Company", "Purchase Order") or _allowed_values(user, "Company")
	if doc.company not in allowed_companies:
		return False

	return bool(
		frappe.db.exists(
			"Marketplace Quotation Request",
			{"clinic": ["in", allowed_companies], "linked_purchase_order": doc.name},
		)
	)


def _clinic_request_permission(doc, user, permission_type):
	if not _has_role(user, "Clinic User"):
		return False

	allowed_companies = _allowed_values(user, "Company", "Marketplace Quotation Request") or _allowed_values(user, "Company")
	if doc.clinic not in allowed_companies:
		return False

	if permission_type in READ_PERMISSIONS:
		return doc.status in {"Draft", "Sent", "Cancelled", "Expired"}

	if permission_type == "write":
		return doc.docstatus == 0 and doc.status == "Draft"

	if permission_type == "submit":
		return doc.docstatus == 0 and doc.status == "Draft"

	if permission_type == "cancel":
		return doc.docstatus in {0, 1} and doc.status in {"Draft", "Sent"}

	if permission_type == "delete":
		return doc.docstatus == 0 and doc.status == "Draft"

	return False


def _supplier_request_permission(doc, user, permission_type):
	if not _has_role(user, "Fournisseur") or permission_type not in READ_PERMISSIONS:
		return False

	return doc.status == "Sent" and doc.supplier in _allowed_values(user, "Supplier", "Marketplace Quotation Request")


def _supplier_offer_permission(doc, user, permission_type):
	if not _has_role(user, "Fournisseur"):
		return False

	if doc.supplier not in _allowed_values(user, "Supplier", "Marketplace Supplier Offer"):
		return False

	if permission_type in READ_PERMISSIONS:
		return True

	if permission_type in {"write", "submit", "delete"}:
		return doc.docstatus == 0 and doc.status == "Draft"

	return False


def _clinic_offer_permission(doc, user, permission_type):
	if not _has_role(user, "Clinic User"):
		return False

	allowed_companies = _allowed_values(user, "Company", "Marketplace Supplier Offer") or _allowed_values(user, "Company")
	if doc.clinic not in allowed_companies:
		return False

	if permission_type in READ_PERMISSIONS:
		return doc.status in {"Sent", "Accepted", "Rejected"}

	if permission_type == "write":
		return doc.docstatus == 1 and doc.status == "Sent"

	return False


def _allowed_values(user, allow, applicable_for=None):
	records = frappe.get_all(
		"User Permission",
		filters={"user": user, "allow": allow},
		fields=["for_value", "applicable_for"],
	)
	return {
		record.for_value
		for record in records
		if record.for_value and (not record.applicable_for or record.applicable_for == applicable_for)
	}


def _has_role(user, role):
	return role in frappe.get_roles(user)


def _is_unrestricted(user):
	return user == "Administrator" or _has_role(user, "System Manager")


def _column(doctype, fieldname):
	if frappe.db.db_type == "postgres":
		return f'{_table(doctype)}."{fieldname}"'
	return f"{_table(doctype)}.`{fieldname}`"


def _table(doctype):
	table = f"tab{doctype}"
	if frappe.db.db_type == "postgres":
		return f'"{table}"'
	return f"`{table}`"


def _sql_list(values):
	return ", ".join(frappe.db.escape(value) for value in values)
