from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class ClaimFeatures(BaseModel):
    patient_age: float
    affiliation_type: str
    affiliation_valid: bool
    past_claims_count: int
    past_rejection_rate: float
    device_price_tnd: float
    cnam_ceiling_tnd: float = 3000.0
    price_vs_ceiling_ratio: float
    claim_amount_tnd: float
    has_prescription: bool
    has_audiogram: bool
    has_invoice: bool
    has_cnam_card: bool
    has_national_id: bool
    doc_completeness_score: float
    doctor_license_valid: bool
    doctor_past_approval_rate: float
    days_since_diagnosis: int
    submission_day_of_week: int

@router.post("/predict-claim")
async def predict_claim(features: ClaimFeatures):
    try:
        import joblib
        import numpy as np
        model = joblib.load("models/claim_model.pkl")
        # Feature vector construction would go here
        # proba = model.predict_proba(features_vector)[0, 1]
        # For MVP, return rule-based estimate
        pass
    except (FileNotFoundError, Exception) as e:
        logger.warning(f"Model not available, using rule-based fallback: {e}")

    # Rule-based fallback
    score = 0.5
    risk_factors = []

    if features.doc_completeness_score >= 1.0:
        score += 0.2
    else:
        risk_factors.append({
            "feature": "doc_completeness",
            "impact": -0.2,
            "value": features.doc_completeness_score,
            "message": "Documents incomplets"
        })

    ratio = features.price_vs_ceiling_ratio
    if ratio > 0.8:
        score -= 0.15
        risk_factors.append({
            "feature": "price_vs_ceiling",
            "impact": -0.15,
            "value": ratio,
            "message": "Prix proche du plafond CNAM"
        })

    if features.past_rejection_rate > 0.3:
        score -= 0.1
        risk_factors.append({
            "feature": "past_rejections",
            "impact": -0.1,
            "value": features.past_rejection_rate,
            "message": "Taux de rejet passé élevé"
        })

    if features.doctor_past_approval_rate > 0.8:
        score += 0.1
        risk_factors.append({
            "feature": "doctor_approval_rate",
            "impact": 0.1,
            "value": features.doctor_past_approval_rate,
            "message": "Bon taux d'approbation du médecin"
        })

    score = max(0.0, min(1.0, score))

    return {
        "success_probability": round(score, 2),
        "risk_factors": risk_factors,
        "shap_explanation": {}
    }
