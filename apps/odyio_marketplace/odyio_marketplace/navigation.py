import frappe
from frappe import _


MARKETPLACE_WORKSPACE = "Odyio Marketplace"
ODYIO_WORKSPACE_LABEL = "Odyio"
CLINIC_SHORTCUTS = {"Home", "Catalogue", "My Requests", "Purchase Orders", "Patients", "Audiograms"}
SUPPLIER_SHORTCUTS = {"Home", "My Products", "Incoming Requests", "My Offers"}
INTERNAL_SHORTCUTS = {
	"Home",
	"Items",
	"Item Groups",
	"Suppliers",
	"ERP Purchase Orders",
	"Warehouses",
	"Companies",
	"Audiograms",
	"Patients",
}
WORKSPACE_NAMES = {MARKETPLACE_WORKSPACE, ODYIO_WORKSPACE_LABEL}
INTERNAL_ROLES = {
	"Accounts Manager",
	"Accounts User",
	"Audiometriste",
	"Item Manager",
	"Purchase Manager",
	"Purchase Master Manager",
	"Purchase User",
	"Stock Manager",
	"Stock User",
}


@frappe.whitelist()
def get_workspace_sidebar_items():
	from frappe.desk.desktop import get_workspace_sidebar_items as get_core_workspace_sidebar_items
	from frappe.desk.desktop import get_desktop_page as get_core_desktop_page

	result = get_core_workspace_sidebar_items()
	user = frappe.session.user
	roles = set(frappe.get_roles(user))
	role_allowed_shortcuts = _allowed_workspace_shortcuts_for_roles(roles, user)
	pages = result.get("pages") or []
	for page in pages:
		if _page_name(page) in WORKSPACE_NAMES:
			visible_shortcuts = _visible_workspace_shortcut_labels(get_core_desktop_page, page)
			allowed_shortcuts = visible_shortcuts
			if role_allowed_shortcuts is not None:
				allowed_shortcuts = visible_shortcuts.intersection(role_allowed_shortcuts)
			_filter_workspace_page_content(page, allowed_shortcuts)

	if user == "Administrator" or "System Manager" in roles or not roles.intersection({"Clinic User", "Fournisseur"}):
		return result

	result["pages"] = [
		page
		for page in pages
		if page.get("name") == MARKETPLACE_WORKSPACE or page.get("title") in WORKSPACE_NAMES
	]
	return result


@frappe.whitelist()
@frappe.read_only()
def get_desktop_page(page):
	from frappe.desk.desktop import get_desktop_page as get_core_desktop_page

	result = get_core_desktop_page(page)
	if _is_unrestricted_user() or _page_name(page) not in {MARKETPLACE_WORKSPACE, ODYIO_WORKSPACE_LABEL}:
		return result

	roles = set(frappe.get_roles(frappe.session.user))
	allowed_shortcuts = _allowed_workspace_shortcuts_for_roles(roles)

	if not allowed_shortcuts:
		result["shortcuts"] = _filter_shortcut_payload(result.get("shortcuts"), set())
		return result

	result["shortcuts"] = _filter_shortcut_payload(result.get("shortcuts"), allowed_shortcuts)
	return result


def get_marketplace_landing_page(user=None):
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	if user == "Administrator" or "System Manager" in roles:
		return None
	if roles.intersection({"Clinic User", "Fournisseur"}):
		return "app/marketplace-home"
	return None


def marketplace_page_access(page_name, user=None):
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	if user == "Administrator" or "System Manager" in roles:
		return True

	clinic_pages = {"marketplace-home", "marketplace-catalogue", "clinic-my-requests", "clinic-purchase-orders"}
	supplier_pages = {"marketplace-home", "supplier-my-products", "supplier-incoming-requests", "supplier-my-offers"}
	if page_name in clinic_pages and "Clinic User" in roles:
		return True
	if page_name in supplier_pages and "Fournisseur" in roles:
		return True
	if page_name == "marketplace-home" and roles.intersection(INTERNAL_ROLES):
		return True

	frappe.throw(_("You are not allowed to access this marketplace page."), frappe.PermissionError)


