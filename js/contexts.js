// ─────────────────────────────────────────────────────────
// js/contexts.js — React contexts: Auth + Prefs (theme / lang)
// ─────────────────────────────────────────────────────────
import React, {
  useState, useEffect, useCallback, createContext, useContext,
} from 'react';
import { supabase } from './config.js';
import { translations } from './i18n.js';

// ── Auth ─────────────────────────────────────────────────
export const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = () => {
    if (session) loadProfile(session.user.id);
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return React.createElement(
    AuthCtx.Provider,
    { value: { session, profile, loading, signOut, refreshProfile } },
    children,
  );
}

export const useAuth = () => useContext(AuthCtx);

// ── Prefs (theme + language) ─────────────────────────────
export const PrefsCtx = createContext(null);

export function PrefsProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('ntx-theme') || 'dark'
  );
  const [lang, setLangState] = useState(
    () => localStorage.getItem('ntx-lang') || 'az'
  );

  const setTheme = (v) => {
    setThemeState(v);
    localStorage.setItem('ntx-theme', v);
    document.documentElement.setAttribute('data-theme', v);
  };
  const setLang = (v) => {
    setLangState(v);
    localStorage.setItem('ntx-lang', v);
    document.documentElement.setAttribute('lang', v);
  };

  // Apply on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('lang', lang);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? key,
    [lang]
  );

  return React.createElement(
    PrefsCtx.Provider,
    { value: { theme, setTheme, lang, setLang, t } },
    children,
  );
}

export const usePrefs = () => useContext(PrefsCtx);
