frappe.ui.form.on("Releve Document", {
	refresh(frm) {
		if (frm.doc.attachment && !["Analyse", "Analyse en cours"].includes(frm.doc.ocr_status)) {
			frm.add_custom_button(__("Analyser le document"), function () {
				frappe.call({
					method: "odyio_ocr.ocr.doctype.releve_document.releve_document.analyze_document",
					args: { doc: frm.doc },
					freeze: true,
					freeze_message: __("OCR en cours..."),
					callback: function (r) {
						frm.reload_doc();
						if (r.message && r.message.ok) {
							frappe.show_alert({ message: __("Document analysé"), indicator: "green" });
						} else {
							frappe.msgprint(r.message ? r.message.error : __("Erreur inconnue"));
						}
					},
				});
			}).addClass("btn-primary");
		}

		if (frm.doc.items && frm.doc.items.length && !frm.doc.stock_entry) {
			frm.add_custom_button(__("Créer Entrée de Stock"), function () {
				frappe.call({
					method: "odyio_ocr.ocr.doctype.releve_document.releve_document.create_stock_entry",
					args: { doc: frm.doc },
					freeze: true,
					callback: function (r) {
						frm.reload_doc();
						if (r.message && r.message.ok) {
							frappe.show_alert({
								message: __("Entrée de stock {0} créée", [r.message.stock_entry]),
								indicator: "green",
							});
						} else if (r.exc) {
							frappe.msgprint(__("Erreur lors de la création de l'entrée de stock"));
						}
					},
				});
			});
		}
	},
});
