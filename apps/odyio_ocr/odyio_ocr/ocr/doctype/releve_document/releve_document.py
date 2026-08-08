import glob
import json
import os
import re
import subprocess
import tempfile

import frappe
from frappe import _
from frappe.model.document import Document

MOTS_ENTETE = (
	"total",
	"designation",
	"désignation",
	"article",
	"reference",
	"référence",
	"qte",
	"qté",
	"quantite",
	"quantité",
	"prix",
	"p.u",
	"pu",
	"montant",
	"ht",
	"ttc",
	"tva",
	"remise",
	"net",
	"libelle",
	"libellé",
	"code",
	"fournisseur",
	"facture",
	"livraison",
)


class ReleveDocument(Document):
	def validate(self):
		self.compute_amounts()

	def compute_amounts(self):
		total = 0
		for row in self.items:
			row.amount = (row.qty or 0) * (row.rate or 0)
			total += row.amount
		self.total_amount = total


@frappe.whitelist()
def analyze_document(doc):
	doc = _get_doc(doc)
	doc.ocr_status = "Analyse en cours"
	doc.error = ""
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	try:
		text = _run_ocr(doc.attachment)
		parsed = _parse_text(text)
		_fill_document(doc, text, parsed)
		doc.ocr_status = "Analyse"
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"ok": True, "status": "Analyse"}
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "ReleveDocument OCR")
		doc.ocr_status = "Erreur"
		doc.error = str(e)
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"ok": False, "error": str(e)}


@frappe.whitelist()
def create_stock_entry(doc):
	doc = _get_doc(doc)
	if not doc.items:
		frappe.throw(_("Aucun article détecté dans le document"))

	company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value(
		"Company", {}, "name"
	)
	warehouse = frappe.db.get_value(
		"Warehouse",
		{"company": company, "is_group": 0, "disabled": 0},
		"name",
		order_by="creation",
	)
	if not warehouse:
		frappe.throw(_("Aucun entrepôt non groupe configuré pour l'entreprise {0}").format(company))

	se = frappe.new_doc("Stock Entry")
	se.stock_entry_type = "Material Receipt"
	se.company = company
	se.set_posting_time = 1
	se.posting_date = doc.date_document or frappe.utils.today()
	se.remark = _("Généré depuis Releve Document {0}").format(doc.name)

	for row in doc.items:
		if not row.matched_item:
			continue
		se.append(
			"items",
			{
				"item_code": row.matched_item,
				"qty": row.qty or 1,
				"basic_rate": row.rate or 0,
				"t_warehouse": warehouse,
			},
		)

	if not se.items:
		frappe.throw(_("Aucun article matché avec le catalogue. Corrigez le matching avant de continuer."))

	se.insert()
	doc.stock_entry = se.name
	doc.save(ignore_permissions=True)
	return {"ok": True, "stock_entry": se.name}


def _get_doc(doc):
	if isinstance(doc, str):
		doc = json.loads(doc)
	return frappe.get_doc(doc)


def _run_ocr(attachment):
	file_doc = frappe.get_doc("File", {"file_url": attachment})
	path = file_doc.get_full_path()
	if not path or not os.path.exists(path):
		frappe.throw(_("Fichier introuvable sur le disque: {0}").format(path))

	ext = os.path.splitext(path)[1].lower()
	image_path = path
	with tempfile.TemporaryDirectory() as tmp:
		if ext == ".pdf":
			prefix = os.path.join(tmp, "page")
			subprocess.run(
				["pdftoppm", "-png", "-r", "200", "-f", "1", "-l", "1", path, prefix],
				check=True,
				capture_output=True,
			)
			image_path = glob.glob(prefix + "*.png")[0]
		cmd = ["tesseract", image_path, "stdout", "-l", "fra", "--psm", "6"]
		result = subprocess.run(cmd, capture_output=True, text=True)
		if result.returncode != 0:
			frappe.throw(_("Tesseract a échoué: {0}").format(result.stderr))
		return result.stdout


