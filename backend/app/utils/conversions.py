import datetime
import math

EPHEM_EPOCH = datetime.datetime(1899, 12, 31)
AU_IN_KM = 149597870.7


def as_float(value) -> float:
    return float(value)


def rad_to_deg(rad) -> float | None:
    if rad is None:
        return None
    return math.degrees(float(rad))


def rad_to_hours(rad) -> float | None:
    if rad is None:
        return None
    return float(rad) * 12.0 / math.pi


def au_to_km(au) -> float:
    return as_float(au) * AU_IN_KM


def ephem_to_iso(ephem_date) -> str | None:
    if ephem_date is None:
        return None  # or "N/A" if you prefer strings

    dt = EPHEM_EPOCH + datetime.timedelta(days=as_float(ephem_date))
    return dt.isoformat()
