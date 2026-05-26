(function () {
  "use strict";

  // app.js eski isim olarak FirebaseService bekliyor.
  // Bu dosya, aynı arayüzü Supabase ile karşılar.

  const DEFAULT_REMOTE_TABLES = ["alcopoint_db", "alco_db", "meta"];
  const REMOTE_ROW_ID = 1;

  const LS_CACHE_KEY = "alcopoint_supabase_cache_v1";

  function safeJsonParse(s) {
    try {
      return s ? JSON.parse(s) : null;
    } catch (_) {
      return null;
    }
  }

  async function upsertDb(remoteTable, db) {
    // DB'yi tek json blob olarak saklıyoruz.
    // Kolon adı farklı olabileceği için (data / value) sırayla deneriz.
    const fields = ["data", "value"];
    let lastErr = null;
    for (const field of fields) {
      const payload = { id: REMOTE_ROW_ID };
      payload[field] = db;
      try {
        const { error } = await globalThis.supabaseClient
          .from(remoteTable)
          .upsert(payload, { onConflict: "id" });
        if (!error) return;
        lastErr = error;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Unable to upsert JSON column");
  }

  async function fetchDb(remoteTable) {
    const fields = ["data", "value"];
    let lastErr = null;
    for (const field of fields) {
      try {
        const { data, error } = await globalThis.supabaseClient
          .from(remoteTable)
          .select(`id,${field},updated_at`)
          .eq("id", REMOTE_ROW_ID)
          .maybeSingle();
        if (error) {
          lastErr = error;
          continue;
        }
        if (!data) return null;
        return { id: data.id, data: data[field], updated_at: data.updated_at };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Unable to fetch JSON column");
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

  const FirebaseService = {
    connected: false,
    initDone: false,
    _mode: "local",
    _remoteTable: null,
    _lastRemoteUpdatedAt: readCacheUpdatedAt(),
    _pollTimer: null,

    isConfigured() {
      return (
        typeof globalThis.supabaseClient !== "undefined" && !!globalThis.supabaseClient
      );
    },

    loadCache() {
      return readCache();
    },

    async saveAll(db) {
      if (!FirebaseService.connected || !FirebaseService._remoteTable) return;
      // app.js await etmediği için exception yakalayalım.
      try {
        const prevUpdatedAt = FirebaseService._lastRemoteUpdatedAt;
        await upsertDb(FirebaseService._remoteTable, db);
        // updated_at kesin dönmeyebilir; poll bir sonraki fetch’ta günceller.
        // Cache’i hemen güncelleyerek UI'nin boşa beklememesini sağlarız.
        writeCache(db, prevUpdatedAt);
      } catch (e) {
        console.warn("Supabase saveAll error:", e);
        FirebaseService.connected = false;
      }
    },

    async pushActivity(entry) {
      if (!FirebaseService.connected || !FirebaseService._remoteTable) return;
      try {
        // activityLogs'u db blob içinde sakladığımız için tamamını yeniden kaydederiz.
        // Kritik: entry formatı app.js'in beklentisiyle aynı olmalı.
        const remote = await fetchDb(FirebaseService._remoteTable);
        if (!remote || !remote.data) return;
        const db = remote.data;
        db.activityLogs = db.activityLogs || [];
        db.activityLogs.unshift(entry);
        if (db.activityLogs.length > 200) db.activityLogs.length = 200;
        await upsertDb(FirebaseService._remoteTable, db);
        writeCache(db, remote.updated_at || null);
      } catch (e) {
        console.warn("Supabase pushActivity error:", e);
        FirebaseService.connected = false;
      }
    },

    init(onRemote, onStatus) {
      const status = (s) => {
        try {
          onStatus && onStatus(s);
        } catch (_) {}
      };

      if (!FirebaseService.isConfigured()) {
        status(buildStatus({ mode: "local", connected: false, error: "Supabase client yok" }));
        return false;
      }

      // Başlangıçta local UI'yi bozmamak için connected=false ile başlıyoruz.
      status(buildStatus({ mode: "firebase", connected: false, error: null }));

      const run = async () => {
        // Uygun tabloyu bulmak için sırayla deneriz.
        let lastErr = null;
        for (const table of DEFAULT_REMOTE_TABLES) {
          try {
            const remote = await fetchDb(table);
            FirebaseService._remoteTable = table;

            // Tablo boş ise, default db'yi ilk kez yazmaya çalışacağız.
            if (!remote || !remote.data) {
              // onRemote callback'e gönderecek bir şey yoksa db'yi app.js kendi defaultundan alıyor.
              // Bu nedenle sadece connected=true yapıp, sonraki saveAll poll ile tabloya yazacağız.
              FirebaseService.connected = true;
              FirebaseService._lastRemoteUpdatedAt = null;
              status(buildStatus({ mode: "firebase", connected: true, error: null }));
              FirebaseService.initDone = true;
              // Cache'i boş geçiyoruz; app loadDB zaten local cache'i kullanır.
              return;
            }

            // Remote'dan cache oluştur.
            writeCache(remote.data, remote.updated_at || null);
            FirebaseService._lastRemoteUpdatedAt = remote.updated_at || null;
            FirebaseService.connected = true;
            status(buildStatus({ mode: "firebase", connected: true, error: null }));

            // Remote snapshot'ı app'e ver.
            onRemote && onRemote(remote.data);
            FirebaseService.initDone = true;
            return;
          } catch (e) {
            lastErr = e;
          }
        }

        FirebaseService.connected = false;
        status(
          buildStatus({
            mode: "local",
            connected: false,
            error: lastErr ? lastErr.message || String(lastErr) : "Unknown table error",
          })
        );
      };

      // init async ama app.js bunu await etmiyor.
      run();

      // "local" mı yoksa "firebase" mı olacağı status callback ile güncellenecek.
      return true;
    },
  };

  globalThis.FirebaseService = FirebaseService;
})();

