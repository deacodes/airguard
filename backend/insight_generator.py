from typing import Any


def generate_pattern_summary(
    patterns: list[dict],
    baseline: dict[str, Any]
) -> str:

    if not patterns:
        return (
            "We couldn't identify any clear patterns yet. "
            "Keep logging your experiences to improve future insights."
        )

    strongest_pattern = max(
        patterns,
        key=lambda p: p["confidence_pct"]
    )

    return (
        f"Your strongest pattern is "
        f"'{strongest_pattern['title']}'. "
        f"It appeared on "
        f"{strongest_pattern['matched_days']} of "
        f"{strongest_pattern['total_days']} tracked days "
        f"with a confidence of "
        f"{strongest_pattern['confidence_pct']}%."
    )


def generate_daily_recommendations(
    current_conditions: dict
) -> list[str]:

    recommendations = []

    if (current_conditions.get("aqi") or 0) > 120:
        recommendations.append(
            "Reduce outdoor exposure if possible."
        )

    if (current_conditions.get("humidity_pct") or 0) > 70:
        recommendations.append(
            "Stay hydrated."
        )

    if (current_conditions.get("temperature_c") or 0) > 33:
        recommendations.append(
            "Avoid excessive heat during the day."
        )

    if (current_conditions.get("uv_index") or 0) > 7:
        recommendations.append(
            "Limit direct sun exposure."
        )

    return recommendations


def generate_flag_explanation(
    current_conditions: dict,
    pattern: dict
) -> str:

    recommendations = generate_daily_recommendations(
        current_conditions
    )

    advice = (
        recommendations[0]
        if recommendations
        else "Continue monitoring your symptoms."
    )

    return (
        f"Today's environmental conditions resemble your "
        f"'{pattern['title']}' pattern. "
        f"{advice}"
    )


def generate_chat_reply(
    user_question: str,
    *,
    current_conditions: dict,
    baseline: dict,
    patterns: list[dict],
    activity_context: dict | None = None,
    conversation_history=None
) -> str:

    if patterns:
        return generate_pattern_summary(
            patterns,
            baseline
        )

    # No patterns: if the user provided a planned activity, craft a
    # short, friendly, activity-focused reply using the available
    # environmental and baseline numbers.
    activity_context = activity_context or {}

    # Prefer numeric keys commonly used by the frontend/backend.
    temp_now = (
        (current_conditions or {}).get("temperature_c")
        or (current_conditions or {}).get("temp")
        or activity_context.get("temperature")
    )
    hum_now = (
        (current_conditions or {}).get("humidity_pct")
        or (current_conditions or {}).get("humidity")
        or activity_context.get("humidity")
    )
    aqi_now = (
        (current_conditions or {}).get("aqi")
        or activity_context.get("aqi")
    )

    base_temp = (
        (baseline or {}).get("temp")
        or (baseline or {}).get("temperature_c")
        or (baseline or {}).get("baseline_temperature")
    )

    # Build a concise reply prioritizing activity information.
    activity = activity_context.get("activity") or "this activity"
    duration = activity_context.get("duration_minutes") or activity_context.get("duration")
    time = activity_context.get("selected_time") or activity_context.get("planned_time") or activity_context.get("plannedTime")
    best_window = activity_context.get("best_window")

    sentences = []

    # Opening sentence grounded in current numbers when available.
    if temp_now is not None and base_temp is not None:
        try:
            temp_now_n = float(temp_now)
            base_temp_n = float(base_temp)
            diff = round(temp_now_n - base_temp_n)
            if diff > 0:
                sentences.append(f"For your {duration or ''} {activity} at {time or 'the selected time'}, it'll be about {round(temp_now_n)}°C — about {abs(diff)}°C warmer than your usual activity days.")
            elif diff < 0:
                sentences.append(f"For your {duration or ''} {activity} at {time or 'the selected time'}, it'll be about {round(temp_now_n)}°C — about {abs(diff)}°C cooler than your usual activity days.")
            else:
                sentences.append(f"For your {duration or ''} {activity} at {time or 'the selected time'}, conditions are similar to your usual activity days at about {round(temp_now_n)}°C.")
        except (TypeError, ValueError):
            pass
    elif temp_now is not None:
        sentences.append(f"Conditions for your {activity} look like about {temp_now}°C at the selected time.")

    # Suggestion sentence: prefer an AIRGUARD-provided better time if present.
    if best_window:
        sentences.append(f"If possible, shift to {best_window} — it's a closer match to your comfortable-day history.")
    else:
        # Use simple heuristics for one practical suggestion.
        if aqi_now is not None and isinstance(aqi_now, (int, float)) and aqi_now > 120:
            sentences.append("Consider reducing outdoor exposure or choosing a lower-AQI time.")
        elif temp_now is not None and base_temp is not None and isinstance(base_temp, (int, float)):
            try:
                if float(temp_now) - float(base_temp) > 2:
                    sentences.append("Consider a cooler time of day to reduce heat stress.")
                else:
                    sentences.append("This looks reasonable — a short break-and-hydrate rule is a good precaution.")
            except Exception:
                sentences.append("A small adjustment in timing could make this more comfortable.")
        else:
            sentences.append("Consider a slightly cooler or lower-AQI time if one is available.")

    # Keep it short: 2-3 sentences maximum.
    reply = " ".join(sentences)[:1000]
    if not reply:
        return "I don't have enough information to identify a pattern yet."
    return reply
