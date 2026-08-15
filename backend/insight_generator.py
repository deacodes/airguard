from __future__ import annotations
 
import os
from typing import Any
 
import anthropic
 
_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
_MODEL = "claude-sonnet-4-6"
 
_SYSTEM_PROMPT = """You are AIRGUARD AI, a personal environment-wellness explainer.
 
Rules:
- You only ever receive abstracted numeric/statistical parameters, never raw journal text.
- You are not a doctor. Never diagnose, never suggest medication, never claim clinical causation.
- Speak plainly: name the environmental factors that changed, explain why a pattern was flagged
  using the numbers given, and suggest ONE simple, low-effort adjustment.
- Keep responses to 2-4 sentences unless asked for more detail.
- Ground every claim strictly in the numbers provided — never invent a statistic.
"""
 
 
def _format_patterns_for_prompt(patterns: list[dict]) -> str:
    lines = []
    for p in patterns:
        lines.append(
            f"- {p['title']} | matched {p['matched_days']}/{p['total_days']} days | "
            f"confidence {p['confidence_pct']}% | stats: {p['stats']}"
        )
    return "\n".join(lines) or "No confirmed patterns yet."
 
 
def generate_pattern_summary(patterns: list[dict], baseline: dict[str, Any]) -> str:
    user_content = (
        "Here is this user's structured pattern data (last 30 days).\n\n"
        f"Baseline: {baseline}\n\n"
        f"Detected patterns:\n{_format_patterns_for_prompt(patterns)}\n\n"
        "Write a short personal summary (3-5 sentences) highlighting the "
        "strongest pattern first."
    )
 
    response = _client.messages.create(
        model=_MODEL,
        max_tokens=400,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return _extract_text(response)
 
 
def generate_flag_explanation(current_conditions: dict, matched_pattern: dict) -> str:
    user_content = (
        f"Today's conditions: {current_conditions}\n\n"
        f"This matches an existing confirmed pattern: {matched_pattern}\n\n"
        "Explain in 2-3 sentences why today was flagged, referencing the "
        "specific numbers, and end with one concrete suggestion."
    )
    response = _client.messages.create(
        model=_MODEL,
        max_tokens=250,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return _extract_text(response)
 
 
def generate_chat_reply(
    user_question: str,
    *,
    current_conditions: dict,
    baseline: dict,
    patterns: list[dict],
    conversation_history: list[dict] | None = None,
) -> str:
    context_block = (
        f"Current conditions: {current_conditions}\n"
        f"User's baseline: {baseline}\n"
        f"Confirmed patterns:\n{_format_patterns_for_prompt(patterns)}"
    )
 
    messages = list(conversation_history or [])
    messages.append({
        "role": "user",
        "content": f"{context_block}\n\nUser question: {user_question}",
    })
 
    response = _client.messages.create(
        model=_MODEL,
        max_tokens=300,
        system=_SYSTEM_PROMPT,
        messages=messages,
    )
    return _extract_text(response)
 
 
def _extract_text(response: anthropic.types.Message) -> str:
    parts = [block.text for block in response.content if getattr(block, "type", None) == "text"]
    return "\n".join(parts).strip()
 
