import datetime

import ephem
import pytz


def parse_observation_time(time_str: str | None) -> datetime.datetime:
    if not time_str:
        return datetime.datetime.now(datetime.UTC)

    dt = datetime.datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.UTC)
    return dt.astimezone(datetime.UTC)


def build_observer(
    lat: float,
    lon: float,
    at_time: datetime.datetime,
    elevation: float = 0.0,
    pressure: float = 1013.25,
    horizon: str = "-0:34",
    epoch: str = "2000",
) -> ephem.Observer:
    observer = ephem.Observer()
    observer.lat = str(lat)
    observer.lon = str(lon)
    observer.elev = elevation
    observer.pressure = pressure
    observer.horizon = horizon
    observer.epoch = epoch
    observer.date = at_time.astimezone(pytz.UTC)
    return observer


def body_to_raw_dict(body: ephem.Body) -> dict:
    raw: dict = {}
    for attr in dir(body):
        if attr.startswith("_"):
            continue
        try:
            value = getattr(body, attr)
            if callable(value):
                continue
            raw[attr] = value
        except Exception:
            continue
    return raw


def compute_moon_raw(lat: float, lon: float, time_str: str | None) -> dict:
    obs_time = parse_observation_time(time_str)
    observer = build_observer(lat=lat, lon=lon, at_time=obs_time)
    moon = ephem.Moon()
    moon.compute(observer)
    return body_to_raw_dict(moon)


def compute_sun_raw(lat: float, lon: float, time_str: str | None) -> dict:
    obs_time = parse_observation_time(time_str)
    observer = build_observer(lat=lat, lon=lon, at_time=obs_time)
    sun = ephem.Sun()
    sun.compute(observer)
    return body_to_raw_dict(sun)
