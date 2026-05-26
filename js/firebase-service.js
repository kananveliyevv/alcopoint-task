(function () {
  "use strict";

  const REMOTE_ROW_ID = 1;
  const LS_CACHE_KEY = "alcopoint_supabase_cache_v1";
  const RETRY_MS = 4000;

  function tableName() {
    return globalThis.SUPABASE_TABLE || "alcopoint_db";
  }

  function safeJsonParse(s) {
    try {
      return s ? JSON.parse(s) : null;
    } catch (_) {
      return null;
    }
  }

  function isMissingTable(err) {
    const msg = (err && (err.message || err.msg || String(err))) || "";
    return err?.code === "PGRST205" || /Could not find the table/i.test(msg);
  }

  function errMessage(err) {
    if (!err) return "Naməlum xəta";
    return err.message || err.msg || String(err);
  }

  function writeCache(db, updatedAt) {
    try {
      localStorage.setItem(
        LS_CACHE_KEY,
        JSON.stringify({ db, updatedAt: updatedAt || null })
      );
    } catch (_) {}
  }

  function readCache() {
    const cached = safeJsonParse(localStorage.getItem(LS_CACHE_KEY));
    return cached && cached.db ? cached.db : null;
  }

  function readCacheUpdatedAt() {
    const cached = safeJsonParse(localStorage.getItem(LS_CACHE_KEY));
    return cached ? cached.updatedAt || null : null;
  }

  function buildStatus({ mode, connected, error }) {
    return { mode, connected: !!connected, error: error ? String(error) : null };
  }

  async function fetchRow() {
    // JSON blob sütunu bəzən `data`, bəzən `value` adlanır.
    // Birinci `data` ilə cəhd edirik, alınmasa `value`-a düşürük.
    const tbl = tableName();

    const tryField = async (field) => {
      const { data, error } = await globalThis.supabaseClient
        .from(tbl)
        .select(`id,${field},updated_at`)
        .eq("id", REMOTE_ROW_ID)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, data: data[field], updated_at: data.updated_at };
    };

    try {
      const row = await tryField("data");
      if (row) FirebaseService._jsonField = "data";
      return row;
    } catch (_) {
      const row = await tryField("value");
      if (row) FirebaseService._jsonField = "value";
      return row;
    }
  }

  async function upsertRow(db) {
    const tbl = tableName();
    const field = FirebaseService._jsonField || "data";
    const payload = { id: REMOTE_ROW_ID };
    payload[field] = db;

    const { error } = await globalThis.supabaseClient
      .from(tbl)
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }

  const FirebaseService = {
    connected: false,
    initDone: false,
    lastError: null,
    needsSetup: false,
    _remoteTable: null,
    _lastRemoteUpdatedAt: readCacheUpdatedAt(),
    _pollTimer: null,
    _everConnected: false,
    _onStatus: null,
    _onRemote: null,
    _connecting: false,
    _jsonField: "data",

    isConfigured() {
      return !!globalThis.supabaseClient;
    },

    getLastError() {
      return FirebaseService.lastError;
    },

    loadCache() {
      return readCache();
    },

    stopPolling() {
      if (FirebaseService._pollTimer) {
        clearInterval(FirebaseService._pollTimer);
        FirebaseService._pollTimer = null;
      }
    },

    startPolling() {
      FirebaseService.stopPolling();
      FirebaseService._pollTimer = setInterval(() => {
        FirebaseService._tryConnect();
      }, RETRY_MS);
    },

    _emitStatus(patch) {
      const mode = patch.mode ?? (FirebaseService.connected ? "firebase" : "local");
      const connected = patch.connected ?? FirebaseService.connected;
      const error = patch.error !== undefined ? patch.error : FirebaseService.lastError;
      if (FirebaseService._onStatus) {
        FirebaseService._onStatus(buildStatus({ mode, connected, error }));
      }
    },

    async saveAll(db) {
      if (!FirebaseService.connected) return;
      try {
        await upsertRow(db);
        writeCache(db, FirebaseService._lastRemoteUpdatedAt);
      } catch (e) {
        console.warn("Supabase saveAll:", e);
        FirebaseService.connected = false;
        FirebaseService.lastError = errMessage(e);
        FirebaseService._emitStatus({
          mode: "local",
          connected: false,
          error: FirebaseService._everConnected ? FirebaseService.lastError : null
        });
        FirebaseService.startPolling();
      }
    },

    async pushActivity(entry) {
      if (!FirebaseService.connected) return;
      try {
        const remote = await fetchRow();
        const base = (remote && remote.data) || readCache() || {};
        base.activityLogs = base.activityLogs || [];
        base.activityLogs.unshift(entry);
        if (base.activityLogs.length > 200) base.activityLogs.length = 200;
        await upsertRow(base);
        writeCache(base, remote?.updated_at || null);
      } catch (e) {
        console.warn("Supabase pushActivity:", e);
      }
    },

    async _tryConnect() {
      if (FirebaseService._connecting || !FirebaseService.isConfigured()) return;
      FirebaseService._connecting = true;

      try {
        const remote = await fetchRow();
        FirebaseService._remoteTable = tableName();
        FirebaseService.needsSetup = false;
        FirebaseService.lastError = null;
        FirebaseService.connected = true;
        FirebaseService._everConnected = true;
        FirebaseService.initDone = true;
        FirebaseService.stopPolling();

        if (remote && remote.data && typeof remote.data === "object") {
          FirebaseService._lastRemoteUpdatedAt = remote.updated_at || null;
          writeCache(remote.data, remote.updated_at || null);
          if (FirebaseService._onRemote) FirebaseService._onRemote(remote.data);
        } else {
          const cached = readCache();
          if (cached) {
            await upsertRow(cached);
          } else {
            await upsertRow({});
          }
        }

        FirebaseService._emitStatus({ mode: "firebase", connected: true, error: null });
      } catch (e) {
        FirebaseService.connected = false;
        if (isMissingTable(e)) {
          FirebaseService.needsSetup = true;
          FirebaseService.lastError =
            "Cədvəl '" +
            tableName() +
            "' yoxdur. Supabase SQL Editor-də SUPABASE_SETUP.txt faylındakı SQL-i işlədin.";
        } else {
          FirebaseService.needsSetup = false;
          FirebaseService.lastError = errMessage(e);
        }
        FirebaseService._emitStatus({
          mode: "local",
          connected: false,
          error: FirebaseService._everConnected ? FirebaseService.lastError : null
        });
      } finally {
        FirebaseService._connecting = false;
      }
    },

    init(onRemote, onStatus) {
      FirebaseService._onRemote = onRemote || null;
      FirebaseService._onStatus = onStatus || null;

      if (!FirebaseService.isConfigured()) {
        FirebaseService.lastError = "Supabase kitabxanası və ya config yüklənməyib";
        FirebaseService._emitStatus({ mode: "local", connected: false, error: null });
        return false;
      }

      FirebaseService._emitStatus({ mode: "local", connected: false, error: null });
      FirebaseService._tryConnect();
      FirebaseService.startPolling();
      return true;
    }
  };

  globalThis.FirebaseService = FirebaseService;
})();
