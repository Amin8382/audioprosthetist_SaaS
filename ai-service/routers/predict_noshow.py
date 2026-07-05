from fastapi import APIRouter
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class NoshowFeatures(BaseModel):
    lead_time_days: int
    past_noshow_count: int
    past_noshow_rate: float
    appointment_hour: int
    day_of_week: int
    is_first_appointment: bool
    distance_km: float = 0.0
    appointment_type: str
    age: int

@router.post("/predict-noshow")
async def predict_noshow(features: NoshowFeatures):
    score = 0.0

    if features.past_noshow_rate > 0.3:
        score += 0.25
    if features.lead_time_days > 14:
        score += 0.1
    if features.is_first_appointment:
        score += 0.15
    if features.appointment_hour < 9 or features.appointment_hour > 17:
        score += 0.05
    if features.past_noshow_count > 2:
        score += 0.15

    score = min(1.0, max(0.0, score))

    recommended = []
    if score > 0.5:
        recommended.append("24h_sms")
        recommended.append("2h_sms")
    else:
        recommended.append("24h_email")

    return {
        "noshow_probability": round(score, 2),
        "recommended_reminders": recommended
    }
