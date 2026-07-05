import json
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pipelines.ocr import OCRPipeline

logger = logging.getLogger(__name__)
router = APIRouter()
ocr_pipeline = OCRPipeline()

@router.post("/extract-document")
async def extract_document(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(400, "No file uploaded")
    
    contents = await file.read()
    result = ocr_pipeline.process(contents, file.filename)
    
    if result["confidence"] < 0.7:
        logger.info(f"Low confidence ({result['confidence']}), attempting Claude Vision fallback")
        from pipelines.vision import ClaudeVisionPipeline
        vision = ClaudeVisionPipeline()
        vision_result = vision.process(contents, file.filename)
        if vision_result["confidence"] > result["confidence"]:
            result = vision_result
    
    return result
