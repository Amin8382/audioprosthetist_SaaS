frappe.pages["supplier-incoming-requests"].on_page_load = function (wrapper) {
	new SupplierIncomingRequests(wrapper);
};

class SupplierIncomingRequests {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.active_request = null;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Incoming Requests"),
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
		this.offer_state_field = this.page.add_field({
			fieldname: "offer_state",
			label: __("Offer"),
			fieldtype: "Select",
			options: "\nwithout_offer\nwith_offer",
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
			this.$context.text(__("Showing sent requests for supplier {0}", [context.supplier_name]));
			this.refresh();
		});
	}

	refresh(options = {}) {
		if (!options.keep_drawer) {
			this.active_request = null;
			this.drawer.close();
		}
		this.$list.html(this.ui.loading(__("Loading incoming requests...")));
		frappe
			.xcall("odyio_marketplace.api.get_supplier_incoming_requests", {
				search: this.search_field.get_value(),
				offer_state: this.offer_state_field.get_value(),
			})
			.then((requests) => this.render_list(requests || []))
			.catch(() => this.$list.html(this.ui.empty(__("Incoming requests could not be loaded. Please retry."))));
	}

	render_list(requests) {
		if (!requests.length) {
			this.$list.html(this.ui.empty(__("No incoming marketplace requests match the current filters.")));
			return;
		}

		this.$list.empty();
		requests.forEach((request) => {
			const action = request.offer_created ? __("View Offer") : __("Create Offer");
			const $row = $(`
				<div class="odyio-row" tabindex="0" data-name="${this.ui.escape(request.name)}">
					<div>
						<h4>${this.ui.escape(request.name)}</h4>
						<div class="odyio-meta">${this.ui.escape(request.clinic_name)} &middot; ${this.ui.date(request.sent_at || request.creation)} &middot; ${this.ui.status_badge(this.ui.status_view(request))}</div>
						<div class="odyio-meta">${this.ui.escape(request.fulfillment_label || "")} &middot; ${__("Lines")}: ${this.ui.escape(request.item_count)} &middot; ${__("Quantity")}: ${this.ui.escape(request.total_requested_quantity)} &middot; ${request.offer_created ? __("Offer exists") : __("No offer yet")}</div>
					</div>
					<div class="odyio-actions">
						<button class="btn btn-sm btn-default odyio-open">${__("Details")}</button>
						<button class="btn btn-sm btn-primary odyio-action">${action}</button>
					</div>
				</div>
			`).appendTo(this.$list);
			$row.on("click", (event) => this.show_details(request.name, event.currentTarget));
			$row.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					this.show_details(request.name, event.currentTarget);
				}
			});
			$row.find(".odyio-open").on("click", (event) => {
				event.stopPropagation();
				this.show_details(request.name, event.currentTarget);
			});
			$row.find(".odyio-action").on("click", (event) => {
				event.stopPropagation();
				if (request.offer_created && request.offer) {
					this.show_offer(request.offer.name, event.currentTarget);
				} else {
					this.create_offer(request.name);
				}
			});
		});
		this.mark_selected();
	}

	mark_selected() {
		this.$list.find(".odyio-row").removeClass("odyio-selected");
		if (this.active_request) {
			this.$list.find(`[data-name="${CSS.escape(this.active_request)}"]`).addClass("odyio-selected");
		}
	}

	show_details(request_name, trigger) {
		this.active_request = request_name;
		this.mark_selected();
		this.drawer.open({
			title: request_name,
			status: __("Loading"),
			subtitle: this.ui.escape(__("Loading request details...")),
			body: this.ui.loading(__("Loading request details...")),
			trigger,
		});
		frappe.xcall("odyio_marketplace.api.get_supplier_request_details", { quotation_request: request_name }).then((request) => {
			const actions = [];
			if (request.offer) {
				actions.push({ label: __("View Offer"), primary: true, on_click: () => this.show_offer(request.offer.name) });
			} else if (request.can_create_offer) {
				actions.push({ label: __("Create Offer"), primary: true, on_click: () => this.create_offer(request.name) });
			}
			this.drawer.open({
				title: request.name,
				status: this.ui.status_view(request),
				subtitle: `${this.ui.escape(request.clinic_name)} &middot; ${this.ui.escape(request.next_action || "")}`,
				body: this.render_request_details(request),
				actions,
				trigger,
			});
		});
	}

	render_request_details(request) {
		const rows = request.items.map(
			(row) => `
				<tr>
					<td>${this.ui.escape(row.item_name)}</td>
					<td>${this.ui.escape(row.item)}</td>
					<td class="text-right">${this.ui.escape(row.quantity)}</td>
					<td>${this.ui.escape(row.uom || "")}</td>
				</tr>`
		);
		return [
			this.ui.section(
				__("Request Summary"),
				this.ui.key_values([
					{ label: __("Clinic"), value: request.clinic_name },
					{ label: __("Created"), value: this.ui.date(request.creation) },
					{ label: __("Sent"), value: this.ui.date(request.sent_at) },
					{ label: __("Requested Delivery"), value: this.ui.date(request.requested_delivery_date) },
					{ label: __("Fulfillment"), value: request.fulfillment ? request.fulfillment.label : "" },
					{ label: __("Lines"), value: request.item_count },
					{ label: __("Total Quantity"), value: request.total_requested_quantity },
				])
			),
			request.fulfillment && request.fulfillment.delivery_address
				? this.ui.section(__("Delivery Address"), `<pre>${this.ui.escape(request.fulfillment.delivery_address.formatted || "")}</pre>`)
				: "",
			this.ui.section(
				__("Requested Items"),
				this.ui.table(
					[
						{ label: __("Item") },
						{ label: __("Code") },
						{ label: __("Qty"), class: "text-right" },
						{ label: __("UOM") },
					],
					rows
				)
			),
			this.ui.section(
				__("Offer State"),
				this.ui.key_values([
					{ label: __("Current State"), value: request.display_status || request.status },
					{ label: __("Next Action"), value: request.next_action || "" },
					{ label: __("Current Offer"), value: request.offer ? request.offer.name : __("No offer created") },
					{ label: __("Available Action"), value: request.offer ? __("View Offer") : __("Create Offer") },
				])
			),
			request.clinic_notes ? this.ui.section(__("Clinic Notes"), `<p>${this.ui.escape(request.clinic_notes)}</p>`) : "",
		].join("");
	}

	create_offer(request_name) {
		frappe.xcall("odyio_marketplace.api.create_supplier_offer_from_request", { quotation_request: request_name }).then((offer) => {
			this.refresh({ keep_drawer: true });
			this.show_offer_review(offer);
		});
	}

	show_offer_review(offer) {
		const rows = offer.items
			.map(
				(row) => `
				<tr data-item="${this.ui.escape(row.item)}">
					<td>${this.ui.escape(row.item_name)}</td>
					<td class="text-right">${this.ui.escape(row.quantity)}</td>
					<td class="text-right"><input class="form-control input-xs odyio-offer-rate" type="number" min="0.01" step="0.01" value="${row.fixed_rate || ""}" aria-label="${this.ui.escape(__("Offer rate for {0}", [row.item_name]))}"></td>
				</tr>`
			)
			.join("");
		const dialog = new frappe.ui.Dialog({
			title: __("Review Offer {0}", [offer.name]),
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "review",
					options: `
						<p class="text-muted">${__("Request")}: ${this.ui.escape(offer.quotation_request)} &middot; ${this.ui.escape(offer.clinic_name)}</p>
						${this.ui.table(
							[
								{ label: __("Item") },
								{ label: __("Qty"), class: "text-right" },
								{ label: __("Offer Rate"), class: "text-right" },
							],
							[rows]
						)}
					`,
				},
			],
			primary_action_label: __("Submit Offer"),
			primary_action: () => {
				frappe.confirm(__("Submit this supplier offer?"), () => {
					const rates = this.collect_rates(dialog.$wrapper);
					frappe.xcall("odyio_marketplace.api.submit_supplier_offer", { offer: offer.name, rates }).then(() => {
						dialog.hide();
						frappe.show_alert({ message: __("Offer submitted"), indicator: "green" });
						this.refresh({ keep_drawer: true });
						this.show_offer(offer.name);
					});
				});
			},
		});
		dialog.show();
	}

	show_offer(offer_name, trigger) {
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
				actions.push({ label: __("Create Devis"), primary: !offer.can_submit, on_click: () => frappe.set_route("supplier-my-offers") });
			}
			if (offer.can_view_devis) {
				actions.push({ label: __("View Devis"), on_click: () => frappe.set_route("supplier-my-offers") });
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
					{ label: __("Result"), value: offer.result },
					{ label: __("Fulfillment"), value: offer.fulfillment ? offer.fulfillment.label : "" },
					{ label: __("Current State"), value: offer.display_status || offer.status },
					{ label: __("Next Action"), value: offer.next_action || "" },
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
		].join("");
	}

	collect_rates($scope) {
		const rates = [];
		$scope.find("tr[data-item]").each(function () {
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
			const rates = this.collect_rates(this.drawer.$backdrop || $(document));
			frappe.xcall("odyio_marketplace.api.submit_supplier_offer", { offer: offer_name, rates: rates.length ? rates : undefined }).then(() => {
				frappe.show_alert({ message: __("Offer submitted"), indicator: "green" });
				this.refresh({ keep_drawer: true });
				this.show_offer(offer_name);
			});
		});
	}
}
