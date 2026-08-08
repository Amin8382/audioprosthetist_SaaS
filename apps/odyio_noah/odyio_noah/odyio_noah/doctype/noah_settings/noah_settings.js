# Copyright (c) 2026, Odyio Technologies and contributors
# For license information, please see license.txt

frappe.ui.form.on("Noah Settings", {
	refresh: function (frm) {
		frm.add_custom_button(__("Tester la connexion"), function () {
			frappe.call({
				method: "odyio_noah.api.test_noah_connection",
				callback: function (r) {
					if (r.message && r.message.status === "success") {
						frappe.show_alert({ message: r.message.message, indicator: "green" });
						frm.reload_doc();
					} else {
						frappe.show_alert({
							message: (r.message && r.message.message) || __("Échec du test"),
							indicator: "red",
						});
					}
				},
			});
		});
	},
});
