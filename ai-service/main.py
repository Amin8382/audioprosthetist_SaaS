import uvicorn
from fastapi import FastAPI
from routers.predict_claim import router as predict_claim_router
from routers.extract_document import router as extract_document_router

app = FastAPI(title="Odyio AI Service", version="1.0.0")
app.include_router(predict_claim_router)
app.include_router(extract_document_router)

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
