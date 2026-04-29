import math

from app.utils.conversions import (
    as_float,
    au_to_km,
    ephem_to_iso,
    rad_to_deg,
    rad_to_hours,
)


def format_moon_output(raw: dict) -> dict:
    altitude_rad = as_float(raw["alt"])

    return {
        "meta": {"object": str(raw["name"])},
        "position": {
            "equatorial": {
                "ra_hours": rad_to_hours(raw["ra"]),
                "dec_deg": rad_to_deg(raw["dec"]),
                "hour_angle_hours": rad_to_hours(raw["ha"]),
            },
            "geocentric": {
                "ra_hours": rad_to_hours(raw["g_ra"]),
                "dec_deg": rad_to_deg(raw["g_dec"]),
            },
            "horizontal": {
                "altitude_deg": rad_to_deg(raw["alt"]),
                "azimuth_deg": rad_to_deg(raw["az"]),
            },
        },
        "phase": {
            "illumination_fraction": as_float(raw["moon_phase"]),
            "phase_percent": as_float(raw["phase"]),
            "elongation_deg": rad_to_deg(raw["elong"]),
            "phase_angle_deg": 180.0 - rad_to_deg(raw["elong"]),
            "visual_magnitude": as_float(raw["mag"]),
        },
        "distance": {
            "au": as_float(raw["earth_distance"]),
            "km": au_to_km(raw["earth_distance"]),
        },
        "libration": {
            "latitude_deg": rad_to_deg(raw["libration_lat"]),
            "longitude_deg": rad_to_deg(raw["libration_long"]),
            "terminator_tilt_deg": rad_to_deg(raw["libration_long"]),
        },
        "appearance": {
            "angular_radius_deg": rad_to_deg(raw["radius"]),
            "angular_size_arcsec": as_float(raw["size"]),
            "colongitude_deg": rad_to_deg(raw["colong"]),
            "subsolar_lat_deg": rad_to_deg(raw["subsolar_lat"]),
        },
        "visibility": {
            "rise_time": ephem_to_iso(raw["rise_time"]),
            "set_time": ephem_to_iso(raw["set_time"]),
            "transit_time": ephem_to_iso(raw["transit_time"]),
            "rise_azimuth_deg": rad_to_deg(raw["rise_az"]),
            "set_azimuth_deg": rad_to_deg(raw["set_az"]),
            "transit_altitude_deg": rad_to_deg(raw["transit_alt"]),
            "visibility_score": max(0.0, math.sin(altitude_rad)),
            "circumpolar": bool(raw["circumpolar"]),
            "never_up": bool(raw["neverup"]),
        },
        "solar_geometry": {"sun_distance_au": as_float(raw["sun_distance"])},
    }


def format_sun_output(raw: dict) -> dict:
    altitude_rad = as_float(raw["alt"])

    return {
        "meta": {"object": str(raw.get("name", "Sun"))},
        "position": {
            "equatorial": {
                "ra_hours": rad_to_hours(raw["ra"]),
                "dec_deg": rad_to_deg(raw["dec"]),
                "hour_angle_hours": rad_to_hours(raw["ha"]),
            },
            "horizontal": {
                "altitude_deg": rad_to_deg(raw["alt"]),
                "azimuth_deg": rad_to_deg(raw["az"]),
            },
        },
        "appearance": {
            "angular_radius_deg": rad_to_deg(raw["radius"]),
            "visual_magnitude": as_float(raw["mag"]),
        },
        "visibility": {
            "rise_time": ephem_to_iso(raw["rise_time"]),
            "set_time": ephem_to_iso(raw["set_time"]),
            "transit_time": ephem_to_iso(raw["transit_time"]),
            "visibility_score": max(0.0, math.sin(altitude_rad)),
            "circumpolar": bool(raw["circumpolar"]),
            "never_up": bool(raw["neverup"]),
        },
        "distance": {
            "earth_distance_au": as_float(raw["earth_distance"]),
            "earth_distance_km": au_to_km(raw["earth_distance"]),
        },
    }


def build_sky_scene(lat: float, lon: float, time_iso: str, moon: dict, sun: dict) -> dict:
    return {
        "observer_location": {"lat": lat, "lon": lon},
        "time": time_iso,
        "celestial_objects": [
            {"type": "moon", "data": moon},
            {"type": "sun", "data": sun},
        ],
        "lighting_model": {
            "sun_altitude_deg": sun["position"]["horizontal"]["altitude_deg"],
            "moon_phase_fraction": moon["phase"]["illumination_fraction"],
        },
        "atmosphere": {"enabled": False, "mode": "placeholder"},
    }
