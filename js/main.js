// ─────────────────────────────────────────────────────────
// js/main.js — App root + entry point
// ─────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle } from 'lucide-react';
import { initRealtimeNotifications } from './realtimeNotifications';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { AuthProvider, PrefsProvider }      from './contexts.js';
import { useAuth, usePrefs }               from './contexts.js';
import { Spinner, PrefsToggle }            from './components.js';
import { AuthPage, CompleteProfile }       from './auth.js';
import { AppShell }                        from './shell.js';

const h = React.createElement;

// ── Config check — shows friendly error if keys not set ──
function checkConfig() {
  return !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON');
}

// ── Config error screen ───────────────────────────────────
function ConfigError() {
  const { t } = usePrefs();
  return h('div', { className: 'min-h-screen flex items-center justify-center p-6 relative' },
    h('div', { className: 'absolute top-6 right-6' }, h(PrefsToggle)),
    h('div', { className: 'max-w-lg bg-surface border border-amber-500/30 rounded-xl p-6' },
      h('div', { className: 'flex items-center gap-2 mb-3' },
        h(AlertCircle, { className: 'w-5 h-5 text-amber-500' }),
        h('h2', { className: 'text-lg font-display font-semibold' }, t('configRequired')),
      ),
      h('p', { className: 'text-sm text-ctext2 mb-4' }, t('configRequiredDesc')),
      h('ol', { className: 'text-sm text-ctext2 space-y-2 list-decimal pl-5' },
        h('li', null, 'supabase.com-da yeni layihə yaradın'),
        h('li', null, 'SQL Editor-də ', h('code', { className: 'text-accent font-mono' }, 'schema.sql'), ' işlədin'),
        h('li', null, 'Project Settings → API-dən URL və anon key alın'),
        h('li', null, h('code', { className: 'text-accent font-mono' }, 'js/config.js'), '-də ', h('code', { className: 'font-mono' }, 'SUPABASE_URL'), ' və ', h('code', { className: 'font-mono' }, 'SUPABASE_ANON_KEY'), ' dəyərlərini yeniləyin'),
      ),
    ),
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  const { session, loading, profile } = useAuth();
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    setNeedsProfile(!loading && !!session && !profile);
  }, [loading, session, profile]);

  if (loading) return h('div', { className: 'min-h-screen flex items-center justify-center' },
    h(Spinner, { className: 'w-6 h-6 text-accent' }));

  if (!session)      return h(AuthPage);
  if (needsProfile)  return h(CompleteProfile);
  return h(AppShell);
}

// 60-cı sətrin yaxınına — Bootstrap bölməsinə
const root = createRoot(document.getElementById('root'));

root.render(
  h(PrefsProvider, null,
    checkConfig()
      ? h(AuthProvider, null, h(App))
      : h(ConfigError),
  ),
);
initRealtimeNotifications();
const root = createRoot(document.getElementById('root'));

root.render(
  h(PrefsProvider, null,
    checkConfig()
      ? h(AuthProvider, null, h(App))
      : h(ConfigError), 
  ),
);
