import uvicorn
from fastapi import FastAPI
from routers.extract import router as extract_router
from routers.extract_bl import router as extract_bl_router

app = FastAPI(title="Audiosoin AI Service", version="1.0.0")
app.include_router(extract_router)
app.include_router(extract_bl_router)

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
