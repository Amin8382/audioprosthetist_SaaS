from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ExtractRequest(BaseModel):
    file_url: str
    file_name: Optional[str] = ""

class ExtractResponse(BaseModel):
    extracted_text: str
    confidence: float
    fields: dict

@router.post("/ai/extract-document", response_model=ExtractResponse)
def extract_document(req: ExtractRequest):
    return ExtractResponse(
        extracted_text="",
        confidence=0.0,
        fields={},
    )
