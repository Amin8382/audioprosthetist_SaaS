from fastapi import APIRouter
from pydantic import BaseModel
from pipelines.ocr import extract_text_from_file
from pipelines.ner import extract_document_fields
from pipelines.vision import call_claude_vision

router = APIRouter()

class ExtractRequest(BaseModel):
    filePath: str
    documentType: str

class ExtractResponse(BaseModel):
    patient_name: str | None = None
    doctor_name: str | None = None
    device_brand: str | None = None
    device_model: str | None = None
    device_price_tnd: float | None = None
    ear_side: str | None = None
    prescription_date: str | None = None
    audiogram: dict | None = None
    confidence: float = 0.0
    source: str = "local_pipeline"

@router.post("/ai/extract-document", response_model=ExtractResponse)
def extract_document(req: ExtractRequest):
    text = extract_text_from_file(req.filePath)
    if not text:
        return ExtractResponse(confidence=0.0, source="local_pipeline")

    fields = extract_document_fields(text)

    if fields.get("confidence", 0) < 0.7:
        prompt = (
            "Extract from this Tunisian medical document (French/Arabic mixed). "
            "Return ONLY valid JSON: "
            "{patient_name, doctor_name, device_brand, "
            "device_model, device_price_tnd, ear_side, "
            "prescription_date, audiogram: {left: {...}, right: {...}}}"
        )
        claude = call_claude_vision(req.filePath, prompt)
        if claude:
            claude["source"] = "claude_vision"
            return ExtractResponse(**claude)

    return ExtractResponse(
        device_price_tnd=fields.get("device_price_tnd"),
        ear_side=fields.get("ear_side"),
        prescription_date=fields.get("prescription_date"),
        confidence=fields.get("confidence", 0.0),
        source=fields.get("source", "local_pipeline"),
    )
