/* AIRGUARD Firebase bootstrap. Uses the browser-compatible SDK build so this
   works when the app is served as plain static HTML. */
(function () {
  window.AIRGUARD_FIREBASE_SCRIPT_LOADED = true;
  if (typeof firebase === "undefined") {
    window.AIRGUARD_FIREBASE_ERROR = "The Firebase SDK could not be loaded. Check your network connection and reload.";
    return;
  }
  const config = {
    apiKey: "AIzaSyDqBudPC-f97DvI-I6UpkMn5HcUu54NuWY",
    authDomain: "airguard-csgirlies.firebaseapp.com",
    databaseURL: "https://airguard-csgirlies-default-rtdb.firebaseio.com",
    projectId: "airguard-csgirlies",
    storageBucket: "airguard-csgirlies.firebasestorage.app",
    messagingSenderId: "220055494",
    appId: "1:220055494:web:9e5beb0bcdacff364194c7",
    measurementId: "G-MPVND175GK"
  };
  const app = firebase.initializeApp(config);
  try { firebase.analytics(); } catch (error) { console.info("Analytics unavailable", error); }
  const auth = firebase.auth();
  const db = firebase.firestore();
  const USER_CACHE = "airguard_user_data";
  const readCache = () => { try { return JSON.parse(localStorage.getItem(USER_CACHE) || "null"); } catch { return null; } };
  const writeCache = data => localStorage.setItem(USER_CACHE, JSON.stringify(data));

  async function loadUserData(user) {
    const profileSnap = await db.doc(`users/${user.uid}`).get();
    const profile = profileSnap.exists ? profileSnap.data() : { email: user.email };
    const checkins = await db.collection(`users/${user.uid}/checkins`).orderBy("createdAt", "desc").get();
    const activities = await db.collection(`users/${user.uid}/activities`).orderBy("createdAt", "desc").get();
    const data = {
      uid: user.uid, email: user.email, profile,
      checkins: checkins.docs.map(item => ({ id: item.id, ...item.data() })),
      activities: activities.docs.map(item => ({ id: item.id, ...item.data() }))
    };
    if (profile.location?.lat && profile.location?.lng) localStorage.setItem("airguard_location", JSON.stringify(profile.location));
    writeCache(data);
    window.dispatchEvent(new CustomEvent("airguard-data-ready", { detail: data }));
    return data;
  }

  async function saveProfile(user, profile) {
    const payload = { ...profile, email: user.email, updatedAt: new Date().toISOString() };
    const cached = readCache() || { uid: user.uid, email: user.email, profile: {}, checkins: [], activities: [] };
    writeCache({ ...cached, profile: { ...cached.profile, ...payload } });
    await db.doc(`users/${user.uid}`).set(payload, { merge: true });
  }

  async function saveCheckin(user, checkin) {
    const payload = { ...checkin, createdAt: new Date().toISOString() };
    const cached = readCache() || { uid: user.uid, email: user.email, profile: {}, checkins: [], activities: [] };
    const localId = `local-${Date.now()}`;
    cached.checkins = [{ id: localId, ...payload }, ...(cached.checkins || [])];
    writeCache(cached);
    try {
      const ref = await db.collection(`users/${user.uid}/checkins`).add(payload);
      cached.checkins[0].id = ref.id;
      writeCache(cached);
    } catch (error) {
      console.warn("Check-in saved locally; Firestore sync pending", error);
    }
    return payload;
  }

  async function saveActivity(user, activity) {
    const payload = { ...activity, createdAt: new Date().toISOString() };
    const cached = readCache() || { uid: user.uid, email: user.email, profile: {}, checkins: [], activities: [] };
    const localId = `local-activity-${Date.now()}`;
    cached.activities = [{ id: localId, ...payload }, ...(cached.activities || [])];
    writeCache(cached);
    try {
      const ref = await db.collection(`users/${user.uid}/activities`).add(payload);
      cached.activities[0].id = ref.id;
      writeCache(cached);
    } catch (error) { console.warn("Activity saved locally; Firestore sync pending", error); }
    return payload;
  }

  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let readyResolved = false;
  auth.onAuthStateChanged(async user => {
    if (!user) {
      if (!readyResolved) { readyResolved = true; resolveReady(null); }
      return;
    }
    // Never block authentication/onboarding on Firestore availability.
    const cached = readCache() || { uid: user.uid, email: user.email, profile: {}, checkins: [], activities: [] };
    if (!readyResolved) { readyResolved = true; resolveReady(cached); }
    try { await loadUserData(user); }
    catch (error) { console.warn("Could not sync AIRGUARD data; using local cache", error); }
  });

  window.AIRGUARD_FIREBASE = {
    auth, db, ready,
    currentUser: () => auth.currentUser,
    getCachedData: readCache,
    signUp: async (email, password) => {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      const data = { uid: result.user.uid, email, profile: {}, checkins: [], activities: [] };
      writeCache(data);
      db.doc(`users/${result.user.uid}`).set({ email, onboardingComplete: false, createdAt: new Date().toISOString() }, { merge: true }).catch(error => console.warn("Profile sync pending", error));
      return result.user;
    },
    signIn: async (email, password) => (await auth.signInWithEmailAndPassword(email, password)).user,
    signOut: () => auth.signOut(), saveProfile, saveCheckin, saveActivity,
    setDemoMode: () => { localStorage.setItem("airguard_demo", "true"); localStorage.removeItem(USER_CACHE); },
    clearDemoMode: () => localStorage.removeItem("airguard_demo")
  };
})();
