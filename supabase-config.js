const SUPABASE_URL = "https://eferozgkqhhkdgekqlhh.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_Hy769-TrtR1SZDaNNuSRRw_RMfl_NuD";

/** PostgREST cədvəl adı — SUPABASE_SETUP.txt SQL ilə yaradılmalıdır */
const SUPABASE_TABLE = "alcopoint_db";

(function initSupabase() {
  if (!globalThis.supabase || typeof globalThis.supabase.createClient !== "function") {
    console.error("Supabase JS kitabxanası yüklənməyib");
    return;
  }
  const client = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  globalThis.supabaseClient = client;
  globalThis.SUPABASE_TABLE = SUPABASE_TABLE;
})();
