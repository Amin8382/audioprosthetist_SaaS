app_name = "odyio_marketplace"
app_title = "Odyio Marketplace"
app_publisher = "Odyio Technologies"
app_description = "Odyio Marketplace foundation for ERPNext"
app_email = "contact@odyio.fr"
app_license = "mit"

required_apps = ["erpnext"]

after_install = "odyio_marketplace.setup.install.after_install"
after_migrate = "odyio_marketplace.setup.install.after_migrate"
before_tests = "odyio_marketplace.setup.test_setup.before_tests"

app_include_js = ["/assets/odyio_marketplace/js/marketplace_ui.js"]

permission_query_conditions = {
	"Marketplace Quotation Request": "odyio_marketplace.permissions.marketplace_quotation_request_query_conditions",
	"Marketplace Supplier Offer": "odyio_marketplace.permissions.marketplace_supplier_offer_query_conditions",
	"Marketplace Devis Snapshot": "odyio_marketplace.permissions.marketplace_devis_snapshot_query_conditions",
	"Marketplace Supplier Devis Settings": "odyio_marketplace.permissions.marketplace_supplier_devis_settings_query_conditions",
	"Item": "odyio_marketplace.permissions.marketplace_item_query_conditions",
	"Purchase Order": "odyio_marketplace.permissions.marketplace_purchase_order_query_conditions",
}

has_permission = {
	"Marketplace Quotation Request": "odyio_marketplace.permissions.has_marketplace_quotation_request_permission",
	"Marketplace Supplier Offer": "odyio_marketplace.permissions.has_marketplace_supplier_offer_permission",
	"Marketplace Devis Snapshot": "odyio_marketplace.permissions.has_marketplace_devis_snapshot_permission",
	"Marketplace Supplier Devis Settings": "odyio_marketplace.permissions.has_marketplace_supplier_devis_settings_permission",
	"Item": "odyio_marketplace.permissions.has_marketplace_item_permission",
	"Purchase Order": "odyio_marketplace.permissions.has_marketplace_purchase_order_permission",
}

override_whitelisted_methods = {
	"frappe.utils.goal.get_monthly_goal_graph_data": "odyio_marketplace.compat.goal.get_monthly_goal_graph_data",
	"frappe.desk.desktop.get_workspace_sidebar_items": "odyio_marketplace.navigation.get_workspace_sidebar_items",
	"frappe.desk.desktop.get_desktop_page": "odyio_marketplace.navigation.get_desktop_page",
}

fixtures = [
	{"doctype": "Custom Field", "filters": [["dt", "=", "Item"], ["fieldname", "in", [
		"marketplace_section",
		"marketplace_enabled",
		"marketplace_available",
		"marketplace_supplier",
		"supplier_reference",
		"ear_side",
		"technical_specs",
	]]]},
	{"doctype": "Role", "filters": [["name", "in", ["Clinic User", "Fournisseur"]]]},
	{"doctype": "Custom DocPerm", "filters": [["parent", "=", "Item"], ["role", "in", ["Clinic User", "Fournisseur"]]]},
	{"doctype": "Workspace", "filters": [["name", "=", "Odyio Marketplace"]]},
]
