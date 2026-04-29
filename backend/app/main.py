from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.moon import router as moon_router
from app.api.sky import router as sky_router
from app.api.sun import router as sun_router
from app.api.esp import router as esp_router

app = FastAPI(title="Moon Simulator API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(moon_router)
app.include_router(sun_router)
app.include_router(sky_router)
app.include_router(esp_router)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/viewer", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="viewer")


@app.get("/")
def health():
    return {"status": "ok", "service": "moon-simulator"}
