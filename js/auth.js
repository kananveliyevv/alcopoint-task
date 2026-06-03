// ─────────────────────────────────────────────────────────
// js/auth.js — Auth pages: login/signup, onboarding, profile
// ─────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  Eye, EyeOff, ArrowRight, Plus, UserPlus,
  LayoutGrid, ShieldCheck, BarChart3,
} from 'lucide-react';
import { supabase }   from './config.js';
import { useAuth, usePrefs } from './contexts.js';
import { generateCode }      from './utils.js';
import {
  Button, Input, Textarea, Label, Spinner, LogoMark, PrefsToggle,
} from './components.js';

const h = React.createElement;

// ── AuthPage ──────────────────────────────────────────────
export function AuthPage() {
  const { t } = usePrefs();
  const [mode, setMode] = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!fullName.trim() || !username.trim()) throw new Error('Required fields');
        const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const { data: existing } = await supabase.from('profiles').select('id').eq('username', clean).maybeSingle();
        if (existing) throw new Error('Username already exists');
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: pErr } = await supabase.from('profiles').insert({
            id: data.user.id, full_name: fullName, username: clean,
          });
          if (pErr) throw pErr;
        }
      }
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  const switchMode = () => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); };

  const errorBox = err && h('div', {
    className: 'text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2',
  }, err);

  return h('div', { className: 'min-h-screen flex' },
    // ── Left branding panel ──────────────────────────────
    h('div', { className: 'hidden lg:flex lg:w-1/2 bg-surface border-r border-edge p-12 flex-col justify-between relative overflow-hidden' },
      h('div', { className: 'absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl' }),
      h('div', { className: 'absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5  rounded-full blur-3xl' }),
      // logo + prefs
      h('div', { className: 'relative flex items-center justify-between' },
        h('div', { className: 'flex items-center gap-2.5' },
          h(LogoMark),
          h('span', { className: 'text-xl font-semibold tracking-tight' }, 'NextTaskX'),
        ),
        h(PrefsToggle),
      ),
      // tagline
      h('div', { className: 'relative max-w-md' },
        h('h1', { className: 'text-5xl font-display-italic text-ctext leading-tight mb-4' }, t('appTagline')),
        h('p',  { className: 'text-ctext2 leading-relaxed font-display' }, t('appDesc')),
      ),
      // feature chips
      h('div', { className: 'relative flex items-center gap-6 text-xs text-ctext3' },
        h('div', { className: 'flex items-center gap-1.5' }, h(LayoutGrid, { className: 'w-3.5 h-3.5' }), t('kanban')),
        h('div', { className: 'flex items-center gap-1.5' }, h(ShieldCheck, { className: 'w-3.5 h-3.5' }), t('approvals')),
        h('div', { className: 'flex items-center gap-1.5' }, h(BarChart3,   { className: 'w-3.5 h-3.5' }), t('reports')),
      ),
    ),
    // ── Right form panel ─────────────────────────────────
    h('div', { className: 'flex-1 flex items-center justify-center p-8 relative' },
      h('div', { className: 'absolute top-6 right-6 lg:hidden' }, h(PrefsToggle)),
      h('div', { className: 'w-full max-w-sm' },
        // mobile logo
        h('div', { className: 'lg:hidden flex items-center gap-2.5 mb-10' },
          h(LogoMark, { size: 'sm' }),
          h('span', { className: 'text-lg font-semibold' }, 'NextTaskX'),
        ),
        // heading
        h('div', { className: 'mb-8' },
          h('h2', { className: 'text-3xl font-display-italic mb-1' },
            mode === 'login' ? t('welcomeBack') : t('createAccount'),
          ),
          h('p', { className: 'text-sm text-ctext2' },
            mode === 'login' ? t('loginSubtitle') : t('signupSubtitle'),
          ),
        ),
        h('form', { onSubmit: submit, className: 'space-y-4' },
          mode === 'signup' && h('div', null, h(Label, null, t('fullName')),
            h(Input, { value: fullName, onChange: e => setFullName(e.target.value), required: true })),
          mode === 'signup' && h('div', null, h(Label, null, t('username')),
            h(Input, { value: username, onChange: e => setUsername(e.target.value), required: true }),
            h('p', { className: 'text-xs text-ctext3 mt-1' }, t('usernameHint')),
          ),
          h('div', null, h(Label, null, t('email')),
            h(Input, { type: 'email', value: email, onChange: e => setEmail(e.target.value), required: true })),
          h('div', null, h(Label, null, t('password')),
            h('div', { className: 'relative' },
              h(Input, { type: showPw ? 'text' : 'password', value: password, onChange: e => setPassword(e.target.value), required: true, minLength: 6 }),
              h('button', { type: 'button', onClick: () => setShowPw(!showPw), className: 'absolute right-3 top-1/2 -translate-y-1/2 text-ctext3 hover:text-ctext' },
                showPw ? h(EyeOff, { className: 'w-4 h-4' }) : h(Eye, { className: 'w-4 h-4' }),
              ),
            ),
          ),
          errorBox,
          h(Button, { type: 'submit', size: 'lg', className: 'w-full justify-center', disabled: loading },
            loading && h(Spinner, { className: 'w-4 h-4' }),
            mode === 'login' ? t('login') : t('signup'),
            !loading && h(ArrowRight, { className: 'w-4 h-4' }),
          ),
        ),
        h('div', { className: 'mt-6 text-center text-sm text-ctext2' },
          mode === 'login' ? t('noAccount') + ' ' : t('hasAccount') + ' ',
          h('button', { onClick: switchMode, className: 'text-accent hover:text-accentH font-semibold' },
            mode === 'login' ? t('signupHere') : t('loginHere'),
          ),
        ),
      ),
    ),
  );
}

