from __future__ import annotations
 
import statistics
from dataclasses import dataclass, asdict
from typing import Callable, Optional
 
 
@dataclass
class Pattern:
    id: str
    title: str
    description: str
    badge: str
    matched_days: int
    total_days: int
    confidence_pct: int
    stats: dict
 
    def to_dict(self) -> dict:
        return asdict(self)
 
 
MIN_DAYS_FOR_CONFIRMED = 5
MIN_DAYS_FOR_EARLY_SIGNAL = 2
 
 
def _merge_logs_with_env(logs: list[dict], env_history: list[dict]) -> list[dict]:
    env_by_date = {e["date"]: e for e in env_history}
    merged = []
    for log in logs:
        env = env_by_date.get(log.get("date"))
        if env:
            merged.append({**log, **env})
    return merged
 
 
def _confidence_from_ratio(matched: int, total: int, effect_strength: float) -> int:
    if total == 0:
        return 0
    sample_factor = min(matched / max(total, 1), 1.0)
    raw = 0.5 * sample_factor + 0.5 * min(abs(effect_strength), 1.0)
    return round(raw * 100)
 
 
def _badge_for(matched_days: int, confidence_pct: int) -> str:
    if matched_days < MIN_DAYS_FOR_EARLY_SIGNAL:
        return "Insufficient data"
    if matched_days < MIN_DAYS_FOR_CONFIRMED or confidence_pct < 65:
        return "Early signal"
    if confidence_pct < 80:
        return "Moderate signal"
    return "Strong signal"
 
 
def _detect_threshold_pattern(
    merged: list[dict],
    *,
    pattern_id: str,
    title_template: str,
    description_template: str,
    condition: Callable[[dict], bool],
    metric_key: str,
    baseline: float,
) -> Optional[Pattern]:
    matching_days = [d for d in merged if condition(d) and d.get(metric_key) is not None]
    total_days = len(merged)
 
    if not matching_days:
        return None
 
    matched_avg = statistics.mean(d[metric_key] for d in matching_days)
    if baseline == 0:
        effect_strength = 0.0
    else:
        effect_strength = (baseline - matched_avg) / baseline
 
    confidence = _confidence_from_ratio(len(matching_days), total_days, effect_strength)
    badge = _badge_for(len(matching_days), confidence)
 
    return Pattern(
        id=pattern_id,
        title=title_template,
        description=description_template.format(
            matched_avg=round(matched_avg, 1), baseline=round(baseline, 1)
        ),
        badge=badge,
        matched_days=len(matching_days),
        total_days=total_days,
        confidence_pct=confidence,
        stats={
            "matched_avg": round(matched_avg, 2),
            "baseline": round(baseline, 2),
            "delta": round(matched_avg - baseline, 2),
        },
    )
 
 
def _detect_symptom_pattern(
    merged: list[dict],
    *,
    pattern_id: str,
    title: str,
    description: str,
    condition: Callable[[dict], bool],
    symptom: str,
) -> Optional[Pattern]:
    matching_days = [d for d in merged if condition(d)]
    other_days = [d for d in merged if not condition(d)]
    if not matching_days:
        return None
 
    def freq(days: list[dict]) -> float:
        if not days:
            return 0.0
        hits = sum(1 for d in days if symptom in (d.get("symptoms") or []))
        return hits / len(days)
 
    freq_matching = freq(matching_days)
    freq_other = freq(other_days)
    effect_strength = freq_matching - freq_other
 
    confidence = _confidence_from_ratio(len(matching_days), len(merged), effect_strength)
    badge = _badge_for(len(matching_days), confidence)
 
    return Pattern(
        id=pattern_id,
        title=title,
        description=description,
        badge=badge,
        matched_days=len(matching_days),
        total_days=len(merged),
        confidence_pct=confidence,
        stats={
            "symptom_freq_matching_pct": round(freq_matching * 100),
            "symptom_freq_other_pct": round(freq_other * 100),
        },
    )
 
 
def detect_patterns(logs: list[dict], env_history: list[dict]) -> list[Pattern]:
    merged = _merge_logs_with_env(logs, env_history)
    if not merged:
        return []
 
    baseline_energy = statistics.mean(d["energy"] for d in merged if d.get("energy") is not None)
    baseline_comfort = statistics.mean(d["comfort"] for d in merged if d.get("comfort") is not None)
 
    patterns: list[Pattern] = []
 
    humidity_pattern = _detect_threshold_pattern(
        merged,
        pattern_id="humidity",
        title_template="High humidity leads to lower energy",
        description_template=(
            "On days when humidity is above 70%, your energy score drops to "
            "{matched_avg}/10 vs your baseline of {baseline}/10."
        ),
        condition=lambda d: (d.get("humidity") or 0) > 70,
        metric_key="energy",
        baseline=baseline_energy,
    )
    if humidity_pattern:
        patterns.append(humidity_pattern)
 
    aqi_pattern = _detect_symptom_pattern(
        merged,
        pattern_id="aqi",
        title="High AQI increases congestion reports",
        description="When AQI exceeds 120, congestion is reported far more often than on cleaner days.",
        condition=lambda d: (d.get("aqi") or 0) > 120,
        symptom="Congestion",
    )
    if aqi_pattern:
        patterns.append(aqi_pattern)
 
    heat_outdoor_pattern = _detect_threshold_pattern(
        merged,
        pattern_id="heat_outdoor",
        title_template="Heat + outdoor activity reduces comfort",
        description_template=(
            "On hot days (>33°C) spent partly outdoors, comfort drops to "
            "{matched_avg}/10 vs your baseline of {baseline}/10."
        ),
        condition=lambda d: (d.get("temp") or 0) > 33 and d.get("activity") == "Outside",
        metric_key="comfort",
        baseline=baseline_comfort,
    )
    if heat_outdoor_pattern:
        patterns.append(heat_outdoor_pattern)
 
    return patterns
 
 
def is_today_flagged(current_conditions: dict, patterns: list[Pattern]) -> tuple[bool, list[str]]:
    reasons = []
    if (current_conditions.get("humidity_pct") or 0) > 70:
        reasons.append("humidity")
    if (current_conditions.get("aqi") or 0) > 120:
        reasons.append("aqi")
    if (current_conditions.get("temperature_c") or 0) > 33:
        reasons.append("heat")
 
    flagged = bool(reasons) and any(p.confidence_pct >= 65 for p in patterns if p.id in reasons)
    return flagged, reasons
