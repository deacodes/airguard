from flask import Flask, request, jsonify
from flask_cors import CORS

from environmentalapi import get_current_conditions

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


if __name__ == "__main__":
    app.run(debug=True, port=5001)