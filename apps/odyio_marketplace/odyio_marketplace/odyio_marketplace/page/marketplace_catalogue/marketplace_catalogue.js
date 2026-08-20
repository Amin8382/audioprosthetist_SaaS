frappe.pages["marketplace-catalogue"].on_page_load = function (wrapper) {
	new MarketplaceCatalogue(wrapper);
};

class MarketplaceCatalogue {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Catalogue"),
			single_column: true,
		});
		this.items = [];
		this.cart = {};
		this.line_notes = {};
		this.request_notes = "";
		this.fulfillment_method = "";
		this.delivery_address = {};
		this.filters = {};
		this.review_open = false;
		this.creating_request = false;
		this.make_controls();
		this.make_layout();
		this.load_context();
	}

	make_controls() {
		this.search_field = this.page.add_field({
			fieldname: "search",
			label: __("Search"),
			fieldtype: "Data",
			change: () => this.refresh_items(),
		});
		this.group_field = this.page.add_field({
			fieldname: "item_group",
			label: __("Category"),
			fieldtype: "Select",
			change: () => this.refresh_items(),
		});
		this.supplier_field = this.page.add_field({
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Select",
			change: () => this.refresh_items(),
		});
		this.ear_side_field = this.page.add_field({
			fieldname: "ear_side",
			label: __("Ear Side"),
			fieldtype: "Select",
			change: () => this.refresh_items(),
		});
		this.page.set_primary_action(__("Review Request"), () => this.open_review_drawer(), "cart");
	}

	make_layout() {
		this.$body = $(`
			<div class="odyio-catalogue odyio-page-shell">
				<div class="odyio-page-description odyio-clinic-context"></div>
				<div class="odyio-catalogue-feedback hide"></div>
				<div class="odyio-catalogue-grid"></div>
			</div>
		`).appendTo(this.page.main);
		this.$context = this.$body.find(".odyio-clinic-context");
		this.$feedback = this.$body.find(".odyio-catalogue-feedback");
		this.$grid = this.$body.find(".odyio-catalogue-grid");
		this.inject_styles();
	}

	inject_styles() {
		$(`<style>
			.odyio-catalogue-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; margin-top: 12px; }
			.odyio-catalogue-item { border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; background: var(--card-bg); min-height: 310px; }
			.odyio-product-image { height: 132px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--subtle-fg); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; overflow: hidden; }
			.odyio-product-image img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
			.odyio-product-fallback { color: var(--text-muted); font-size: 12px; text-align: center; padding: 12px; }
			.odyio-detail-image { height: 220px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--subtle-fg); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; overflow: hidden; }
			.odyio-detail-image img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
			.odyio-review-thumb { width: 72px; height: 72px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--subtle-fg); display: flex; align-items: center; justify-content: center; overflow: hidden; }
			.odyio-review-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
			.odyio-review-line { display: grid; grid-template-columns: 72px 1fr; gap: 12px; align-items: start; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
			.odyio-review-line:last-child { border-bottom: 0; }
			.odyio-review-controls { display: grid; grid-template-columns: minmax(90px, 120px) 1fr auto; gap: 8px; align-items: end; margin-top: 10px; }
			.odyio-review-notes { margin-top: 12px; }
			.odyio-catalogue-item h4 { margin: 0 0 6px; font-size: 15px; line-height: 1.3; }
			.odyio-catalogue-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
			.odyio-catalogue-actions { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
			.odyio-catalogue-actions input { width: 80px; }
			.odyio-review-message { padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--control-bg); margin-bottom: 12px; }
			.odyio-review-message.odyio-review-error { border-color: var(--red-100); background: var(--red-50); color: var(--red-700); }
			.odyio-catalogue-feedback { border: 1px solid var(--green-100); background: var(--green-50); color: var(--green-700); border-radius: 6px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
			@media (max-width: 767px) {
				.odyio-review-line { grid-template-columns: 1fr; }
				.odyio-review-controls { grid-template-columns: 1fr; }
			}
		</style>`).appendTo(document.head);
	}

	load_context() {
		frappe
			.xcall("odyio_marketplace.api.get_clinic_catalog_context")
			.then((context) => {
				this.context = context;
				this.delivery_address = context.default_delivery_address || {};
				this.$context.text(__("Creating requests for clinic {0}", [context.company]));
				return frappe.xcall("odyio_marketplace.api.get_catalog_filters");
			})
			.then((filters) => {
				this.filters = filters;
				this.set_select_options();
				this.refresh_items();
			});
	}

	set_select_options() {
		this.group_field.df.options = ["", ...(this.filters.item_groups || [])].join("\n");
		this.group_field.refresh();
		this.supplier_field.df.options = [
			"",
			...(this.filters.suppliers || []).map((supplier) => ({
				label: supplier.supplier_name,
				value: supplier.name,
			})),
		];
		this.supplier_field.refresh();
		this.ear_side_field.df.options = ["", ...(this.filters.ear_sides || [])].join("\n");
		this.ear_side_field.refresh();
	}

	refresh_items() {
		this.$grid.html(this.ui.loading(__("Loading marketplace products...")));
		frappe
			.xcall("odyio_marketplace.api.get_catalog_items", {
				search: this.search_field.get_value(),
				item_group: this.group_field.get_value(),
				supplier: this.supplier_field.get_value(),
				ear_side: this.ear_side_field.get_value(),
			})
			.then((items) => {
				this.items = items || [];
				this.render_items();
			})
			.catch(() => this.$grid.html(this.ui.empty(__("Marketplace products could not be loaded. Please retry."))));
	}

	render_items() {
		if (!this.items.length) {
			this.$grid.html(this.ui.empty(__("No marketplace products match the current filters.")));
			return;
		}

		this.$grid.empty();
		this.items.forEach((item) => {
			const quantity = this.cart[item.name] || 1;
			const image = this.render_product_image(item, "odyio-product-image");
			const $item = $(`
				<div class="odyio-catalogue-item" data-item="${this.ui.escape(item.name)}">
					${image}
					<h4>${this.ui.escape(item.item_name || item.name)}</h4>
					<div class="odyio-catalogue-meta">${this.ui.escape(item.supplier_name || item.marketplace_supplier || "")}</div>
					<div>${this.ui.escape(item.description || item.technical_specs || "")}</div>
					<div class="odyio-catalogue-meta">${__("Reference")}: ${this.ui.escape(item.supplier_reference || "-")}</div>
					<div class="odyio-catalogue-actions">
						<input class="form-control input-xs odyio-qty" type="number" min="1" step="1" value="${this.ui.escape(quantity)}" aria-label="${this.ui.escape(__("Quantity for {0}", [item.item_name || item.name]))}">
						<button class="btn btn-sm btn-primary odyio-add">${this.cart[item.name] ? __("Update") : __("Select")}</button>
						<button class="btn btn-sm btn-default odyio-open">${__("Details")}</button>
					</div>
				</div>
			`).appendTo(this.$grid);
			this.attach_image_fallback($item);
			$item.find(".odyio-add").on("click", () => this.select_item(item.name, flt($item.find(".odyio-qty").val())));
			$item.find(".odyio-qty").on("change", () => {
				if (this.cart[item.name]) {
					this.select_item(item.name, flt($item.find(".odyio-qty").val()), { silent: true });
				}
			});
			$item.find(".odyio-open").on("click", () => this.show_item_details(item));
		});
	}

	select_item(item_name, quantity, options = {}) {
		if (quantity <= 0) {
			frappe.msgprint(__("Quantity must be greater than zero."));
			return;
		}
		this.cart[item_name] = quantity;
		this.update_catalogue_card(item_name);
		if (!options.silent) {
			frappe.show_alert({ message: __("Item selected"), indicator: "green" });
		}
		if (this.review_open) {
			this.open_review_drawer({ preserve_focus: true });
		}
	}

	update_catalogue_card(item_name) {
		const $card = this.$grid.find(`[data-item="${CSS.escape(item_name)}"]`);
		if (!$card.length) return;
		$card.find(".odyio-qty").val(this.cart[item_name] || 1);
		$card.find(".odyio-add").text(this.cart[item_name] ? __("Update") : __("Select"));
	}

	render_product_image(item, wrapper_class) {
		const alt = this.ui.escape(item.item_name || item.name || __("Marketplace product"));
		if (!item.image) {
			return `<div class="${wrapper_class}"><div class="odyio-product-fallback">${__("No product image")}</div></div>`;
		}

		const src = this.ui.escape(item.image);
		return `
			<div class="${wrapper_class}">
				<img src="${src}" alt="${alt}" loading="lazy">
			</div>
		`;
	}

	attach_image_fallback($container) {
		$container.find(".odyio-product-image img, .odyio-detail-image img, .odyio-review-thumb img").on("error", function () {
			$(this).closest(".odyio-product-image, .odyio-detail-image, .odyio-review-thumb").html(`<div class="odyio-product-fallback">${__("Image unavailable")}</div>`);
		});
	}

	show_item_details(item) {
		const dialog = new frappe.ui.Dialog({
			title: item.item_name || item.name,
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "details",
					options: `
						<div>
							${this.render_product_image(item, "odyio-detail-image")}
							<p class="text-muted">${this.ui.escape(item.supplier_name || "")}</p>
							<p>${this.ui.escape(item.description || item.technical_specs || __("No additional details are available."))}</p>
							<table class="table table-bordered">
								<tbody>
									<tr><th>${__("Category")}</th><td>${this.ui.escape(item.item_group || "-")}</td></tr>
									<tr><th>${__("Supplier Reference")}</th><td>${this.ui.escape(item.supplier_reference || "-")}</td></tr>
									<tr><th>${__("Ear Side")}</th><td>${this.ui.escape(item.ear_side || "-")}</td></tr>
									<tr><th>${__("Unit")}</th><td>${this.ui.escape(item.stock_uom || "-")}</td></tr>
								</tbody>
							</table>
						</div>
					`,
				},
			],
			primary_action_label: __("Select Item"),
			primary_action: () => {
				this.select_item(item.name, this.cart[item.name] || 1);
				dialog.hide();
			},
		});
		dialog.show();
		this.attach_image_fallback(dialog.$wrapper);
	}

	selected_items() {
		return Object.keys(this.cart).map((item) => ({
			item,
			quantity: this.cart[item],
			line_notes: this.line_notes[item] || "",
		}));
	}

	open_review_drawer(options = {}) {
		const selected = this.selected_items();
		const trigger = options.preserve_focus ? null : document.activeElement;
		if (!selected.length) {
			frappe.msgprint(__("Select at least one marketplace item."));
			return;
		}

		this.review_open = true;
		this.drawer.open({
			title: __("Review Quotation Request"),
			subtitle: this.ui.escape(__("Loading selected items...")),
			body: this.ui.loading(__("Loading selected items...")),
			block_close: this.creating_request,
			trigger,
		});

		frappe
			.xcall("odyio_marketplace.api.preview_catalog_request", { items: selected })
			.then((preview) => this.render_review_drawer(preview, trigger))
			.catch(() => {
				this.drawer.open({
					title: __("Review Quotation Request"),
					subtitle: this.ui.escape(__("Selected items could not be reviewed.")),
					body: this.ui.empty(__("Selected items could not be reviewed. Your selection is still preserved.")),
					actions: [{ label: __("Close"), on_click: () => this.close_review_drawer() }],
					trigger,
				});
			});
	}

	render_review_drawer(preview, trigger) {
		const supplier_label =
			preview.suppliers && preview.suppliers.length === 1
				? preview.suppliers[0].supplier_name
				: __("Multiple suppliers selected");
		const subtitle = `${this.ui.escape(preview.items.length)} ${this.ui.escape(__("selected"))} &middot; ${this.ui.escape(supplier_label)}`;

		this.drawer.open({
			title: __("Review Quotation Request"),
			subtitle,
			body: this.render_review_body(preview),
			block_close: this.creating_request,
			trigger,
		});
		this.bind_review_events(preview);
	}

	render_review_body(preview) {
		const message_class = preview.can_create_request ? "" : " odyio-review-error";
		const lines = preview.items.map((row) => this.render_review_line(row)).join("");
		return `
			${this.ui.section(
				__("Request Summary"),
				`
					<div class="odyio-review-message${message_class}">${this.ui.escape(preview.message)}</div>
					<p class="text-muted">${this.ui.escape(__("Supplier pricing is provided later in the supplier offer. Catalogue prices, line totals, and request totals are intentionally not shown before an offer is submitted."))}</p>
					<div class="form-group">
						<label class="control-label">${__("Fulfillment")}</label>
						<select class="form-control odyio-fulfillment-method" aria-label="${this.ui.escape(__("Fulfillment method"))}">
							<option value="">${__("Choose Delivery or Pickup")}</option>
							<option value="DELIVERY" ${this.fulfillment_method === "DELIVERY" ? "selected" : ""}>${__("Delivery")}</option>
							<option value="PICKUP" ${this.fulfillment_method === "PICKUP" ? "selected" : ""}>${__("Pickup")}</option>
						</select>
					</div>
					<div class="odyio-delivery-fields ${this.fulfillment_method === "DELIVERY" ? "" : "hide"}">
						<div class="odyio-review-message">${this.ui.escape(__("Delivery address is stored as a request snapshot. No delivery fee is added; suppliers include fulfillment costs in their quoted prices."))}</div>
						<div class="row">
							<div class="col-sm-12"><label class="control-label">${__("Address Line 1")}</label><input class="form-control odyio-delivery-field" data-field="address_line1" value="${this.ui.escape(this.delivery_address.address_line1 || "")}"></div>
							<div class="col-sm-12"><label class="control-label">${__("Address Line 2")}</label><input class="form-control odyio-delivery-field" data-field="address_line2" value="${this.ui.escape(this.delivery_address.address_line2 || "")}"></div>
							<div class="col-sm-6"><label class="control-label">${__("City")}</label><input class="form-control odyio-delivery-field" data-field="city" value="${this.ui.escape(this.delivery_address.city || "")}"></div>
							<div class="col-sm-6"><label class="control-label">${__("Postal Code")}</label><input class="form-control odyio-delivery-field" data-field="pincode" value="${this.ui.escape(this.delivery_address.pincode || this.delivery_address.postal_code || "")}"></div>
							<div class="col-sm-6"><label class="control-label">${__("Country")}</label><input class="form-control odyio-delivery-field" data-field="country" value="${this.ui.escape(this.delivery_address.country || "")}"></div>
							<div class="col-sm-6"><label class="control-label">${__("Contact Phone")}</label><input class="form-control odyio-delivery-field" data-field="phone" value="${this.ui.escape(this.delivery_address.phone || "")}"></div>
						</div>
					</div>
					<div class="odyio-review-notes">
						<label class="control-label">${__("Request Notes")}</label>
						<textarea class="form-control odyio-request-notes" rows="3" placeholder="${this.ui.escape(__("Optional notes for the supplier"))}">${this.ui.escape(this.request_notes)}</textarea>
					</div>
				`
			)}
			${this.ui.section(__("Selected Items"), lines)}
			<div class="odyio-actions odyio-review-footer">
				<button class="btn btn-default odyio-review-close">${__("Back")}</button>
				<button class="btn btn-primary odyio-create-request" ${preview.can_create_request && !this.creating_request ? "" : "disabled"}>${this.creating_request ? __("Creating...") : __("Create Quotation Request")}</button>
			</div>
		`;
	}

	render_review_line(row) {
		const image = this.render_product_image(row, "odyio-review-thumb");
		return `
			<div class="odyio-review-line" data-item="${this.ui.escape(row.item)}">
				${image}
				<div>
					<h4>${this.ui.escape(row.item_name || row.item)}</h4>
					<div class="odyio-meta">${this.ui.escape(row.item_code || row.item)} &middot; ${this.ui.escape(row.supplier_name || "")}</div>
					<div class="odyio-meta">${__("UOM")}: ${this.ui.escape(row.stock_uom || "-")} &middot; ${__("Reference")}: ${this.ui.escape(row.supplier_reference || "-")}</div>
					<div class="odyio-review-controls">
						<div>
							<label class="control-label">${__("Quantity")}</label>
							<input class="form-control odyio-review-qty" type="number" min="1" step="1" value="${this.ui.escape(row.quantity)}" aria-label="${this.ui.escape(__("Quantity for {0}", [row.item_name || row.item]))}">
						</div>
						<div>
							<label class="control-label">${__("Line Notes")}</label>
							<input class="form-control odyio-line-notes" type="text" value="${this.ui.escape(row.line_notes || "")}" placeholder="${this.ui.escape(__("Optional line note"))}">
						</div>
						<button class="btn btn-default odyio-remove-item">${__("Remove")}</button>
					</div>
				</div>
			</div>
		`;
	}

	bind_review_events(preview) {
		const $scope = this.drawer.$backdrop;
		this.attach_image_fallback($scope);
		$scope.find(".odyio-request-notes").on("input", (event) => {
			this.request_notes = event.currentTarget.value;
		});
		$scope.find(".odyio-fulfillment-method").on("change", (event) => {
			this.fulfillment_method = event.currentTarget.value;
			$scope.find(".odyio-delivery-fields").toggleClass("hide", this.fulfillment_method !== "DELIVERY");
		});
		$scope.find(".odyio-delivery-field").on("input", (event) => {
			this.delivery_address[$(event.currentTarget).attr("data-field")] = event.currentTarget.value;
		});
		$scope.find(".odyio-review-qty").on("change", (event) => {
			const $line = $(event.currentTarget).closest("[data-item]");
			const item = $line.attr("data-item");
			const quantity = flt(event.currentTarget.value);
			if (quantity <= 0) {
				frappe.msgprint(__("Quantity must be greater than zero."));
				event.currentTarget.value = this.cart[item] || 1;
				return;
			}
			this.cart[item] = quantity;
			this.update_catalogue_card(item);
			this.open_review_drawer({ preserve_focus: true });
		});
		$scope.find(".odyio-line-notes").on("input", (event) => {
			const item = $(event.currentTarget).closest("[data-item]").attr("data-item");
			this.line_notes[item] = event.currentTarget.value;
		});
		$scope.find(".odyio-remove-item").on("click", (event) => {
			const item = $(event.currentTarget).closest("[data-item]").attr("data-item");
			delete this.cart[item];
			delete this.line_notes[item];
			this.update_catalogue_card(item);
			if (this.selected_items().length) {
				this.open_review_drawer({ preserve_focus: true });
			} else {
				this.close_review_drawer();
			}
		});
		$scope.find(".odyio-review-close").on("click", () => this.close_review_drawer());
		$scope.find(".odyio-create-request").on("click", () => {
			if (preview.can_create_request) {
				this.create_request();
			}
		});
	}

	close_review_drawer() {
		if (this.creating_request) return;
		this.review_open = false;
		this.drawer.close();
	}

	create_request() {
		const selected = this.selected_items();
		if (!selected.length || this.creating_request) return;
		if (!this.fulfillment_method) {
			frappe.msgprint(__("Choose Delivery or Pickup before creating the request."));
			return;
		}

		this.creating_request = true;
		if (this.drawer.$backdrop) {
			this.drawer.$backdrop.find(".odyio-create-request").prop("disabled", true).text(__("Creating..."));
			this.drawer.block_close = true;
			this.drawer.$backdrop.find(".odyio-drawer-close").prop("disabled", true);
		}
		frappe
			.xcall("odyio_marketplace.api.create_request_from_catalog", {
				items: selected,
				clinic_notes: this.request_notes,
				fulfillment_method: this.fulfillment_method,
				delivery_address: this.delivery_address,
			})
			.then((result) => {
				this.cart = {};
				this.line_notes = {};
				this.request_notes = "";
				this.creating_request = false;
				this.review_open = false;
				this.drawer.close(true);
				this.render_items();
				this.show_success_feedback(result.quotation_request);
				frappe.show_alert({ message: __("Quotation request {0} sent", [result.quotation_request]), indicator: "green" });
			})
			.catch(() => {
				this.creating_request = false;
				this.open_review_drawer({ preserve_focus: true });
			});
	}

	show_success_feedback(request_name) {
		this.$feedback.removeClass("hide").html(`
			<div>${this.ui.escape(__("Quotation request {0} was sent.", [request_name]))}</div>
			<button class="btn btn-sm btn-default odyio-open-my-requests">${__("Open My Requests")}</button>
		`);
		this.$feedback.find(".odyio-open-my-requests").on("click", () => frappe.set_route("clinic-my-requests"));
	}
}
