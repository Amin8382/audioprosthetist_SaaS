from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import random
import uuid

router = APIRouter()

class ClaimRequest(BaseModel):
    montant_demande: float
    montant_total_ttc: Optional[float] = 0
    taux_remboursement: Optional[float] = 70
    cnam_affiliation_type: Optional[str] = ""
    customer_name: Optional[str] = ""

class ClaimResponse(BaseModel):
    request_id: str
    probability: float
    prediction: str
    details: dict

@router.post("/ai/predict-claim", response_model=ClaimResponse)
def predict_claim(req: ClaimRequest):
    if req.montant_demande <= 0:
        raise HTTPException(status_code=400, detail="Montant demande invalide")

    prob = random.uniform(0.3, 0.95)
    if prob >= 0.7:
        prediction = "Probablement approuve"
    elif prob >= 0.4:
        prediction = "Incertain"
    else:
        prediction = "Probablement refuse"

    return ClaimResponse(
        request_id=str(uuid.uuid4()),
        probability=round(prob * 100, 1),
        prediction=prediction,
        details={
            "montant_demande": req.montant_demande,
            "taux_remboursement": req.taux_remboursement,
            "affiliation": req.cnam_affiliation_type,
        },
    )
