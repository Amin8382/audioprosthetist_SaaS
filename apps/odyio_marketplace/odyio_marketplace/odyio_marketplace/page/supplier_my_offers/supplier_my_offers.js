frappe.pages["supplier-my-offers"].on_page_load = function (wrapper) {
	new SupplierMyOffers(wrapper);
};

class SupplierMyOffers {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.active_offer = null;
		this.devis_configuration_dialog = null;
		this.devis_configuration_opening = false;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("My Offers"),
			single_column: true,
		});
		this.make_controls();
		this.make_layout();
		this.load_context();
	}

	make_controls() {
		this.search_field = this.page.add_field({
			fieldname: "search",
			label: __("Search"),
			fieldtype: "Data",
			change: () => this.refresh(),
		});
		this.status_field = this.page.add_field({
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: "\nDraft\nSent\nAccepted\nRejected\nCancelled",
			change: () => this.refresh(),
		});
	}

	make_layout() {
		this.$body = $(`
			<div class="odyio-page-shell">
				<div class="odyio-page-description odyio-context"></div>
				<div class="odyio-list"></div>
			</div>
		`).appendTo(this.page.main);
		this.$context = this.$body.find(".odyio-context");
		this.$list = this.$body.find(".odyio-list");
	}

	load_context() {
		frappe.xcall("odyio_marketplace.api.get_supplier_marketplace_context").then((context) => {
			this.context = context;
			this.$context.text(__("Showing offers for supplier {0}", [context.supplier_name]));
			this.refresh();
		});
	}

	refresh(options = {}) {
		if (!options.keep_drawer) {
			this.active_offer = null;
			this.drawer.close();
		}
		this.$list.html(this.ui.loading(__("Loading offers...")));
		frappe
			.xcall("odyio_marketplace.api.get_supplier_my_offers", {
				search: this.search_field.get_value(),
				status: this.status_field.get_value(),
			})
			.then((offers) => this.render_list(offers || []))
			.catch(() => this.$list.html(this.ui.empty(__("Supplier offers could not be loaded. Please retry."))));
	}

	render_list(offers) {
		if (!offers.length) {
			this.$list.html(this.ui.empty(__("No supplier offers match the current filters. Incoming requests without offers appear on the Incoming Requests page.")));
			return;
		}

		this.$list.empty();
		offers.forEach((offer) => {
			const $row = $(`
				<div class="odyio-row" tabindex="0" data-name="${this.ui.escape(offer.name)}">
					<div>
						<h4>${this.ui.escape(offer.name)}</h4>
						<div class="odyio-meta">${__("Request")}: ${this.ui.escape(offer.quotation_request)} &middot; ${this.ui.escape(offer.clinic_name)}</div>
						<div class="odyio-meta">${this.ui.status_badge(this.ui.status_view(offer))} &middot; ${this.ui.escape(offer.result)} &middot; ${this.ui.money(offer.total_amount)}</div>
					</div>
					<div class="odyio-actions">
						<button class="btn btn-sm btn-primary odyio-open">${__("Details")}</button>
					</div>
				</div>
			`).appendTo(this.$list);
			$row.on("click", (event) => this.show_details(offer.name, event.currentTarget));
			$row.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					this.show_details(offer.name, event.currentTarget);
				}
			});
			$row.find(".odyio-open").on("click", (event) => {
				event.stopPropagation();
				this.show_details(offer.name, event.currentTarget);
			});
		});
		this.mark_selected();
	}

	mark_selected() {
		this.$list.find(".odyio-row").removeClass("odyio-selected");
		if (this.active_offer) {
			this.$list.find(`[data-name="${CSS.escape(this.active_offer)}"]`).addClass("odyio-selected");
		}
	}

	show_details(offer_name, trigger) {
		this.active_offer = offer_name;
		this.mark_selected();
		this.drawer.open({
			title: offer_name,
			status: __("Loading"),
			subtitle: this.ui.escape(__("Loading offer details...")),
			body: this.ui.loading(__("Loading offer details...")),
			trigger,
		});
		frappe.xcall("odyio_marketplace.api.get_supplier_offer_details", { offer: offer_name }).then((offer) => {
			const actions = offer.can_submit
				? [{ label: __("Submit Offer"), primary: true, on_click: () => this.submit_offer(offer.name) }]
				: [];
			if (offer.can_create_devis) {
				actions.push({ label: __("Create Devis"), primary: !offer.can_submit, on_click: () => this.create_devis(offer.name) });
			}
			if (offer.can_view_devis) {
				actions.push({ label: __("View Devis"), on_click: () => this.view_devis(offer.name) });
			}
			this.drawer.open({
				title: offer.name,
				status: this.ui.status_view(offer),
				subtitle: `${__("Request")}: ${this.ui.escape(offer.quotation_request)} &middot; ${this.ui.escape(offer.clinic_name)} &middot; ${this.ui.escape(offer.next_action || "")}`,
				body: this.render_offer_details(offer),
				actions,
				trigger,
			});
		});
	}

	render_offer_details(offer) {
		const rows = offer.items.map(
			(row) => `
				<tr data-item="${this.ui.escape(row.item)}">
					<td>${this.ui.escape(row.item_name)}</td>
					<td>${this.ui.escape(row.item)}</td>
					<td class="text-right">${this.ui.escape(row.quantity)}</td>
					<td>${this.ui.escape(row.uom || "")}</td>
					<td class="text-right">${
						offer.can_submit
							? `<input class="form-control input-xs odyio-offer-rate" type="number" min="0.01" step="0.01" value="${row.fixed_rate || ""}" aria-label="${this.ui.escape(__("Offer rate for {0}", [row.item_name]))}">`
							: this.ui.money(row.fixed_rate)
					}</td>
					<td class="text-right">${this.ui.money(row.amount)}</td>
				</tr>`
		);
		return [
			this.ui.section(
				__("Offer Summary"),
				this.ui.key_values([
					{ label: __("Clinic"), value: offer.clinic_name },
					{ label: __("Request"), value: offer.quotation_request },
					{ label: __("Created"), value: this.ui.date(offer.creation) },
					{ label: __("Submitted"), value: this.ui.date(offer.sent_at) },
					{ label: __("Accepted"), value: this.ui.date(offer.accepted_at) },
					{ label: __("Rejected"), value: this.ui.date(offer.rejected_at) },
					{ label: __("Result"), value: offer.result },
					{ label: __("Fulfillment"), value: offer.fulfillment ? offer.fulfillment.label : "" },
					{ label: __("Total"), value: this.ui.money(offer.total_amount), html: true },
				])
			),
			offer.fulfillment && offer.fulfillment.delivery_address
				? this.ui.section(__("Delivery Address"), `<pre>${this.ui.escape(offer.fulfillment.delivery_address.formatted || "")}</pre>`)
				: "",
			this.ui.section(
				__("Offer Lines"),
				this.ui.table(
					[
						{ label: __("Item") },
						{ label: __("Code") },
						{ label: __("Qty"), class: "text-right" },
						{ label: __("UOM") },
						{ label: __("Offer Rate"), class: "text-right" },
						{ label: __("Amount"), class: "text-right" },
					],
					rows
				)
			),
			this.ui.section(
				__("Decision"),
				this.ui.key_values([
					{ label: __("Current State"), value: offer.display_status || offer.status },
					{ label: __("Next Action"), value: offer.next_action || "" },
					{ label: __("Purchase Order"), value: offer.purchase_order ? offer.purchase_order.name : __("Not created") },
				])
			),
		].join("");
	}

	create_devis(offer_name) {
		frappe.xcall("odyio_marketplace.api.get_devis_templates", { offer: offer_name }).then((result) => {
			this.open_devis_builder(offer_name, result);
		});
	}

	open_devis_builder(offer_name, result) {
		const dialog = new frappe.ui.Dialog({
			title: __("Create Devis"),
			fields: [{ fieldtype: "HTML", fieldname: "builder" }],
			primary_action_label: __("Confirm Devis"),
			primary_action: () => {
				frappe
					.xcall("odyio_marketplace.api.confirm_supplier_devis", {
						offer: offer_name,
						template: this.devis_builder.selected_template,
					})
					.then(() => {
						dialog.hide();
						frappe.show_alert({ message: __("Devis confirmed"), indicator: "green" });
						this.show_details(offer_name);
					});
			},
		});
		dialog.show();
		this.devis_builder = {
			offer_name,
			dialog,
			templates: result.templates || [],
			selected_template: result.selected_template || result.default_template || "classic",
			default_template: result.default_template || "classic",
			configuration: result.configuration || {},
		};
		dialog.fields_dict.builder.$wrapper.html(this.render_devis_builder(result));
		this.bind_devis_builder_events();
	}

	render_devis_builder(result) {
		return `
			<div class="odyio-devis-builder">
				<div class="odyio-page-description">
					${__("Choose a Devis style and review one live preview. Supplier configuration is saved separately and applies to future Devis.")}
				</div>
				<div class="odyio-devis-toolbar">
					<div class="odyio-template-selector" role="listbox" aria-label="${this.ui.escape(__("Devis template"))}">
						${this.render_template_selector()}
					</div>
					<button type="button" class="btn btn-default btn-sm odyio-configure-devis">${__("Configure")}</button>
				</div>
				<div class="odyio-devis-preview-frame" aria-live="polite">
					${result.preview && result.preview.html ? result.preview.html : this.ui.loading(__("Loading Devis preview..."))}
				</div>
			</div>
		`;
	}

	render_template_selector() {
		return (this.devis_builder.templates || [])
			.map((template) => {
				const selected = template.key === this.devis_builder.selected_template;
				const is_default = template.key === this.devis_builder.default_template;
				return `
					<button type="button" class="odyio-template-option ${selected ? "active" : ""}" data-template="${this.ui.escape(template.key)}" aria-selected="${selected ? "true" : "false"}">
						<span class="odyio-template-title">
							${this.ui.escape(template.label)}
							${is_default ? `<span class="odyio-default-marker">${__("Default")}</span>` : ""}
						</span>
						<span class="odyio-card-description">${this.ui.escape(template.description || "")}</span>
					</button>
				`;
			})
			.join("");
	}

	bind_devis_builder_events() {
		const $wrapper = this.devis_builder.dialog.fields_dict.builder.$wrapper;
		$wrapper.off("click.odyioDevisBuilder", ".odyio-template-option");
		$wrapper.off("click.odyioDevisBuilder", ".odyio-configure-devis");
		$wrapper.on("click.odyioDevisBuilder", ".odyio-template-option", (event) => {
			this.select_devis_template($(event.currentTarget).data("template"));
		});
		$wrapper.on("click.odyioDevisBuilder", ".odyio-configure-devis", () => this.open_devis_configuration());
	}

	select_devis_template(template) {
		if (!template || template === this.devis_builder.selected_template) return;
		this.devis_builder.selected_template = template;
		const $wrapper = this.devis_builder.dialog.fields_dict.builder.$wrapper;
		$wrapper.find(".odyio-template-selector").html(this.render_template_selector());
		this.bind_devis_builder_events();
		this.load_devis_preview();
	}

	load_devis_preview() {
		const $preview = this.devis_builder.dialog.fields_dict.builder.$wrapper.find(".odyio-devis-preview-frame");
		$preview.html(this.ui.loading(__("Refreshing Devis preview...")));
		frappe
			.xcall("odyio_marketplace.api.preview_devis_template", {
				offer: this.devis_builder.offer_name,
				template: this.devis_builder.selected_template,
			})
			.then((result) => {
				$preview.html(result.html || this.ui.empty(__("Preview is unavailable.")));
			})
			.catch(() => {
				$preview.html(this.ui.empty(__("Preview could not be refreshed. Check the Devis configuration and retry.")));
			});
	}

	open_devis_configuration() {
		if (this.devis_configuration_dialog && this.devis_configuration_dialog.$wrapper && this.devis_configuration_dialog.$wrapper.is(":visible")) {
			this.devis_configuration_dialog.$wrapper.find(".modal-content").trigger("focus");
			return;
		}
		if (this.devis_configuration_opening) {
			return;
		}
		this.devis_configuration_opening = true;
		frappe.xcall("odyio_marketplace.api.get_supplier_devis_configuration", { offer: this.devis_builder.offer_name }).then((config) => {
			if (this.devis_configuration_dialog && this.devis_configuration_dialog.$wrapper && this.devis_configuration_dialog.$wrapper.is(":visible")) {
				this.devis_configuration_opening = false;
				return;
			}
			this.pending_devis_logo = null;
			this.pending_devis_logo_url = config.logo || "";
			const dialog = new frappe.ui.Dialog({
				title: __("Devis Configuration"),
				fields: [
					{ fieldtype: "Section Break", label: __("Branding") },
					{ fieldtype: "Data", fieldname: "display_name", label: __("Display Name"), default: config.display_name },
					{ fieldtype: "HTML", fieldname: "logo_upload", options: this.render_devis_logo_upload(config) },
					{ fieldtype: "Section Break", label: __("Contact / Presentation") },
					{ fieldtype: "Small Text", fieldname: "address", label: __("Address"), default: config.address },
					{ fieldtype: "Column Break" },
					{ fieldtype: "Data", fieldname: "city", label: __("City"), default: config.city },
					{ fieldtype: "Data", fieldname: "country", label: __("Country"), default: config.country },
					{ fieldtype: "Data", fieldname: "phone", label: __("Phone"), default: config.phone },
					{ fieldtype: "Data", fieldname: "email", label: __("Email"), default: config.email },
					{ fieldtype: "Small Text", fieldname: "identifiers", label: __("Identifiers"), default: config.identifiers },
					{ fieldtype: "Section Break", label: __("Document Defaults") },
					{
						fieldtype: "Select",
						fieldname: "default_template",
						label: __("Default Template"),
						options: this.devis_builder.templates.map((template) => template.key).join("\n"),
						default: config.default_template || "classic",
						reqd: 1,
					},
					{ fieldtype: "Small Text", fieldname: "footer_terms", label: __("Footer / Terms"), default: config.footer_terms },
				],
				primary_action_label: __("Save Configuration"),
				primary_action: (values) => this.save_devis_configuration(dialog, values),
				secondary_action_label: __("Cancel"),
				secondary_action: () => dialog.hide(),
			});
			this.devis_configuration_dialog = dialog;
			dialog.$wrapper.off("hidden.bs.modal.odyioDevisConfig").on("hidden.bs.modal.odyioDevisConfig", () => {
				if (this.devis_configuration_dialog === dialog) {
					this.devis_configuration_dialog = null;
				}
				this.devis_configuration_opening = false;
			});
			dialog.show();
			this.devis_configuration_opening = false;
			this.bind_devis_configuration_events(dialog, config);
		}).catch(() => {
			this.devis_configuration_opening = false;
		});
	}

	render_devis_logo_upload(config) {
		const input_id = `odyio-devis-logo-input-${frappe.utils.get_random(6)}`;
		const logo = config.logo || "";
		return `
			<div class="odyio-devis-logo-uploader">
				<input id="${input_id}" class="odyio-devis-logo-input sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${this.ui.escape(__("Choose supplier logo"))}">
				<label for="${input_id}" class="odyio-upload-card" tabindex="0" role="button" aria-label="${this.ui.escape(__("Choose supplier logo. JPEG, PNG, or WebP. Maximum 2 MB."))}">
					<div class="odyio-devis-logo-preview">${this.logo_preview(logo)}</div>
					<div class="odyio-upload-copy">
						<div class="odyio-upload-icon" aria-hidden="true">+</div>
						<div class="odyio-upload-title">${logo ? __("Replace logo") : __("Choose supplier logo")}</div>
						<div class="odyio-upload-help">${__("JPEG, PNG, or WebP")} &middot; ${__("Maximum 2 MB")}</div>
						<div class="odyio-selected-file">${logo ? this.ui.escape(logo.split("/").pop()) : __("No logo selected")}</div>
						<div class="odyio-upload-error" role="alert"></div>
					</div>
				</label>
				<div class="odyio-actions" style="justify-content:flex-start;margin-top:8px;">
					<button type="button" class="btn btn-default btn-sm odyio-replace-devis-logo">${logo ? __("Replace Logo") : __("Choose Logo")}</button>
					<button type="button" class="btn btn-default btn-sm odyio-remove-devis-logo">${__("Remove Logo")}</button>
				</div>
			</div>
		`;
	}

	bind_devis_configuration_events(dialog, config) {
		const $body = dialog.$wrapper;
		const $input = $body.find(".odyio-devis-logo-input");
		const open_picker = () => {
			$input.val("");
			$input.trigger("click");
		};
		$body.find(".odyio-replace-devis-logo").on("click", open_picker);
		$body.find(".odyio-upload-card").on("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				open_picker();
			}
		});
		$input.on("change", (event) => this.accept_devis_logo_file(event.target.files && event.target.files[0], $body));
		$body.find(".odyio-remove-devis-logo").on("click", () => {
			this.pending_devis_logo = null;
			this.pending_devis_logo_url = "";
			$body.find(".odyio-devis-logo-preview").html(this.logo_preview(""));
			$body.find(".odyio-selected-file").text(__("Logo will be removed."));
			$body.find(".odyio-upload-error").text("");
		});
	}

	accept_devis_logo_file(file, $body) {
		this.pending_devis_logo = null;
		if (!file) return;
		if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
			$body.find(".odyio-upload-error").text(__("Upload a JPEG, PNG, or WebP image up to 2 MB."));
			$body.find(".odyio-selected-file").text(__("File not accepted."));
			return;
		}
		this.pending_devis_logo = file;
		this.pending_devis_logo_url = URL.createObjectURL(file);
		$body.find(".odyio-devis-logo-preview").html(this.logo_preview(this.pending_devis_logo_url));
		$body.find(".odyio-selected-file").text(`${file.name} (${this.format_file_size(file.size)})`);
		$body.find(".odyio-upload-error").text("");
	}

	save_devis_configuration(dialog, values) {
		const upload = this.pending_devis_logo ? this.upload_devis_logo_file(this.pending_devis_logo) : Promise.resolve({ file_url: this.pending_devis_logo_url });
		dialog.set_primary_action(__("Saving..."), () => {});
		upload
			.then((logo) =>
				frappe.xcall("odyio_marketplace.api.save_supplier_devis_configuration", {
					offer: this.devis_builder.offer_name,
					data: {
						default_template: values.default_template,
						display_name: values.display_name,
						logo: logo.file_url || "",
						address: values.address,
						city: values.city,
						country: values.country,
						phone: values.phone,
						email: values.email,
						identifiers: values.identifiers,
						footer_terms: values.footer_terms,
					},
				})
			)
			.then((config) => {
				dialog.hide();
				this.devis_builder.configuration = config;
				this.devis_builder.default_template = config.default_template || "classic";
				this.devis_builder.dialog.fields_dict.builder.$wrapper.find(".odyio-template-selector").html(this.render_template_selector());
				this.bind_devis_builder_events();
				this.load_devis_preview();
				frappe.show_alert({ message: __("Devis configuration saved."), indicator: "green" });
			});
	}

	upload_devis_logo_file(file) {
		const form = new FormData();
		form.append("offer", this.devis_builder.offer_name);
		form.append("file", file, file.name);
		return fetch("/api/method/odyio_marketplace.api.upload_devis_logo", {
			method: "POST",
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
			body: form,
		})
			.then((response) => response.json())
			.then((response) => {
				if (response.exc || response.exception) throw response;
				return response.message;
			});
	}

	logo_preview(logo) {
		if (logo) {
			return `<div style="width:112px;height:112px;border:1px solid var(--border-color);border-radius:6px;background:var(--card-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;">
				<img src="${this.ui.escape(logo)}" alt="${this.ui.escape(__("Supplier logo"))}" style="max-width:100%;max-height:100%;object-fit:contain;">
			</div>`;
		}
		return `<div aria-label="${this.ui.escape(__("No supplier logo"))}" style="width:112px;height:112px;border:1px dashed var(--border-color);border-radius:6px;background:var(--control-bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;">${__("No logo")}</div>`;
	}

	render_devis_party_review(party) {
		return this.ui.key_values([
			{ label: __("Name"), value: party.display_name || __("Not set") },
			{ label: __("Address"), value: party.address || __("Not set") },
			{ label: __("Phone"), value: party.phone || __("Not set") },
			{ label: __("Email"), value: party.email || __("Not set") },
		]);
	}

	render_devis_fulfillment_review(fulfillment) {
		const rows = [{ label: __("Method"), value: fulfillment.label || __("Not set") }];
		if (fulfillment.delivery_address) {
			rows.push({ label: __("Delivery Address"), value: fulfillment.delivery_address });
		}
		return this.ui.key_values(rows);
	}

	view_devis(offer_name) {
		frappe.xcall("odyio_marketplace.api.get_devis_snapshot", { offer: offer_name }).then((devis) => {
			this.drawer.open({
				title: __("Devis {0}", [offer_name]),
				status: { label: __("Confirmed"), indicator: "green" },
				subtitle: this.ui.escape(__("Printable supplier quotation")),
				body: devis.html,
				actions: [
					{ label: __("Download PDF"), on_click: () => this.download_devis(offer_name) },
				],
			});
		});
	}

	download_devis(offer_name) {
		frappe.xcall("odyio_marketplace.api.download_devis_pdf", { offer: offer_name }).then((result) => {
			window.open(result.file_url, "_blank");
		});
	}

	format_file_size(size) {
		if (size >= 1024 * 1024) {
			return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		}
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}

	collect_rates() {
		const rates = [];
		(this.drawer.$backdrop || $(document)).find("tr[data-item]").each(function () {
			const $row = $(this);
			const $input = $row.find(".odyio-offer-rate");
			if ($input.length) {
				rates.push({
					item: $row.attr("data-item"),
					fixed_rate: flt($input.val()),
				});
			}
		});
		return rates;
	}

	submit_offer(offer_name) {
		frappe.confirm(__("Submit this supplier offer?"), () => {
			const rates = this.collect_rates();
			frappe.xcall("odyio_marketplace.api.submit_supplier_offer", { offer: offer_name, rates: rates.length ? rates : undefined }).then(() => {
				frappe.show_alert({ message: __("Offer submitted"), indicator: "green" });
				this.refresh({ keep_drawer: true });
				this.show_details(offer_name);
			});
		});
	}
}
