/**
 * AIRGUARD — Unified Frontend Application Logic
 * Built for CS Girlies Hackathon 2026
 * Pure Vanilla JavaScript · Local-first · Chart.js · Explainable Intelligence
 */

(function() {
  'use strict';

  // Base constants & personal baselines
  const BASELINE = {
    temp: 28,
    humidity: 56,
    aqi: 92,
    pm25: 28,
    energy: 6.4,
    comfort: 6.6,
    sleep: 7.03, // 7h 02m
    movement: 51
  };

  const DEFAULT_LOCATION = {
    label: "Jaipur, India",
    lat: 26.9124,
    lng: 75.7873
  };

  const CITIES = {
    "Jaipur, India": { temp: 34, humidity: 72, aqi: 128, pm25: 34, pm10: 68, uv: "High", pollen: "Moderate", wind: "14 km/h", pressure: "1012 hPa" },
    "New Delhi, India": { temp: 36, humidity: 65, aqi: 168, pm25: 58, pm10: 110, uv: "Very High", pollen: "Moderate", wind: "9 km/h", pressure: "1009 hPa" },
    "London, UK": { temp: 22, humidity: 58, aqi: 42, pm25: 11, pm10: 22, uv: "Moderate", pollen: "High", wind: "19 km/h", pressure: "1018 hPa" },
    "New York, USA": { temp: 29, humidity: 62, aqi: 74, pm25: 19, pm10: 38, uv: "High", pollen: "Low", wind: "16 km/h", pressure: "1014 hPa" },
    "Tokyo, Japan": { temp: 31, humidity: 78, aqi: 52, pm25: 14, pm10: 28, uv: "Very High", pollen: "Moderate", wind: "12 km/h", pressure: "1008 hPa" }
  };

  // Deterministic RNG for consistent data display across pages
  let seed = 8943;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function round1(v) { return Math.round(v * 10) / 10; }

  const todayDate = new Date(2026, 7, 15);
  const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS_OF_WEEK = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // Generate 30 days of data
  function generate30Days() {
    const records = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);

      const dayName = DAYS_OF_WEEK[d.getDay()];
      const monthName = SHORT_MONTHS[d.getMonth()];
      const dateNum = d.getDate();
      const dateLabel = `${monthName} ${dateNum}`;

      let temp = BASELINE.temp + (rand() - 0.48) * 9;
      let humidity = BASELINE.humidity + (rand() - 0.42) * 24;
      let aqi = BASELINE.aqi + (rand() - 0.44) * 50;

      temp = Math.round(clamp(temp, 23, 38));
      humidity = Math.round(clamp(humidity, 34, 88));
      aqi = Math.round(clamp(aqi, 40, 175));

      const humidityHigh = humidity > (BASELINE.humidity + 12);
      const aqiHigh = aqi > (BASELINE.aqi + 25);
      const tempHigh = temp > (BASELINE.temp + 5);

      let energy = 7.1 - (rand() * 1.2);
      if (humidityHigh && rand() < 0.76) energy -= (1.4 + rand() * 0.8);
      if (aqiHigh && rand() < 0.42) energy -= 0.7;
      energy = clamp(round1(energy), 2.5, 9.5);

      let comfort = 7.0 - (rand() * 1.2);
      if (tempHigh && rand() < 0.72) comfort -= (1.5 + rand() * 0.9);
      if (humidityHigh && rand() < 0.48) comfort -= 0.8;
      comfort = clamp(round1(comfort), 2.5, 9.5);

      const symptoms = [];
      if (aqiHigh && rand() < 0.65) symptoms.push("Congestion");
      if (humidityHigh && rand() < 0.55) symptoms.push("Fatigue");
      if (tempHigh && rand() < 0.45) symptoms.push("Headache");
      if (aqiHigh && tempHigh && rand() < 0.35) symptoms.push("Eye irritation");

      const sleep = round1(5.5 + rand() * 2.8);
      const movement = Math.round(20 + rand() * 55);
      const activity = rand() < 0.5 ? "Outside" : "Indoors";
      const uv = temp > 33 ? "High" : temp > 28 ? "Moderate" : "Low";
      const pollen = ["Low", "Moderate", "High"][Math.floor(rand() * 3)];

      records.push({
        id: `day-${30 - i}`,
        date: d,
        dateLabel,
        dayLabel: dayName,
        fullDateStr: `${dayName}, ${monthName} ${dateNum}, ${d.getFullYear()}`,
        temp,
        humidity,
        aqi,
        pm25: Math.round(aqi * 0.45),
        pm10: Math.round(aqi * 0.85),
        uv,
        pollen,
        energy,
        comfort,
        sleep,
        movement,
        symptoms,
        activity,
        notes: ""
      });
    }
    return records;
  }

  function getCachedUserData() {
    try { return JSON.parse(localStorage.getItem("airguard_user_data") || "null"); } catch { return null; }
  }

  function buildUserDays(data) {
    return (data?.checkins || []).slice().reverse().map((item, index) => ({
      id: item.id || `checkin-${index}`,
      date: new Date(item.createdAt || Date.now()),
      dateLabel: new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      dayLabel: new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, { weekday: "short" }),
      fullDateStr: new Date(item.createdAt || Date.now()).toLocaleDateString(undefined, { dateStyle: "full" }),
      temp: item.environment?.temperature_c ?? null,
      humidity: item.environment?.humidity_pct ?? null,
      aqi: item.environment?.aqi ?? null,
      pm25: item.environment?.pm2_5 ?? null,
      pm10: item.environment?.pm10 ?? null,
      uv: item.environment?.uv_index ?? null,
      pollen: item.environment?.pollen_level ?? null,
      energy: item.energy,
      comfort: item.comfort,
      sleep: item.sleep,
      movement: item.movement ?? null,
      symptoms: item.symptoms || [],
      activity: item.activity || "Indoors",
      notes: item.notes || ""
    }));
  }

  const cachedUserData = getCachedUserData();
  const demoMode = localStorage.getItem("airguard_demo") === "true";
  let daysData = demoMode ? generate30Days() : buildUserDays(cachedUserData);
  let todayEntry = daysData[daysData.length - 1];
  let yesterdayEntry = daysData[daysData.length - 2];
  let exampleEntry = daysData[daysData.length - 4];

  if (demoMode) {
  todayEntry.aqi = 128;
  todayEntry.temp = 34;
  todayEntry.humidity = 72;
  todayEntry.pm25 = 34;
  todayEntry.pm10 = 68;
  todayEntry.uv = "High";
  todayEntry.pollen = "Moderate";
  todayEntry.energy = 5.8;
  todayEntry.comfort = 6.2;
  todayEntry.sleep = 6.23; // 6h 14m
  todayEntry.movement = 42;
  todayEntry.symptoms = ["Headache", "Fatigue"];
  todayEntry.activity = "Outside";
  todayEntry.notes = "Hot afternoon walk.";

  yesterdayEntry.aqi = 116;
  yesterdayEntry.temp = 31.9;
  yesterdayEntry.humidity = 68;
  yesterdayEntry.pollen = "High";
  yesterdayEntry.energy = 6.4;
  yesterdayEntry.comfort = 6.7;

  exampleEntry.dateLabel = "Aug 12";
  exampleEntry.aqi = 141;
  exampleEntry.temp = 35;
  exampleEntry.humidity = 69;
  exampleEntry.energy = 4.0;
  exampleEntry.comfort = 5.0;
  exampleEntry.symptoms = ["Headache", "Congestion"];
  exampleEntry.activity = "Outside";
  exampleEntry.notes = "Walked home from school.";
  }

  // Pattern Database
  const PATTERNS = {
    humidity: {
      id: "humidity",
      title: "High Humidity → Lower Energy",
      factor: "Humidity",
      impact: "Lower Energy",
      matchingDays: 11,
      impactedDays: 8,
      strength: "Moderate",
      confidence: 73,
      todayVal: "72%",
      baselineVal: "56%",
      deltaVal: "+28%",
      foundText: "On days where humidity was above your personal baseline (56%), you reported lower energy on 8 of 11 occasions.",
      whyFlaggedText: "Today's humidity of 72% exceeds your baseline by +28%. AIRGUARD identified 11 similar days in your record, where 73% coincided with decreased energy.",
      similarDays: [
        { date: "Aug 12", temp: "35°C", hum: "69%", aqi: 141, energy: "4.0 / 10", comfort: "5.0 / 10", symptoms: "Headache, Congestion" },
        { date: "Aug 08", temp: "33°C", hum: "74%", aqi: 122, energy: "4.5 / 10", comfort: "5.2 / 10", symptoms: "Fatigue" },
        { date: "Aug 03", temp: "34°C", hum: "78%", aqi: 130, energy: "3.8 / 10", comfort: "4.6 / 10", symptoms: "Fatigue, Brain Fog" },
        { date: "Jul 28", temp: "32°C", hum: "71%", aqi: 110, energy: "4.2 / 10", comfort: "5.4 / 10", symptoms: "None" },
        { date: "Jul 22", temp: "34°C", hum: "75%", aqi: 135, energy: "4.0 / 10", comfort: "4.8 / 10", symptoms: "Fatigue, Headache" },
        { date: "Jul 18", temp: "33°C", hum: "70%", aqi: 115, energy: "4.8 / 10", comfort: "5.6 / 10", symptoms: "Congestion" }
      ]
    },
    aqi: {
      id: "aqi",
      title: "High AQI → More Congestion Reports",
      factor: "Air Quality Index (AQI)",
      impact: "More Congestion",
      matchingDays: 9,
      impactedDays: 6,
      strength: "Moderate",
      confidence: 67,
      todayVal: "128",
      baselineVal: "92",
      deltaVal: "+39%",
      foundText: "On days where AQI was elevated above 115, you reported congestion and sinus pressure on 6 of 9 occasions.",
      whyFlaggedText: "Today's AQI of 128 is 39% higher than your personal baseline of 92, matching the threshold where congestion reports historically double.",
      similarDays: [
        { date: "Aug 12", temp: "35°C", hum: "69%", aqi: 141, energy: "4.0 / 10", comfort: "5.0 / 10", symptoms: "Headache, Congestion" },
        { date: "Aug 06", temp: "31°C", hum: "55%", aqi: 148, energy: "5.5 / 10", comfort: "5.2 / 10", symptoms: "Congestion, Eye irritation" },
        { date: "Jul 31", temp: "30°C", hum: "58%", aqi: 134, energy: "6.0 / 10", comfort: "5.5 / 10", symptoms: "Congestion" },
        { date: "Jul 25", temp: "33°C", hum: "64%", aqi: 152, energy: "4.5 / 10", comfort: "4.2 / 10", symptoms: "Congestion, Breathing discomfort" },
        { date: "Jul 19", temp: "29°C", hum: "52%", aqi: 126, energy: "6.2 / 10", comfort: "6.0 / 10", symptoms: "Congestion" }
      ]
    },
    temp: {
      id: "temp",
      title: "High Temperature + Outdoor Activity → Lower Comfort",
      factor: "Temperature & Activity",
      impact: "Lower Physical Comfort",
      matchingDays: 7,
      impactedDays: 5,
      strength: "Early signal",
      confidence: 71,
      todayVal: "34°C",
      baselineVal: "28°C",
      deltaVal: "+21%",
      foundText: "On days with temperatures over 33°C combined with outdoor activity, you recorded physical comfort below 5.5 on 5 of 7 occasions.",
      whyFlaggedText: "High thermal load combined with midday outdoor movement accelerates heat fatigue and comfort degradation.",
      similarDays: [
        { date: "Aug 12", temp: "35°C", hum: "69%", aqi: 141, energy: "4.0 / 10", comfort: "5.0 / 10", symptoms: "Headache, Congestion" },
        { date: "Aug 09", temp: "36°C", hum: "58%", aqi: 118, energy: "5.0 / 10", comfort: "4.5 / 10", symptoms: "Headache" },
        { date: "Aug 01", temp: "35°C", hum: "62%", aqi: 105, energy: "5.2 / 10", comfort: "4.8 / 10", symptoms: "Muscle tension" },
        { date: "Jul 26", temp: "37°C", hum: "54%", aqi: 120, energy: "4.2 / 10", comfort: "3.9 / 10", symptoms: "Headache, Fatigue" },
        { date: "Jul 16", temp: "35°C", hum: "60%", aqi: 98, energy: "5.5 / 10", comfort: "4.9 / 10", symptoms: "None" }
      ]
    }
  };

  // Evidence-backed personal pattern engine. Signed-in users only see
  // patterns derived from their saved check-ins and paired environmental
  // snapshots. The snapshot is cached for one calendar day so a reload does
  // not silently invent a new explanation.
  const PATTERN_CACHE_PREFIX = 'airguard_pattern_snapshot_';
  const patternCacheKey = data => `${PATTERN_CACHE_PREFIX}${data?.uid || 'guest'}`;
  const numeric = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const localDateKey = value => value ? new Date(value).toLocaleDateString('en-CA') : '';
  const dayText = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
  const personalRows = data => (data?.checkins || []).map(item => ({
    date: item.createdAt || item.timestamp,
    temp: numeric(item.environment?.temperature_c),
    humidity: numeric(item.environment?.humidity_pct),
    aqi: numeric(item.environment?.aqi),
    energy: numeric(item.energy),
    comfort: numeric(item.comfort),
    sleep: numeric(item.sleep),
    movement: numeric(item.movement),
    activity: String(item.activity || '').toLowerCase(),
    symptoms: Array.isArray(item.symptoms) ? item.symptoms : []
  })).filter(item => item.date);
  const average = (items, key) => {
    const values = items.map(item => numeric(item[key])).filter(value => value != null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const percent = value => `${Math.round(value)}%`;
  const patternRows = (rows, key, threshold, direction = 'high') => rows.filter(row => {
    const value = numeric(row[key]);
    return value != null && (direction === 'high' ? value >= threshold : value <= threshold);
  });

  function buildPersonalPatterns(data) {
    const rows = personalRows(data);
    const patterns = [];
    if (rows.length < 3) return patterns;
    const colors = {
      purple: ['var(--purple)', 'var(--purple-bg)', 'var(--purple-fg)'],
      blue: ['var(--blue)', 'var(--blue-bg)', 'var(--blue-fg)'],
      red: ['var(--red)', 'var(--red-bg)', 'var(--red-fg)'],
      amber: ['var(--amber)', 'var(--amber-bg)', 'var(--amber-fg)']
    };
    const addPattern = (pattern, color) => patterns.push({ ...pattern, color: colors[color][0], badgeBg: colors[color][1], badgeColor: colors[color][2] });
    const makeSimilar = matched => matched.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map(row => ({
      date: dayText(row.date), temp: row.temp == null ? '—' : `${Math.round(row.temp)}°C`, hum: row.humidity == null ? '—' : `${Math.round(row.humidity)}%`,
      aqi: row.aqi == null ? '—' : Math.round(row.aqi), energy: row.energy == null ? '—' : `${row.energy.toFixed(1)} / 10`, comfort: row.comfort == null ? '—' : `${row.comfort.toFixed(1)} / 10`, symptoms: row.symptoms.length ? row.symptoms.join(', ') : 'None'
    }));

    const envRows = rows.filter(row => row.temp != null || row.humidity != null || row.aqi != null);
    const latestRow = rows.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0] || {};
    const energyBaseline = average(rows, 'energy');
    const comfortBaseline = average(rows, 'comfort');
    const humidityAvg = average(envRows, 'humidity');
    if (humidityAvg != null && energyBaseline != null) {
      const threshold = Math.max(60, humidityAvg + (rows.length >= 7 ? 8 : 3));
      const matched = patternRows(envRows, 'humidity', threshold);
      const impacted = matched.filter(row => row.energy != null && row.energy < energyBaseline);
      const control = envRows.filter(row => row.humidity != null && row.humidity < threshold && row.energy != null);
      const controlRate = control.length ? control.filter(row => row.energy < energyBaseline).length / control.length : 0;
      const rate = matched.length ? impacted.length / matched.length : 0;
      if (matched.length >= 2 && impacted.length >= 1 && rate >= controlRate) {
        const confidence = clamp(45 + (rate - controlRate) * 70 + Math.min(15, matched.length), 45, 94);
        addPattern({ id: 'humidity', title: 'High Humidity → Lower Energy', factor: 'Humidity', impact: 'Lower Energy', matchingDays: matched.length, impactedDays: impacted.length, strength: confidence >= 75 ? 'Strong signal' : confidence >= 60 ? 'Moderate signal' : 'Early signal', confidence: Math.round(confidence), todayVal: latestRow.humidity == null ? 'No live value' : `${Math.round(latestRow.humidity)}% (latest saved)`, baselineVal: `${Math.round(humidityAvg)}%`, deltaVal: `${Math.round(threshold - humidityAvg)} points above baseline`, foundText: `On days where humidity was above ${Math.round(threshold)}%, your energy was below your personal average on ${impacted.length} of ${matched.length} occasions.`, whyFlaggedText: `AIRGUARD compared your saved environmental snapshots with your energy reports.`, similarDays: makeSimilar(matched), description: `On days when humidity is above ${Math.round(threshold)}%, your energy score falls below your average of ${energyBaseline.toFixed(1)} / 10.` }, 'purple');
      }
    }

    const tempAvg = average(envRows, 'temp');
    if (tempAvg != null && comfortBaseline != null) {
      const threshold = tempAvg + (rows.length >= 7 ? 4 : 2);
      const matched = patternRows(envRows, 'temp', threshold);
      const impacted = matched.filter(row => row.comfort != null && row.comfort < comfortBaseline);
      const control = envRows.filter(row => row.temp != null && row.temp < threshold && row.comfort != null);
      const controlRate = control.length ? control.filter(row => row.comfort < comfortBaseline).length / control.length : 0;
      const rate = matched.length ? impacted.length / matched.length : 0;
      if (matched.length >= 2 && impacted.length >= 1 && rate >= controlRate) {
        const confidence = clamp(45 + (rate - controlRate) * 75 + Math.min(15, matched.length), 45, 92);
        addPattern({ id: 'temp', title: 'Higher Temperatures → Lower Comfort', factor: 'Temperature', impact: 'Lower Comfort', matchingDays: matched.length, impactedDays: impacted.length, strength: confidence >= 75 ? 'Strong signal' : confidence >= 60 ? 'Moderate signal' : 'Early signal', confidence: Math.round(confidence), todayVal: latestRow.temp == null ? 'No live value' : `${Math.round(latestRow.temp)}°C (latest saved)`, baselineVal: `${tempAvg.toFixed(1)}°C`, deltaVal: `+${Math.round(threshold - tempAvg)}°C threshold`, foundText: `On days above ${threshold.toFixed(1)}°C, your comfort was below your average on ${impacted.length} of ${matched.length} occasions.`, whyFlaggedText: 'AIRGUARD compared temperature snapshots with your comfort check-ins.', similarDays: makeSimilar(matched), description: `Your comfort tends to be lower on hotter days than your personal temperature baseline.` }, 'red');
      }
    }

    const aqiAvg = average(envRows, 'aqi');
    if (aqiAvg != null) {
      const threshold = aqiAvg + (rows.length >= 7 ? 20 : 10);
      const matched = patternRows(envRows, 'aqi', threshold);
      const impacted = matched.filter(row => row.symptoms.some(symptom => /congestion|breathing|eye|headache/i.test(symptom)));
      const control = envRows.filter(row => row.aqi != null && row.aqi < threshold);
      const controlRate = control.length ? control.filter(row => row.symptoms.some(symptom => /congestion|breathing|eye|headache/i.test(symptom))).length / control.length : 0;
      const rate = matched.length ? impacted.length / matched.length : 0;
      if (matched.length >= 2 && impacted.length >= 1 && rate >= controlRate) {
        const confidence = clamp(42 + (rate - controlRate) * 70 + Math.min(15, matched.length), 42, 90);
        addPattern({ id: 'aqi', title: 'Higher AQI → More Reported Air Symptoms', factor: 'AQI', impact: 'Reported Symptoms', matchingDays: matched.length, impactedDays: impacted.length, strength: confidence >= 75 ? 'Strong signal' : confidence >= 60 ? 'Moderate signal' : 'Early signal', confidence: Math.round(confidence), todayVal: latestRow.aqi == null ? 'No live value' : `${Math.round(latestRow.aqi)} (latest saved)`, baselineVal: `${Math.round(aqiAvg)}`, deltaVal: `${Math.round(threshold - aqiAvg)} points above baseline`, foundText: `On higher-AQI days, you reported an air-related symptom on ${impacted.length} of ${matched.length} occasions.`, whyFlaggedText: 'AIRGUARD compared AQI snapshots with your reported symptoms.', similarDays: makeSimilar(matched), description: `Your saved records show more reported air-related symptoms on higher-AQI days.` }, 'blue');
      }
    }

    if (rows.filter(row => row.sleep != null && row.energy != null).length >= 4 && energyBaseline != null) {
      const sleepAvg = average(rows, 'sleep');
      const matched = rows.filter(row => row.sleep != null && row.sleep < sleepAvg - 0.5);
      const impacted = matched.filter(row => row.energy < energyBaseline);
      if (matched.length >= 3 && impacted.length >= 2) {
        const confidence = clamp(55 + (impacted.length / matched.length) * 30, 55, 88);
        addPattern({ id: 'sleep', title: 'Shorter Sleep → Lower Energy', factor: 'Sleep', impact: 'Lower Energy', matchingDays: matched.length, impactedDays: impacted.length, strength: confidence >= 75 ? 'Strong signal' : 'Moderate signal', confidence: Math.round(confidence), todayVal: 'Latest saved entry', baselineVal: `${sleepAvg.toFixed(1)}h`, deltaVal: '-0.5h threshold', foundText: `On shorter-sleep days, your energy was below average on ${impacted.length} of ${matched.length} occasions.`, whyFlaggedText: 'AIRGUARD compared your sleep reports with your energy scores.', similarDays: makeSimilar(matched), description: `Your energy is more often below baseline after nights with less sleep.` }, 'amber');
      }
    }
    return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, Math.min(4, Math.max(2, patterns.length)));
  }

  function getPatternSnapshot(data, forceRefresh = false) {
    const key = patternCacheKey(data);
    const today = new Date().toISOString().slice(0, 10);
    if (!forceRefresh && data?.profile?.patternSnapshot?.engineVersion === 3 && data.profile.patternSnapshot.date === today && Array.isArray(data.profile.patternSnapshot.patterns)) {
      localStorage.setItem(key, JSON.stringify(data.profile.patternSnapshot));
      return data.profile.patternSnapshot;
    }
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (!forceRefresh && cached?.engineVersion === 3 && cached?.date === today && Array.isArray(cached.patterns)) return cached;
    } catch (error) { /* regenerate below */ }
    const snapshot = { engineVersion: 3, date: today, generatedAt: new Date().toISOString(), patterns: buildPersonalPatterns(data) };
    localStorage.setItem(key, JSON.stringify(snapshot));
    return snapshot;
  }

  function renderPatternDetail(pattern) {
    if (!pattern || !document.getElementById('pdTitle')) return;
    const live = window.AIRGUARD.currentEnvironment || {};
    const liveMetric = pattern.id === 'humidity' ? live.humidity_pct : pattern.id === 'aqi' ? live.aqi : pattern.id === 'temp' ? live.temperature_c : null;
    const liveValue = liveMetric == null || String(pattern.todayVal).toLowerCase().includes('current live value') ? (liveMetric == null ? 'Latest saved value' : pattern.id === 'humidity' ? `${Math.round(liveMetric)}%` : pattern.id === 'aqi' ? `${Math.round(liveMetric)}` : `${Math.round(liveMetric)}°C`) : pattern.todayVal;
    const values = { pdTitle: pattern.title, pdMatching: pattern.matchingDays, pdLower: pattern.impactedDays, pdStrength: pattern.strength, pdConfidence: `${pattern.confidence}%`, pdFound: pattern.foundText, pdContext: `${pattern.description} ${pattern.whyFlaggedText} This is an observational comparison from your personal records. It does not establish that one condition caused the other.`, pdToday: liveValue, pdBaseline: pattern.baselineVal, pdDiff: pattern.deltaVal };
    Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.textContent = value; });
    const todayLabel = document.getElementById('pdTodayLabel');
    if (todayLabel) todayLabel.textContent = pattern.id === 'humidity' ? "Today's humidity" : pattern.id === 'aqi' ? "Today's AQI" : pattern.id === 'temp' ? "Today's temperature" : "Latest saved value";
    const sources = document.getElementById('pdSources');
    if (sources) {
      const links = pattern.id === 'humidity' ? [['Humidity and heat', 'Learn how heat and humidity can affect everyday comfort.', 'https://www.who.int/news-room/fact-sheets/detail/heat-and-health'], ['Heat safety basics', 'Practical ways to reduce heat exposure and stay comfortable.', 'https://www.cdc.gov/heat-health/about/index.html']] : pattern.id === 'aqi' ? [['Air Quality Index guide', 'Understand what AQI categories mean and how to read them.', 'https://www.airnow.gov/aqi/'], ['Outdoor air pollution and health', 'General health information about outdoor air pollution.', 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health']] : pattern.id === 'temp' ? [['Heat and health', 'Learn why unusually hot conditions can increase heat strain.', 'https://www.who.int/news-room/fact-sheets/detail/heat-and-health'], ['CDC heat prevention', 'Simple steps for planning around hot weather.', 'https://www.cdc.gov/heat-health/about/index.html']] : [['Sleep and health', 'Learn why sleep duration matters for energy and wellbeing.', 'https://www.cdc.gov/sleep/about/index.html']];
      sources.innerHTML = `${links.map(link => `<a href="${link[2]}" target="_blank" rel="noopener" style="display:block;padding:12px 14px;border:1px solid var(--border-soft);border-radius:10px;text-decoration:none;background:var(--card-bg);"><span style="display:block;font-weight:800;color:var(--text);">${link[0]} ↗</span><span style="display:block;margin-top:4px;font-size:12px;line-height:1.5;color:var(--text-secondary);">${link[1]}</span></a>`).join('')}<p class="secondary-text" style="font-size:12px;line-height:1.5;margin-top:2px;">These links explain the environmental topic generally. The AIRGUARD finding above is calculated only from your saved records.</p>`;
    }
    const tbody = document.getElementById('similarDaysTableBody');
    if (tbody) tbody.innerHTML = pattern.similarDays?.length ? pattern.similarDays.map(row => `<tr style="border-top:1px solid var(--border-soft);"><td style="padding:12px 8px;font-weight:700;">${row.date}</td><td style="padding:12px 8px;">${row.temp}</td><td style="padding:12px 8px;font-weight:700;color:var(--blue-fg);">${row.hum}</td><td style="padding:12px 8px;">${row.aqi}</td><td style="padding:12px 8px;font-weight:700;color:var(--purple-fg);">${row.energy}</td><td style="padding:12px 8px;">${row.comfort}</td><td style="padding:12px 8px;color:var(--text-secondary);">${row.symptoms}</td></tr>`).join('') : '<tr><td colspan="7" style="padding:16px;text-align:center;">Not enough matching records yet.</td></tr>';
  }

  function renderPatternSurfaces(data, forceRefresh = false) {
    const snapshot = getPatternSnapshot(data, forceRefresh);
    const patterns = snapshot.patterns || [];
    const storedSnapshot = data?.profile?.patternSnapshot;
    if (data?.uid && storedSnapshot?.date !== snapshot.date) {
      window.AIRGUARD_FIREBASE?.currentUser?.() && window.AIRGUARD_FIREBASE.saveProfile(window.AIRGUARD_FIREBASE.currentUser(), { patternSnapshot: snapshot }).catch(error => console.warn('Could not persist daily pattern snapshot', error));
    }
    window.AIRGUARD.PATTERNS = Object.fromEntries(patterns.map(pattern => [pattern.id, pattern]));
    const summary = document.querySelector('.ai-summary-body');
    if (summary) summary.innerHTML = patterns.length ? patterns.slice(0, 3).map(pattern => `<strong>${pattern.title}.</strong> ${pattern.description}`).join(' ') : 'AIRGUARD needs at least three saved check-ins with environmental snapshots before it can identify a personal pattern.';
    const generated = document.querySelector('.ai-refresh-row');
    if (generated) generated.innerHTML = `Generated from your saved records · ${new Date(snapshot.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    const modalContent = document.getElementById('modalContent');
    if (modalContent) modalContent.innerHTML = patterns.length ? patterns.slice(0, 3).map(pattern => `<p><strong>${pattern.title}.</strong> ${pattern.description} ${pattern.impactedDays} of ${pattern.matchingDays} matching saved days; confidence ${pattern.confidence}%.</p>`).join('') : '<p>There is not enough saved data to generate a personal summary yet.</p>';
    document.querySelectorAll('.learning-card').forEach(card => { card.style.display = data?.uid ? 'none' : ''; });
    const cards = Array.from(document.querySelectorAll('.pattern-card'));
    cards.forEach((card, index) => {
      const pattern = patterns[index];
      card.style.display = pattern ? '' : 'none';
      if (!pattern) return;
      const title = card.querySelector('.pattern-title');
      const badge = card.querySelector('.pattern-badge');
      const description = card.querySelector('.pattern-description');
      if (title) title.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${pattern.color};display:inline-block;flex-shrink:0;"></span>${pattern.title}`;
      if (badge) { badge.textContent = pattern.strength; badge.style.background = pattern.badgeBg; badge.style.color = pattern.badgeColor; }
      if (description) description.textContent = pattern.description;
      const stats = card.querySelectorAll('.pattern-stats .v');
      if (stats[0]) stats[0].textContent = `${pattern.impactedDays} of ${pattern.matchingDays}`;
      if (stats[1]) stats[1].textContent = pattern.id === 'aqi' ? `${Math.round(pattern.impactedDays / pattern.matchingDays * 100)}%` : `${average(personalRows(data), pattern.id === 'temp' ? 'comfort' : 'energy')?.toFixed(1) || '—'} / 10`;
      if (stats[2]) stats[2].textContent = pattern.id === 'temp' ? `${average(personalRows(data), 'comfort')?.toFixed(1) || '—'} / 10` : `${pattern.baselineVal}`;
      const fill = card.querySelector('.confidence-bar-fill');
      if (fill) { fill.style.width = `${pattern.confidence}%`; fill.style.background = pattern.color; }
      const confidence = card.querySelector('.confidence-pct');
      if (confidence) confidence.textContent = `${pattern.confidence}%`;
      const link = card.querySelector('a');
      if (link) { link.href = `pattern-detail.html?p=${pattern.id}`; link.textContent = 'View all matching days →'; }
    });
    const empty = document.getElementById('patternDataEmpty');
    if (!patterns.length && !empty) {
      const firstCard = cards[0];
      if (firstCard?.parentElement) { const message = document.createElement('div'); message.id = 'patternDataEmpty'; message.className = 'card'; message.style.marginBottom = '16px'; message.innerHTML = '<strong>Not enough linked environmental data yet.</strong><p class="secondary-text" style="margin-top:6px;">AIRGUARD is pairing your saved check-ins with the real environmental history for those dates. Patterns will appear when the comparison has enough evidence.</p>'; firstCard.parentElement.insertBefore(message, firstCard); }
    } else if (patterns.length) empty?.remove();
    const urlPattern = new URLSearchParams(window.location.search).get('p');
    renderPatternDetail((urlPattern && window.AIRGUARD.PATTERNS[urlPattern]) || patterns[0]);
    return snapshot;
  }

  async function refreshPatternsWithEnvironment(data) {
    const checkins = data?.checkins || [];
    const missing = checkins.filter(item => !item.environment || item.environment.temperature_c == null && item.environment.humidity_pct == null && item.environment.aqi == null);
    if (!missing.length || !window.AIRGUARD.fetchEnvironmentHistory) return;
    const location = data.profile?.location || getSavedLocation();
    try {
      const history = await window.AIRGUARD.fetchEnvironmentHistory(location.lat, location.lng, Math.min(90, Math.max(7, checkins.length + 2)));
      const byDate = Object.fromEntries((history || []).map(item => [String(item.date).slice(0, 10), item]));
      const enriched = { ...data, checkins: checkins.map(item => {
        if (item.environment && (item.environment.temperature_c != null || item.environment.humidity_pct != null || item.environment.aqi != null)) return item;
        const date = localDateKey(item.createdAt || item.timestamp);
        const environment = byDate[date];
        if (!environment) return item;
        return { ...item, environment: { temperature_c: environment.temp, humidity_pct: environment.humidity, aqi: environment.aqi, location: location.label, source: 'Open-Meteo historical conditions' } };
      }) };
      const linked = enriched.checkins.filter(item => item.environment?.temperature_c != null || item.environment?.humidity_pct != null || item.environment?.aqi != null).length;
      if (linked >= 3) {
        const user = window.AIRGUARD_FIREBASE?.currentUser?.();
        if (user && window.AIRGUARD_FIREBASE.updateCheckinEnvironment) {
          await Promise.all(enriched.checkins.filter(item => item.id && (!checkins.find(original => original.id === item.id)?.environment) && item.environment).map(item => window.AIRGUARD_FIREBASE.updateCheckinEnvironment(user, item.id, item.environment)));
        }
        daysData = buildUserDays(enriched);
        window.AIRGUARD.daysData = daysData;
        renderPatternSurfaces(enriched, true);
      }
    } catch (error) { console.warn('Could not pair check-ins with environmental history', error); }
  }

  async function populateMockData(days = 7, onProgress = () => {}) {
    const user = window.AIRGUARD_FIREBASE?.currentUser?.();
    if (!user) throw new Error('Please sign in before populating this account.');
    const total = days === 30 ? 30 : 7;
    const location = getSavedLocation();
    const now = Date.now();
    for (let index = total - 1; index >= 0; index -= 1) {
      const date = new Date(now - index * 86400000);
      const wave = Math.sin(index * 1.7);
      const humidity = Math.round(clamp(63 + wave * 15 + Math.random() * 10, 35, 90));
      const temp = round1(clamp(29 + wave * 4 + Math.random() * 5, 20, 40));
      const aqi = Math.round(clamp(82 + wave * 32 + Math.random() * 42, 25, 190));
      const energy = round1(clamp(7.4 - (humidity > 70 ? 1.5 : 0) - (aqi > 120 ? .5 : 0) + (Math.random() - .5) * 1.2, 2, 9.5));
      const comfort = round1(clamp(7.3 - (temp > 33 ? 1.4 : 0) - (humidity > 75 ? .5 : 0) + (Math.random() - .5) * 1.1, 2, 9.5));
      const symptoms = [];
      if (humidity > 70 && Math.random() > .45) symptoms.push('Fatigue');
      if (aqi > 120 && Math.random() > .4) symptoms.push('Congestion');
      if (temp > 33 && Math.random() > .55) symptoms.push('Headache');
      await window.AIRGUARD_FIREBASE.saveCheckin(user, {
        createdAt: date.toISOString(), energy, comfort, sleep: round1(clamp(6.2 + Math.random() * 1.7, 4.5, 8.5)), movement: Math.round(25 + Math.random() * 45), symptoms,
        activity: Math.random() > .45 ? 'Outside' : 'Indoors', notes: 'Generated sample for testing', isMockData: true,
        environment: { temperature_c: temp, humidity_pct: humidity, aqi, pm2_5: Math.round(aqi * .45), pm10: Math.round(aqi * .85), uv_index: temp > 33 ? 8 : 5, pollen_level: humidity > 72 ? 'Moderate' : 'Low', location: location.label }
      });
      onProgress(total - index, total);
    }
    localStorage.removeItem(patternCacheKey({ uid: user.uid }));
    await window.AIRGUARD_FIREBASE.saveProfile(user, { patternSnapshot: null, patternRefreshAt: new Date().toISOString() });
    const cached = window.AIRGUARD_FIREBASE.getCachedData?.();
    if (cached) renderPatternSurfaces(cached);
    return total;
  }

  // Shared location state for onboarding + environment map selectors.
  const LOCATION_STORAGE_KEY = "airguard_location";

  function getSavedLocation() {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_LOCATION };
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number" || !parsed.label) {
        return { ...DEFAULT_LOCATION };
      }
      return parsed;
    } catch (error) {
      return { ...DEFAULT_LOCATION };
    }
  }

  function saveLocation(location) {
    const next = {
      label: location.label || DEFAULT_LOCATION.label,
      lat: Number(location.lat),
      lng: Number(location.lng)
    };
    if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return getSavedLocation();
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  async function reverseGeocode(lat, lng) {
    const fallback = `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("lat", lat);
      url.searchParams.set("lon", lng);
      url.searchParams.set("zoom", "10");
      url.searchParams.set("addressdetails", "1");

      const response = await fetch(url.toString(), {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);

      const data = await response.json();
      const address = data.address || {};
      const locality = address.city || address.town || address.village || address.municipality || address.county;
      const country = address.country;
      return locality && country ? `${locality}, ${country}` : (data.display_name || fallback);
    } catch (error) {
      return fallback;
    }
  }

  // Expose Globally
  window.AIRGUARD = {
    BASELINE,
    CITIES,
    daysData,
    todayEntry,
    yesterdayEntry,
    PATTERNS,
    showToast,
    openModal,
    closeModal,
    openDrawer,
    closeDrawer,
    DEFAULT_LOCATION,
    getSavedLocation,
    saveLocation,
    reverseGeocode,
    populateMockData,
    fetchCurrentConditions,
    fetchHourlyForecast,
    loadCurrentEnvironment
  };

  window.AIRGUARD.ready = window.AIRGUARD_FIREBASE?.ready || Promise.resolve(null);
  window.AIRGUARD.getUserData = () => window.AIRGUARD_FIREBASE?.getCachedData?.() || null;
  window.AIRGUARD.getUserDataReady = () => window.AIRGUARD_FIREBASE?.getUserDataReady?.() || Promise.resolve(null);
  window.AIRGUARD.saveCheckin = async (checkin) => {
    const user = window.AIRGUARD_FIREBASE?.currentUser?.();
    if (user) return window.AIRGUARD_FIREBASE.saveCheckin(user, checkin);
    if (localStorage.getItem("airguard_demo") === "true") return null;
    throw new Error("Please sign in before saving personal data.");
  };
  window.AIRGUARD.saveActivity = async (activity) => {
    const user = window.AIRGUARD_FIREBASE?.currentUser?.();
    if (!user) throw new Error('Please sign in before saving activities.');
    return window.AIRGUARD_FIREBASE.saveActivity(user, activity);
  };
  window.AIRGUARD.fetchEnvironmentHistory = async (lat, lng, days) => {
    const params = `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&days=${days}`;
    if (window.AIRGUARD_ENV_API) {
      const response = await fetch(`${window.AIRGUARD_ENV_API}/environment/history?${params}`);
      if (response.ok) return (await response.json()).days || [];
    }
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_mean,relative_humidity_2m_mean&past_days=${Math.min(days, 92)}&forecast_days=1&timezone=auto`);
    if (!weatherResponse.ok) throw new Error(`Weather history request failed: ${weatherResponse.status}`);
    const weather = await weatherResponse.json();
    // AQI is a useful enhancement, but it should not prevent the weather
    // history from rendering when that separate service is unavailable.
    let air = { hourly: {} };
    try {
      const airResponse = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&past_days=${Math.min(days, 92)}&forecast_days=1&timezone=auto`);
      if (airResponse.ok) air = await airResponse.json();
    } catch (error) {
      console.info('AQI history unavailable; rendering weather history', error);
    }
    const aqiByDate = {};
    (air.hourly?.time || []).forEach((time, index) => {
      const date = time.slice(0, 10);
      const value = air.hourly.us_aqi?.[index];
      if (value != null) (aqiByDate[date] ||= []).push(value);
    });
    return (weather.daily?.time || []).map((date, index) => ({
      date, dateLabel: date.slice(5), dayLabel: date.slice(5),
      temp: weather.daily.temperature_2m_mean?.[index] ?? null,
      humidity: weather.daily.relative_humidity_2m_mean?.[index] ?? null,
      aqi: aqiByDate[date]?.length ? Math.round(aqiByDate[date].reduce((a, b) => a + b, 0) / aqiByDate[date].length) : null
    }));
  };
  window.addEventListener('airguard-data-ready', (event) => {
    const data = event.detail;
    if (!data) return;
    localStorage.removeItem('airguard_demo');
    daysData = buildUserDays(data);
    todayEntry = daysData[daysData.length - 1];
    yesterdayEntry = daysData[daysData.length - 2];
    exampleEntry = daysData[daysData.length - 4];
    window.AIRGUARD.daysData = daysData;
    window.AIRGUARD.todayEntry = todayEntry;
    window.AIRGUARD.yesterdayEntry = yesterdayEntry;
    applyUserMode(data);
  });
  window.addEventListener('airguard-current-environment', () => {
    const key = new URLSearchParams(window.location.search).get('p');
    const pattern = key && window.AIRGUARD?.PATTERNS?.[key];
    if (pattern) renderPatternDetail(pattern);
  });

  function applyUserMode(data) {
    if (localStorage.getItem('airguard_demo') === 'true' || !data) return;
    document.body.dataset.airguardMode = 'user';
    const userLocation = data.profile?.location || getSavedLocation();
    const name = data.profile?.name || 'there';
    document.querySelectorAll('#currentLocationLabel, #comparisonLocationLabel').forEach(el => el.textContent = userLocation.label);
    const activityLocation = document.getElementById('actLocation');
    if (activityLocation) activityLocation.value = userLocation.label;
    const title = document.querySelector('.page-title');
    if (title && /Good morning/i.test(title.textContent)) title.textContent = `Welcome, ${name}`;
    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle && subtitle.textContent.includes('India')) subtitle.textContent = `${userLocation.label} · Today`;
    const sidebarBottom = document.querySelector('.sidebar-bottom');
    if (sidebarBottom && !document.getElementById('profileSummary')) {
      const profile = document.createElement('div');
      profile.id = 'profileSummary';
      profile.style.cssText = 'display:flex;align-items:center;gap:9px;padding:12px 14px;margin-bottom:6px;';
      const initials = (name || 'U').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
      profile.innerHTML = `<div style="width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--purple-bg);color:var(--purple-fg);font-size:11px;font-weight:800;">${initials}</div><div style="min-width:0;"><div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div><div style="font-size:10px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.email || ''}</div></div>`;
      sidebarBottom.prepend(profile);
    }
    const activities = (data.activities || []).slice().sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
    const formatActivity = (item, compact = false) => {
      const recorded = item.createdAt || item.timestamp;
      const date = recorded ? new Date(recorded).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Saved activity';
      const details = [item.duration, item.plannedTime && `Planned ${item.plannedTime}`, item.location].filter(Boolean).join(' · ') || 'Details will appear after saving';
      return `<div style="padding:${compact ? '11px 12px' : '15px 16px'};border:1px solid var(--border-soft);border-radius:12px;background:var(--card-bg);display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="min-width:0;"><div style="font-weight:800;">${item.activity || 'Activity'}</div><div class="secondary-text" style="font-size:12px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${details}</div></div>
        <div class="secondary-text" style="font-size:11px;white-space:nowrap;text-align:right;">${date}</div>
      </div>`;
    };
    const timelineActivities = document.getElementById('timelineActivityList');
    if (timelineActivities) timelineActivities.innerHTML = activities.length ? activities.map(item => formatActivity(item)).join('') : '<div class="secondary-text" style="padding:18px 0;">No activities yet. Start an activity to build your personal history.</div>';
    const dashboardActivities = document.getElementById('dashboardActivityList');
    if (dashboardActivities) dashboardActivities.innerHTML = activities.length ? activities.slice(0, 3).map(item => formatActivity(item, true)).join('') : '<div class="secondary-text" style="padding:10px 0;">No activities yet. Your saved activity plans will appear here.</div>';

    // Render personal evidence only from this user's saved records.
    const wellnessGrid = document.getElementById('dashboardWellnessGrid');
    if (wellnessGrid) {
      const checkins = data.checkins || [];
      const latest = checkins[0];
      const metrics = [
        ['ENERGY', latest?.energy, 'var(--purple)', 'energy'],
        ['COMFORT', latest?.comfort, 'var(--green)', 'comfort'],
        ['SLEEP', latest?.sleep, 'var(--blue)', 'sleep'],
        ['MOVEMENT', latest?.movement, 'var(--green)', 'movement']
      ];
      wellnessGrid.innerHTML = metrics.map(([label, value, color]) => {
        const display = value == null ? '—' : label === 'SLEEP' ? `${value}h` : label === 'MOVEMENT' ? `${value} min` : `${value} / 10`;
        const width = value == null ? 0 : label === 'SLEEP' ? Math.min(100, Number(value) / 8 * 100) : label === 'MOVEMENT' ? Math.min(100, Number(value) / 60 * 100) : Number(value) * 10;
        return `<div class="card stat-card"><div class="stat-label">${label}</div><div class="stat-value">${display}</div><div class="stat-bar-track"><div class="stat-bar-fill" style="width:${width}%;background:${color};"></div></div><div class="stat-caption">${value == null ? 'Enter data to view stats' : 'From your latest check-in'}</div></div>`;
      }).join('');
    }
    const snapshot = renderPatternSurfaces(data);
    refreshPatternsWithEnvironment(data);
    const dashboardPattern = document.getElementById('dashboardPersonalInsight');
    if (dashboardPattern) {
      const pattern = snapshot.patterns?.[0];
      const patternBody = dashboardPattern.querySelector('.body-text');
      const patternAverage = dashboardPattern.querySelector('.avg-highlight-line');
      if (pattern) {
        if (patternBody) patternBody.textContent = pattern.description;
        if (patternAverage) patternAverage.textContent = `${pattern.impactedDays} of ${pattern.matchingDays} matching saved days · ${pattern.confidence}% confidence`;
        const evidence = dashboardPattern.querySelector('[data-open-modal="evidenceModal"]');
        if (evidence) { evidence.style.display = ''; evidence.textContent = 'Inspect evidence →'; evidence.onclick = () => { window.location.href = `pattern-detail.html?p=${pattern.id}`; }; }
      } else {
        if (patternBody) patternBody.textContent = 'Save more check-ins with live environmental snapshots and AIRGUARD will look for personal patterns.';
        if (patternAverage) patternAverage.textContent = 'Not enough evidence yet.';
      }
    }
    const weeklyPattern = document.getElementById('weeklyPatternCard');
    renderWeeklySummary(data);
    if (weeklyPattern) {
      const pattern = snapshot.patterns?.[0];
      const title = weeklyPattern.querySelector('.card-heading');
      const description = weeklyPattern.querySelector('.body-text');
      if (title) title.textContent = pattern?.title || 'Not enough personal data yet';
      if (description) description.textContent = pattern?.description || 'Save more check-ins with environmental snapshots to build your weekly pattern history.';
      weeklyPattern.querySelectorAll('.pattern-meta-item .v').forEach((item, index) => item.textContent = pattern ? [pattern.matchingDays, pattern.strength, pattern.confidence + '%'][index] || '—' : '—');
      const evidence = weeklyPattern.querySelector('a');
      if (evidence) { evidence.textContent = pattern ? 'Inspect evidence →' : 'Evidence needs more data'; if (pattern) evidence.href = `pattern-detail.html?p=${pattern.id}`; }
    }
    document.getElementById('dashboardSuggestionCard')?.remove();
    document.getElementById('environmentBaselineCard')?.remove();
    document.querySelectorAll('.ai-summary-card .ai-summary-body, .ai-summary-card .ai-refresh-row, .ai-prompts-row').forEach(el => el.textContent = 'Awaiting personal data');
    ['recentPatternChart', 'env7DayChart', 'weekEnvChart'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas || daysData.length) return;
      const parent = canvas.parentElement;
      if (parent && !parent.querySelector('.chart-empty-state')) {
        const empty = document.createElement('p');
        empty.className = 'secondary-text chart-empty-state';
        empty.textContent = 'Not enough personal data yet — this graph will fill in after your first check-ins.';
        parent.appendChild(empty);
      }
    });
  }

  function renderWeeklySummary(data) {
    const grid = document.getElementById('weeklySummaryGrid');
    if (!grid) return;
    const entries = (data?.checkins || []).slice().sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
    const recent = entries.slice(-7);
    const enough = recent.length >= 7;
    const latest = recent[recent.length - 1] || {};
    const valueFor = (key, environmentKey) => {
      if (!recent.length) return null;
      if (!enough) return environmentKey ? latest.environment?.[environmentKey] : latest[key];
      const values = recent.map(item => environmentKey ? item.environment?.[environmentKey] : item[key]).map(Number).filter(Number.isFinite);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    const format = (value, suffix = '') => value == null ? '—' : `${Number(value).toFixed(suffix === ' / 10' ? 1 : 0)}${suffix}`;
    const sleep = valueFor('sleep');
    const sleepText = sleep == null ? '—' : `${Math.floor(sleep)}h ${Math.round((sleep % 1) * 60)}m`;
    const cards = [
      [format(valueFor('aqi', 'aqi')), enough ? 'Average from your last 7 check-ins' : 'Most recent entry'],
      [format(valueFor('energy'), ' / 10'), enough ? 'Average from your last 7 check-ins' : 'Most recent entry'],
      [format(valueFor('comfort'), ' / 10'), enough ? 'Average from your last 7 check-ins' : 'Most recent entry'],
      [sleepText, enough ? 'Average from your last 7 check-ins' : 'Most recent entry']
    ];
    grid.querySelectorAll('.stat-card').forEach((card, index) => {
      const value = card.querySelector('.stat-value');
      const caption = card.querySelector('.stat-caption');
      if (value) value.textContent = cards[index][0];
      if (caption) caption.innerHTML = `${cards[index][1]}${enough ? '' : ' <span title="Less than 7 check-ins">!</span> (not enough data)'}`;
    });
  }

  // =====================================================
  // UI HELPERS (TOAST, MODALS, TOOLTIPS)
  // =====================================================
  let toastTimer = null;
  function showToast(msg) {
    let t = document.getElementById('toastNotice');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toastNotice';
      t.className = 'toast-notice';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('open');
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('open');
  }

  function openDrawer(drawerId) {
    const d = document.getElementById(drawerId);
    if (d) d.classList.add('open');
  }

  function closeDrawer(drawerId) {
    const d = document.getElementById(drawerId);
    if (d) d.classList.remove('open');
  }

  // DOM Content Loaded Handler
  document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    const publicPages = new Set(['', 'index.html', 'auth.html', 'onboarding.html']);
    if (!publicPages.has(page)) {
      const waitForAuth = () => {
        if (!window.AIRGUARD_FIREBASE) return setTimeout(waitForAuth, 50);
        window.AIRGUARD_FIREBASE.ready.then(userData => {
          if (!userData && localStorage.getItem('airguard_demo') !== 'true') window.location.href = 'onboarding.html';
        });
      };
      waitForAuth();
    }
    initTooltips();
    initModals();
    initMobileNav();
    initThemeState();
    initSliders();
    initChips();
    applyUserMode(getCachedUserData());
    updateCurrentEnvironment();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
  });
  
  // Tooltip Engine
  function initTooltips() {
    let tipEl = document.getElementById('tooltipBubble');
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'tooltipBubble';
      tipEl.className = 'tooltip-bubble';
      document.body.appendChild(tipEl);
    }

    let tipTimer;
    document.addEventListener('mouseenter', (e) => {
      const el = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
      if (!el) return;
      clearTimeout(tipTimer);
      tipEl.textContent = el.dataset.tip;
      const r = el.getBoundingClientRect();
      tipEl.style.left = Math.min(window.innerWidth - 290, Math.max(12, r.left + r.width / 2 - 120)) + 'px';
      tipEl.style.top = Math.max(10, r.bottom + 8) + 'px';
      tipEl.classList.add('show');
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-tip]')) {
        tipTimer = setTimeout(() => tipEl.classList.remove('show'), 80);
      }
    }, true);
  }

  // Modals & Drawers backdrop click
  function initModals() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
      }
      const closeBtn = e.target instanceof Element ? e.target.closest('[data-close-modal]') : null;
      if (closeBtn) {
        const modal = closeBtn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      }
      const openBtn = e.target instanceof Element ? e.target.closest('[data-open-modal]') : null;
      if (openBtn) {
        openModal(openBtn.dataset.openModal);
      }
    });
  }

  // Mobile sidebar toggle
  function initMobileNav() {
    const hamb = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (hamb && sidebar && overlay) {
      hamb.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('open');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      });
    }
  }

  // Theme support
  function initThemeState() {
    const savedTheme = localStorage.getItem('airguard_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  }

  // Sliders with live delta tags
  function initSliders() {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      const targetId = slider.dataset.valTarget;
      const deltaId = slider.dataset.deltaTarget;
      const avgVal = parseFloat(slider.dataset.avg || "6.5");

      function update() {
        if (targetId) {
          const valEl = document.getElementById(targetId);
          if (valEl) valEl.textContent = slider.value;
        }
        if (deltaId) {
          const deltaEl = document.getElementById(deltaId);
          if (deltaEl) {
            const diff = round1(parseFloat(slider.value) - avgVal);
            const arrow = diff < 0 ? "↘" : diff > 0 ? "↗" : "→";
            const cls = diff < 0 ? "change-down-bad" : diff > 0 ? "change-up-good" : "change-neutral";
            deltaEl.className = `delta-tag ${cls}`;
            deltaEl.textContent = `${arrow} ${diff > 0 ? "+" : ""}${diff}`;
          }
        }
      }
      slider.addEventListener('input', update);
      update();
    });
  }

  // Interactive Chips (Symptoms, Activities, Places)
  function initChips() {
    document.querySelectorAll('.chip-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const chip = e.target instanceof Element ? e.target.closest('.chip') : null;
        if (!chip) return;
        const val = chip.dataset.val;
        if (val === 'None') {
          row.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        } else {
          const noneChip = row.querySelector('.chip[data-val="None"]');
          if (noneChip) noneChip.classList.remove('selected');
          chip.classList.toggle('selected');
        }
      });
    });
  }

  // fetch curent conditions from the location with latitude and longitude.
  async function fetchCurrentConditions(lat, lng) {
    const params = `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    // Use the Flask service when the host app provides one. Static hosting uses
    // the same live Open-Meteo sources directly and does not require localhost.
    if (window.AIRGUARD_ENV_API) {
      const response = await fetch(`${window.AIRGUARD_ENV_API}/environment/current?${params}`);
      if (response.ok) return await response.json();
    }

    const [weatherResponse, airResponse] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,uv_index&timezone=auto`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,grass_pollen,birch_pollen&timezone=auto`)
    ]);
    if (!weatherResponse.ok || !airResponse.ok) throw new Error('Live environmental data is unavailable.');
    const weather = (await weatherResponse.json()).current || {};
    const air = (await airResponse.json()).current || {};
    const pollen = Math.max(air.grass_pollen || 0, air.birch_pollen || 0);
    return { aqi: air.us_aqi, pm2_5: air.pm2_5, pm10: air.pm10, temperature_c: weather.temperature_2m, feels_like_c: weather.apparent_temperature, humidity_pct: weather.relative_humidity_2m, uv_index: weather.uv_index, pollen_level: pollen < 20 ? 'Low' : pollen < 50 ? 'Moderate' : 'High', timestamp: weather.time };
  }

  async function fetchHourlyForecast(lat, lng) {
    const [weatherResponse, airResponse] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m&forecast_days=2&timezone=auto`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&forecast_days=2&timezone=auto`)
    ]);
    if (!weatherResponse.ok || !airResponse.ok) throw new Error('Hourly environmental data is unavailable.');
    const weather = await weatherResponse.json();
    const air = await airResponse.json();
    const airByTime = {};
    (air.hourly?.time || []).forEach((time, index) => { airByTime[time] = air.hourly.us_aqi?.[index]; });
    return (weather.hourly?.time || []).map((time, index) => ({ time, temp: weather.hourly.temperature_2m?.[index] ?? null, humidity: weather.hourly.relative_humidity_2m?.[index] ?? null, aqi: airByTime[time] ?? null }));
  }

  // load the current location 
  async function loadCurrentEnvironment() {
    const location = getSavedLocation();

    try {
      const conditions = await fetchCurrentConditions(
        location.lat,
        location.lng
      );

      console.log("Current environment:", conditions);
      window.AIRGUARD.currentEnvironment = conditions;
      window.dispatchEvent(new CustomEvent('airguard-current-environment', { detail: conditions }));

      return conditions;
    } catch (error) {
      console.error("Failed to load environment:", error);
      showToast("Could not load current environment data.");
      return null;
    }
  }

  //  Updates Temperature
  function updateTemperature(conditions) {
      const temp = conditions.temperature_c;

      if (temp == null) return;

      function getTempLevel(temp) {
          if (temp <= 0) return "Freezing";
          if (temp <= 10) return "Cold";
          if (temp <= 20) return "Cool";
          if (temp <= 25) return "Warm";
          return "Hot";
      }

      const roundedTemp = Math.round(temp);

      // Temperature pill
      const tempEl = document.getElementById("currentTemp");

      if (tempEl) {
          tempEl.textContent = `${roundedTemp}°C`;

          if (tempEl.parentElement) tempEl.parentElement.dataset.tip =
              `Temperature is ${roundedTemp}°C today (${getTempLevel(temp)}).`;
      }
      const envTemp = document.getElementById('envTemperatureValue');
      if (envTemp) envTemp.textContent = `${roundedTemp}°C`;
      const activityTemp = document.getElementById('dispTemp');
      if (activityTemp) activityTemp.textContent = `${roundedTemp}°C`;
      const envFeels = document.getElementById('envFeelsLikeCaption');
      if (envFeels && conditions.feels_like_c != null) envFeels.textContent = `Feels like ${Math.round(conditions.feels_like_c)}°C`;

      // Comparison temperature
      const comparisonTemp =
          document.getElementById("comparisonTemp");

      if (comparisonTemp) {
          comparisonTemp.textContent = `${roundedTemp}°C`;
      }

      // Temperature baseline
      const baselineTemp =
          document.getElementById("comparisonTempBaseline");

      if (baselineTemp) {
          baselineTemp.textContent = `${BASELINE.temp}°C`;
      }
  }

  // Updates AQI
  function updateAQI(conditions) {
      const aqi = conditions.aqi;

      if (aqi == null) return;

      // Current AQI pill
      const aqiEl =
          document.getElementById("currentAQI");

      if (aqiEl) {
          aqiEl.textContent = aqi;

          if (aqiEl.parentElement) aqiEl.parentElement.dataset.tip =
              `AQI is ${aqi} today.`;
      }
      const envAqi = document.getElementById('envAqiValue');
      if (envAqi) envAqi.textContent = aqi;
      const activityAqi = document.getElementById('dispAqi');
      if (activityAqi) activityAqi.textContent = aqi;
      const envPm25 = document.getElementById('envPm25Value');
      if (envPm25 && conditions.pm2_5 != null) envPm25.innerHTML = `${Math.round(conditions.pm2_5)} <span style="font-size:14px;font-weight:600">μg/m³</span>`;

      // AQI comparison
      const comparisonAQI =
          document.getElementById("comparisonAQI");

      if (comparisonAQI) {
          comparisonAQI.textContent = aqi;
      }

      // AQI baseline
      const comparisonAQIBaseline =
          document.getElementById("comparisonAQIBaseline");

      if (comparisonAQIBaseline) {
          comparisonAQIBaseline.textContent =
              BASELINE.aqi;
      }
  }


  // Updates Humidity
  function updateHumidity(conditions) {
      const humidity = conditions.humidity_pct;

      if (humidity == null) return;

      const roundedHumidity = Math.round(humidity);

      // Current humidity
      const humidityEl =
          document.getElementById("currentHumidity");

      if (humidityEl) {
          humidityEl.textContent =
              `${roundedHumidity}%`;

          if (humidityEl.parentElement) humidityEl.parentElement.dataset.tip =
              `Humidity is ${roundedHumidity}% today.`;
      }
      const envHumidity = document.getElementById('envHumidityValue');
      if (envHumidity) envHumidity.textContent = `${roundedHumidity}%`;
      const activityHumidity = document.getElementById('dispHumidity');
      if (activityHumidity) activityHumidity.textContent = `${roundedHumidity}%`;

      // Humidity comparison
      const comparisonHumidity =
          document.getElementById("comparisonHumidity");

      if (comparisonHumidity) {
          comparisonHumidity.textContent =
              `${roundedHumidity}%`;
      }

      // Humidity baseline
      const comparisonHumidityBaseline =
          document.getElementById("comparisonHumidityBaseline");

      if (comparisonHumidityBaseline) {
          comparisonHumidityBaseline.textContent =
              `${BASELINE.humidity}%`;
      }
  }


  // updates UV
  function updateUV(conditions) {
      const uv = conditions.uv_index;

      if (uv == null) return;

      function getUVLevel(uv) {
          if (uv <= 2) return "Low";
          if (uv <= 5) return "Moderate";
          if (uv <= 7) return "High";
          if (uv <= 10) return "Very High";
          return "Extreme";
      }

      const level = getUVLevel(uv);

      const uvEl =
          document.getElementById("currentUV");

      if (uvEl) {
          uvEl.textContent = level;

          if (uvEl.parentElement) uvEl.parentElement.dataset.tip =
              `UV index is ${uv} (${level}).`;
      }
      const envUv = document.getElementById('envUvValue');
      if (envUv) envUv.textContent = level;
  }


  // Updates Pollen
  function updatePollen(conditions) {
      const pollenEl =
          document.getElementById("currentPollen");

      const level = conditions.pollen_level;

      if (!level) return;

      if (pollenEl) pollenEl.textContent = level;
      const envPollen = document.getElementById('envPollenValue');
      if (envPollen) envPollen.textContent = level;

      if (pollenEl?.parentElement) pollenEl.parentElement.dataset.tip =
          `Pollen levels are ${level} today.`;
  }


  // Main environment update
  async function updateCurrentEnvironment() {
      const location = getSavedLocation();

      try {
          const conditions = await fetchCurrentConditions(
              location.lat,
              location.lng
          );

          // Update each environmental factor
          updateTemperature(conditions);
          updateAQI(conditions);
          updateHumidity(conditions);
          updateUV(conditions);
          updatePollen(conditions);

          // Today's conditions
          const todayEl =
              document.getElementById("todayConditions");

          if (todayEl) {
              todayEl.textContent =
                  `${Math.round(conditions.temperature_c)}°C · ` +
                  `${Math.round(conditions.humidity_pct)}% humidity · ` +
                  `AQI ${conditions.aqi ?? "N/A"}`;
          }

          console.log("Environment loaded:", conditions);

      } catch (error) {
          console.error(
              "Failed to load environment:",
              error
          );
      }
  }

  function updateCurrentTime() {
    const timeEl = document.getElementById("currentTime");

    if (!timeEl) return;

    const now = new Date();

    timeEl.textContent = now.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}
})();
