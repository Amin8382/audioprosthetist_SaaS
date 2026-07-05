from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import extract, predict_claim, predict_noshow, anomaly

app = FastAPI(title="Audiosoin AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract.router, prefix="/ai", tags=["Document Extraction"])
app.include_router(predict_claim.router, prefix="/ai", tags=["Claim Prediction"])
app.include_router(predict_noshow.router, prefix="/ai", tags=["No-Show Prediction"])
app.include_router(anomaly.router, prefix="/ai", tags=["Anomaly Detection"])

@app.get("/health")
def health():
    return {"status": "ok"}
