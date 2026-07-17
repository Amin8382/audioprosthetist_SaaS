import re
from typing import Optional

DATE_PATTERN = r'\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}'
PRICE_PATTERN = r'(\d+)[,\.](\d{2})\s*(?:TND|DT|dinars?)'
AUDIOGRAM_PATTERN = r'(\d{3,4})\s*Hz\s*[:\-]?\s*(\d{1,3})\s*dB'


def extract_dates(text: str) -> list[str]:
    return re.findall(DATE_PATTERN, text)


def extract_prices(text: str) -> list[float]:
    matches = re.findall(PRICE_PATTERN, text, re.IGNORECASE)
    return [float(f"{m[0]}.{m[1]}") for m in matches]


def extract_audiogram(text: str) -> dict:
    matches = re.findall(AUDIOGRAM_PATTERN, text, re.IGNORECASE)
    values = {}
    for hz_str, db_str in matches:
        hz = int(hz_str)
        db = int(db_str)
        if hz in (125, 250, 500, 1000, 2000, 4000, 8000):
            values[str(hz)] = db
    return values


def extract_ear_side(text: str) -> Optional[str]:
    lower = text.lower()
    if any(w in lower for w in ['bilat', 'both', 'deux']):
        return "BILATERAL"
    if any(w in lower for w in ['gauche', 'left', 'l']):
        return "LEFT"
    if any(w in lower for w in ['droite', 'right', 'r']):
        return "RIGHT"
    return None


def extract_document_fields(text: str) -> dict:
    dates = extract_dates(text)
    prices = extract_prices(text)
    audiogram = extract_audiogram(text)
    ear_side = extract_ear_side(text)

    total_fields = 4
    filled = sum([
        1 if prices else 0,
        1 if ear_side else 0,
        1 if dates else 0,
        1 if audiogram else 0,
    ])

    return {
        "device_price_tnd": max(prices) if prices else None,
        "ear_side": ear_side,
        "prescription_date": dates[0] if dates else None,
        "audiogram": {"left": None, "right": None} if audiogram else None,
        "confidence": round(filled / total_fields, 2),
        "source": "local_pipeline",
    }
