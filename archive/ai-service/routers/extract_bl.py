from fastapi import APIRouter
from pydantic import BaseModel
from pipelines.ocr import extract_text_from_file
from pipelines.table_detection import extract_bl_table
from pipelines.vision import call_claude_vision

router = APIRouter()

class BlExtractRequest(BaseModel):
    filePath: str

class BlLine(BaseModel):
    description: str | None = None
    reference: str | None = None
    quantity: float = 0
    unit_price_ht: float | None = None
    total_ht: float | None = None
    ear_side: str | None = None

class BlExtractResponse(BaseModel):
    fournisseur_name: str | None = None
    bl_numero: str | None = None
    bl_date: str | None = None
    lignes: list[BlLine] = []
    total_ht: float | None = None
    confidence: float = 0.0
    source: str = "local_pipeline"

@router.post("/ai/extract-bl", response_model=BlExtractResponse)
def extract_bl(req: BlExtractRequest):
    text = extract_text_from_file(req.filePath)
    if not text:
        return BlExtractResponse(confidence=0.0, source="local_pipeline")

    result = extract_bl_table(text)

    if result.get("confidence", 0) < 0.7:
        prompt = (
            "Extract the line items table from this supplier delivery note "
            "(BL fournisseur). Return ONLY JSON: "
            "{fournisseur_name, bl_numero, bl_date, "
            "lignes: [{description, reference, quantity, "
            "unit_price_ht, total_ht, ear_side}], total_ht}"
        )
        claude = call_claude_vision(req.filePath, prompt)
        if claude:
            claude["source"] = "claude_vision"
            lignes = [BlLine(**l) for l in claude.get("lignes", [])]
            return BlExtractResponse(
                fournisseur_name=claude.get("fournisseur_name"),
                bl_numero=claude.get("bl_numero"),
                bl_date=claude.get("bl_date"),
                lignes=lignes,
                total_ht=claude.get("total_ht"),
                confidence=claude.get("confidence", 0.0),
                source="claude_vision",
            )

    lignes = [BlLine(**l) for l in result.get("lignes", [])]
    return BlExtractResponse(
        bl_numero=result.get("bl_numero"),
        bl_date=result.get("bl_date"),
        lignes=lignes,
        total_ht=result.get("total_ht"),
        confidence=result.get("confidence", 0.0),
        source=result.get("source", "local_pipeline"),
    )
