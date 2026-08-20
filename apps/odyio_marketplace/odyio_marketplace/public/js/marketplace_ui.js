window.odyio_marketplace = window.odyio_marketplace || {};

odyio_marketplace.ui = {
	styles_loaded: false,

	ensure_styles() {
		if (this.styles_loaded) return;
		this.styles_loaded = true;
		$(`<style>
			.odyio-page-shell { display: grid; gap: 12px; }
			.odyio-page-description { color: var(--text-muted); max-width: 760px; font-size: var(--text-sm); }
			.odyio-list { margin-top: 10px; display: grid; gap: 8px; }
			.odyio-row { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 10px 12px; background: var(--card-bg); display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; cursor: pointer; }
			.odyio-row:hover, .odyio-row:focus { border-color: var(--gray-400); background: var(--fg-hover-color); outline: none; }
			.odyio-row.odyio-selected { border-color: var(--primary); background: var(--control-bg); }
			.odyio-row h4 { margin: 0 0 6px; font-size: 15px; line-height: 1.3; }
			.odyio-meta { color: var(--text-muted); font-size: 12px; line-height: 1.5; }
			.odyio-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; flex-wrap: wrap; }
			.odyio-empty { padding: 24px; border: 1px dashed var(--border-color); border-radius: var(--border-radius-md); color: var(--text-muted); text-align: center; background: var(--card-bg); }
			.odyio-drawer-backdrop { position: fixed; inset: 0; z-index: 1040; background: rgba(0, 0, 0, 0.18); display: flex; justify-content: flex-end; }
			.odyio-drawer { width: min(680px, 92vw); height: 100vh; background: var(--bg-color); border-left: 1px solid var(--border-color); box-shadow: var(--shadow-lg); display: grid; grid-template-rows: auto 1fr; }
			.odyio-drawer-header { padding: 14px 16px; border-bottom: 1px solid var(--border-color); background: var(--card-bg); display: grid; gap: 10px; }
			.odyio-drawer-title-row { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
			.odyio-drawer-title { margin: 0; font-size: 18px; line-height: 1.25; }
			.odyio-drawer-subtitle { color: var(--text-muted); font-size: 13px; }
			.odyio-drawer-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
			.odyio-drawer-close { min-width: 32px; }
			.odyio-drawer-body { overflow: auto; padding: 16px; display: grid; gap: 12px; }
			.odyio-section { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: var(--card-bg); padding: 12px; }
			.odyio-section h5 { margin: 0 0 10px; font-size: 14px; }
			.odyio-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
			.odyio-kv-label { color: var(--text-muted); font-size: 12px; }
			.odyio-kv-value { font-weight: 600; }
			.odyio-home-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
			.odyio-home-card { width: 100%; min-height: 84px; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: var(--card-bg); padding: 12px; display: grid; grid-template-columns: 1fr auto; gap: 12px; text-align: left; color: var(--text-color); }
			.odyio-home-card:hover, .odyio-home-card:focus { border-color: var(--gray-400); background: var(--fg-hover-color); outline: none; }
			.odyio-card-title { display: block; font-weight: 600; margin-bottom: 6px; }
			.odyio-card-description { display: block; color: var(--text-muted); font-size: 12px; line-height: 1.4; }
			.odyio-card-count { align-self: start; min-width: 36px; border-radius: 999px; padding: 3px 8px; text-align: center; background: var(--control-bg); border: 1px solid var(--border-color); font-weight: 600; }
			.odyio-devis-builder { display: grid; gap: 12px; }
			.odyio-devis-toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
			.odyio-template-selector { display: flex; gap: 8px; flex-wrap: wrap; }
			.odyio-template-option { border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--card-bg); padding: 8px 10px; min-width: 118px; text-align: left; }
			.odyio-template-option:hover, .odyio-template-option:focus { border-color: var(--gray-500); background: var(--fg-hover-color); outline: none; }
			.odyio-template-option.active { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
			.odyio-template-title { font-weight: 600; display: flex; gap: 6px; align-items: center; }
			.odyio-default-marker { color: var(--text-muted); font-size: 11px; font-weight: 400; }
			.odyio-devis-preview-frame { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: white; padding: 14px; overflow: auto; max-height: min(70vh, 760px); }
			.odyio-upload-card { border: 1px dashed var(--border-color); border-radius: 6px; background: var(--control-bg); padding: 12px; display: grid; grid-template-columns: 112px 1fr; gap: 14px; align-items: center; cursor: pointer; min-height: 128px; }
			.odyio-upload-card:hover, .odyio-upload-card:focus, .odyio-upload-active { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(36, 114, 200, 0.12); outline: none; }
			.odyio-upload-pending { opacity: 0.72; pointer-events: none; }
			.odyio-upload-title { font-weight: 600; font-size: 14px; }
			.odyio-upload-help, .odyio-selected-file { color: var(--text-muted); font-size: 12px; margin-top: 4px; }
			.odyio-upload-error { color: var(--red-700); font-size: 12px; margin-top: 6px; min-height: 16px; }
			.odyio-upload-icon { width: 32px; height: 32px; border: 1px solid var(--border-color); border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; background: var(--card-bg); font-weight: 700; }
			.odyio-product-image-input.sr-only, .odyio-devis-logo-input.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
			@media (max-width: 767px) {
				.odyio-drawer { width: 100vw; }
				.odyio-row { grid-template-columns: 1fr; }
				.odyio-actions { justify-content: flex-start; }
				.odyio-home-card { grid-template-columns: 1fr; }
				.odyio-upload-card { grid-template-columns: 1fr; }
			}
		</style>`).appendTo(document.head);
	},

	escape(value) {
		return frappe.utils.escape_html(value == null ? "" : String(value));
	},

	date(value) {
		return value ? frappe.datetime.str_to_user(value) : "-";
	},

	money(value) {
		return format_currency(flt(value || 0));
	},

	status_badge(status, indicator) {
		const status_view = typeof status === "object" && status !== null ? status : { label: status, indicator };
		const label = status_view.label || status_view.display_status || status || "-";
		const color = {
			Draft: "orange",
			Sent: "blue",
			Accepted: "green",
			Rejected: "red",
			Cancelled: "red",
			Expired: "red",
			Open: "blue",
			Closed: "green",
			Listed: "blue",
			Available: "green",
			Unavailable: "orange",
			Hidden: "gray",
		}[label] || status_view.indicator || "blue";
		return `<span class="indicator ${this.escape(color)}">${this.escape(__(label || "-"))}</span>`;
	},

	status_view(record) {
		return {
			label: record && (record.display_status || record.status),
			indicator: record && record.indicator,
			next_action: record && record.next_action,
		};
	},

	empty(message) {
		return `<div class="odyio-empty">${this.escape(message)}</div>`;
	},

	loading(message) {
		return `<div class="odyio-empty">${this.escape(message || __("Loading..."))}</div>`;
	},

	section(title, body) {
		return `<section class="odyio-section"><h5>${this.escape(title)}</h5>${body}</section>`;
	},

	key_values(items) {
		return `<div class="odyio-kv">${items
			.map(
				(item) => `
				<div>
					<div class="odyio-kv-label">${this.escape(item.label)}</div>
					<div class="odyio-kv-value">${item.html ? item.value : this.escape(item.value == null || item.value === "" ? "-" : item.value)}</div>
				</div>`
			)
			.join("")}</div>`;
	},

	table(headers, rows) {
		return `
			<table class="table table-bordered table-hover">
				<thead><tr>${headers.map((header) => `<th class="${header.class || ""}">${this.escape(header.label)}</th>`).join("")}</tr></thead>
				<tbody>${rows.join("")}</tbody>
			</table>`;
	},

	drawer() {
		this.ensure_styles();
		return new MarketplaceDrawer(this);
	},
};

