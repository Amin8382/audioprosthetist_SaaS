// Customer form client script for Noah Mobile sync (odyio_noah app)

frappe.ui.form.on("Customer", {
	refresh: function (frm) {
		// ─── SYNC BUTTONS ───────────────────────────────────
		if (frm.doc.noah_patient_id) {
			frm.add_custom_button(__("Sync from Noah"), function () {
				frappe.call({
					method: "odyio_noah.api.sync_from_noah",
					args: { customer_name: frm.doc.name },
					callback: function (r) {
						if (r.message && r.message.status === "success") {
							frappe.show_alert({
								message: __("Noah synchronisé"),
								indicator: "green",
							});
							frm.reload_doc();
						} else {
							frappe.msgprint(
								(r.message && r.message.message) || __("Erreur de synchronisation")
							);
						}
					},
				});
			}, __("Noah"));

			frm.add_custom_button(__("Push to Noah"), function () {
				frappe.call({
					method: "odyio_noah.api.push_to_noah",
					args: { customer_name: frm.doc.name },
					callback: function (r) {
						if (r.message && r.message.status === "success") {
							frappe.show_alert({
								message: __("Push réussi"),
								indicator: "green",
							});
							frm.reload_doc();
						} else {
							frappe.msgprint(
								(r.message && r.message.message) || __("Erreur du push")
							);
						}
					},
				});
			}, __("Noah"));
		}

		// ─── SYNC STATUS BADGE ─────────────────────────────
		const colors = {
			SYNCED: "green",
			OUT_OF_SYNC: "orange",
			NEVER_SYNCED: "grey",
			SYNC_ERROR: "red",
		};
		if (frm.doc.noah_sync_status) {
			frm.dashboard.add_indicator(
				"Noah: " + frm.doc.noah_sync_status,
				colors[frm.doc.noah_sync_status] || "grey"
			);
		}

		// ─── AUDIOGRAM CHART ───────────────────────────────
		if (frm.doc.audiogram_left || frm.doc.audiogram_right) {
			renderAudiogram(frm);
		}
	},

	// ─── PATIENT ID = prénom + nom ──────────────────────────
	first_name: function (frm) {
		syncPatientName(frm);
	},

	last_name: function (frm) {
		syncPatientName(frm);
	},
});

// Derive the patient ID (customer_name) from prénom + nom as the operator
// types, so the required full-name field is already filled before save.
function syncPatientName(frm) {
	const parts = [frm.doc.first_name, frm.doc.last_name].filter(function (value) {
		return value;
	});
	if (parts.length) {
		frm.set_value("customer_name", parts.join(" ").trim());
	}
}

function renderAudiogram(frm) {
	function parseAudiogram(value) {
		if (!value) return {};
		if (typeof value === "string") {
			try {
				return JSON.parse(value) || {};
			} catch (e) {
				return {};
			}
		}
		return value;
	}

	let left = parseAudiogram(frm.doc.audiogram_left);
	let right = parseAudiogram(frm.doc.audiogram_right);

	if (Object.keys(left).length === 0 && Object.keys(right).length === 0) {
		return;
	}

	const freqs = ["250", "500", "1000", "2000", "4000", "8000"];

	let html =
		'<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">' +
		'<h5 style="margin-bottom: 15px;">' +
		__("Audiogramme") +
		"</h5>" +
		'<div style="display: flex; gap: 30px;">' +
		'<div style="flex: 1;">' +
		'<h6 style="color: #2563eb;">' +
		__("Oreille Gauche") +
		"</h6>" +
		'<table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
		'<tr style="background: #e5e7eb;">' +
		'<th style="padding: 5px; text-align: left;">' +
		__("Fréquence") +
		'</th><th style="padding: 5px; text-align: right;">dB HL</th></tr>';

	freqs.forEach(function (freq) {
		const val = left[freq] !== undefined ? left[freq] : "-";
		html +=
			"<tr><td style=\"padding: 4px 5px; border-bottom: 1px solid #e5e7eb;\">" +
			freq +
			" Hz</td><td style=\"padding: 4px 5px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: " +
			(val !== "-" ? "bold" : "normal") +
			';">' +
			val +
			"</td></tr>";
	});

	html +=
		"</table></div>" +
		'<div style="flex: 1;">' +
		'<h6 style="color: #dc2626;">' +
		__("Oreille Droite") +
		"</h6>" +
		'<table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
		'<tr style="background: #e5e7eb;">' +
		'<th style="padding: 5px; text-align: left;">' +
		__("Fréquence") +
		'</th><th style="padding: 5px; text-align: right;">dB HL</th></tr>';

	freqs.forEach(function (freq) {
		const val = right[freq] !== undefined ? right[freq] : "-";
		html +=
			"<tr><td style=\"padding: 4px 5px; border-bottom: 1px solid #e5e7eb;\">" +
			freq +
			" Hz</td><td style=\"padding: 4px 5px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: " +
			(val !== "-" ? "bold" : "normal") +
			';">' +
			val +
			"</td></tr>";
	});

	html +=
		"</table></div></div>" +
		(frm.doc.ear_side
			? '<p style="margin-top: 10px; font-size: 12px; color: #6b7280;">' +
			  __("Côté: ") +
			  frm.doc.ear_side +
			  "</p>"
			: "") +
		"</div>";

	// Insert into form
	if (!frm.fields_dict.noah_audiogram_html) {
		frm.fields_dict.noah_audiogram_html = {
			df: { fieldname: "noah_audiogram_html", fieldtype: "HTML" },
			$wrapper: $(html).insertAfter(frm.fields_dict.customer_name.$wrapper),
		};
	} else {
		frm.fields_dict.noah_audiogram_html.$wrapper.html(html);
	}
}
