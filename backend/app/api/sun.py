from fastapi import APIRouter, Query

from app.core.ephem_engine import compute_sun_raw
from app.services.sky_service import format_sun_output

router = APIRouter(prefix="/api", tags=["sun"])


@router.get("/sun")
def get_sun(
    lat: float = Query(..., description="Observer latitude in decimal degrees."),
    lon: float = Query(..., description="Observer longitude in decimal degrees."),
    time: str | None = Query(None, description="ISO datetime. Defaults to current UTC."),
):
    raw = compute_sun_raw(lat=lat, lon=lon, time_str=time)
    return format_sun_output(raw)
