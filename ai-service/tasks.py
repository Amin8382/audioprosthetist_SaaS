import os
import logging
from celery import Celery

logger = logging.getLogger(__name__)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
app = Celery("audiosoin", broker=redis_url, backend=redis_url)

app.conf.beat_schedule = {
    "retrain-claim-model-weekly": {
        "task": "tasks.retrain_claim_model",
        "schedule": 604800,
    },
    "retrain-noshow-model-weekly": {
        "task": "tasks.retrain_noshow_model",
        "schedule": 604800,
    },
}

@app.task
def send_sms_reminder(appointment_id: str, timing: str):
    logger.info(f"Sending SMS reminder for appointment {appointment_id} ({timing})")

@app.task
def send_email_reminder(appointment_id: str, timing: str):
    logger.info(f"Sending email reminder for appointment {appointment_id} ({timing})")

@app.task
def retrain_claim_model():
    logger.info("Weekly claim model retraining triggered (placeholder)")

@app.task
def retrain_noshow_model():
    logger.info("Weekly noshow model retraining triggered (placeholder)")
