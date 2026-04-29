import datetime
import threading
import time

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


_CACHE_LOCK = threading.Lock()
_RAW_CACHE: dict[tuple, tuple[float, dict]] = {}

# Tune these for your UI:
# - rounding trades a bit of temporal precision for fewer expensive ephemeris recomputations
# - TTL keeps the cache warm while the viewer interpolates between snapshots
_ROUND_TIME_SECONDS = 5
_CACHE_TTL_SECONDS = 20


def _round_time_seconds(dt: datetime.datetime) -> datetime.datetime:
    dt_utc = dt.astimezone(datetime.UTC)
    rounded_epoch = int(dt_utc.timestamp() // _ROUND_TIME_SECONDS) * _ROUND_TIME_SECONDS
    return datetime.datetime.fromtimestamp(rounded_epoch, tz=datetime.UTC)


def _cache_get(key: tuple) -> dict | None:
    now = time.time()
    with _CACHE_LOCK:
        item = _RAW_CACHE.get(key)
        if not item:
            return None
        expires_at, value = item
        if now > expires_at:
            _RAW_CACHE.pop(key, None)
            return None
        return value


def _cache_set(key: tuple, value: dict) -> None:
    expires_at = time.time() + _CACHE_TTL_SECONDS
    with _CACHE_LOCK:
        _RAW_CACHE[key] = (expires_at, value)


def compute_moon_raw(lat: float, lon: float, time_str: str | None) -> dict:
    obs_time = parse_observation_time(time_str)
    rounded_time = _round_time_seconds(obs_time)

    lat_key = round(float(lat), 4)
    lon_key = round(float(lon), 4)
    time_key = int(rounded_time.timestamp())
    key = ("moon", lat_key, lon_key, time_key)

    cached = _cache_get(key)
    if cached is not None:
        return cached

    observer = build_observer(lat=lat_key, lon=lon_key, at_time=rounded_time)
    moon = ephem.Moon()
    moon.compute(observer)
    raw = body_to_raw_dict(moon)
    _cache_set(key, raw)
    return raw


def compute_sun_raw(lat: float, lon: float, time_str: str | None) -> dict:
    obs_time = parse_observation_time(time_str)
    rounded_time = _round_time_seconds(obs_time)

    lat_key = round(float(lat), 4)
    lon_key = round(float(lon), 4)
    time_key = int(rounded_time.timestamp())
    key = ("sun", lat_key, lon_key, time_key)

    cached = _cache_get(key)
    if cached is not None:
        return cached

    observer = build_observer(lat=lat_key, lon=lon_key, at_time=rounded_time)
    sun = ephem.Sun()
    sun.compute(observer)
    raw = body_to_raw_dict(sun)
    _cache_set(key, raw)
    return raw
