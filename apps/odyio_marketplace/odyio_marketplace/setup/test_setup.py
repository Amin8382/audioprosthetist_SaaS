import frappe

from odyio_marketplace.setup.install import install_marketplace_foundation


def before_tests():
	normalize_postgres_link_filter_json_values()
	ensure_marketplace_test_prerequisites()
	install_marketplace_foundation()


def normalize_postgres_link_filter_json_values():
	if frappe.conf.db_type != "postgres":
		return

	for table in ("tabDocField", "tabCustom Field"):
		frappe.db.sql(
			f"""
			update "{table}"
			set link_filters = to_json(link_filters::text)
			where link_filters is not null
				and json_typeof(link_filters) = 'array'
			"""
		)

	frappe.db.commit()


def ensure_marketplace_test_prerequisites():
	ensure_tree_root("Supplier Group", "supplier_group_name", "All Supplier Groups")
	ensure_tree_child(
		"Supplier Group",
		"supplier_group_name",
		"_Test Marketplace Supplier Group",
		"parent_supplier_group",
		"All Supplier Groups",
	)
	ensure_tree_root("Item Group", "item_group_name", "All Item Groups")
	ensure_tree_child(
		"Item Group",
		"item_group_name",
		"_Test Marketplace Item Group",
		"parent_item_group",
		"All Item Groups",
	)
	ensure_simple_record("UOM", "Nos", {"uom_name": "Nos", "must_be_whole_number": 1})

	frappe.db.commit()


def ensure_tree_root(doctype, fieldname, name):
	if not frappe.db.exists("DocType", doctype) or frappe.db.exists(doctype, name):
		return

	frappe.get_doc({"doctype": doctype, fieldname: name, "is_group": 1}).insert(ignore_permissions=True)


def ensure_simple_record(doctype, name, values):
	if not frappe.db.exists("DocType", doctype) or frappe.db.exists(doctype, name):
		return

	frappe.get_doc({"doctype": doctype, **values}).insert(ignore_permissions=True)


def ensure_tree_child(doctype, fieldname, name, parent_fieldname, parent):
	if not frappe.db.exists("DocType", doctype) or frappe.db.exists(doctype, name):
		return

	frappe.get_doc(
		{
			"doctype": doctype,
			fieldname: name,
			parent_fieldname: parent,
			"is_group": 0,
		}
	).insert(ignore_permissions=True)
