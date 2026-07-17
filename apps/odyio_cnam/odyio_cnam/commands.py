import frappe, os

def create_print_formats():
    bl_html_path = os.path.join(os.path.dirname(__file__), "templates", "odyio_cnam", "print_format", "odyio_bl.html")
    facture_html_path = os.path.join(os.path.dirname(__file__), "templates", "odyio_cnam", "print_format", "odyio_facture.html")

    with open(bl_html_path) as f:
        bl_html = f.read()
    with open(facture_html_path) as f:
        facture_html = f.read()

    formats = [
        {
            "name": "Odyio BL",
            "doc_type": "Delivery Note",
            "print_format_type": "Jinja",
            "html": bl_html,
            "standard": "No",
            "custom_format": 1,
            "module": "Odyio CNAM",
            "disabled": 0,
        },
        {
            "name": "Odyio Facture",
            "doc_type": "Sales Invoice",
            "print_format_type": "Jinja",
            "html": facture_html,
            "standard": "No",
            "custom_format": 1,
            "module": "Odyio CNAM",
            "disabled": 0,
        },
    ]

    for pf_data in formats:
        name = pf_data["name"]
        if frappe.db.exists("Print Format", name):
            print(f"Already exists: {name}")
            continue
        doc = frappe.get_doc({"doctype": "Print Format", **pf_data})
        doc.insert(ignore_permissions=True)
        print(f"Created: {name}")

    frappe.db.commit()
    print("Done")


def create_cnam_dossier_pf():
    import frappe, os
    html_path = os.path.join(os.path.dirname(__file__), "templates", "odyio_cnam", "print_format", "odyio_cnam_dossier.html")
    with open(html_path) as fh:
        html = fh.read()
    name = "Odyio CNAM Dossier"
    if frappe.db.exists("Print Format", name):
        print(f"Already exists: {name}")
        return
    doc = frappe.get_doc({
        "doctype": "Print Format",
        "name": name,
        "doc_type": "CNAM Demande",
        "print_format_type": "Jinja",
        "html": html,
        "standard": "No",
        "custom_format": 1,
        "module": "Odyio CNAM",
        "disabled": 0,
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"Created: {name}")
