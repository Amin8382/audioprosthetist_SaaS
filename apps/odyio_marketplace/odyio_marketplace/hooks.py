app_name = "odyio_marketplace"
app_title = "Odyio Marketplace"
app_publisher = "Odyio Technologies"
app_description = "Odyio Marketplace foundation for ERPNext"
app_email = "contact@odyio.fr"
app_license = "mit"

required_apps = ["erpnext"]

after_install = "odyio_marketplace.setup.install.after_install"
after_migrate = "odyio_marketplace.setup.install.after_migrate"
before_tests = "odyio_marketplace.setup.install.before_tests"

permission_query_conditions = {
	"Marketplace Quotation Request": "odyio_marketplace.permissions.marketplace_quotation_request_query_conditions",
	"Item": "odyio_marketplace.permissions.marketplace_item_query_conditions",
}

has_permission = {
	"Marketplace Quotation Request": "odyio_marketplace.permissions.has_marketplace_quotation_request_permission",
	"Item": "odyio_marketplace.permissions.has_marketplace_item_permission",
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
