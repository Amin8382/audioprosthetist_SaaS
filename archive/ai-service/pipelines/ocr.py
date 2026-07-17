import cv2
import numpy as np
import easyocr
import fitz  # PyMuPDF

_reader = None

def get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['fr', 'ar'], gpu=False)
    return _reader

def preprocess_image(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary

def extract_text_from_file(file_path: str) -> str:
    text = ""
    if file_path.lower().endswith('.pdf'):
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        if text.strip():
            return text
        doc.close()
        doc = fitz.open(file_path)
        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
            processed = preprocess_image(img)
            reader = get_reader()
            result = reader.readtext(processed)
            text += " ".join([item[1] for item in result]) + "\n"
        doc.close()
    else:
        img = cv2.imread(file_path)
        if img is None:
            return ""
        processed = preprocess_image(img)
        reader = get_reader()
        result = reader.readtext(processed)
        text = " ".join([item[1] for item in result])
    return text.strip()
