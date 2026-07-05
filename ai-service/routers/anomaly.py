from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ClaimItem(BaseModel):
    claim_id: str
    claim_amount_tnd: float
    device_price_tnd: float
    past_rejection_rate: float
    days_since_diagnosis: int

class AnomalyRequest(BaseModel):
    claims: List[ClaimItem]

@router.post("/detect-anomalies")
async def detect_anomalies(request: AnomalyRequest):
    flagged = []
    for claim in request.claims:
        reasons = []
        score = 0.0

        if claim.claim_amount_tnd > 3000:
            score += 0.3
            reasons.append("AMOUNT_ABOVE_CEILING")

        if claim.device_price_tnd > 0:
            ratio = claim.claim_amount_tnd / claim.device_price_tnd
            if ratio > 1.1:
                score += 0.3
                reasons.append("CLAIM_EXCEEDS_DEVICE_PRICE")

        if claim.days_since_diagnosis < 1:
            score += 0.2
            reasons.append("SAME_DAY_DIAGNOSIS_AND_CLAIM")

        if claim.past_rejection_rate > 0.5:
            score += 0.2
            reasons.append("HIGH_REJECTION_RATE")

        if score > 0.3:
            flagged.append({
                "claim_id": claim.claim_id,
                "anomaly_score": round(score, 2),
                "reason_codes": reasons
            })

    return {"flagged_claims": flagged}
