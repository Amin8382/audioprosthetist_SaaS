frappe.ui.form.on("Marketplace Quotation Request", {
	refresh(frm) {
		set_item_query(frm);
		add_lifecycle_actions(frm);
	},

	supplier(frm) {
		set_item_query(frm);
		validate_items_supplier(frm);
	},

	validate(frm) {
		validate_items_supplier(frm);
	},
});

frappe.ui.form.on("Marketplace Quotation Request Item", {
	item(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.item) {
			return;
		}

		frappe.db
			.get_value("Item", row.item, [
				"item_name",
				"supplier_reference",
				"marketplace_supplier",
				"marketplace_enabled",
				"marketplace_available",
			])
			.then((result) => {
				const item = result.message || {};
				frappe.model.set_value(cdt, cdn, "item_name_snapshot", item.item_name || "");
				frappe.model.set_value(cdt, cdn, "supplier_reference_snapshot", item.supplier_reference || "");

				if (frm.doc.supplier && item.marketplace_supplier && item.marketplace_supplier !== frm.doc.supplier) {
					frappe.msgprint(__("Selected item belongs to supplier {0}.", [item.marketplace_supplier]));
				}

				if (!item.marketplace_enabled || !item.marketplace_available) {
					frappe.msgprint(__("Selected item is not available in the marketplace."));
				}
			});
	},
});

function set_item_query(frm) {
	frm.set_query("supplier", () => ({
		filters: {
			disabled: 0,
		},
	}));

	frm.set_query("item", "items", () => {
		const filters = {
			marketplace_enabled: 1,
			marketplace_available: 1,
		};

		if (frm.doc.supplier) {
			filters.marketplace_supplier = frm.doc.supplier;
		}

		return { filters };
	});
}

function add_lifecycle_actions(frm) {
	if (frm.is_new() || frm.doc.docstatus === 2) {
		return;
	}

	if (frm.doc.status === "Draft" && frm.doc.docstatus === 0) {
		frm.add_custom_button(__("Send"), () => {
			frm.call("send_request").then(() => {
				frm.reload_doc();
			});
		});
	}

	if (["Draft", "Sent"].includes(frm.doc.status)) {
		frm.add_custom_button(__("Cancel Request"), () => {
			frappe.confirm(__("Cancel this quotation request?"), () => {
				frm.call("cancel_request").then(() => {
					frm.reload_doc();
				});
			});
		});
	}

	if (
		frm.doc.status === "Sent" &&
		frm.doc.docstatus === 1 &&
		!frm.doc.linked_supplier_offer &&
		frappe.user.has_role("Fournisseur")
	) {
		frm.add_custom_button(__("Create Offer"), () => {
			frappe.new_doc("Marketplace Supplier Offer", {
				quotation_request: frm.doc.name,
			});
		});
	}
}

function validate_items_supplier(frm) {
	if (!frm.doc.supplier || !frm.doc.items) {
		return;
	}

	const mismatched_rows = frm.doc.items.filter(
		(row) => row.marketplace_supplier && row.marketplace_supplier !== frm.doc.supplier
	);

	if (mismatched_rows.length) {
		frappe.msgprint(__("All request items must belong to the selected supplier."));
	}
}
