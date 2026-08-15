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

  const daysData = generate30Days();
  const todayEntry = daysData[daysData.length - 1];
  const yesterdayEntry = daysData[daysData.length - 2];
  const exampleEntry = daysData[daysData.length - 4]; // Aug 12

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
    fetchCurrentConditions,
    loadCurrentEnvironment
  };

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
    initTooltips();
    initModals();
    initMobileNav();
    initThemeState();
    initSliders();
    initChips();
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
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      clearTimeout(tipTimer);
      tipEl.textContent = el.dataset.tip;
      const r = el.getBoundingClientRect();
      tipEl.style.left = Math.min(window.innerWidth - 290, Math.max(12, r.left + r.width / 2 - 120)) + 'px';
      tipEl.style.top = Math.max(10, r.bottom + 8) + 'px';
      tipEl.classList.add('show');
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (e.target.closest('[data-tip]')) {
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
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      }
      const openBtn = e.target.closest('[data-open-modal]');
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
        const chip = e.target.closest('.chip');
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
    const response = await fetch(
      `http://127.0.0.1:5001/environment/current?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    );

    if (!response.ok) {
      throw new Error(`Environment request failed: ${response.status}`);
    }

    return await response.json();
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

          tempEl.parentElement.dataset.tip =
              `Temperature is ${roundedTemp}°C today (${getTempLevel(temp)}).`;
      }

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

          aqiEl.parentElement.dataset.tip =
              `AQI is ${aqi} today.`;
      }

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

          humidityEl.parentElement.dataset.tip =
              `Humidity is ${roundedHumidity}% today.`;
      }

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

          uvEl.parentElement.dataset.tip =
              `UV index is ${uv} (${level}).`;
      }
  }


  // Updates Pollen
  function updatePollen(conditions) {
      const pollenEl =
          document.getElementById("currentPollen");

      if (!pollenEl) return;

      const level = conditions.pollen_level;

      if (!level) return;

      pollenEl.textContent = level;

      pollenEl.parentElement.dataset.tip =
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
