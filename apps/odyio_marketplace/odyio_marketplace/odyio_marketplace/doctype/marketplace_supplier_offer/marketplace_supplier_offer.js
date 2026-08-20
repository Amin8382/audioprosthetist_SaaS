frappe.ui.form.on("Marketplace Supplier Offer", {
	refresh(frm) {
		if (frm.doc.docstatus === 0 && frm.doc.status === "Draft" && frm.has_perm("submit")) {
			frm.add_custom_button(__("Send Offer"), () => {
				frm.call("send_offer").then(() => frm.reload_doc());
			}).addClass("btn-primary");
		}

		if (frm.doc.docstatus === 1 && frm.doc.status === "Sent" && frm.has_perm("write")) {
			frm.add_custom_button(__("Accept"), () => {
				frm.call("accept_offer").then(() => frm.reload_doc());
			}).addClass("btn-primary");
			frm.add_custom_button(__("Reject"), () => {
				frm.call("reject_offer").then(() => frm.reload_doc());
			});
		}
	},
});