class MarketplaceDrawer {
	constructor(ui) {
		this.ui = ui;
		this.$backdrop = null;
		this.previous_focus = null;
		this.block_close = false;
		this.key_handler = (event) => {
			if (event.key === "Escape") {
				this.close();
			}
		};
	}

	open(options) {
		this.previous_focus = options.trigger || document.activeElement;
		this.block_close = !!options.block_close;
		if (!this.$backdrop) {
			this.$backdrop = $(`
				<div class="odyio-drawer-backdrop">
					<aside class="odyio-drawer" role="dialog" aria-modal="false" tabindex="-1">
						<div class="odyio-drawer-header"></div>
						<div class="odyio-drawer-body"></div>
					</aside>
				</div>
			`).appendTo(document.body);
			this.$backdrop.on("click", (event) => {
				if ($(event.target).is(".odyio-drawer-backdrop")) this.close();
			});
		}

		const actions = (options.actions || [])
			.map(
				(action, index) =>
					`<button class="btn btn-sm ${action.primary ? "btn-primary" : "btn-default"} odyio-drawer-action" data-action="${index}">${this.ui.escape(action.label)}</button>`
			)
			.join("");
		this.$backdrop.find(".odyio-drawer-header").html(`
			<div class="odyio-drawer-title-row">
				<div>
					<h3 class="odyio-drawer-title">${this.ui.escape(options.title)}</h3>
					<div class="odyio-drawer-subtitle">${options.subtitle || ""}</div>
				</div>
				<button class="btn btn-default icon-btn odyio-drawer-close" aria-label="${this.ui.escape(__("Close details"))}" ${this.block_close ? "disabled" : ""}>
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="odyio-drawer-actions">
				${options.status ? this.ui.status_badge(options.status) : ""}
				${actions}
			</div>
		`);
		this.$backdrop.find(".odyio-drawer-body").html(options.body || "");
		this.$backdrop.find(".odyio-drawer-close").on("click", () => this.close());
		this.$backdrop.find(".odyio-drawer-action").on("click", (event) => {
			const action = (options.actions || [])[$(event.currentTarget).data("action")];
			action && action.on_click && action.on_click();
		});
		$(document).off("keydown.odyio-drawer").on("keydown.odyio-drawer", this.key_handler);
		this.$backdrop.find(".odyio-drawer").focus();
	}

	close(force = false) {
		if (!this.$backdrop) return;
		if (this.block_close && !force) return;
		this.$backdrop.remove();
		this.$backdrop = null;
		this.block_close = false;
		$(document).off("keydown.odyio-drawer");
		if (this.previous_focus && this.previous_focus.focus) {
			this.previous_focus.focus();
		}
	}
}
