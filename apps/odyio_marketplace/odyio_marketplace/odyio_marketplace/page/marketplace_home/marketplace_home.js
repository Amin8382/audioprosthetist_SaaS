frappe.pages["marketplace-home"].on_page_load = function (wrapper) {
	new MarketplaceHome(wrapper);
};

class MarketplaceHome {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Odyio Home"),
			single_column: true,
		});
		this.make_layout();
		this.refresh();
	}

	make_layout() {
		this.$body = $(`
			<div class="odyio-page-shell">
				<div class="odyio-page-description">${__("Your Odyio workspace, filtered for your role.")}</div>
				<div class="odyio-home-content">${this.ui.loading(__("Loading Odyio Home..."))}</div>
			</div>
		`).appendTo(this.page.main);
		this.$content = this.$body.find(".odyio-home-content");
	}

	refresh() {
		frappe
			.xcall("odyio_marketplace.api.get_marketplace_home_context")
			.then((context) => this.render(context))
			.catch(() => this.$content.html(this.ui.empty(__("Odyio Home could not be loaded."))));
	}

	render(context) {
		const sections = [];
		if (context.is_clinic && context.clinic) {
			sections.push(this.render_clinic(context.clinic));
		}
		if (context.is_supplier && context.supplier) {
			sections.push(this.render_supplier(context.supplier));
		}
		if (context.is_staff && context.staff) {
			sections.push(this.render_staff(context.staff));
		}
		if (context.is_admin && context.admin) {
			sections.push(this.render_admin(context.admin));
		}
		this.$content.html(sections.join(""));
	}

	render_clinic(clinic) {
		return `
			${this.render_hero(__("Clinic Home"), __("Browse products, create requests, decide supplier offers, and follow marketplace orders."), [
				{ label: __("Browse Catalogue"), route: "marketplace-catalogue", primary: true },
				{ label: __("My Requests"), route: "clinic-my-requests" },
				{ label: __("Purchase Orders"), route: "clinic-purchase-orders" },
			])}
			${this.render_counts([
				{ label: __("Awaiting supplier"), value: clinic.counts.awaiting_supplier },
				{ label: __("Awaiting decision"), value: clinic.counts.awaiting_decision },
				{ label: __("Accepted"), value: clinic.counts.accepted },
				{ label: __("Purchase Orders"), value: clinic.counts.purchase_orders },
				{ label: __("Patients"), value: clinic.counts.patients || 0 },
				{ label: __("Audiograms"), value: clinic.counts.audiogrammes || 0 },
			])}
			${this.render_grouped_sections(clinic.sections || [])}
			${this.render_recent_requests(__("Recent Requests"), clinic.recent_requests)}
		`;
	}

	render_supplier(supplier) {
		return `
			${this.render_hero(__("Supplier Home"), __("Manage products, review incoming requests, price offers, and track clinic decisions."), [
				{ label: __("My Products"), route: "supplier-my-products", primary: true },
				{ label: __("View Incoming Requests"), route: "supplier-incoming-requests" },
				{ label: __("My Offers"), route: "supplier-my-offers" },
			])}
			${this.render_counts([
				{ label: __("Products"), value: supplier.counts.products },
				{ label: __("Available products"), value: supplier.counts.available_products },
				{ label: __("Need offer"), value: supplier.counts.needs_offer },
				{ label: __("Draft offers"), value: supplier.counts.draft_offers },
				{ label: __("Awaiting decision"), value: supplier.counts.awaiting_decision },
				{ label: __("Decided"), value: supplier.counts.decided },
			])}
			${this.render_recent_requests(__("Recent Incoming Requests"), supplier.recent_requests)}
			${this.render_recent_offers(__("Recent Offers"), supplier.recent_offers)}
		`;
	}

	render_staff(staff) {
		return `
			${this.render_hero(__("Odyio Operations"), __("Use ERP operations, audiometry, purchasing, stock, and marketplace monitoring from one workspace."), [
				{ label: __("Marketplace Activity"), route: "marketplace-home", primary: true },
				{ label: __("Items"), route: "List/Item/List" },
				{ label: __("Suppliers"), route: "List/Supplier/List" },
				{ label: __("Purchase Orders"), route: "List/Purchase Order/List" },
				{ label: __("Audiograms"), route: "List/Audiogramme/List" },
			])}
			${this.render_counts([
				{ label: __("Products"), value: staff.counts.items },
				{ label: __("Suppliers"), value: staff.counts.suppliers },
				{ label: __("Purchase Orders"), value: staff.counts.purchase_orders },
				{ label: __("Marketplace Requests"), value: staff.counts.marketplace_requests },
				{ label: __("Marketplace Offers"), value: staff.counts.marketplace_offers },
				{ label: __("Audiograms"), value: staff.counts.audiogrammes || 0 },
			])}
			${this.render_grouped_sections(staff.sections || [])}
		`;
	}

	render_admin(admin) {
		return `
			${this.render_hero(__("Odyio"), __("Marketplace, ERP operations, audiology, and administration in one workspace."), [
				{ label: __("Open Odyio Workspace"), route: "Workspaces/Odyio Marketplace", primary: true },
				{ label: __("Purchase Orders"), route: "List/Purchase Order/List" },
				{ label: __("Audiograms"), route: "List/Audiogramme/List" },
				{ label: __("Users"), route: "List/User/List" },
				{ label: __("ERPNext Settings"), route: "Workspaces/ERPNext Settings" },
			])}
			${this.render_counts([
				{ label: __("Requests"), value: admin.counts.requests },
				{ label: __("Offers"), value: admin.counts.offers },
				{ label: __("Marketplace Products"), value: admin.counts.marketplace_products },
				{ label: __("Open POs"), value: admin.counts.open_purchase_orders },
				{ label: __("Audiograms"), value: admin.counts.audiogrammes || 0 },
				{ label: __("Users"), value: admin.counts.users },
			])}
			${this.render_grouped_sections(admin.sections || [])}
			${this.render_installed_integrations(admin.installed_integrations || [])}
		`;
	}

	render_hero(title, description, actions) {
		return this.ui.section(
			title,
			`
				<p class="odyio-page-description">${this.ui.escape(description)}</p>
				<div class="odyio-actions" style="justify-content:flex-start;">
					${actions
						.map(
							(action) =>
								`<button class="btn btn-sm ${action.primary ? "btn-primary" : "btn-default"}" data-route="${this.ui.escape(action.route)}">${this.ui.escape(action.label)}</button>`
						)
						.join("")}
				</div>
			`
		);
	}

	render_counts(counts) {
		const cards = counts
			.map(
				(count) => `
				<div class="odyio-section">
					<div class="odyio-kv-label">${this.ui.escape(count.label)}</div>
					<div class="odyio-kv-value" style="font-size:24px;">${this.ui.escape(count.value)}</div>
				</div>`
			)
			.join("");
		return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">${cards}</div>`;
	}

	render_grouped_sections(sections) {
		sections = (sections || []).filter((section) => (section.entries || []).length);
		if (!sections.length) {
			return "";
		}
		return sections
			.map((section) => {
				const cards = (section.entries || [])
					.map(
						(entry) => `
						<button class="odyio-home-card" data-route="${this.ui.escape(entry.route)}">
							<span>
								<span class="odyio-card-title">${this.ui.escape(entry.label)}</span>
								<span class="odyio-card-description">${this.ui.escape(entry.description || "")}</span>
							</span>
							${entry.count !== undefined ? `<span class="odyio-card-count">${this.ui.escape(entry.count)}</span>` : ""}
						</button>`
					)
					.join("");
				return this.ui.section(
					section.label,
					`<div class="odyio-home-card-grid">${cards}</div>`
				);
			})
			.join("");
	}

	render_installed_integrations(integrations) {
		if (!integrations.length) {
			return "";
		}
		const rows = integrations
			.map(
				(row) => `
				<tr>
					<td>${this.ui.escape(row.label)}</td>
					<td>${this.ui.status_badge(row.status)}</td>
					<td>${this.ui.escape(row.description || "")}</td>
				</tr>`
			)
			.join("");
		return this.ui.section(
			__("Installed Integrations"),
			this.ui.table(
				[
					{ label: __("Integration") },
					{ label: __("Status") },
					{ label: __("Notes") },
				],
				[rows]
			)
		);
	}

	render_recent_requests(title, requests) {
		if (!requests || !requests.length) {
			return this.ui.section(title, this.ui.empty(__("No recent requests.")));
		}
		const rows = requests
			.map(
				(row) => `
				<tr>
					<td>${this.ui.escape(row.name)}</td>
					<td>${this.ui.escape(row.supplier_name || row.clinic_name || "")}</td>
					<td>${this.ui.status_badge(this.ui.status_view(row))}</td>
					<td class="text-right">${this.ui.escape(row.total_requested_quantity)}</td>
				</tr>`
			)
			.join("");
		return this.ui.section(
			title,
			this.ui.table(
				[
					{ label: __("Reference") },
					{ label: __("Actor") },
					{ label: __("Status") },
					{ label: __("Qty"), class: "text-right" },
				],
				[rows]
			)
		);
	}

	render_recent_offers(title, offers) {
		if (!offers || !offers.length) {
			return this.ui.section(title, this.ui.empty(__("No recent offers.")));
		}
		const rows = offers
			.map(
				(row) => `
				<tr>
					<td>${this.ui.escape(row.name)}</td>
					<td>${this.ui.escape(row.quotation_request)}</td>
					<td>${this.ui.status_badge(this.ui.status_view(row))}</td>
					<td class="text-right">${this.ui.money(row.total_amount)}</td>
				</tr>`
			)
			.join("");
		return this.ui.section(
			title,
			this.ui.table(
				[
					{ label: __("Offer") },
					{ label: __("Request") },
					{ label: __("Status") },
					{ label: __("Total"), class: "text-right" },
				],
				[rows]
			)
		);
	}
}

$(document).on("click", ".odyio-home-content [data-route]", function () {
	frappe.set_route(String($(this).data("route")).split("/"));
});
