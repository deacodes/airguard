"""
AIRGUARD — AI Explanation Module
"""

from __future__ import annotations

import os
import re
from typing import Any, Optional

import requests

from insight_generator import generate_chat_reply


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"
REQUEST_TIMEOUT = 15

_MARKDOWN_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def _markdown_bold_to_html(text: str) -> str:
    """
    Convert markdown bold to HTML so the frontend doesn't display
    literal **asterisks**.
    """
    return _MARKDOWN_BOLD_RE.sub(r"<b>\1</b>", text)


SYSTEM_PROMPT = """
You are AIRGUARD AI, a warm, perceptive assistant who happens to be great with data. You help the user understand how their environment might connect to how they've been feeling.

You'll get their question plus a JSON bundle of already-aggregated pattern and environment data (no raw journal text, no personal identifiers). Ground everything you say in this data — never invent numbers — but you don't need to use all of it. Pick the one or two most relevant, interesting things and talk about those, the way a friend would, not an analyst reading a report.

You will receive structured data such as:

- current environmental conditions
- historical baseline
- detected patterns
- activity context

The activity_context may describe an activity the user is planning,
such as:

- activity type
- duration
- planned time
- location
- temperature
- humidity
- AQI
- AIRGUARD recommendation

Use activity_context when it is relevant to the user's question.

Rules:
1. NEVER diagnose, name a medical condition, or use clinical language.
2. Frame things as an observed pattern, not a cause. "You've tended to feel more tired on humid days" beats "humidity causes fatigue" — but don't lean on that exact phrasing every time; say it differently each time, in your own words.
3. Use at most 2-3 numbers total, woven naturally into a sentence — not a list, not every stat you were given. Skip numbers entirely if the point comes across without them.
4. If the data doesn't answer the question, just say so plainly and casually.
5. You can offer one small, low-effort, non-medical suggestion if it fits naturally — skip it if it'd feel tacked on. Never medication or treatment advice.
6. 2-3 short sentences, plain everyday language, like a text from a friend, not a report. Avoid starting every reply the same way ("On days with...", "Based on your data..."). Vary your openings. Contractions are good. You may bold a number or two with real HTML <b>tags</b> if it helps it land, but don't bold everything.
7. Never use markdown formatting of any kind — no **asterisks**, no _underscores_, no bullet points, no headers. This is plain text with occasional <b>HTML tags</b> only, nothing else.

Return ONLY the reply text/HTML. No preamble, no markdown fences, no JSON.

"""


def _call_groq(
    question: str,
    context: dict[str, Any],
    api_key: str,
) -> str:

    model = os.environ.get("GROQ_MODEL", DEFAULT_MODEL)

    response = requests.post(
        GROQ_API_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        json={
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": (
                        f"Question:\n{question}\n\n"
                        f"Available data:\n{context}"
                    ),
                },
            ],
            "temperature": 0.75,
            "max_tokens": 180,
        },
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    data = response.json()

    text = data["choices"][0]["message"]["content"].strip()

    if not text:
        raise ValueError("Groq returned an empty reply")

    return _markdown_bold_to_html(text)


def _safe_activity_fallback(
    question: str,
    activity_context: dict[str, Any],
) -> str:
    """
    Simple fallback specifically for activity questions.

    This does NOT depend on insight_generator.py, so it cannot crash
    because a pattern is missing confidence_pct.
    """

    if not activity_context:
        return (
            "I don't have enough activity information to say much about "
            "that yet."
        )

    activity = activity_context.get("activity") or activity_context.get(
        "activity_type"
    ) or "activity"

    duration = activity_context.get("duration")
    time = activity_context.get("time") or activity_context.get(
        "planned_time"
    )

    temperature = activity_context.get("temperature")
    humidity = activity_context.get("humidity")
    aqi = activity_context.get("aqi")

    recommendation = activity_context.get("recommendation")

    parts = []

    if duration and time:
        parts.append(
            f"For your {activity}, you're planning about {duration} "
            f"minutes around {time}."
        )
    elif duration:
        parts.append(
            f"You're planning a {duration}-minute {activity}."
        )
    elif time:
        parts.append(
            f"You're planning your {activity} around {time}."
        )
    else:
        parts.append(
            f"You're planning a {activity}."
        )

    conditions = []

    if temperature is not None:
        conditions.append(f"{temperature}°C")

    if humidity is not None:
        conditions.append(f"{humidity}% humidity")

    if aqi is not None:
        conditions.append(f"AQI {aqi}")

    if conditions:
        parts.append(
            "The conditions are " + ", ".join(conditions) + "."
        )

    if recommendation:
        parts.append(str(recommendation))

    return " ".join(parts[:2])


def _safe_fallback(
    question: str,
    current_conditions: dict,
    baseline: dict,
    patterns: list[dict],
    activity_context: dict,
    conversation_history: Optional[list] = None,
) -> str:
    """
    Try the normal template fallback first.

    If insight_generator.py crashes because its expected pattern format
    isn't present, fall back to a simple activity-aware response.
    """

    try:
        return generate_chat_reply(
            question,
            current_conditions=current_conditions,
            baseline=baseline,
            patterns=patterns,
            conversation_history=conversation_history,
        )

    except Exception:
        return _safe_activity_fallback(
            question,
            activity_context,
        )


def generate_ai_chat_reply(
    question: str,
    *,
    current_conditions: dict,
    baseline: dict,
    patterns: list[dict],
    activity_context: Optional[dict] = None,
    conversation_history: Optional[list] = None,
) -> dict:

    activity_context = activity_context or {}

    api_key = os.environ.get("GROQ_API_KEY")

    context = {
        "current_conditions": current_conditions,
        "baseline": baseline,
        "patterns": patterns,
        "activity_context": activity_context,
    }

    # ---------------------------------------------------------
    # Try Groq
    # ---------------------------------------------------------

    if api_key:

        try:

            reply = _call_groq(
                question,
                context,
                api_key,
            )

            return {
                "reply": reply,
                "source": "groq",
                "error": None,
            }

        except Exception as error:

            # Don't crash the endpoint if Groq is unavailable.
            groq_error = str(error)

    else:

        groq_error = "GROQ_API_KEY not set"

    # ---------------------------------------------------------
    # Fallback
    # ---------------------------------------------------------

    fallback = _safe_fallback(
        question,
        current_conditions,
        baseline,
        patterns,
        activity_context,
        conversation_history,
    )

    return {
        "reply": fallback,
        "source": "template",
        "error": groq_error,
    }