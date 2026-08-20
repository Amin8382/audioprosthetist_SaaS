frappe.pages["clinic-my-requests"].on_page_load = function (wrapper) {
	new ClinicMyRequests(wrapper);
};

class ClinicMyRequests {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.requests = [];
		this.active_request = null;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("My Requests"),
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
			label: __("Request Status"),
			fieldtype: "Select",
			options: "\nDraft\nSent\nCancelled\nExpired",
			change: () => this.refresh(),
		});
		this.supplier_field = this.page.add_field({
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			options: "Supplier",
			change: () => this.refresh(),
		});
		this.date_from_field = this.page.add_field({
			fieldname: "date_from",
			label: __("From"),
			fieldtype: "Date",
			change: () => this.refresh(),
		});
		this.date_to_field = this.page.add_field({
			fieldname: "date_to",
			label: __("To"),
			fieldtype: "Date",
			change: () => this.refresh(),
		});
		this.offer_state_field = this.page.add_field({
			fieldname: "offer_state",
			label: __("Offer"),
			fieldtype: "Select",
			options: "\nwithout_offer\nwith_offer",
			change: () => this.refresh(),
		});
		this.decision_field = this.page.add_field({
			fieldname: "decision_state",
			label: __("Decision"),
			fieldtype: "Select",
			options: "\nno_offer\noffer_draft\nawaiting_decision\naccepted\nrejected",
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
		frappe.xcall("odyio_marketplace.api.get_clinic_marketplace_context").then((context) => {
			this.context = context;
			this.$context.text(__("Showing marketplace requests for clinic {0}", [context.company_name]));
			this.refresh();
		});
	}

	refresh(options = {}) {
		if (!options.keep_drawer) {
			this.active_request = null;
			this.drawer.close();
		}
		this.$list.html(this.ui.loading(__("Loading marketplace requests...")));
		frappe
			.xcall("odyio_marketplace.api.get_clinic_my_requests", {
				search: this.search_field.get_value(),
				status: this.status_field.get_value(),
				supplier: this.supplier_field.get_value(),
				offer_state: this.offer_state_field.get_value(),
				decision_state: this.decision_field.get_value(),
				date_from: this.date_from_field.get_value(),
				date_to: this.date_to_field.get_value(),
			})
			.then((requests) => {
				this.requests = requests || [];
				this.render_list(this.requests);
			})
			.catch(() => this.$list.html(this.ui.empty(__("Marketplace requests could not be loaded. Please retry."))));
	}

	render_list(requests) {
		if (!requests.length) {
			this.$list.html(this.ui.empty(__("No marketplace requests match the current filters. Use the catalogue to create a request.")));
			return;
		}

		this.$list.empty();
		requests.forEach((request) => {
			const $row = $(`
				<div class="odyio-row" tabindex="0" data-name="${this.ui.escape(request.name)}">
					<div>
						<h4>${this.ui.escape(request.name)}</h4>
						<div class="odyio-meta">${this.ui.escape(request.supplier_name)} &middot; ${this.ui.date(request.sent_at || request.creation)} &middot; ${this.ui.status_badge(this.ui.status_view(request))}</div>
						<div class="odyio-meta">${this.ui.escape(request.fulfillment_label || "")} &middot; ${__("Lines")}: ${this.ui.escape(request.item_count)} &middot; ${__("Quantity")}: ${this.ui.escape(request.total_requested_quantity)} &middot; ${this.ui.escape(request.empty_state || "")}</div>
					</div>
					<div class="odyio-actions">
						<button class="btn btn-sm btn-primary odyio-open">${__("Details")}</button>
					</div>
				</div>
			`).appendTo(this.$list);
			$row.on("click", (event) => this.show_request(request.name, event.currentTarget));
			$row.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					this.show_request(request.name, event.currentTarget);
				}
			});
			$row.find(".odyio-open").on("click", (event) => {
				event.stopPropagation();
				this.show_request(request.name, event.currentTarget);
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

	show_request(request_name, trigger) {
		this.active_request = request_name;
		this.mark_selected();
		this.drawer.open({
			title: request_name,
			status: __("Loading"),
			subtitle: this.ui.escape(__("Loading request details...")),
			body: this.ui.loading(__("Loading request details...")),
			trigger,
		});
		frappe.xcall("odyio_marketplace.api.get_clinic_request_details", { quotation_request: request_name }).then((request) => {
			const actions = [];
			if (request.actions.can_view_offer && request.offer) {
				actions.push({ label: __("View Offer"), on_click: () => this.show_offer(request.offer.name) });
			}
			if (request.actions.can_accept_offer && request.offer) {
				actions.push({ label: __("Accept Offer"), primary: true, on_click: () => this.accept_offer(request.offer.name) });
			}
			if (request.actions.can_reject_offer && request.offer) {
				actions.push({ label: __("Reject Offer"), on_click: () => this.reject_offer(request.offer.name) });
			}
			if (request.actions.can_view_purchase_order && request.purchase_order) {
				actions.push({ label: __("View Purchase Order"), on_click: () => this.show_purchase_order(request.purchase_order.name) });
			}
			this.drawer.open({
				title: request.name,
				status: this.ui.status_view(request),
				subtitle: `${this.ui.escape(request.supplier_name)} &middot; ${this.ui.escape(request.next_action || request.actions.state_label)}`,
				body: this.render_request_details(request),
				actions,
				trigger,
			});
		});
	}

	render_request_details(request) {
		const item_rows = request.items.map(
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
					{ label: __("Supplier"), value: request.supplier_name },
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
					item_rows
				)
			),
			this.ui.section(
				__("Status Timeline"),
				this.ui.key_values([
					{ label: __("Current State"), value: request.display_status || request.status },
					{ label: __("Next Action"), value: request.next_action || "" },
					{ label: __("Linked Offer"), value: request.offer ? request.offer.name : __("No offer yet") },
					{ label: __("Purchase Order"), value: request.purchase_order ? request.purchase_order.name : __("Not created") },
				])
			),
			request.clinic_notes ? this.ui.section(__("Clinic Notes"), `<p>${this.ui.escape(request.clinic_notes)}</p>`) : "",
		].join("");
	}

	show_offer(offer_name, trigger) {
		this.drawer.open({
			title: offer_name,
			status: __("Loading"),
			subtitle: this.ui.escape(__("Loading offer details...")),
			body: this.ui.loading(__("Loading offer details...")),
			trigger,
		});
		frappe.xcall("odyio_marketplace.api.get_clinic_offer_details", { offer: offer_name }).then((offer) => {
			const actions = [];
			if (offer.can_accept) {
				actions.push({ label: __("Accept Offer"), primary: true, on_click: () => this.accept_offer(offer.name) });
			}
			if (offer.can_reject) {
				actions.push({ label: __("Reject Offer"), on_click: () => this.reject_offer(offer.name) });
			}
			if (offer.purchase_order) {
				actions.push({ label: __("View Purchase Order"), on_click: () => this.show_purchase_order(offer.purchase_order.name) });
			}
			if (offer.can_view_devis) {
				actions.push({ label: __("View Devis"), on_click: () => this.view_devis(offer.name) });
			}
			this.drawer.open({
				title: offer.name,
				status: this.ui.status_view(offer),
				subtitle: `${__("Request")}: ${this.ui.escape(offer.quotation_request)} &middot; ${this.ui.escape(offer.supplier_name)} &middot; ${this.ui.escape(offer.next_action || "")}`,
				body: this.render_offer_details(offer),
				actions,
				trigger,
			});
		});
	}

	render_offer_details(offer) {
		const rows = offer.items.map(
			(row) => `
				<tr>
					<td>${this.ui.escape(row.item_name)}</td>
					<td class="text-right">${this.ui.escape(row.quantity)}</td>
					<td class="text-right">${this.ui.money(row.fixed_rate)}</td>
					<td class="text-right">${this.ui.money(row.amount)}</td>
				</tr>`
		);
		return [
			this.ui.section(
				__("Offer Summary"),
				this.ui.key_values([
					{ label: __("Supplier"), value: offer.supplier_name },
					{ label: __("Request"), value: offer.quotation_request },
					{ label: __("Submitted"), value: this.ui.date(offer.sent_at) },
					{ label: __("Decision"), value: offer.decision_state },
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
				__("Priced Items"),
				this.ui.table(
					[
						{ label: __("Item") },
						{ label: __("Qty"), class: "text-right" },
						{ label: __("Offer Rate"), class: "text-right" },
						{ label: __("Amount"), class: "text-right" },
					],
					rows
				)
			),
			this.ui.section(
				__("Linked Records"),
				this.ui.key_values([
					{ label: __("Purchase Order"), value: offer.purchase_order ? offer.purchase_order.name : __("Not created") },
				])
			),
		].join("");
	}

	accept_offer(offer_name) {
		frappe.confirm(__("Accept this supplier offer and create one draft Purchase Order?"), () => {
			frappe.xcall("odyio_marketplace.api.accept_supplier_offer_for_clinic", { offer: offer_name }).then((result) => {
				frappe.show_alert({ message: __("Offer accepted"), indicator: "green" });
				this.refresh({ keep_drawer: true });
				this.show_purchase_order(result.purchase_order.name);
			});
		});
	}

	reject_offer(offer_name) {
		frappe.confirm(__("Reject this supplier offer?"), () => {
			frappe.xcall("odyio_marketplace.api.reject_supplier_offer_for_clinic", { offer: offer_name }).then((result) => {
				frappe.show_alert({ message: __("Offer rejected"), indicator: "orange" });
				this.refresh({ keep_drawer: true });
				this.show_offer(result.offer.name);
			});
		});
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

	show_purchase_order(purchase_order, trigger) {
		this.drawer.open({
			title: purchase_order,
			status: __("Loading"),
			subtitle: this.ui.escape(__("Loading Purchase Order...")),
			body: this.ui.loading(__("Loading Purchase Order...")),
			trigger,
		});
		frappe.xcall("odyio_marketplace.api.get_clinic_purchase_order_details", { purchase_order }).then((po) => {
			this.drawer.open({
				title: po.name,
				status: this.ui.status_view(po),
				subtitle: `${this.ui.escape(po.supplier_name)} &middot; ${__("Request")}: ${this.ui.escape(po.quotation_request)}`,
				body: this.render_purchase_order_details(po),
				trigger,
			});
		});
	}

	render_purchase_order_details(po) {
		const rows = po.items.map(
			(row) => `
				<tr>
					<td>${this.ui.escape(row.item_name)}</td>
					<td>${this.ui.escape(row.item_code)}</td>
					<td class="text-right">${this.ui.escape(row.quantity)}</td>
					<td>${this.ui.escape(row.uom || "")}</td>
					<td class="text-right">${this.ui.money(row.rate)}</td>
					<td class="text-right">${this.ui.money(row.amount)}</td>
				</tr>`
		);
		return [
			this.ui.section(
				__("Purchase Order Summary"),
				this.ui.key_values([
					{ label: __("Company"), value: po.company_name },
					{ label: __("Supplier"), value: po.supplier_name },
					{ label: __("Transaction Date"), value: this.ui.date(po.transaction_date) },
					{ label: __("Schedule Date"), value: this.ui.date(po.schedule_date) },
					{ label: __("Total"), value: this.ui.money(po.grand_total), html: true },
				])
			),
			this.ui.section(
				__("Linked Marketplace Records"),
				this.ui.key_values([
					{ label: __("Quotation Request"), value: po.quotation_request },
					{ label: __("Supplier Offer"), value: po.supplier_offer },
				])
			),
			this.ui.section(
				__("Items"),
				this.ui.table(
					[
						{ label: __("Item") },
						{ label: __("Code") },
						{ label: __("Qty"), class: "text-right" },
						{ label: __("UOM") },
						{ label: __("Rate"), class: "text-right" },
						{ label: __("Amount"), class: "text-right" },
					],
					rows
				)
			),
		].join("");
	}
}
