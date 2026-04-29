from fastapi import APIRouter, Query

from app.core.ephem_engine import (
    compute_moon_raw,
    compute_sun_raw,
    parse_observation_time,
)
from app.services.sky_service import (
    build_sky_scene,
    format_moon_output,
    format_sun_output,
)

router = APIRouter(prefix="/api", tags=["sky"])


@router.get("/sky")
def get_sky_scene(
    lat: float = Query(..., description="Observer latitude in decimal degrees."),
    lon: float = Query(..., description="Observer longitude in decimal degrees."),
    time: str | None = Query(None, description="ISO datetime. Defaults to current UTC."),
):
    obs_time = parse_observation_time(time).isoformat()
    moon = format_moon_output(compute_moon_raw(lat=lat, lon=lon, time_str=time))
    sun = format_sun_output(compute_sun_raw(lat=lat, lon=lon, time_str=time))
    return build_sky_scene(lat=lat, lon=lon, time_iso=obs_time, moon=moon, sun=sun)
