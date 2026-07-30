import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


MARKETPLACE_MODULE = "Odyio Marketplace"
MARKETPLACE_APP = "odyio_marketplace"
MARKETPLACE_ROLES = ("Clinic User", "Fournisseur")

ITEM_CUSTOM_FIELDS = [
	{
		"fieldname": "marketplace_section",
		"fieldtype": "Section Break",
		"label": "Marketplace",
		"insert_after": "description",
		"collapsible": 1,
	},
	{
		"fieldname": "marketplace_enabled",
		"fieldtype": "Check",
		"label": "Marketplace Enabled",
		"insert_after": "marketplace_section",
		"default": 0,
	},
	{
		"fieldname": "marketplace_available",
		"fieldtype": "Check",
		"label": "Marketplace Available",
		"insert_after": "marketplace_enabled",
		"default": 0,
		"depends_on": "eval:doc.marketplace_enabled",
	},
	{
		"fieldname": "marketplace_supplier",
		"fieldtype": "Link",
		"label": "Marketplace Supplier",
		"options": "Supplier",
		"insert_after": "marketplace_available",
		"depends_on": "eval:doc.marketplace_enabled",
		"in_standard_filter": 1,
	},
	{
		"fieldname": "supplier_reference",
		"fieldtype": "Data",
		"label": "Supplier Reference",
		"insert_after": "marketplace_supplier",
		"depends_on": "eval:doc.marketplace_enabled",
		"in_list_view": 1,
	},
	{
		"fieldname": "ear_side",
		"fieldtype": "Select",
		"label": "Ear Side",
		"options": "\nLEFT\nRIGHT\nBILATERAL",
		"insert_after": "supplier_reference",
		"depends_on": "eval:doc.marketplace_enabled",
	},
	{
		"fieldname": "technical_specs",
		"fieldtype": "Small Text",
		"label": "Technical Specs",
		"insert_after": "ear_side",
		"depends_on": "eval:doc.marketplace_enabled",
	},
]


def after_install():
	install_marketplace_foundation()


def after_migrate():
	install_marketplace_foundation()


def before_tests():
	install_marketplace_foundation()


def install_marketplace_foundation():
	ensure_module_def()
	ensure_roles()
	ensure_item_custom_fields()
	ensure_standard_doctype_permissions()
	ensure_workspace()
	frappe.clear_cache()


def ensure_module_def():
	if frappe.db.exists("Module Def", MARKETPLACE_MODULE):
		return

	frappe.get_doc(
		{
			"doctype": "Module Def",
			"module_name": MARKETPLACE_MODULE,
			"app_name": MARKETPLACE_APP,
		}
	).insert(ignore_permissions=True)


def ensure_roles():
	for role_name in MARKETPLACE_ROLES:
		if frappe.db.exists("Role", role_name):
			role = frappe.get_doc("Role", role_name)
			if not role.desk_access:
				role.desk_access = 1
				role.save(ignore_permissions=True)
			continue

		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
			}
		).insert(ignore_permissions=True)


def ensure_item_custom_fields():
	existing_fields = set(
		frappe.get_all(
			"Custom Field",
			filters={"dt": "Item", "fieldname": ["in", [field["fieldname"] for field in ITEM_CUSTOM_FIELDS]]},
			pluck="fieldname",
		)
	)
	fields_to_create = [field for field in ITEM_CUSTOM_FIELDS if field["fieldname"] not in existing_fields]

	if fields_to_create:
		create_custom_fields({"Item": fields_to_create}, update=False)


def ensure_standard_doctype_permissions():
	ensure_custom_docperm(
		"Item",
		"Clinic User",
		{
			"read": 1,
			"select": 1,
			"report": 1,
			"print": 0,
			"email": 0,
			"export": 0,
			"import": 0,
			"write": 0,
			"create": 0,
			"delete": 0,
			"submit": 0,
			"cancel": 0,
			"amend": 0,
		},
	)
	ensure_custom_docperm(
		"Item",
		"Fournisseur",
		{
			"read": 1,
			"select": 1,
			"report": 1,
			"print": 1,
			"email": 0,
			"export": 0,
			"import": 0,
			"write": 1,
			"create": 1,
			"delete": 0,
			"submit": 0,
			"cancel": 0,
			"amend": 0,
		},
	)


def ensure_custom_docperm(doctype, role, permissions):
	name = frappe.db.exists(
		"Custom DocPerm",
		{
			"parent": doctype,
			"parenttype": "DocType",
			"parentfield": "permissions",
			"role": role,
			"permlevel": 0,
		},
	)
	doc = frappe.get_doc("Custom DocPerm", name) if name else frappe.new_doc("Custom DocPerm")

	if not name:
		doc.parent = doctype
		doc.parenttype = "DocType"
		doc.parentfield = "permissions"
		doc.role = role
		doc.permlevel = 0

	changed = False
	for fieldname, value in permissions.items():
		if doc.get(fieldname) != value:
			doc.set(fieldname, value)
			changed = True

	if name and changed:
		doc.save(ignore_permissions=True)
	elif not name:
		doc.insert(ignore_permissions=True)

	frappe.clear_cache(doctype=doctype)


def ensure_workspace():
	if frappe.db.exists("Workspace", MARKETPLACE_MODULE):
		return

	workspace = frappe.new_doc("Workspace")
	workspace.label = MARKETPLACE_MODULE
	workspace.title = MARKETPLACE_MODULE
	workspace.module = MARKETPLACE_MODULE
	workspace.icon = "store"
	workspace.public = 1
	workspace.indicator_color = "green"
	workspace.content = json.dumps(
		[
			{"id": "marketplace-header", "type": "header", "data": {"text": MARKETPLACE_MODULE, "col": 12}},
			{"id": "marketplace-catalogue", "type": "shortcut", "data": {"shortcut_name": "Marketplace Catalogue", "col": 3}},
			{"id": "my-quotation-requests", "type": "shortcut", "data": {"shortcut_name": "My Quotation Requests", "col": 3}},
			{"id": "my-products", "type": "shortcut", "data": {"shortcut_name": "My Products", "col": 3}},
			{"id": "incoming-quotation-requests", "type": "shortcut", "data": {"shortcut_name": "Incoming Quotation Requests", "col": 3}},
		]
	)

	for role in ("Clinic User", "Fournisseur", "System Manager"):
		workspace.append("roles", {"role": role})

	for shortcut in get_workspace_shortcuts():
		workspace.append("shortcuts", shortcut)

	workspace.insert(ignore_permissions=True)


def get_workspace_shortcuts():
	return [
		{
			"type": "DocType",
			"label": "Marketplace Catalogue",
			"link_to": "Item",
			"doc_view": "List",
			"color": "Green",
		},
		{
			"type": "DocType",
			"label": "My Quotation Requests",
			"link_to": "Marketplace Quotation Request",
			"doc_view": "List",
			"color": "Blue",
		},
		{
			"type": "DocType",
			"label": "My Products",
			"link_to": "Item",
			"doc_view": "List",
			"color": "Orange",
		},
		{
			"type": "DocType",
			"label": "Incoming Quotation Requests",
			"link_to": "Marketplace Quotation Request",
			"doc_view": "List",
			"color": "Purple",
		},
	]

