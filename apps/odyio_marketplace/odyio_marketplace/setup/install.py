import json

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


MARKETPLACE_MODULE = "Odyio Marketplace"
MARKETPLACE_APP = "odyio_marketplace"
MARKETPLACE_ROLES = ("Clinic User", "Fournisseur")
DEPRECATED_WORKSPACE_SHORTCUTS = {
	"Supplier Offers",
	"Incoming Quotation Requests",
	"My Quotation Requests",
	"Marketplace Home",
	"Marketplace Catalogue",
}
MARKETPLACE_ROLE_HOME_PAGE = "app/marketplace-home"
INTERNAL_ODYIO_ROLES = (
	"Accounts Manager",
	"Accounts User",
	"Audiometriste",
	"Item Manager",
	"Purchase Manager",
	"Purchase Master Manager",
	"Purchase User",
	"Stock Manager",
	"Stock User",
)

ERPNEXT_PARTY_CONTACT_CUSTOM_FIELDS = {
	"Address": [
		{
			"label": "Tax Category",
			"fieldname": "tax_category",
			"fieldtype": "Link",
			"options": "Tax Category",
			"insert_after": "fax",
		},
		{
			"label": "Is Your Company Address",
			"fieldname": "is_your_company_address",
			"fieldtype": "Check",
			"default": "0",
			"insert_after": "linked_with",
		},
	],
	"Contact": [
		{
			"label": "Is Billing Contact",
			"fieldname": "is_billing_contact",
			"fieldtype": "Check",
			"insert_after": "is_primary_contact",
		},
	],
}

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
		"options": "\nLEFT\nRIGHT\nBILATERAL\nNOT_APPLICABLE",
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


def install_marketplace_foundation():
	ensure_module_def()
	ensure_roles()
	ensure_link_filter_metadata_is_text()
	ensure_erpnext_party_contact_custom_fields()
	ensure_item_custom_fields()
	ensure_standard_doctype_permissions()
	ensure_workspace()
	ensure_devis_print_formats()
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
			changed = False
			if not role.desk_access:
				role.desk_access = 1
				changed = True
			if role.home_page != MARKETPLACE_ROLE_HOME_PAGE:
				role.home_page = MARKETPLACE_ROLE_HOME_PAGE
				changed = True
			if changed:
				role.save(ignore_permissions=True)
			continue

		frappe.get_doc(
			{
				"doctype": "Role",
				"role_name": role_name,
				"desk_access": 1,
				"home_page": MARKETPLACE_ROLE_HOME_PAGE,
			}
		).insert(ignore_permissions=True)

	if frappe.db.exists("Role", "Audiometriste"):
		role = frappe.get_doc("Role", "Audiometriste")
		if not role.desk_access:
			role.desk_access = 1
			role.save(ignore_permissions=True)


def ensure_link_filter_metadata_is_text():
	"""Repair PostgreSQL metadata rows that store link_filters as JSON arrays.

	Frappe v15 validates link_filters by calling json.loads on the field value.
	On PostgreSQL, stale rows can be returned as Python lists, which breaks any
	later Custom Field save even when the changed field is unrelated.
	"""

	if frappe.conf.db_type == "postgres":
		for table in ("tabDocField", "tabCustom Field"):
			frappe.db.sql(
				f"""
				update "{table}"
				set link_filters = to_json(link_filters::text)
				where link_filters is not null
					and json_typeof(link_filters) in ('array', 'object')
				"""
			)
		return

	for doctype in ("DocField", "Custom Field"):
		for field in frappe.get_all(
			doctype,
			filters={"link_filters": ["is", "set"]},
			fields=["name", "link_filters"],
		):
			if isinstance(field.link_filters, (list, dict)):
				frappe.db.set_value(
					doctype,
					field.name,
					"link_filters",
					json.dumps(field.link_filters),
					update_modified=False,
				)


