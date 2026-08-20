frappe.pages["clinic-purchase-orders"].on_page_load = function (wrapper) {
	new ClinicPurchaseOrders(wrapper);
};

class ClinicPurchaseOrders {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.active_purchase_order = null;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Purchase Orders"),
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
			options: "\nDraft\nTo Receive and Bill\nTo Bill\nTo Receive\nCompleted\nCancelled",
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
			this.$context.text(__("Showing marketplace Purchase Orders for clinic {0}", [context.company_name]));
			this.refresh();
		});
	}

	refresh(options = {}) {
		if (!options.keep_drawer) {
			this.active_purchase_order = null;
			this.drawer.close();
		}
		this.$list.html(this.ui.loading(__("Loading Purchase Orders...")));
		frappe
			.xcall("odyio_marketplace.api.get_clinic_purchase_orders", {
				search: this.search_field.get_value(),
				status: this.status_field.get_value(),
				supplier: this.supplier_field.get_value(),
				date_from: this.date_from_field.get_value(),
				date_to: this.date_to_field.get_value(),
			})
			.then((orders) => this.render_list(orders || []))
			.catch(() => this.$list.html(this.ui.empty(__("Purchase Orders could not be loaded. Please retry."))));
	}

	render_list(orders) {
		if (!orders.length) {
			this.$list.html(this.ui.empty(__("No marketplace Purchase Orders match the current filters. Accepted offers will appear here.")));
			return;
		}

		this.$list.empty();
		orders.forEach((order) => {
			const $row = $(`
				<div class="odyio-row" tabindex="0" data-name="${this.ui.escape(order.name)}">
					<div>
						<h4>${this.ui.escape(order.name)}</h4>
						<div class="odyio-meta">${this.ui.escape(order.supplier_name)} &middot; ${this.ui.date(order.transaction_date)} &middot; ${this.ui.status_badge(this.ui.status_view(order))}</div>
						<div class="odyio-meta">${__("Request")}: ${this.ui.escape(order.quotation_request)} &middot; ${__("Offer")}: ${this.ui.escape(order.supplier_offer || "-")} &middot; ${__("Total")}: ${this.ui.money(order.grand_total)}</div>
					</div>
					<div class="odyio-actions">
						<button class="btn btn-sm btn-primary odyio-open">${__("Details")}</button>
					</div>
				</div>
			`).appendTo(this.$list);
			$row.on("click", (event) => this.show_purchase_order(order.name, event.currentTarget));
			$row.on("keydown", (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					this.show_purchase_order(order.name, event.currentTarget);
				}
			});
			$row.find(".odyio-open").on("click", (event) => {
				event.stopPropagation();
				this.show_purchase_order(order.name, event.currentTarget);
			});
		});
		this.mark_selected();
	}

	mark_selected() {
		this.$list.find(".odyio-row").removeClass("odyio-selected");
		if (this.active_purchase_order) {
			this.$list.find(`[data-name="${CSS.escape(this.active_purchase_order)}"]`).addClass("odyio-selected");
		}
	}

	show_purchase_order(purchase_order, trigger) {
		this.active_purchase_order = purchase_order;
		this.mark_selected();
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
				actions: [{ label: __("View Request"), on_click: () => frappe.set_route("clinic-my-requests") }],
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
					{ label: __("Clinic"), value: po.company_name },
					{ label: __("Supplier"), value: po.supplier_name },
					{ label: __("Transaction Date"), value: this.ui.date(po.transaction_date) },
					{ label: __("Schedule Date"), value: this.ui.date(po.schedule_date) },
					{ label: __("Total"), value: this.ui.money(po.grand_total), html: true },
				])
			),
			this.ui.section(
				__("Linked Odyio Records"),
				this.ui.key_values([
					{ label: __("Quotation Request"), value: po.quotation_request },
					{ label: __("Supplier Offer"), value: po.supplier_offer },
				])
			),
			this.ui.section(
				__("Items"),
				this.ui.table(
					[
						{ label: __("Product") },
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
}
