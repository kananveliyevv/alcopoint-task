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
      if (row) SupabaseService._jsonField = "data";
      return row;
    } catch (_) {
      const row = await tryField("value");
      if (row) SupabaseService._jsonField = "value";
      return row;
    }
  }

  async function upsertRow(db) {
    const tbl = tableName();
    const field = SupabaseService._jsonField || "data";
    const payload = { id: REMOTE_ROW_ID };
    payload[field] = db;

    const { error } = await globalThis.supabaseClient
      .from(tbl)
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }

  const SupabaseService = {
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
      return SupabaseService.lastError;
    },

    loadCache() {
      return readCache();
    },

    stopPolling() {
      if (SupabaseService._pollTimer) {
        clearInterval(SupabaseService._pollTimer);
        SupabaseService._pollTimer = null;
      }
    },

    startPolling() {
      SupabaseService.stopPolling();
      SupabaseService._pollTimer = setInterval(() => {
        SupabaseService._tryConnect();
      }, RETRY_MS);
    },

    _emitStatus(patch) {
      const mode = patch.mode ?? (SupabaseService.connected ? "supabase" : "local");
      const connected = patch.connected ?? SupabaseService.connected;
      const error = patch.error !== undefined ? patch.error : SupabaseService.lastError;
      if (SupabaseService._onStatus) {
        SupabaseService._onStatus(buildStatus({ mode, connected, error }));
      }
    },

    async saveAll(db) {
      if (!SupabaseService.connected) return;
      try {
        await upsertRow(db);
        writeCache(db, SupabaseService._lastRemoteUpdatedAt);
      } catch (e) {
        console.warn("Supabase saveAll:", e);
        SupabaseService.connected = false;
        SupabaseService.lastError = errMessage(e);
        SupabaseService._emitStatus({
          mode: "local",
          connected: false,
          error: SupabaseService._everConnected ? SupabaseService.lastError : null
        });
        SupabaseService.startPolling();
      }
    },

    async pushActivity(entry) {
      if (!SupabaseService.connected) return;
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
      if (SupabaseService._connecting || !SupabaseService.isConfigured()) return;
      SupabaseService._connecting = true;

      try {
        const remote = await fetchRow();
        SupabaseService._remoteTable = tableName();
        SupabaseService.needsSetup = false;
        SupabaseService.lastError = null;
        SupabaseService.connected = true;
        SupabaseService._everConnected = true;
        SupabaseService.initDone = true;
        SupabaseService.stopPolling();

        if (remote && remote.data && typeof remote.data === "object") {
          SupabaseService._lastRemoteUpdatedAt = remote.updated_at || null;
          writeCache(remote.data, remote.updated_at || null);
          if (SupabaseService._onRemote) SupabaseService._onRemote(remote.data);
        } else {
          const cached = readCache();
          if (cached) {
            await upsertRow(cached);
          } else {
            await upsertRow({});
          }
        }

        SupabaseService._emitStatus({ mode: "supabase", connected: true, error: null });
      } catch (e) {
        SupabaseService.connected = false;
        if (isMissingTable(e)) {
          SupabaseService.needsSetup = true;
          SupabaseService.lastError =
            "Cədvəl '" +
            tableName() +
            "' yoxdur. Supabase SQL Editor-də SUPABASE_SETUP.txt faylındakı SQL-i işlədin.";
        } else {
          SupabaseService.needsSetup = false;
          SupabaseService.lastError = errMessage(e);
        }
        SupabaseService._emitStatus({
          mode: "local",
          connected: false,
          error: SupabaseService._everConnected ? SupabaseService.lastError : null
        });
      } finally {
        SupabaseService._connecting = false;
      }
    },

    init(onRemote, onStatus) {
      SupabaseService._onRemote = onRemote || null;
      SupabaseService._onStatus = onStatus || null;

      if (!SupabaseService.isConfigured()) {
        SupabaseService.lastError = "Supabase kitabxanası və ya config yüklənməyib";
        SupabaseService._emitStatus({ mode: "local", connected: false, error: null });
        return false;
      }

      SupabaseService._emitStatus({ mode: "local", connected: false, error: null });
      SupabaseService._tryConnect();
      SupabaseService.startPolling();
      return true;
    }
  };

  globalThis.SupabaseService = SupabaseService;
})();
