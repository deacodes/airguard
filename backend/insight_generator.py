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
    conversation_history=None
) -> str:

    if patterns:
        return generate_pattern_summary(
            patterns,
            baseline
        )

    return (
        "I don't have enough information to identify a pattern yet."
    )
