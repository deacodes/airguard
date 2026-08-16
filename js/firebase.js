/* AIRGUARD Firebase bootstrap. Personal records are scoped to the authenticated user.
   localStorage is only an offline cache; Firestore is the source of truth. */
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
  window.AIRGUARD_FIREBASE_PERSISTENCE = false;
  try {
    db.enablePersistence({ synchronizeTabs: true })
      .then(() => { window.AIRGUARD_FIREBASE_PERSISTENCE = true; })
      .catch(error => console.warn('Firestore offline persistence unavailable in this browser:', error.code || error.message));
  } catch (error) {
    console.warn('Firestore offline persistence unavailable in this browser:', error.code || error.message);
  }

  const CACHE_PREFIX = "airguard_user_data_";
  const legacyCacheKey = "airguard_user_data";
  const cacheKey = uid => `${CACHE_PREFIX}${uid}`;
  const readCache = uid => {
    try { return JSON.parse(localStorage.getItem(uid ? cacheKey(uid) : legacyCacheKey) || "null"); }
    catch { return null; }
  };
  const writeCache = data => {
    if (!data?.uid) return;
    localStorage.setItem(cacheKey(data.uid), JSON.stringify(data));
    localStorage.setItem(legacyCacheKey, JSON.stringify(data));
  };
  const emptyData = user => ({ uid: user.uid, email: user.email || "", profile: {}, checkins: [], activities: [], conversations: [] });
  const asMillis = value => value?.toMillis ? value.toMillis() : Date.parse(value || 0) || 0;
  const sortNewest = (a, b) => asMillis(b.createdAt || b.timestamp || b.updatedAt) - asMillis(a.createdAt || a.timestamp || a.updatedAt);

  async function getCollection(path) {
    try {
      const snap = await db.collection(path).get();
      return snap.docs.map(item => ({ id: item.id, ...item.data() })).sort(sortNewest);
    } catch (error) {
      console.warn(`Could not load ${path}; using cached records`, error);
      return null;
    }
  }

  async function loadUserData(user) {
    const base = readCache(user.uid) || emptyData(user);
    let profile = base.profile || {};
    try {
      const profileSnap = await db.doc(`users/${user.uid}`).get();
      if (profileSnap.exists) profile = { ...profile, ...profileSnap.data() };
    } catch (error) { console.warn("Could not load AIRGUARD profile; using cached profile", error); }
    const [checkins, activities, conversations] = await Promise.all([
      getCollection(`users/${user.uid}/checkins`),
      getCollection(`users/${user.uid}/activities`),
      getCollection(`users/${user.uid}/conversations`)
    ]);
    const data = {
      ...base, uid: user.uid, email: user.email || base.email, profile,
      checkins: checkins || base.checkins || [], activities: activities || base.activities || [],
      conversations: conversations || base.conversations || []
    };
    if (profile.location?.lat != null && profile.location?.lng != null) localStorage.setItem("airguard_location", JSON.stringify(profile.location));
    writeCache(data);
    window.dispatchEvent(new CustomEvent("airguard-data-ready", { detail: data }));
    return data;
  }

  function updateCached(user, update) {
    const cached = readCache(user.uid) || emptyData(user);
    const next = { ...cached, ...update, uid: user.uid, email: user.email || cached.email };
    writeCache(next);
    window.dispatchEvent(new CustomEvent("airguard-data-ready", { detail: next }));
    return next;
  }

  async function saveProfile(user, profile) {
    const payload = { ...profile, email: user.email, updatedAt: new Date().toISOString() };
    const cached = readCache(user.uid) || emptyData(user);
    updateCached(user, { profile: { ...cached.profile, ...payload } });
    await db.doc(`users/${user.uid}`).set(payload, { merge: true });
    return payload;
  }

  async function migrateLegacyCache(user) {
    const existing = readCache(user.uid);
    if (existing) return existing;
    let legacy = readCache();
    if (!legacy || legacy.uid !== user.uid) return null;
    const migrated = { ...emptyData(user), ...legacy, uid: user.uid, email: user.email || legacy.email };
    writeCache(migrated);
    for (const record of migrated.checkins || []) await saveRecord(user, "checkins", record);
    for (const record of migrated.activities || []) await saveRecord(user, "activities", record);
    for (const record of migrated.conversations || []) await saveRecord(user, "conversations", record);
    return migrated;
  }

  async function saveRecord(user, collection, record) {
    const payload = { ...record, createdAt: record.createdAt || new Date().toISOString() };
    const cached = readCache(user.uid) || emptyData(user);
    const localId = `local-${collection}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const key = collection === "checkins" ? "checkins" : collection === "activities" ? "activities" : "conversations";
    updateCached(user, { [key]: [{ id: localId, ...payload }, ...(cached[key] || [])] });

    const ref = await db.collection(`users/${user.uid}/${collection}`).add(payload);

    // NEW: check whether this write actually reached Firestore's servers
    // or is just sitting in the local offline queue.
    const snap = await ref.get();
    if (snap.metadata.hasPendingWrites) {
      console.warn(`${collection} record is queued locally and hasn't reached Firestore's servers yet.`);
    }

    const fresh = readCache(user.uid) || emptyData(user);
    fresh[key] = (fresh[key] || []).map(item => item.id === localId ? { ...item, id: ref.id } : item);
    writeCache(fresh);
    return { id: ref.id, ...payload, pendingSync: snap.metadata.hasPendingWrites };
  }
  async function saveCheckin(user, checkin) { return saveRecord(user, "checkins", checkin); }
  async function saveActivity(user, activity) { return saveRecord(user, "activities", activity); }
  async function saveConversation(user, message) { return saveRecord(user, "conversations", message); }
  async function updateCheckinEnvironment(user, checkinId, environment) {
    if (!checkinId || String(checkinId).startsWith('local-')) return null;
    await db.doc(`users/${user.uid}/checkins/${checkinId}`).update({ environment, environmentLinkedAt: new Date().toISOString() });
    const cached = readCache(user.uid) || emptyData(user);
    cached.checkins = (cached.checkins || []).map(item => item.id === checkinId ? { ...item, environment, environmentLinkedAt: new Date().toISOString() } : item);
    writeCache(cached);
    return environment;
  }
  async function deleteCollection(user, collection) {
    const ref = db.collection(`users/${user.uid}/${collection}`);
    const snap = await ref.get({ source: "server" });
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    if (snap.docs.length) await batch.commit();
    const cached = readCache(user.uid) || emptyData(user);
    const key = collection === "checkins" ? "checkins" : collection === "activities" ? "activities" : "conversations";
    cached[key] = [];
    writeCache(cached);
    window.dispatchEvent(new CustomEvent("airguard-data-ready", { detail: cached }));
    return snap.docs.length;
  }

  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let readyResolved = false;
  auth.onAuthStateChanged(async user => {
    if (!user) { if (!readyResolved) { readyResolved = true; resolveReady(null); } return; }
    const cached = readCache(user.uid) || emptyData(user);
    if (!readyResolved) { readyResolved = true; resolveReady(cached); }
    try { await loadUserData(user); } catch (error) { console.warn("Could not sync AIRGUARD data; using local cache", error); }
  });

  window.AIRGUARD_FIREBASE = {
    app, auth, db, ready,
    currentUser: () => auth.currentUser,
    getCachedData: () => auth.currentUser ? readCache(auth.currentUser.uid) : null,
    getUserDataReady: async () => auth.currentUser ? loadUserData(auth.currentUser) : null,
    signUp: async (email, password) => {
      const result = await auth.createUserWithEmailAndPassword(email, password);
      const data = emptyData(result.user);
      writeCache(data);
      await db.doc(`users/${result.user.uid}`).set({ email, onboardingComplete: false, createdAt: new Date().toISOString() }, { merge: true });
      return result.user;
    },
    signIn: async (email, password) => (await auth.signInWithEmailAndPassword(email, password)).user,
    signOut: () => auth.signOut(), saveProfile, saveCheckin, saveActivity, saveConversation, updateCheckinEnvironment,
    deleteCheckins: user => deleteCollection(user, "checkins"),
    setDemoMode: () => { localStorage.setItem("airguard_demo", "true"); localStorage.removeItem(legacyCacheKey); },
    clearDemoMode: () => localStorage.removeItem("airguard_demo")
  };
})();
