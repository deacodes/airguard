from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()  # reads .env in the project root, if present

from environmentalapi import get_current_conditions, get_history
from ai_explainer import generate_ai_chat_reply

app = Flask(__name__)
CORS(app)


@app.get("/environment/current")
def environment_current():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
    except (TypeError, ValueError):
        return jsonify({
            "error": "lat and lon are required and must be numbers"
        }), 400

    try:
        conditions = get_current_conditions(lat, lon)

        return jsonify(conditions.to_dict())

    except Exception as e:
        return jsonify({
            "error": "Failed to retrieve environmental data",
            "details": str(e)
        }), 500


@app.get("/environment/history")
def environment_history():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        days = min(max(int(request.args.get("days", 7)), 1), 90)

    except (TypeError, ValueError):
        return jsonify({
            "error": "lat, lon, and a valid days value are required"
        }), 400

    try:
        return jsonify({
            "days": get_history(lat, lon, days)
        })

    except Exception as error:
        return jsonify({
            "error": "Failed to retrieve environmental history",
            "details": str(error)
        }), 500


@app.post("/ai/chat")
def ai_chat():
    """
    Takes a user's question plus environmental, pattern,
    and activity context data and returns an AI-generated,
    non-diagnostic explanation.
    """

    body = request.get_json(silent=True) or {}

    question = (body.get("question") or "").strip()

    if not question:
        return jsonify({
            "error": "question is required"
        }), 400

    current_conditions = body.get("current_conditions") or {}
    baseline = body.get("baseline") or {}
    patterns = body.get("patterns") or []
    activity_context = body.get("activity_context") or {}

    if not isinstance(patterns, list):
        return jsonify({
            "error": "patterns must be a list"
        }), 400

    result = generate_ai_chat_reply(
        question,
        current_conditions=current_conditions,
        baseline=baseline,
        patterns=patterns,
        activity_context=activity_context,
    )

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5001)