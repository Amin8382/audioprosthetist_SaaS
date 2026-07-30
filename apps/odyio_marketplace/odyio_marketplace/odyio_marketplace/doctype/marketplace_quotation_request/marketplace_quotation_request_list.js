frappe.listview_settings["Marketplace Quotation Request"] = {
	add_fields: ["clinic", "supplier", "status", "sent_at", "item_count", "total_requested_quantity"],

	onload(listview) {
		const is_supplier = frappe.user.has_role("Fournisseur");
		const is_manager = frappe.user.has_role("System Manager");

		if (is_supplier && !is_manager) {
			listview.filter_area.add([
				["Marketplace Quotation Request", "status", "=", "Sent"],
			]);
		}
	},

	get_indicator(doc) {
		const colors = {
			Draft: "gray",
			Sent: "blue",
			Cancelled: "red",
			Expired: "orange",
		};

		return [__(doc.status), colors[doc.status] || "gray", `status,=,${doc.status}`];
	},
};