def _page_name(page):
	page = frappe.parse_json(page) if isinstance(page, str) else page
	return (page or {}).get("name") or (page or {}).get("title") or (page or {}).get("label")


def _filter_shortcut_payload(shortcuts, allowed_labels):
	if not shortcuts:
		return shortcuts
	if isinstance(shortcuts, dict):
		filtered = dict(shortcuts)
		items = shortcuts.get("items") or shortcuts.get("data") or []
		filtered_items = [shortcut for shortcut in items if _shortcut_label(shortcut) in allowed_labels]
		if "items" in shortcuts:
			filtered["items"] = filtered_items
		elif "data" in shortcuts:
			filtered["data"] = filtered_items
		return filtered
	if isinstance(shortcuts, list):
		return [shortcut for shortcut in shortcuts if _shortcut_label(shortcut) in allowed_labels]
	return shortcuts


def _visible_workspace_shortcut_labels(get_core_desktop_page, page):
	try:
		payload = get_core_desktop_page(frappe.as_json(page))
	except Exception:
		return set()

	return {
		_shortcut_label(shortcut)
		for shortcut in _shortcut_payload_items(payload.get("shortcuts"))
		if _shortcut_label(shortcut)
	}


def _shortcut_payload_items(shortcuts):
	if not shortcuts:
		return []
	if isinstance(shortcuts, dict):
		return shortcuts.get("items") or shortcuts.get("data") or []
	if isinstance(shortcuts, list):
		return shortcuts
	return []


def _shortcut_label(shortcut):
	if isinstance(shortcut, dict):
		return shortcut.get("label") or shortcut.get("name") or shortcut.get("shortcut_name")
	return getattr(shortcut, "label", None) or getattr(shortcut, "name", None) or getattr(shortcut, "shortcut_name", None)


def _allowed_workspace_shortcuts_for_roles(roles, user=None):
	user = user or frappe.session.user
	if user == "Administrator" or "System Manager" in roles:
		return None

	allowed_shortcuts = set()
	if "Clinic User" in roles:
		allowed_shortcuts.update(CLINIC_SHORTCUTS)
	if "Fournisseur" in roles:
		allowed_shortcuts.update(SUPPLIER_SHORTCUTS)
	if roles.intersection(INTERNAL_ROLES):
		allowed_shortcuts.update(INTERNAL_SHORTCUTS)
	return allowed_shortcuts


def _filter_workspace_page_content(page, allowed_labels):
	if allowed_labels is None:
		return

	page["content"] = json_dumps(_filter_workspace_content(frappe.parse_json(page.get("content") or "[]"), allowed_labels))


def _filter_workspace_content(content, allowed_labels):
	"""Filter Odyio Workspace EditorJS blocks as complete role-aware sections."""

	filtered = []
	current_header = None
	current_blocks = []

	def flush_section():
		nonlocal current_header, current_blocks
		if current_header and current_blocks:
			filtered.append(current_header)
			filtered.extend(current_blocks)
		elif not current_header:
			filtered.extend(current_blocks)
		current_header = None
		current_blocks = []

	for block in content or []:
		if block.get("type") == "header":
			flush_section()
			current_header = block
			continue

		if block.get("type") == "shortcut":
			shortcut_name = (block.get("data") or {}).get("shortcut_name")
			if shortcut_name in allowed_labels:
				current_blocks.append(block)
			continue

		current_blocks.append(block)

	flush_section()
	return filtered


def json_dumps(value):
	return frappe.as_json(value)


def _is_unrestricted_user(user=None):
	user = user or frappe.session.user
	roles = set(frappe.get_roles(user))
	return user == "Administrator" or "System Manager" in roles
