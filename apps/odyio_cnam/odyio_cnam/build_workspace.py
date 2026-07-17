import frappe
import json

def execute():
    print("=== Rebuilding Odyio Workspace with Card Breaks ===")

    try:
        frappe.delete_doc('Workspace', 'Odyio', force=True)
    except:
        pass

    content = json.dumps([
        {"id": "spacer1", "type": "spacer", "data": {"col": 12}},
        {"id": "hdr1", "type": "header", "data": {"text": '<span class="h4"><b>Acces Rapide</b></span>', "col": 12}},
        {"id": "sc1", "type": "shortcut", "data": {"shortcut_name": "Patients", "col": 3}},
        {"id": "sc2", "type": "shortcut", "data": {"shortcut_name": "Factures", "col": 3}},
        {"id": "sc3", "type": "shortcut", "data": {"shortcut_name": "Articles", "col": 3}},
        {"id": "sc4", "type": "shortcut", "data": {"shortcut_name": "Bon de Livraison", "col": 3}},
        {"id": "sc5", "type": "shortcut", "data": {"shortcut_name": "Fournisseurs", "col": 3}},
        {"id": "sc6", "type": "shortcut", "data": {"shortcut_name": "Commande Vente", "col": 3}},
        {"id": "sc7", "type": "shortcut", "data": {"shortcut_name": "Commande Achat", "col": 3}},
        {"id": "sc8", "type": "shortcut", "data": {"shortcut_name": "Encaissement", "col": 3}},
        {"id": "spacer2", "type": "spacer", "data": {"col": 12}},
        {"id": "hdr2", "type": "header", "data": {"text": '<span class="h4"><b>Modules</b></span>', "col": 12}},
        {"id": "c1", "type": "card", "data": {"card_name": "Patients & Dossiers", "col": 4}},
        {"id": "c2", "type": "card", "data": {"card_name": "Ventes & Facturation", "col": 4}},
        {"id": "c3", "type": "card", "data": {"card_name": "Articles & Stock", "col": 4}},
        {"id": "c4", "type": "card", "data": {"card_name": "Achats & Fournisseurs", "col": 4}},
        {"id": "c5", "type": "card", "data": {"card_name": "Tresorerie", "col": 4}},
        {"id": "c6", "type": "card", "data": {"card_name": "Rapports", "col": 4}},
        {"id": "c7", "type": "card", "data": {"card_name": "Marketplace", "col": 4}},
        {"id": "c8", "type": "card", "data": {"card_name": "Configuration", "col": 4}},
    ])

    ws = frappe.get_doc({
        "doctype": "Workspace",
        "label": "Odyio",
        "title": "Odyio",
        "module": "Odyio CNAM",
        "is_hidden": 0,
        "public": 1,
        "content": content,
    })

    # Cards are defined by Card Break entries in the links list
    # Each card section = 1 Card Break + N Link entries
    card_sections = [
        ("Patients & Dossiers", [
            ("DocType", "Customer", "List", "Patients / Clients", 1),
            ("DocType", "Contact", "List", "Contacts", 0),
            ("DocType", "Address", "List", "Adresses", 0),
        ]),
        ("Ventes & Facturation", [
            ("DocType", "Quotation", "List", "Devis", 1),
            ("DocType", "Sales Order", "List", "Commandes Vente", 0),
            ("DocType", "Sales Invoice", "List", "Factures", 1),
            ("DocType", "Payment Entry", "List", "Encaissements", 0),
            ("DocType", "Mode of Payment", "List", "Modes de Paiement", 0),
        ]),
        ("Articles & Stock", [
            ("DocType", "Item", "List", "Articles", 1),
            ("DocType", "Item Group", "List", "Groupes d'Articles", 0),
            ("DocType", "Warehouse", "List", "Entrepots", 0),
            ("DocType", "Stock Entry", "List", "Mouvements Stock", 0),
            ("DocType", "Delivery Note", "List", "Bons de Livraison", 1),
        ]),
        ("Achats & Fournisseurs", [
            ("DocType", "Supplier", "List", "Fournisseurs", 1),
            ("DocType", "Purchase Order", "List", "Commandes Achat", 0),
            ("DocType", "Purchase Invoice", "List", "Factures Fournisseur", 0),
        ]),
        ("Tresorerie", [
            ("DocType", "Journal Entry", "List", "Ecritures Comptables", 0),
            ("DocType", "Account", "Tree", "Plan Comptable", 0),
            ("DocType", "Bank Account", "List", "Comptes Bancaires", 0),
        ]),
        ("Rapports", [
            ("Report", "General Ledger", "Report", "Livre Grand Livre", 0),
            ("Report", "Accounts Receivable", "Report", "Clients - Recevoir", 0),
            ("Report", "Accounts Payable", "Report", "Fournisseurs - Payer", 0),
            ("Report", "Stock Balance", "Report", "Balance Stock", 0),
            ("Report", "Gross Profit", "Report", "Marge Brute", 0),
        ]),
        ("Marketplace", [
            ("DocType", "Item", "List", "Catalogue Produits", 1),
            ("DocType", "Item Group", "List", "Categories", 0),
            ("DocType", "Supplier", "List", "Fournisseurs Partenaires", 0),
        ]),
        ("Configuration", [
            ("DocType", "Company", "List", "Entreprise", 0),
            ("DocType", "Fiscal Year", "List", "Exercice Comptable", 0),
            ("DocType", "Warehouse", "List", "Entrepots", 0),
            ("DocType", "Mode of Payment", "List", "Modes de Paiement", 0),
            ("DocType", "User", "List", "Utilisateurs", 0),
            ("DocType", "Role", "List", "Roles", 0),
            ("DocType", "Print Format", "List", "Formats d'Impression", 0),
            ("DocType", "Document Naming Settings", "List", "Series de Numerotation", 0),
        ]),
    ]

    for card_name, links in card_sections:
        # Card Break entry starts each card
        ws.append("links", {
            "type": "Card Break",
            "label": card_name,
            "hidden": 0,
            "onboard": 0,
        })
        for link_type, link_to, link_view, label, onboard in links:
            ws.append("links", {
                "type": "Link",
                "link_type": link_type,
                "link_to": link_to,
                "link_view": link_view,
                "label": label,
                "onboard": onboard,
            })

    for link_to, label in [
        ("Customer", "Patients"),
        ("Sales Invoice", "Factures"),
        ("Item", "Articles"),
        ("Delivery Note", "Bon de Livraison"),
        ("Supplier", "Fournisseurs"),
        ("Sales Order", "Commande Vente"),
        ("Purchase Order", "Commande Achat"),
        ("Payment Entry", "Encaissement"),
    ]:
        ws.append("shortcuts", {
            "link_type": "DocType",
            "link_to": link_to,
            "label": label,
            "color": "#2490EF",
            "onboard": 1,
        })

    ws.insert(ignore_permissions=True, ignore_links=True)
    frappe.db.commit()

    print(f"Workspace: {ws.name}")
    print(f"Links: {len(ws.links)}")
    print(f"Shortcuts: {len(ws.shortcuts)}")

    card_breaks = [l for l in ws.links if l.type == "Card Break"]
    print(f"Cards: {len(card_breaks)}")
    for cb in card_breaks:
        print(f"  - {cb.label}")

    return ws.name
