/**
 * ALCOPOINT — Firebase Realtime Database xidməti
 * Struktur: tasks/, users/, departments/, activityLogs/, meta/
 */
const FirebaseService = (function () {
  let fbDb = null;
  let connected = false;
  let listeners = [];
  let unsubscribers = [];
  let reconnectTimer = null;
  let localCache = null;

  const PATHS = {
    tasks: "tasks",
    users: "users",
    departments: "departments",
    activityLogs: "activityLogs",
    meta: "meta"
  };

  function isConfigured() {
    const c = window.FIREBASE_CONFIG || {};
    return !!(c.apiKey && c.databaseURL && c.databaseURL.indexOf("YOUR_PROJECT") === -1);
  }

  function init(onData, onStatus) {
    if (!isConfigured() || typeof firebase === "undefined") {
      onStatus && onStatus({ mode: "local", connected: false });
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      fbDb = firebase.database();
      fbDb.goOnline();

      const connectedRef = fbDb.ref(".info/connected");
      connectedRef.on(
        "value",
        (snap) => {
          connected = !!snap.val();
          onStatus && onStatus({ mode: "firebase", connected });
          if (connected) {
            clearTimeout(reconnectTimer);
            syncFromCloud(onData);
          } else {
            scheduleReconnect(onData, onStatus);
          }
        },
        (err) => {
          console.warn("Firebase connection error:", err);
          onStatus && onStatus({ mode: "firebase", connected: false, error: err.message });
          scheduleReconnect(onData, onStatus);
        }
      );

      ["tasks", "users", "departments", "activityLogs", "meta"].forEach((key) => {
        const cb = () => syncFromCloud(onData);
        fbDb.ref(PATHS[key] || key).on("value", cb, (err) =>
          console.warn("Firebase listen error:", key, err)
        );
        unsubscribers.push(() => fbDb.ref(key).off("value", cb));
      });

      return true;
    } catch (e) {
      console.warn("Firebase init failed:", e.message);
      onStatus && onStatus({ mode: "local", connected: false, error: e.message });
      return false;
    }
  }

  function scheduleReconnect(onData, onStatus) {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (fbDb) {
        fbDb.goOnline();
        syncFromCloud(onData);
      }
      onStatus && onStatus({ mode: "firebase", connected: false, reconnecting: true });
    }, 4000);
  }

  function arrayFromSnapshot(snap) {
    const val = snap.val();
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return Object.keys(val).map((k) => ({ ...val[k], id: val[k].id || k }));
  }

  function syncFromCloud(onData) {
    if (!fbDb) return;
    Promise.all([
      fbDb.ref(PATHS.tasks).once("value"),
      fbDb.ref(PATHS.users).once("value"),
      fbDb.ref(PATHS.departments).once("value"),
      fbDb.ref(PATHS.activityLogs).once("value"),
      fbDb.ref(PATHS.meta).once("value")
    ])
      .then(([tasksSnap, usersSnap, deptsSnap, logsSnap, metaSnap]) => {
        const data = {
          tasks: arrayFromSnapshot(tasksSnap),
          users: arrayFromSnapshot(usersSnap),
          departments: arrayFromSnapshot(deptsSnap),
          activityLogs: arrayFromSnapshot(logsSnap),
          meta: metaSnap.val() || {}
        };
        if (data.meta.adminPass) data.adminPass = data.meta.adminPass;
        if (data.meta.imports) data.imports = data.meta.imports;
        localCache = data;
        try {
          localStorage.setItem("alcopoint_cache", JSON.stringify(data));
        } catch (_) {}
        onData && onData(data);
      })
      .catch((e) => console.warn("Sync error:", e));
  }

  function objFromArray(arr) {
    const o = {};
    (arr || []).forEach((item) => {
      if (item && item.id) o[item.id] = item;
    });
    return o;
  }

  function pushActivity(log) {
    if (!fbDb) return;
    const ref = fbDb.ref(PATHS.activityLogs).push();
    ref.set({
      ...log,
      id: ref.key,
      at: new Date().toISOString()
    });
  }

  function saveAll(dbData) {
    localCache = dbData;
    try {
      localStorage.setItem("alcopoint_cache", JSON.stringify(dbData));
    } catch (_) {}

    if (!fbDb || !connected) return Promise.resolve(false);

    const meta = {
      adminPass: dbData.adminPass,
      imports: dbData.imports || []
    };

    return Promise.all([
      fbDb.ref(PATHS.tasks).set(objFromArray(dbData.tasks)),
      fbDb.ref(PATHS.users).set(objFromArray(dbData.users)),
      fbDb.ref(PATHS.departments).set(objFromArray(dbData.departments || [])),
      fbDb.ref(PATHS.activityLogs).set(objFromArray(dbData.activityLogs || [])),
      fbDb.ref(PATHS.meta).set(meta)
    ])
      .then(() => true)
      .catch((e) => {
        console.warn("Firebase save error:", e);
        return false;
      });
  }

  function loadCache() {
    try {
      const s = localStorage.getItem("alcopoint_cache");
      if (s) return JSON.parse(s);
    } catch (_) {}
    return localCache;
  }

  function destroy() {
    unsubscribers.forEach((fn) => fn());
    unsubscribers = [];
    clearTimeout(reconnectTimer);
    if (fbDb) fbDb.goOffline();
  }

  function on(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  return {
    isConfigured,
    init,
    saveAll,
    pushActivity,
    loadCache,
    destroy,
    get connected() {
      return connected;
    },
    get mode() {
      return isConfigured() && fbDb ? "firebase" : "local";
    }
  };
})();
