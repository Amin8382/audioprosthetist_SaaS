frappe.listview_settings["Marketplace Supplier Offer"] = {
	get_indicator(doc) {
		const colors = {
			Draft: "gray",
			Sent: "blue",
			Accepted: "green",
			Rejected: "red",
			Cancelled: "red",
		};
		return [__(doc.status), colors[doc.status] || "gray", `status,=,${doc.status}`];
	},
};
