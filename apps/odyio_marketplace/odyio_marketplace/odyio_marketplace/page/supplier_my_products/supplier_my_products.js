frappe.pages["supplier-my-products"].on_page_load = function (wrapper) {
	new SupplierMyProducts(wrapper);
};

class SupplierMyProducts {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.ui = odyio_marketplace.ui;
		this.ui.ensure_styles();
		this.drawer = this.ui.drawer();
		this.products = [];
		this.filters = {};
		this.active_product = null;
		this.pending_file = null;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("My Products"),
			single_column: true,
		});
		this.make_layout();
		this.bind_events();
		this.load_filters();
		this.refresh();
	}

	make_layout() {
		this.$body = $(`
			<div class="odyio-page-shell">
				<style>
					.odyio-upload-card { border: 1px dashed var(--border-color); border-radius: 6px; background: var(--control-bg); padding: 12px; display: grid; grid-template-columns: 112px 1fr; gap: 14px; align-items: center; cursor: pointer; min-height: 140px; }
					.odyio-upload-card:hover, .odyio-upload-card:focus, .odyio-upload-active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(36, 114, 200, 0.12); outline: none; }
					.odyio-upload-pending { opacity: 0.72; pointer-events: none; }
					.odyio-upload-title { font-weight: 600; font-size: 14px; }
					.odyio-upload-help, .odyio-selected-file { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
					.odyio-upload-error { color: var(--red-700); font-size: 12px; margin-top: 6px; min-height: 16px; }
					.odyio-upload-icon { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; background: var(--card-bg); font-weight: 700; }
					.odyio-product-image-input.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
					@media (max-width: 767px) { .odyio-upload-card { grid-template-columns: 1fr; } }
				</style>
				<div class="odyio-page-description">${__("Manage your marketplace product catalogue without opening the ERPNext Item form.")}</div>
				<div class="row">
					<div class="col-md-4"><input class="form-control odyio-product-search" placeholder="${__("Search products or references")}"></div>
					<div class="col-md-3"><select class="form-control odyio-product-group"><option value="">${__("All categories")}</option></select></div>
					<div class="col-md-2">
						<select class="form-control odyio-product-availability">
							<option value="">${__("Any availability")}</option>
							<option value="available">${__("Available")}</option>
							<option value="unavailable">${__("Unavailable")}</option>
						</select>
					</div>
					<div class="col-md-2">
						<select class="form-control odyio-product-enabled">
							<option value="">${__("Any visibility")}</option>
							<option value="enabled">${__("Listed")}</option>
							<option value="disabled">${__("Hidden")}</option>
						</select>
					</div>
					<div class="col-md-1 text-right">
						<button class="btn btn-primary btn-sm odyio-create-product">${__("Create")}</button>
					</div>
				</div>
				<div class="odyio-list odyio-product-list">${this.ui.loading(__("Loading products..."))}</div>
			</div>
		`).appendTo(this.page.main);
		this.$list = this.$body.find(".odyio-product-list");
	}

	bind_events() {
		this.$body.on("input", ".odyio-product-search", frappe.utils.debounce(() => this.refresh(), 250));
		this.$body.on("change", ".odyio-product-group,.odyio-product-availability,.odyio-product-enabled", () => this.refresh());
		this.$body.on("click", ".odyio-create-product", (event) => this.open_edit_drawer(null, event.currentTarget));
		this.$body.on("click", ".odyio-row", (event) => {
			if ($(event.target).closest("button").length) return;
			this.open_details($(event.currentTarget).data("product"), event.currentTarget);
		});
		this.$body.on("click", ".odyio-edit-product", (event) => {
			event.stopPropagation();
			this.open_edit_drawer($(event.currentTarget).data("product"), event.currentTarget);
		});
	}

	load_filters() {
		frappe.xcall("odyio_marketplace.api.get_supplier_product_filters").then((filters) => {
			const options = [`<option value="">${__("All categories")}</option>`]
				.concat((filters.item_groups || []).map((row) => `<option value="${this.ui.escape(row.name)}">${this.ui.escape(row.item_group_name || row.name)}</option>`));
			this.$body.find(".odyio-product-group").html(options.join(""));
		});
	}

	current_filters() {
		return {
			search: this.$body.find(".odyio-product-search").val(),
			item_group: this.$body.find(".odyio-product-group").val(),
			availability: this.$body.find(".odyio-product-availability").val(),
			enabled_state: this.$body.find(".odyio-product-enabled").val(),
		};
	}

	refresh() {
		this.$list.html(this.ui.loading(__("Loading products...")));
		return frappe
			.xcall("odyio_marketplace.api.get_supplier_products", this.current_filters())
			.then((products) => {
				this.products = products || [];
				this.render_list();
			})
			.catch(() => this.$list.html(this.ui.empty(__("Products could not be loaded."))));
	}

	render_list() {
		if (!this.products.length) {
			this.$list.html(this.ui.empty(__("No marketplace products match the current filters.")));
			return;
		}

		this.$list.html(
			this.products
				.map((product) => {
					return `
						<div class="odyio-row" tabindex="0" data-product="${this.ui.escape(product.name)}">
							<div style="display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center;">
								${this.thumbnail(product, 72)}
								<div>
									<h4>${this.ui.escape(product.item_name)}</h4>
									<div class="odyio-meta">
										${this.ui.escape(product.item_code)} &middot; ${this.ui.escape(product.item_group || "-")} &middot; ${this.ui.escape(product.ear_side || __("Any side"))}
									</div>
									<div class="odyio-meta">${this.ui.escape(product.supplier_reference || __("No supplier reference"))}</div>
								</div>
							</div>
							<div class="odyio-actions">
								${this.ui.status_badge(product.visibility_status || this.ui.status_view(product))}
								${this.ui.status_badge(product.availability_status || this.availability_status(product))}
								<span class="odyio-meta">${this.ui.date(product.modified)}</span>
								<button class="btn btn-default btn-sm odyio-edit-product" data-product="${this.ui.escape(product.name)}">${__("Edit")}</button>
							</div>
						</div>`;
				})
				.join("")
		);
	}

	open_details(product_name, trigger) {
		frappe.xcall("odyio_marketplace.api.get_supplier_product", { item: product_name }).then((product) => {
			this.active_product = product;
			this.drawer.open({
				title: product.item_name,
				subtitle: this.ui.escape(product.item_code),
				status: product.visibility_status || this.ui.status_view(product),
				trigger,
				actions: [
					{ label: __("Edit Product"), primary: true, on_click: () => this.open_edit_drawer(product.name, trigger) },
					{
						label: product.marketplace_available ? __("Mark Unavailable") : __("Mark Available"),
						on_click: () => this.set_availability(product.name, !product.marketplace_available),
					},
				],
				body: this.render_details(product),
			});
		});
	}

	render_details(product) {
		return `
			${this.ui.section(
				__("Product"),
				`<div style="display:grid;grid-template-columns:160px 1fr;gap:14px;align-items:start;">
					${this.thumbnail(product, 160)}
					${this.ui.key_values([
						{ label: __("Category"), value: product.item_group },
						{ label: __("Supplier reference"), value: product.supplier_reference },
						{ label: __("Ear side"), value: product.ear_side || __("Any side") },
						{ label: __("Visibility"), value: product.display_status || (product.marketplace_enabled ? __("Listed") : __("Hidden")) },
						{ label: __("Availability"), value: product.marketplace_available ? __("Available") : __("Unavailable") },
					])}
				</div>`
			)}
			${this.ui.section(__("Description"), `<p>${this.ui.escape(product.description || __("No description provided."))}</p>`)}
			${this.ui.section(__("Technical Details"), `<p>${this.ui.escape(product.technical_specs || __("No technical details provided."))}</p>`)}
			${this.ui.section(__("Pricing"), `<p class="odyio-page-description">${__("Prices are provided only in supplier offers after a clinic sends a quotation request.")}</p>`)}
		`;
	}

	open_edit_drawer(product_name, trigger) {
		const load = product_name
			? frappe.xcall("odyio_marketplace.api.get_supplier_product", { item: product_name })
			: Promise.resolve({
					item_name: "",
					item_code: "",
					item_group: "",
					description: "",
					technical_specs: "",
					ear_side: "",
					supplier_reference: "",
					marketplace_enabled: 1,
					marketplace_available: 1,
					image: "",
			  });

		load.then((product) => {
			this.active_product = product_name ? product : null;
			this.pending_file = null;
			this.drawer.open({
				title: product_name ? __("Edit Product") : __("Create Product"),
				subtitle: product_name ? this.ui.escape(product.item_code) : __("Item code is generated after saving."),
				status: product.visibility_status || this.ui.status_view(product),
				trigger,
				actions: [
					{ label: __("Cancel"), on_click: () => this.drawer.close() },
					{ label: product_name ? __("Save Changes") : __("Create Product"), primary: true, on_click: () => this.save_product(product_name, trigger) },
				],
				body: this.render_form(product, !!product_name),
			});
			this.bind_form_events(product);
		});
	}

	render_form(product, editing) {
		const input_id = `odyio-product-image-input-${frappe.utils.get_random(6)}`;
		return `
			<form class="odyio-product-form">
				${this.ui.section(
					__("Product Image"),
					`<div>
						<input id="${input_id}" class="odyio-product-image-input sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${this.ui.escape(__("Choose product image"))}">
						<label for="${input_id}" class="odyio-upload-card" tabindex="0" role="button" aria-label="${this.ui.escape(__("Choose product image. JPEG, PNG, or WebP. Maximum 2 MB."))}">
							<div class="odyio-product-preview">${this.thumbnail(product, 112)}</div>
							<div class="odyio-upload-copy">
								<div class="odyio-upload-icon" aria-hidden="true">+</div>
								<div class="odyio-upload-title">${editing && product.image ? __("Replace image") : __("Choose product image")}</div>
								<div class="odyio-upload-help">${__("JPEG, PNG, or WebP")} &middot; ${__("Maximum 2 MB")}</div>
								<div class="odyio-selected-file">${product.image ? this.ui.escape(product.image.rsplit("/", 1).pop()) : __("No file selected")}</div>
								<div class="odyio-upload-error" role="alert"></div>
							</div>
						</label>
						<div class="odyio-actions" style="justify-content:flex-start;margin-top:8px;">
							<button type="button" class="btn btn-default btn-sm odyio-replace-image">${editing && product.image ? __("Replace Image") : __("Choose Image")}</button>
							${editing && product.image ? `<button type="button" class="btn btn-default btn-sm odyio-remove-image">${__("Remove Image")}</button>` : ""}
						</div>
					</div>`
				)}
				${this.ui.section(
					__("Product Details"),
					`<div class="row">
						<div class="col-md-6">
							<label>${__("Product Name")}</label>
							<input class="form-control" name="item_name" value="${this.ui.escape(product.item_name)}" required>
						</div>
						<div class="col-md-6">
							<label>${__("Supplier Reference")}</label>
							<input class="form-control" name="supplier_reference" value="${this.ui.escape(product.supplier_reference || "")}">
						</div>
						<div class="col-md-6" style="margin-top:10px;">
							<label>${__("Category")}</label>
							<input class="form-control" name="item_group" value="${this.ui.escape(product.item_group || "")}" required>
						</div>
						<div class="col-md-6" style="margin-top:10px;">
							<label>${__("Ear Side")}</label>
							<select class="form-control" name="ear_side">
								<option value="" ${!product.ear_side ? "selected" : ""}>${__("Any side")}</option>
								<option value="LEFT" ${product.ear_side === "LEFT" ? "selected" : ""}>${__("Left")}</option>
								<option value="RIGHT" ${product.ear_side === "RIGHT" ? "selected" : ""}>${__("Right")}</option>
								<option value="BILATERAL" ${product.ear_side === "BILATERAL" ? "selected" : ""}>${__("Bilateral")}</option>
								<option value="NOT_APPLICABLE" ${product.ear_side === "NOT_APPLICABLE" ? "selected" : ""}>${__("Not applicable")}</option>
							</select>
						</div>
						<div class="col-md-6" style="margin-top:10px;">
							<label><input type="checkbox" name="marketplace_enabled" ${product.marketplace_enabled ? "checked" : ""}> ${__("Listed in marketplace")}</label>
						</div>
						<div class="col-md-6" style="margin-top:10px;">
							<label><input type="checkbox" name="marketplace_available" ${product.marketplace_available ? "checked" : ""}> ${__("Available for requests")}</label>
						</div>
						<div class="col-md-12" style="margin-top:10px;">
							<label>${__("Description")}</label>
							<textarea class="form-control" name="description" rows="3">${this.ui.escape(product.description || "")}</textarea>
						</div>
						<div class="col-md-12" style="margin-top:10px;">
							<label>${__("Technical Specifications")}</label>
							<textarea class="form-control" name="technical_specs" rows="4">${this.ui.escape(product.technical_specs || "")}</textarea>
						</div>
					</div>
					<p class="odyio-page-description" style="margin-top:12px;">${__("Marketplace pricing is quotation-driven. Public catalogue prices are not edited here.")}</p>`
				)}
			</form>
		`;
	}

	bind_form_events(product) {
		const $body = this.drawer.$backdrop.find(".odyio-drawer-body");
		const $input = $body.find(".odyio-product-image-input");
		const open_picker = () => {
			$input.val("");
			$input.trigger("click");
		};
		$body.find(".odyio-replace-image").on("click", open_picker);
		$body.find(".odyio-upload-card").on("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				open_picker();
			}
		});
		$body.find(".odyio-upload-card").on("dragover", (event) => {
			event.preventDefault();
			$(event.currentTarget).addClass("odyio-upload-active");
		});
		$body.find(".odyio-upload-card").on("dragleave drop", (event) => {
			event.preventDefault();
			$(event.currentTarget).removeClass("odyio-upload-active");
		});
		$body.find(".odyio-upload-card").on("drop", (event) => {
			const file = event.originalEvent.dataTransfer.files && event.originalEvent.dataTransfer.files[0];
			this.accept_selected_file(file, product, $body);
		});
		$input.on("change", (event) => {
			const file = event.target.files && event.target.files[0];
			this.accept_selected_file(file, product, $body);
		});
		$body.find(".odyio-remove-image").on("click", () => this.remove_image(product.name));
	}

	accept_selected_file(file, product, $body) {
		this.pending_file = null;
		if (!file) return;
		if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
			$body.find(".odyio-upload-error").text(__("Upload a JPEG, PNG, or WebP image up to 2 MB."));
			$body.find(".odyio-selected-file").text(__("File not accepted."));
			return;
		}
		this.pending_file = file;
		const url = URL.createObjectURL(file);
		$body.find(".odyio-product-preview").html(this.thumbnail({ image: url, item_name: product.item_name || __("Selected image") }, 112));
		$body.find(".odyio-selected-file").text(`${file.name} (${this.format_file_size(file.size)})`);
		$body.find(".odyio-upload-error").text("");
	}

	save_product(product_name, trigger) {
		const $form = this.drawer.$backdrop.find(".odyio-product-form");
		const payload = {
			item_name: $form.find('[name="item_name"]').val(),
			supplier_reference: $form.find('[name="supplier_reference"]').val(),
			item_group: $form.find('[name="item_group"]').val(),
			ear_side: $form.find('[name="ear_side"]').val(),
			marketplace_enabled: $form.find('[name="marketplace_enabled"]').is(":checked") ? 1 : 0,
			marketplace_available: $form.find('[name="marketplace_available"]').is(":checked") ? 1 : 0,
			description: $form.find('[name="description"]').val(),
			technical_specs: $form.find('[name="technical_specs"]').val(),
		};
		const method = product_name ? "odyio_marketplace.api.update_supplier_product" : "odyio_marketplace.api.create_supplier_product";
		const args = product_name ? { item: product_name, data: payload } : { data: payload };
		this.drawer.block_close = true;
		this.set_upload_pending(true);
		frappe
			.xcall(method, args)
			.then((product) => (this.pending_file ? this.upload_image(product.name, this.pending_file) : product))
			.then((product) => {
				this.pending_file = null;
				this.drawer.close(true);
				frappe.show_alert({ message: __("Product saved."), indicator: "green" });
				return this.refresh().then(() => this.open_details(product.name, trigger));
			})
			.catch(() => {
				this.drawer.block_close = false;
				this.set_upload_pending(false);
			});
	}

	upload_image(item, file) {
		const form = new FormData();
		form.append("item", item);
		form.append("file", file, file.name);
		return fetch("/api/method/odyio_marketplace.api.upload_supplier_product_image", {
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

	remove_image(item) {
		frappe.confirm(__("Remove this product image?"), () => {
			frappe.xcall("odyio_marketplace.api.remove_supplier_product_image", { item }).then((product) => {
				frappe.show_alert({ message: __("Image removed."), indicator: "green" });
				this.open_edit_drawer(product.name, null);
				this.refresh();
			});
		});
	}

	set_availability(item, value) {
		frappe.xcall("odyio_marketplace.api.set_supplier_product_availability", { item, marketplace_available: value ? 1 : 0 }).then((product) => {
			frappe.show_alert({ message: __("Product updated."), indicator: "green" });
			this.refresh().then(() => this.open_details(product.name, null));
		});
	}

	availability_status(product) {
		return product.marketplace_available
			? { label: __("Available"), indicator: "green" }
			: { label: __("Unavailable"), indicator: "orange" };
	}

	thumbnail(product, size) {
		const label = this.ui.escape(product.item_name || __("Product image"));
		if (product.image) {
			return `<div style="width:${size}px;height:${size}px;border:1px solid var(--border-color);border-radius:6px;background:var(--control-bg);display:flex;align-items:center;justify-content:center;overflow:hidden;">
				<img src="${this.ui.escape(product.image)}" alt="${label}" style="max-width:100%;max-height:100%;object-fit:contain;">
			</div>`;
		}
		return `<div aria-label="${label}" style="width:${size}px;height:${size}px;border:1px dashed var(--border-color);border-radius:6px;background:var(--control-bg);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;">${__("No image")}</div>`;
	}

	set_upload_pending(pending) {
		const $card = this.drawer.$backdrop && this.drawer.$backdrop.find(".odyio-upload-card");
		if (!$card || !$card.length) return;
		$card.toggleClass("odyio-upload-pending", !!pending);
		if (pending) {
			$card.find(".odyio-upload-error").text(__("Saving product image..."));
		}
	}

	format_file_size(size) {
		if (size >= 1024 * 1024) {
			return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		}
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}
}
