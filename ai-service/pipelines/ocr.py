import io
import json
import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class OCRPipeline:
    def __init__(self):
        self.reader = None

    def _get_reader(self):
        if self.reader is None:
            try:
                import easyocr
                self.reader = easyocr.Reader(["fr", "ar"], gpu=False)
            except Exception as e:
                logger.warning(f"EasyOCR not available: {e}")
                self.reader = None
        return self.reader

    def process(self, file_bytes: bytes, filename: str) -> dict:
        text = ""

        if filename.lower().endswith(".pdf"):
            try:
                import fitz
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                for page in doc:
                    text += page.get_text()
                if len(text.strip()) > 50:
                    logger.info(f"Extracted {len(text)} chars from PDF text layer")
                else:
                    logger.info("PDF has no text layer, falling back to OCR")
                    text = self._ocr_image(file_bytes)
            except Exception as e:
                logger.error(f"PDF extraction failed: {e}")
                text = self._ocr_image(file_bytes)
        else:
            text = self._ocr_image(file_bytes)

        return self._parse_text(text)

    def _ocr_image(self, image_bytes: bytes) -> str:
        reader = self._get_reader()
        if reader is None:
            return self._tesseract_ocr(image_bytes)

        try:
            import numpy as np
            import cv2
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            denoised = cv2.fastNlMeansDenoising(gray)
            _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            results = reader.readtext(binary)
            return " ".join([r[1] for r in results])
        except Exception as e:
            logger.error(f"EasyOCR failed: {e}")
            return self._tesseract_ocr(image_bytes)

    def _tesseract_ocr(self, image_bytes: bytes) -> str:
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(image_bytes))
            return pytesseract.image_to_string(img, lang="fra+ara")
        except Exception as e:
            logger.error(f"Tesseract failed: {e}")
            return ""

    def _parse_text(self, text: str) -> dict:
        result = {
            "patient_name": "",
            "patient_dob": "",
            "cnam_number": "",
            "doctor_name": "",
            "device_brand": "",
            "device_model": "",
            "device_price_tnd": 0.0,
            "ear_side": "",
            "audiogram": {"left": {}, "right": {}},
            "prescription_date": "",
            "confidence": 0.0,
            "source": "local_pipeline"
        }

        cnam_match = re.search(r"\b\d{6,15}\b", text)
        if cnam_match:
            result["cnam_number"] = cnam_match.group(0)

        date_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
        if date_match:
            result["prescription_date"] = date_match.group(0)

        price_match = re.search(r"(\d+[.,]\d{2})\s*(DT|TND|dinars?)", text, re.IGNORECASE)
        if price_match:
            price_str = price_match.group(1).replace(",", ".")
            result["device_price_tnd"] = float(price_str)

        name_patterns = [
            (r"(?:Patient|Nom|Prénom)[:\s]+([A-Za-zÀ-ÿ\s\-]+)", "patient_name"),
            (r"(?:Docteur|Dr|Médecin)[:\s]+([A-Za-zÀ-ÿ\s\-]+)", "doctor_name"),
        ]
        for pattern, key in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result[key] = match.group(1).strip()

        audiogram_freq = [250, 500, 1000, 2000, 4000, 8000]
        for side, key in [("G", "left"), ("D", "right")]:
            for freq in audiogram_freq:
                pattern = rf"{side}.*?{freq}\s*[:\s]\s*(\d+)"
                match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    result["audiogram"][key][str(freq)] = int(match.group(1))

        ears = []
        if "bilat" in text.lower() or "bilateral" in text.lower():
            ears.append("BILATERAL")
        if "oreille G" in text.lower() or "gauche" in text.lower():
            ears.append("LEFT")
        if "oreille D" in text.lower() or "droite" in text.lower():
            ears.append("RIGHT")
        if ears:
            result["ear_side"] = ears[0]

        brands = ["Phonak", "Oticon", "Widex", "Signia", "Resound", "Starkey", "Unitron"]
        for brand in brands:
            if brand.lower() in text.lower():
                result["device_brand"] = brand
                break

        confidence = 0.3
        if result["patient_name"]:
            confidence += 0.1
        if result["cnam_number"]:
            confidence += 0.15
        if result["prescription_date"]:
            confidence += 0.1
        if result["device_price_tnd"] > 0:
            confidence += 0.1
        if result["doctor_name"]:
            confidence += 0.1
        if any(result["audiogram"]["left"]) or any(result["audiogram"]["right"]):
            confidence += 0.15

        result["confidence"] = round(min(confidence, 1.0), 2)
        return result
