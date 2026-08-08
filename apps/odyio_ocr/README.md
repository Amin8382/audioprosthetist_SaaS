# Odyio OCR

Extraction OCR de bons de livraison et de factures (Tesseract), avec generation d'entrees de stock.

## DocTypes

- `Releve Document` — document source (image/PDF), statut OCR, articles detectes, entree de stock liee
- `Releve Document Item` — child table, lignes d'articles extraites et matchees

## Dépendances système

```bash
sudo apt install -y tesseract-ocr tesseract-ocr-fra poppler-utils
```

## Installation

```bash
bench get-app $URL_DU_REPO
bench --site odyio.localhost install-app odyio_ocr
bench --site odyio.localhost migrate
```