def ensure_erpnext_party_contact_custom_fields():
	fields_to_create = {}
	for doctype, fields in ERPNEXT_PARTY_CONTACT_CUSTOM_FIELDS.items():
		missing_fields = []
		for field in fields:
			fieldname = field["fieldname"]
			if frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": fieldname}) and frappe.db.has_column(
				doctype, fieldname
			):
				continue
			missing_fields.append(field)

		if missing_fields:
			fields_to_create[doctype] = missing_fields

	if fields_to_create:
		create_custom_fields(fields_to_create, update=True, ignore_validate=True)


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
		create_custom_fields({"Item": fields_to_create}, update=False, ignore_validate=True)

	expected_by_fieldname = {field["fieldname"]: field for field in ITEM_CUSTOM_FIELDS}
	for custom_field in frappe.get_all(
		"Custom Field",
		filters={"dt": "Item", "fieldname": ["in", list(expected_by_fieldname)]},
		fields=["name", "fieldname"],
	):
		expected = expected_by_fieldname[custom_field.fieldname]
		doc = frappe.get_doc("Custom Field", custom_field.name)
		changed = False
		for fieldname in ("fieldtype", "label", "options", "insert_after", "depends_on", "collapsible", "default", "in_list_view", "in_standard_filter"):
			if fieldname in expected and doc.get(fieldname) != expected[fieldname]:
				doc.set(fieldname, expected[fieldname])
				changed = True
		if changed:
			doc.save(ignore_permissions=True)


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
		"Customer",
		"Clinic User",
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
	if frappe.db.exists("DocType", "Audiogramme"):
		ensure_custom_docperm(
			"Audiogramme",
			"Clinic User",
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
		ensure_custom_docperm(
			"Audiogramme",
			"Audiometriste",
			{
				"read": 1,
				"select": 1,
				"report": 1,
				"print": 1,
				"email": 1,
				"export": 1,
				"import": 0,
				"write": 1,
				"create": 1,
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
		"Purchase Order",
		"Clinic User",
		{
			"read": 1,
			"select": 1,
			"report": 1,
			"print": 1,
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


def ensure_custom_docperm(doctype, role, permissions):
	name = frappe.db.exists(
		"Custom DocPerm",
		{
			"parent": doctype,
			"role": role,
			"permlevel": 0,
		},
	)
	doc = frappe.get_doc("Custom DocPerm", name) if name else frappe.new_doc("Custom DocPerm")

	if not name:
		doc.parent = doctype
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
		workspace = frappe.get_doc("Workspace", MARKETPLACE_MODULE)
		ensure_workspace_content(workspace)
		ensure_workspace_roles(workspace)
		ensure_workspace_shortcuts(workspace)
		return

	workspace = frappe.new_doc("Workspace")
	workspace.label = MARKETPLACE_MODULE
	workspace.title = MARKETPLACE_MODULE
	workspace.module = MARKETPLACE_MODULE
	workspace.icon = "store"
	workspace.public = 1
	workspace.indicator_color = "green"
	workspace.content = json.dumps(get_workspace_content())

	for role in ("Clinic User", "Fournisseur", "System Manager", *INTERNAL_ODYIO_ROLES):
		workspace.append("roles", {"role": role})

	for shortcut in get_workspace_shortcuts():
		workspace.append("shortcuts", shortcut)

	workspace.insert(ignore_permissions=True)


def ensure_workspace_content(workspace):
	changed = False
	if workspace.label != MARKETPLACE_MODULE:
		workspace.label = MARKETPLACE_MODULE
		changed = True
	if workspace.title != MARKETPLACE_MODULE:
		workspace.title = MARKETPLACE_MODULE
		changed = True
	content = get_workspace_content()
	if workspace.content == json.dumps(content) and not changed:
		return

	workspace.content = json.dumps(content)
	workspace.save(ignore_permissions=True)


def ensure_workspace_roles(workspace):
	existing_roles = {row.role for row in workspace.roles}
	changed = False
	for role in ("Clinic User", "Fournisseur", "System Manager", *INTERNAL_ODYIO_ROLES):
		if role not in existing_roles:
			workspace.append("roles", {"role": role})
			changed = True

	if changed:
		workspace.save(ignore_permissions=True)


def ensure_workspace_shortcuts(workspace):
	original_count = len(workspace.shortcuts)
	workspace.shortcuts = [
		shortcut for shortcut in workspace.shortcuts if shortcut.label not in DEPRECATED_WORKSPACE_SHORTCUTS
	]
	existing_by_label = {shortcut.label: shortcut for shortcut in workspace.shortcuts}
	changed = len(workspace.shortcuts) != original_count
	for shortcut in get_workspace_shortcuts():
		if shortcut["label"] not in existing_by_label:
			workspace.append("shortcuts", shortcut)
			changed = True
			continue

		existing = existing_by_label[shortcut["label"]]
		for fieldname, value in shortcut.items():
			if existing.get(fieldname) != value:
				existing.set(fieldname, value)
				changed = True

	if changed:
		workspace.save(ignore_permissions=True)


def get_workspace_shortcuts():
	return [
		{
			"type": "Page",
			"label": "Home",
			"link_to": "marketplace-home",
			"doc_view": "",
			"color": "Green",
		},
		{
			"type": "Page",
			"label": "Catalogue",
			"link_to": "marketplace-catalogue",
			"doc_view": "",
			"color": "Green",
		},
		{
			"type": "Page",
			"label": "My Requests",
			"link_to": "clinic-my-requests",
			"doc_view": "",
			"color": "Blue",
		},
		{
			"type": "Page",
			"label": "Purchase Orders",
			"link_to": "clinic-purchase-orders",
			"doc_view": "",
			"color": "Blue",
		},
		{
			"type": "Page",
			"label": "My Products",
			"link_to": "supplier-my-products",
			"doc_view": "",
			"color": "Orange",
		},
		{
			"type": "Page",
			"label": "Incoming Requests",
			"link_to": "supplier-incoming-requests",
			"doc_view": "",
			"color": "Yellow",
		},
		{
			"type": "Page",
			"label": "My Offers",
			"link_to": "supplier-my-offers",
			"doc_view": "",
			"color": "Purple",
		},
		{
			"type": "DocType",
			"label": "Items",
			"link_to": "Item",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "Item Groups",
			"link_to": "Item Group",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "Suppliers",
			"link_to": "Supplier",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "ERP Purchase Orders",
			"link_to": "Purchase Order",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "Warehouses",
			"link_to": "Warehouse",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "Companies",
			"link_to": "Company",
			"doc_view": "List",
			"color": "Gray",
		},
		{
			"type": "DocType",
			"label": "Audiograms",
			"link_to": "Audiogramme",
			"doc_view": "List",
			"color": "Teal",
		},
		{
			"type": "DocType",
			"label": "Patients",
			"link_to": "Customer",
			"doc_view": "List",
			"color": "Teal",
		},
		{
			"type": "DocType",
			"label": "Users",
			"link_to": "User",
			"doc_view": "List",
			"color": "Red",
		},
		{
			"type": "DocType",
			"label": "Roles",
			"link_to": "Role",
			"doc_view": "List",
			"color": "Red",
		},
	]


def get_workspace_content():
	return [
		{"id": "marketplace-header", "type": "header", "data": {"text": "Marketplace", "col": 12}},
		{"id": "marketplace-home", "type": "shortcut", "data": {"shortcut_name": "Home", "col": 3}},
		{"id": "marketplace-catalogue", "type": "shortcut", "data": {"shortcut_name": "Catalogue", "col": 3}},
		{"id": "clinic-my-requests", "type": "shortcut", "data": {"shortcut_name": "My Requests", "col": 3}},
		{"id": "clinic-purchase-orders", "type": "shortcut", "data": {"shortcut_name": "Purchase Orders", "col": 3}},
		{"id": "supplier-my-products", "type": "shortcut", "data": {"shortcut_name": "My Products", "col": 3}},
		{"id": "supplier-incoming-requests", "type": "shortcut", "data": {"shortcut_name": "Incoming Requests", "col": 3}},
		{"id": "supplier-my-offers", "type": "shortcut", "data": {"shortcut_name": "My Offers", "col": 3}},
		{"id": "odyio-erp-header", "type": "header", "data": {"text": "ERP / Operations", "col": 12}},
		{"id": "odyio-items", "type": "shortcut", "data": {"shortcut_name": "Items", "col": 3}},
		{"id": "odyio-item-groups", "type": "shortcut", "data": {"shortcut_name": "Item Groups", "col": 3}},
		{"id": "odyio-suppliers", "type": "shortcut", "data": {"shortcut_name": "Suppliers", "col": 3}},
		{"id": "odyio-erp-purchase-orders", "type": "shortcut", "data": {"shortcut_name": "ERP Purchase Orders", "col": 3}},
		{"id": "odyio-warehouses", "type": "shortcut", "data": {"shortcut_name": "Warehouses", "col": 3}},
		{"id": "odyio-companies", "type": "shortcut", "data": {"shortcut_name": "Companies", "col": 3}},
		{"id": "odyio-audiology-header", "type": "header", "data": {"text": "Audiology / Clinical", "col": 12}},
		{"id": "odyio-audiograms", "type": "shortcut", "data": {"shortcut_name": "Audiograms", "col": 3}},
		{"id": "odyio-patients", "type": "shortcut", "data": {"shortcut_name": "Patients", "col": 3}},
		{"id": "odyio-admin-header", "type": "header", "data": {"text": "Administration", "col": 12}},
		{"id": "odyio-users", "type": "shortcut", "data": {"shortcut_name": "Users", "col": 3}},
		{"id": "odyio-roles", "type": "shortcut", "data": {"shortcut_name": "Roles", "col": 3}},
	]


def ensure_devis_print_formats():
	for template, label in (
		("classic", "Marketplace Devis Classic"),
		("modern", "Marketplace Devis Modern"),
		("compact", "Marketplace Devis Compact"),
	):
		html = '{{ frappe.get_attr("odyio_marketplace.api.render_devis_print_format")(doc.name) | safe }}'
		name = frappe.db.exists("Print Format", {"name": label, "doc_type": "Marketplace Devis Snapshot"})
		doc = frappe.get_doc("Print Format", name) if name else frappe.new_doc("Print Format")
		doc.name = label
		doc.print_format_name = label
		doc.doc_type = "Marketplace Devis Snapshot"
		doc.module = MARKETPLACE_MODULE
		doc.print_format_type = "Jinja"
		doc.custom_format = 1
		doc.standard = "No"
		doc.html = html
		doc.disabled = 0
		if name:
			doc.save(ignore_permissions=True)
		else:
			doc.insert(ignore_permissions=True)
