import frappe
from frappe.utils import cint


READ_PERMISSIONS = {"read", "select", "print", "email", "export", "report"}


def marketplace_quotation_request_query_conditions(user=None):
	user = user or frappe.session.user
	if _is_unrestricted(user):
		return ""

	conditions = []
	if _has_role(user, "Clinic User"):
		conditions.append(f"{_column('Marketplace Quotation Request', 'owner')} = {frappe.db.escape(user)}")

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
		if permission_type == "create":
			return True
		if permission_type in {"read", "write", "select", "print", "report"}:
			return doc.get("marketplace_supplier") in _allowed_values(user, "Supplier", "Item")
		return False

	return None


def _clinic_request_permission(doc, user, permission_type):
	if not _has_role(user, "Clinic User") or doc.owner != user:
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
	table = f"tab{doctype}"
	if frappe.db.db_type == "postgres":
		return f'"{table}"."{fieldname}"'
	return f"`{table}`.`{fieldname}`"


def _sql_list(values):
	return ", ".join(frappe.db.escape(value) for value in values)
