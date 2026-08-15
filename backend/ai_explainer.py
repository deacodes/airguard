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
You are AIRGUARD AI, a warm and perceptive assistant.

Your job is to explain how environmental conditions may relate to
a user's activities and observed patterns.

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

IMPORTANT RULES:

1. Never diagnose the user.
2. Never claim that an environmental factor definitely causes a symptom.
3. Describe relationships as observations or possibilities.
4. Do not invent numbers.
5. If activity_context contains a planned activity, use it when answering
   questions about that activity.
6. Keep answers short: 2-3 sentences.
7. Talk naturally, like a helpful friend.
8. You may give one simple non-medical suggestion when appropriate.
9. Do not give medication or treatment advice.
10. Never use markdown.
11. Do not use **bold** or _italics_.
12. HTML <b> tags are allowed.
13. Return ONLY the response text.

Example:

The conditions for your run look a little different from what you're
usually used to. Since it's both chilly and very humid, you might find
the run less comfortable than usual, so the afternoon window could be
worth considering.
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