def _parse_text(text):
	document_type = "Facture" if re.search(r"FACTURE", text, re.I) else "Bon de Livraison"

	number = ""
	m = re.search(r"(?:N°?|NO|NUMERO|No)\s*[:.\-]?\s*([A-Za-z0-9][A-Za-z0-9\-/_]{2,})", text, re.I)
	if m:
		number = m.group(1)

	date_value = None
	m = re.search(r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b", text)
	if m:
		date_value = "{0}-{1}-{2}".format(m.group(3), m.group(2), m.group(1))

	supplier = _find_supplier(text)
	items = _extract_items(text.splitlines())

	return {
		"document_type": document_type,
		"document_number": number,
		"date_document": date_value,
		"supplier": supplier,
		"items": items,
	}


def _find_supplier(text):
	lower = text.lower()
	for s in frappe.get_all("Supplier", fields=["name", "supplier_name"]):
		for candidate in (s.supplier_name, s.name):
			if candidate and len(candidate) > 3 and candidate.lower() in lower:
				return s.name
	return None


def _extract_items(lines):
	items = []
	seen = set()
	re_3 = re.compile(r"^(.*?)\s+([0-9][0-9.,]*)\s+([0-9][0-9.,]*)\s+([0-9][0-9.,]*)\s*$")
	re_2 = re.compile(r"^(.*?)\s+([0-9][0-9.,]*)\s+([0-9][0-9.,]*)\s*$")
	for line in lines:
		line = line.strip()
		if not line:
			continue
		code, qty, rate, amount = "", 0, 0, 0
		m = re_3.match(line)
		if m:
			code, q, r, a = m.groups()
			vals = [_parse_number(t) for t in (q, r, a)]
			if all(v is not None for v in vals):
				qty, rate, amount = vals
		else:
			m = re_2.match(line)
			if m:
				code, q, a = m.groups()
				vals = [_parse_number(t) for t in (q, a)]
				if all(v is not None for v in vals):
					qty, amount = vals
					rate = amount / qty if qty else 0
		if not qty:
			continue
		code = code.strip()
		if not code or not re.search(r"[A-Za-zÀ-ÿ]", code):
			continue
		if any(word in code.lower() for word in MOTS_ENTETE):
			continue
		if code.lower() in seen:
			continue
		tokens = code.split()
		if len(tokens) >= 2:
			item_code, item_name = tokens[0], " ".join(tokens[1:])
		else:
			item_code, item_name = code, code
		seen.add(code.lower())
		items.append(
			{"item_code": item_code, "item_name": item_name, "qty": qty, "rate": rate, "amount": amount}
		)
	return items


def _parse_number(token):
	t = token.replace(" ", "").strip()
	if not t:
		return None
	if "," in t and "." in t:
		if t.rindex(",") > t.rindex("."):
			t = t.replace(".", "").replace(",", ".")
		else:
			t = t.replace(",", "")
	elif "," in t:
		t = t.replace(",", ".")
	if not re.match(r"^\d+(\.\d+)?$", t):
		return None
	return float(t)


def _fill_document(doc, text, parsed):
	if parsed["document_type"]:
		doc.document_type = parsed["document_type"]
	if parsed["document_number"]:
		doc.document_number = parsed["document_number"]
	if parsed["date_document"]:
		doc.date_document = parsed["date_document"]
	if parsed["supplier"]:
		doc.supplier = parsed["supplier"]
	doc.ocr_text = text
	doc.items = []
	for item in parsed["items"]:
		matched_item, status = _match_item(item["item_code"])
		doc.append(
			"items",
			{
				"item_code": item["item_code"],
				"item_name": item["item_name"],
				"qty": item["qty"],
				"rate": item["rate"],
				"amount": item["amount"],
				"matched_item": matched_item,
				"match_status": status,
			},
		)


def _match_item(code):
	exact = frappe.db.get_value("Item", {"item_code": code}, "name")
	if exact:
		return exact, "Matché"
	fuzzy = frappe.db.get_value("Item", {"item_code": ["like", "%{0}%".format(code)]}, "name")
	if fuzzy:
		return fuzzy, "Matché"
	return None, "Non trouvé"
