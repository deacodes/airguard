# AirGuard
AirGuard connects real-time air quality and weather data to your personal wellness check-ins, helping you understand how the environment affects your day-to-day life.

## Features
- Dashboard: daily overview of your environment, check-ins and detected patterns
- Check in: a quick 15 second log of energy, comfort and mood.
- Environment: live AQI, PM2.5, temperature, humidity, UV index, and pollen for the user's specified location
- Patterns: finds recurring relationships between environmental conditions and logged user data
- Timeline: a day-by-day history of the user's energy, comfort and their surroundings
- Activity planner: compares today's conditions to the user's past comfortable activity days before they head out, allowing them to set a recommended time with advice
- AirGuard AI: a smart chat interface to ask questions about user data and the environment around them
- Weekly insight: a rolled-up summary of the week's environment and wellbeing trends.


## Stack
- Frontend: Static HTML/CSS/JS, Chart JS for charts, Leaflet for location picker.
- Auth and data: Firebase (Auth + Firestore), see `js/firebase.js` and `firestore.rules`
- Backend: Python/Flask API in `backend/`, proxies environmental data and AI chat requests.

## Processing and Stack
<img width="497" height="666" alt="Screenshot 2026-08-17 at 1 55 07 AM" src="https://github.com/user-attachments/assets/e22a2c33-7563-4130-b0aa-793cffc1ad33" />

## Run Locally
### Frontend 
No build step, serve the root folder with any static file server and open `index.html`.
```bash
# from root:
python3 -m http.server 5500
# then, visit http://localhost:5500
```

Frontend works standalone with mock data. To use the backend for live AI chat and environment history, run the backend below and make sure it's reachable (pages default to `http://localhost:5001` / `http://127.0.0.1:5001`, see `window.AIRGUARD_ENV_API` usages in `js/main.js` and `ai.html`)

### Backend
Create a `backend/.env` file with:
```
GROQ_API_KEY=your_key_here
# enables live AI chat replies via Groq
GROQ_MODEL=llama-3.1-8b-instant
#  defaults if unset
```

By default, CORS on the backend is restricted to `http://127.0.0.1:5500` / `http://localhost:5500`, so update the `origins` list in `app.py` if you serve the frontend elsewhere.

### Firebase
This project uses a live Firebase project (config in `js/firebase.js`). To run your own separate instance, replace it with your own Firebase project config.

### Notes
The demo mode (no Firebase login) uses generated mock data so the app is fully explorable without setup.

The encryption file has been created, but it hasn’t been integrated into the app yet. This is a feature we can implement in the future.
