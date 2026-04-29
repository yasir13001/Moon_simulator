from fastapi import APIRouter, Query
import httpx
import os

router = APIRouter(prefix="/api/esp", tags=["esp"])

# Must match ESP8266 WiFi AP IP from your integration doc.
ESP_BASE_URL = os.environ.get("ESP_BASE_URL", "http://192.168.4.1")


@router.get("/move")
async def move(
    az: float = Query(..., description="Azimuth (absolute) or delta az (relative)."),
    alt: float = Query(..., description="Altitude (absolute) or delta alt (relative)."),
    relative: bool = Query(False, description="If true, interpret az/alt as deltas."),
):
    az = float(az)
    alt = float(alt)

    # Safety limits:
    # - absolute: az [0..360], alt [0..90]
    # - relative: az_delta [-180..180], alt_delta [-90..90]
    if relative:
        az_clamped = max(-180.0, min(180.0, az))
        alt_clamped = max(-90.0, min(90.0, alt))
    else:
        az_clamped = max(0.0, min(360.0, az))
        alt_clamped = max(0.0, min(90.0, alt))

    url = f"{ESP_BASE_URL}/move"
    params = {"az": az_clamped, "alt": alt_clamped}

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(url, params=params)
        # ESP8266 typically returns plain text like "MOVING"
        text = r.text.strip()
        return {"ok": True, "sent": {"az": az_clamped, "alt": alt_clamped}, "response": text}
    except Exception as e:
        return {
            "ok": False,
            "sent": {"az": az_clamped, "alt": alt_clamped},
            "error": str(e),
        }

