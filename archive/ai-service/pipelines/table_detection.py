import re
from typing import Any

HEADER_KEYWORDS = [
    "designation", "article", "reference", "description", "libelle",
    "quantite", "quantité", "qte", "qty",
    "prix", "price", "montant", "tarif", "p.u.ht",
    "total", "total ht", "montant ht",
]

LINE_PATTERN = r'(?P<desc>[A-Za-zÀ-ÿ0-9\s/\-]+?)\s+(?P<qty>\d+)\s+(?P<price>\d+[.,]\d{2})'
TOTAL_HT_PATTERN = r'total\s+H\.?T\.?\s*:?\s*(\d+[.,]\d{2})'
BL_NUM_PATTERN = r'(?:BL|N[°o]|Bon)\s*[-:]?\s*([\w\-\/]+)'
BL_DATE_PATTERN = r'\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}'


def extract_lines(text: str) -> list[dict[str, Any]]:
    lines = []
    for match in re.finditer(LINE_PATTERN, text, re.IGNORECASE):
        lines.append({
            "description": match.group("desc").strip(),
            "quantity": float(match.group("qty")),
            "unit_price_ht": float(match.group("price").replace(",", ".")),
        })
    return lines


def extract_bl_number(text: str) -> str | None:
    match = re.search(BL_NUM_PATTERN, text, re.IGNORECASE)
    return match.group(1) if match else None


def extract_bl_date(text: str) -> str | None:
    dates = re.findall(BL_DATE_PATTERN, text)
    return dates[0] if dates else None


def extract_total_ht(text: str) -> float | None:
    match = re.search(TOTAL_HT_PATTERN, text, re.IGNORECASE)
    if match:
        return float(match.group(1).replace(",", "."))
    return None


def extract_bl_table(text: str) -> dict:
    lignes = extract_lines(text)
    total_ht = extract_total_ht(text)
    bl_num = extract_bl_number(text)
    bl_date = extract_bl_date(text)

    total_fields = 3 + len(lignes)
    filled = sum([
        1 if lignes else 0,
        1 if total_ht else 0,
        1 if bl_num else 0,
        1 if bl_date else 0,
    ])
    confidence = round(filled / max(total_fields, 1), 2) if total_fields > 0 else 0.0

    return {
        "bl_numero": bl_num,
        "bl_date": bl_date,
        "lignes": lignes,
        "total_ht": total_ht,
        "confidence": min(confidence, 1.0),
        "source": "local_pipeline",
    }
