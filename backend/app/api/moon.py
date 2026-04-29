from fastapi import APIRouter, Query

from app.core.ephem_engine import compute_moon_raw
from app.services.sky_service import format_moon_output

router = APIRouter(prefix="/api", tags=["moon"])


@router.get("/moon")
def get_moon(
    lat: float = Query(..., description="Observer latitude in decimal degrees."),
    lon: float = Query(..., description="Observer longitude in decimal degrees."),
    time: str | None = Query(None, description="ISO datetime. Defaults to current UTC."),
):
    raw = compute_moon_raw(lat=lat, lon=lon, time_str=time)
    return format_moon_output(raw)
