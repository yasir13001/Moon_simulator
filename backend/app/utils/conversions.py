import datetime
import math

EPHEM_EPOCH = datetime.datetime(1899, 12, 31)
AU_IN_KM = 149597870.7


def as_float(value) -> float:
    return float(value)


def rad_to_deg(rad) -> float:
    return math.degrees(as_float(rad))


def rad_to_hours(rad) -> float:
    return as_float(rad) * 12.0 / math.pi


def au_to_km(au) -> float:
    return as_float(au) * AU_IN_KM


def ephem_to_iso(ephem_date) -> str:
    dt = EPHEM_EPOCH + datetime.timedelta(days=as_float(ephem_date))
    return dt.isoformat()
