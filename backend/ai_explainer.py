"""
AIRGUARD — AI Explanation Module (server-side)
-----------------------------------------------------------------------
Calls Groq (fast open-model inference — https://console.groq.com) to turn structured pattern/environment data into a warm, non-diagnostic explanation.
It only ever receives already-aggregated data:

  - patterns: list of Pattern.to_dict() from patterndetector.py
    { id, title, description, badge, matched_days, total_days,
      confidence_pct, stats }
  - current_conditions: CurrentConditions.to_dict() from environmentalapi.py
  - baseline: { temp, humidity, aqi, energy, comfort, sleep, ... }

Raw check-in logs (symptoms, free-text notes) are NEVER passed in here.
That data stays local/encrypted and is only used upstream, client-side or
in patterndetector.py, to produce the aggregated `patterns` this module
receives.

Falls back to insight_generator's template-based reply if the key is missing or the API call fails, so the app still works offline/without a key :)
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
    Safety net: models sometimes ignore the 'no markdown' instruction and
    emit **bold** anyway. Convert it to <b> so it renders correctly instead
    of showing literal asterisks in the chat bubble.
    """
    return _MARKDOWN_BOLD_RE.sub(r"<b>\1</b>", text)

SYSTEM_PROMPT = """You are AIRGUARD AI, a warm, perceptive friend who happens to be great with data. You help the user understand how their environment might connect to how they've been feeling.

You'll get their question plus a JSON bundle of already-aggregated pattern and environment data (no raw journal text, no personal identifiers). Ground everything you say in this data — never invent numbers — but you don't need to use all of it. Pick the one or two most relevant, interesting things and talk about those, the way a friend would, not an analyst reading a report.

Rules:
1. NEVER diagnose, name a medical condition, or use clinical language.
2. Frame things as an observed pattern, not a cause. "You've tended to feel more tired on humid days" beats "humidity causes fatigue" — but don't lean on that exact phrasing every time; say it differently each time, in your own words.
3. Use at most 2-3 numbers total, woven naturally into a sentence — not a list, not every stat you were given. Skip numbers entirely if the point comes across without them.
4. If the data doesn't answer the question, just say so plainly and casually.
5. You can offer one small, low-effort, non-medical suggestion if it fits naturally — skip it if it'd feel tacked on. Never medication or treatment advice.
6. 2-3 short sentences, plain everyday language, like a text from a friend, not a report. Avoid starting every reply the same way ("On days with...", "Based on your data..."). Vary your openings. Contractions are good. You may bold a number or two with real HTML <b>tags</b> if it helps it land, but don't bold everything.
7. Never use markdown formatting of any kind — no **asterisks**, no _underscores_, no bullet points, no headers. This is plain text with occasional <b>HTML tags</b> only, nothing else.

Return ONLY the reply text/HTML. No preamble, no markdown fences, no JSON."""


def _call_groq(question: str, context: dict[str, Any], api_key: str) -> str:
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
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Question: {question}\n\nAvailable data:\n{context}",
                },
            ],
            "temperature": 0.85,
            "max_tokens": 160,
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    data = response.json()
    text = data["choices"][0]["message"]["content"].strip()
    if not text:
        raise ValueError("Groq returned an empty reply")
    return _markdown_bold_to_html(text)


def generate_ai_chat_reply(
    question: str,
    *,
    current_conditions: dict,
    baseline: dict,
    patterns: list[dict],
    conversation_history: Optional[list] = None,
) -> dict:
    """
    Main entry point for the /ai/chat route. Tries Grok first; falls back to
    the deterministic template in insight_generator.py if no API key is set
    or the request fails, so the endpoint never hard-fails a demo.

    Returns { "reply": str, "source": "grok" | "template", "error": str|None }
    """
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        return {
            "reply": generate_chat_reply(
                question,
                current_conditions=current_conditions,
                baseline=baseline,
                patterns=patterns,
                conversation_history=conversation_history,
            ),
            "source": "template",
            "error": "GROQ_API_KEY not set — using fallback template reply.",
        }

    context = {
        "current_conditions": current_conditions,
        "baseline": baseline,
        "patterns": patterns,
    }

    try:
        reply = _call_groq(question, context, api_key)
        return {"reply": reply, "source": "groq", "error": None}
    except Exception as error:  # network error, bad key, rate limit, etc.
        fallback = generate_chat_reply(
            question,
            current_conditions=current_conditions,
            baseline=baseline,
            patterns=patterns,
            conversation_history=conversation_history,
        )
        return {"reply": fallback, "source": "template", "error": str(error)}