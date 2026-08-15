
from __future__ import annotations
 
import time
from dataclasses import dataclass, asdict
from typing import Optional
 
import requests
 
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
 
REQUEST_TIMEOUT = 8
CACHE_TTL_SECONDS = 15 * 60
 
_cache: dict[tuple[float, float, str], tuple[float, dict]] = {}
 
 
@dataclass
class CurrentConditions:
    aqi: Optional[int]
    pm2_5: Optional[float]
    pm10: Optional[float]
    temperature_c: float
    feels_like_c: float
    humidity_pct: float
    uv_index: float
    pollen_level: str
    grass_pollen: Optional[float]
    birch_pollen: Optional[float]
    timestamp: str
 
    def to_dict(self) -> dict:
        return asdict(self)
 
 
def _cache_get(lat: float, lon: float, kind: str) -> Optional[dict]:
    key = (round(lat, 3), round(lon, 3), kind)
    hit = _cache.get(key)
    if not hit:
        return None
    ts, data = hit
    if time.time() - ts > CACHE_TTL_SECONDS:
        return None
    return data
 
 
def _cache_set(lat: float, lon: float, kind: str, data: dict) -> None:
    key = (round(lat, 3), round(lon, 3), kind)
    _cache[key] = (time.time(), data)
 
 
def _classify_pollen(grass: Optional[float], birch: Optional[float]) -> str:
    values = [v for v in (grass, birch) if v is not None]
    if not values:
        return "Unavailable"
    peak = max(values)
    if peak < 20:
        return "Low"
    if peak < 50:
        return "Moderate"
    return "High"
 
 
def get_current_conditions(lat: float, lon: float) -> CurrentConditions:
    cached = _cache_get(lat, lon, "current")
    if cached:
        return CurrentConditions(**cached)
 
    weather_resp = requests.get(
        WEATHER_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,uv_index",
            "timezone": "auto",
        },
        timeout=REQUEST_TIMEOUT,
    )
    weather_resp.raise_for_status()
    weather = weather_resp.json().get("current", {})
 
    air_resp = requests.get(
        AIR_QUALITY_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "us_aqi,pm2_5,pm10,grass_pollen,birch_pollen",
            "timezone": "auto",
        },
        timeout=REQUEST_TIMEOUT,
    )
    air_resp.raise_for_status()
    air = air_resp.json().get("current", {})
 
    grass = air.get("grass_pollen")
    birch = air.get("birch_pollen")
 
    result = CurrentConditions(
        aqi=air.get("us_aqi"),
        pm2_5=air.get("pm2_5"),
        pm10=air.get("pm10"),
        temperature_c=weather.get("temperature_2m"),
        feels_like_c=weather.get("apparent_temperature"),
        humidity_pct=weather.get("relative_humidity_2m"),
        uv_index=weather.get("uv_index"),
        pollen_level=_classify_pollen(grass, birch),
        grass_pollen=grass,
        birch_pollen=birch,
        timestamp=weather.get("time", ""),
    )
 
    _cache_set(lat, lon, "current", result.to_dict())
    return result
 
 
def get_history(lat: float, lon: float, days: int = 7) -> list[dict]:
    cached = _cache_get(lat, lon, f"history_{days}")
    if cached:
        return cached["days"]
 
    weather_resp = requests.get(
        WEATHER_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_mean,relative_humidity_2m_mean",
            "past_days": days,
            "forecast_days": 1,
            "timezone": "auto",
        },
        timeout=REQUEST_TIMEOUT,
    )
    weather_resp.raise_for_status()
    daily = weather_resp.json().get("daily", {})
 
    air_resp = requests.get(
        AIR_QUALITY_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "hourly": "us_aqi",
            "past_days": days,
            "forecast_days": 1,
            "timezone": "auto",
        },
        timeout=REQUEST_TIMEOUT,
    )
    air_resp.raise_for_status()
    hourly = air_resp.json().get("hourly", {})
 
    daily_aqi = _average_hourly_to_daily(hourly.get("time", []), hourly.get("us_aqi", []))
 
    days_out = []
    times = daily.get("time", [])
    temps = daily.get("temperature_2m_mean", [])
    hums = daily.get("relative_humidity_2m_mean", [])
    for i, date_str in enumerate(times):
        days_out.append({
            "date": date_str,
            "dayLabel": date_str[-5:],
            "temp": temps[i] if i < len(temps) else None,
            "humidity": hums[i] if i < len(hums) else None,
            "aqi": daily_aqi.get(date_str),
        })
 
    _cache_set(lat, lon, f"history_{days}", {"days": days_out})
    return days_out
 
 
def _average_hourly_to_daily(times: list[str], values: list[Optional[float]]) -> dict[str, float]:
    buckets: dict[str, list[float]] = {}
    for t, v in zip(times, values):
        if v is None:
            continue
        date = t[:10]
        buckets.setdefault(date, []).append(v)
    return {date: round(sum(vals) / len(vals)) for date, vals in buckets.items()}