// ── Onboarding ────────────────────────────────────────────
export function Onboarding({ onDone }) {
  const { profile }         = useAuth();
  const { t }               = usePrefs();
  const [mode, setMode]     = useState(null);
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [code, setCode]     = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);

  const createTeam = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data, error } = await supabase.from('teams').insert({
        name, description: desc, team_code: generateCode(), created_by: profile.id,
      }).select().single();
      if (error) throw error;
      onDone(data.id);
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  const joinTeam = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { data: team, error } = await supabase.from('teams').select('id').eq('team_code', code.toUpperCase()).maybeSingle();
      if (error) throw error;
      if (!team) throw new Error('Team not found');
      const { error: mErr } = await supabase.from('team_members').insert({ team_id: team.id, user_id: profile.id, role: 'worker' });
      if (mErr) { if (mErr.code === '23505') throw new Error('Already a member'); throw mErr; }
      onDone(team.id);
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  const errBox = err && h('div', { className: 'text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2' }, err);

  return h('div', { className: 'min-h-screen flex items-center justify-center p-6 relative' },
    h('div', { className: 'absolute top-6 right-6' }, h(PrefsToggle)),
    h('div', { className: 'w-full max-w-xl' },
      h('div', { className: 'text-center mb-10' },
        h('h1', { className: 'text-4xl font-display-italic mb-3' },
          t('hello'), ', ',
          h('span', { className: 'text-accent' }, profile?.full_name?.split(' ')[0] || profile?.username),
        ),
        h('p', { className: 'text-ctext2' }, t('getStarted')),
      ),

      // Choice cards
      !mode && h('div', { className: 'grid md:grid-cols-2 gap-4' },
        [
          { id: 'create', label: t('createTeam'), desc: t('createTeamDesc'), icon: Plus },
          { id: 'join',   label: t('joinTeam'),   desc: t('joinTeamDesc'),   icon: UserPlus },
        ].map(({ id, label, desc: d, icon: Icon }) =>
          h('button', {
            key: id, onClick: () => setMode(id),
            className: 'group bg-surface border border-edge hover:border-accent/50 rounded-xl p-6 text-left transition-all',
          },
            h('div', { className: 'w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors' },
              h(Icon, { className: 'w-5 h-5 text-accent' }),
            ),
            h('h3', { className: 'font-semibold mb-1.5' }, label),
            h('p',  { className: 'text-sm text-ctext2' }, d),
          )
        ),
      ),

      // Create form
      mode === 'create' && h('form', { onSubmit: createTeam, className: 'bg-surface border border-edge rounded-xl p-6 space-y-4' },
        h('h3', { className: 'text-lg font-semibold mb-2' }, t('createTeam')),
        h('div', null, h(Label, null, t('teamName')),
          h(Input, { value: name, onChange: e => setName(e.target.value), required: true })),
        h('div', null, h(Label, null, t('description'), ' ', h('span', { className: 'text-ctext3 normal-case' }, t('optional'))),
          h(Textarea, { value: desc, onChange: e => setDesc(e.target.value), rows: 3 })),
        errBox,
        h('div', { className: 'flex gap-2' },
          h(Button, { type: 'button', variant: 'ghost', onClick: () => setMode(null) }, t('back')),
          h(Button, { type: 'submit', disabled: loading, className: 'flex-1 justify-center' },
            loading && h(Spinner, { className: 'w-4 h-4' }), t('create')),
        ),
      ),

      // Join form
      mode === 'join' && h('form', { onSubmit: joinTeam, className: 'bg-surface border border-edge rounded-xl p-6 space-y-4' },
        h('h3', { className: 'text-lg font-semibold mb-2' }, t('joinTeam')),
        h('div', null, h(Label, null, t('teamCode')),
          h(Input, { value: code, onChange: e => setCode(e.target.value.toUpperCase()), className: 'font-mono uppercase', maxLength: 6, required: true })),
        errBox,
        h('div', { className: 'flex gap-2' },
          h(Button, { type: 'button', variant: 'ghost', onClick: () => setMode(null) }, t('back')),
          h(Button, { type: 'submit', disabled: loading, className: 'flex-1 justify-center' },
            loading && h(Spinner, { className: 'w-4 h-4' }), t('join')),
        ),
      ),
    ),
  );
}

// ── CompleteProfile ───────────────────────────────────────
export function CompleteProfile() {
  const { session, refreshProfile } = useAuth();
  const { t }                        = usePrefs();
  const [fullName, setFullName]     = useState('');
  const [username, setUsername]     = useState('');
  const [err, setErr]               = useState('');
  const [busy, setBusy]             = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const { error } = await supabase.from('profiles').insert({
        id: session.user.id, full_name: fullName, username: clean,
      });
      if (error) throw error;
      refreshProfile();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return h('div', { className: 'min-h-screen flex items-center justify-center p-6 relative' },
    h('div', { className: 'absolute top-6 right-6' }, h(PrefsToggle)),
    h('form', { onSubmit: submit, className: 'w-full max-w-sm bg-surface border border-edge rounded-xl p-6 space-y-4' },
      h('h2', { className: 'text-xl font-display-italic mb-2' }, t('completeProfile')),
      h('div', null, h(Label, null, t('fullName')),
        h(Input, { value: fullName, onChange: e => setFullName(e.target.value), required: true })),
      h('div', null, h(Label, null, t('username')),
        h(Input, { value: username, onChange: e => setUsername(e.target.value), required: true })),
      err && h('div', { className: 'text-sm text-red-500' }, err),
      h(Button, { type: 'submit', disabled: busy, className: 'w-full justify-center' },
        busy && h(Spinner, { className: 'w-4 h-4' }), t('continueBtn')),
    ),
  );
}
