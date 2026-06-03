// ─────────────────────────────────────────────────────────
// js/shell.js — AppShell layout + NewTeamForm
//   • User / logout chip moved to topbar (top-right)
//   • Sidebar "Members" section: collapsible accordion
// ─────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Crown, LogOut, ChevronDown, Copy, Users, X,
} from 'lucide-react';
import { supabase }          from './config.js';
import { useAuth, usePrefs } from './contexts.js';
import { generateCode, cn, colorFor, avatarBg } from './utils.js';
import { Button, Input, Textarea, Label, Spinner, Modal, Avatar, Badge, LogoMark, PrefsToggle } from './components.js';
import { Onboarding }        from './auth.js';
import { TeamView }          from './team.js';

const h = React.createElement;

// ── Collapsible sidebar members section ──────────────────
function SidebarMembers({ members, t }) {
  const [open, setOpen] = useState(false);

  return h('div', { className: 'mt-1' },
    // Toggle header
    h('button', {
      onClick: () => setOpen(!open),
      className: 'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-ctext2 hover:bg-elev hover:text-ctext transition-colors text-xs font-semibold uppercase tracking-wider',
    },
      h('div', { className: 'flex items-center gap-1.5' },
        h(Users, { className: 'w-3.5 h-3.5' }),
        t('members'),
        h('span', { className: 'text-ctext3 font-mono normal-case' }, '(', members.length, ')'),
      ),
      h(ChevronDown, {
        className: cn('w-3.5 h-3.5 transition-transform duration-200', open && 'rotate-180'),
      }),
    ),
    // Member list — CSS transition via class toggle
    h('div', { className: cn('members-list', open && 'open') },
      h('div', { className: 'pt-1 pb-2 px-1 space-y-0.5' },
        members.map(m =>
          h('div', { key: m.id, className: 'flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-elev group' },
            h(Avatar, { user: m, size: 'xs' }),
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'text-xs font-medium text-ctext truncate' }, m.full_name),
              h('div', { className: 'text-[10px] text-ctext3 truncate' }, '@', m.username),
            ),
            m.role === 'leader' && h(Crown, { className: 'w-3 h-3 text-accent flex-shrink-0' }),
          )
        ),
        members.length === 0 && h('p', { className: 'text-xs text-ctext3 px-2 py-1' }, '—'),
      ),
    ),
  );
}

// ── Topbar user chip ──────────────────────────────────────
function TopbarUser({ profile, signOut, t }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return h('div', { className: 'relative' },
    h('button', {
      onClick: (e) => { e.stopPropagation(); setOpen(!open); },
      className: 'topbar-user group',
    },
      h(Avatar, { user: profile, size: 'sm' }),
      h('div', { className: 'hidden sm:block text-left' },
        h('div', { className: 'text-sm font-semibold leading-none' }, profile.full_name),
        h('div', { className: 'text-[11px] text-ctext3 mt-0.5' }, '@', profile.username),
      ),
      h(ChevronDown, {
        className: cn('w-3.5 h-3.5 text-ctext3 transition-transform', open && 'rotate-180'),
      }),
    ),
    open && h('div', { className: 'absolute right-0 top-full mt-2 bg-surface border border-edge rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden' },
      h('div', { className: 'px-4 py-3 border-b border-edge' },
        h('div', { className: 'text-sm font-semibold' }, profile.full_name),
        h('div', { className: 'text-xs text-ctext3' }, '@', profile.username),
      ),
      h('button', {
        onClick: signOut,
        className: 'w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors',
      },
        h(LogOut, { className: 'w-4 h-4' }), t('signOut'),
      ),
    ),
  );
}

// ── AppShell ──────────────────────────────────────────────
export function AppShell() {
  const { profile, signOut }    = useAuth();
  const { t }                   = usePrefs();
  const [teams, setTeams]       = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [members, setMembers]   = useState([]); // active team members for sidebar
  const [loading, setLoading]   = useState(true);
  const [showNewTeam, setShowNewTeam] = useState(false);

  const loadTeams = useCallback(async () => {
    const { data } = await supabase
      .from('team_members')
      .select('role, teams(*)')
      .eq('user_id', profile.id);
    const tt = (data || []).map(d => ({ ...d.teams, my_role: d.role })).filter(x => x.id);
    setTeams(tt);
    if (!activeTeamId && tt.length > 0) setActiveTeamId(tt[0].id);
    setLoading(false);
  }, [profile?.id, activeTeamId]);

  // Load sidebar members when active team changes
  useEffect(() => {
    if (!activeTeamId) return;
    supabase
      .from('team_members')
      .select('role, profiles(*)')
      .eq('team_id', activeTeamId)
      .then(({ data }) => {
        setMembers(
          (data || []).filter(m => m.profiles).map(m => ({ ...m.profiles, role: m.role }))
        );
      });
  }, [activeTeamId]);

  useEffect(() => { if (profile) loadTeams(); }, [profile, loadTeams]);

  if (loading) return h('div', { className: 'min-h-screen flex items-center justify-center' },
    h(Spinner, { className: 'w-6 h-6 text-accent' }));

  if (teams.length === 0)
    return h(Onboarding, { onDone: (id) => { setActiveTeamId(id); loadTeams(); } });

  const activeTeam = teams.find(t => t.id === activeTeamId);

  return h('div', { className: 'min-h-screen flex flex-col' },
    h('div', { className: 'flex-1 flex overflow-hidden' },

      // ── Sidebar ─────────────────────────────────────────
      h('aside', { className: 'w-64 bg-surface border-r border-edge flex flex-col flex-shrink-0' },

        // Logo + prefs row
        h('div', { className: 'p-4 border-b border-edge flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-2.5' },
            h(LogoMark, { size: 'sm' }),
            h('div', { className: 'flex flex-col leading-none' },
              h('span', { className: 'font-bold tracking-tight text-base text-ctext' }, 'Alcopoint'),
              h('span', { className: 'text-[9px] text-ctext3 tracking-wider font-normal' }, 'Task Manager'),
            ),
          ),
          h(PrefsToggle),
        ),

        // Teams nav
        h('div', { className: 'flex-1 p-3 overflow-y-auto scrollbar-thin' },
          h('div', { className: 'flex items-center justify-between px-2 mb-2' },
            h('span', { className: 'text-[10px] uppercase tracking-widest text-ctext3 font-bold' },
              t('tasks')),
            h('button', {
              onClick: () => setShowNewTeam(true),
              className: 'text-ctext3 hover:text-accent p-0.5 rounded transition-colors',
              title: t('createTeam'),
            }, h(Plus, { className: 'w-3.5 h-3.5' })),
          ),

          h('nav', { className: 'space-y-0.5 mb-4' },
            teams.map(team =>
              h('button', {
                key: team.id,
                onClick: () => setActiveTeamId(team.id),
                className: cn(
                  'w-full text-left px-2 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors',
                  team.id === activeTeamId
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-ctext2 hover:bg-elev hover:text-ctext',
                ),
              },
                h('div', {
                  className: cn(
                    'w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center flex-shrink-0',
                    avatarBg[colorFor(team.id)],
                  ),
                }, team.name[0].toUpperCase()),
                h('span', { className: 'truncate flex-1' }, team.name),
                team.my_role === 'leader' && h(Crown, { className: 'w-3 h-3 flex-shrink-0 text-accent opacity-70' }),
              )
            ),
          ),

          // ── Collapsible Members section ────────────────
          h('div', { className: 'border-t border-edge pt-3' },
            h(SidebarMembers, { members, t }),
          ),
        ),
      ),

      // ── Main content ────────────────────────────────────
      h('div', { className: 'flex-1 overflow-hidden flex flex-col' },
        // Global topbar — user chip lives here (top-right)
        h('div', { className: 'h-14 border-b border-edge bg-base flex items-center justify-between px-5 flex-shrink-0' },
          h('div', null), // spacer / breadcrumb can go here
          h('div', { className: 'flex items-center gap-3' },
            h(TopbarUser, { profile, signOut, t }),
          ),
        ),
        h('main', { className: 'flex-1 overflow-hidden flex flex-col' },
          activeTeam && h(TeamView, {
            team: activeTeam,
            key: activeTeam.id,
            onTeamUpdate: loadTeams,
          }),
        ),
      ),
    ),

    // Footer
    h('footer', { className: 'border-t border-edge px-6 py-2.5 text-center text-[11px] text-ctext3 bg-surface' },
      h('span', { className: 'font-display-italic' }, t('footer')),
    ),

    // New team modal
    h(Modal, { open: showNewTeam, onClose: () => setShowNewTeam(false) },
      h(NewTeamForm, {
        onClose: () => setShowNewTeam(false),
        onDone: (id) => { loadTeams(); setActiveTeamId(id); setShowNewTeam(false); },
      }),
    ),
  );
}

// ── NewTeamForm ───────────────────────────────────────────
function NewTeamForm({ onClose, onDone }) {
  const { profile }         = useAuth();
  const { t }               = usePrefs();
  const [mode, setMode]     = useState('create');
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [code, setCode]     = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.from('teams').insert({
          name, description: desc, team_code: generateCode(), created_by: profile.id,
        }).select().single();
        if (error) throw error;
        // Yaradanı leader kimi team_members-ə əlavə et
        const { error: mErr } = await supabase.from('team_members').insert({
          team_id: data.id, user_id: profile.id, role: 'leader',
        });
        if (mErr) throw mErr;
        onDone(data.id);
      } else {
        const { data: team, error } = await supabase.from('teams').select('id').eq('team_code', code.toUpperCase()).maybeSingle();
        if (error) throw error;
        if (!team) throw new Error('Not found');
        const { error: mErr } = await supabase.from('team_members').insert({ team_id: team.id, user_id: profile.id, role: 'worker' });
        if (mErr) { if (mErr.code === '23505') throw new Error('Already member'); throw mErr; }
        onDone(team.id);
      }
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return h('div', { className: 'p-6' },
    h('div', { className: 'flex items-center justify-between mb-5' },
      h('h2', { className: 'text-xl font-semibold' }, mode === 'create' ? t('createTeam') : t('joinTeam')),
      h('button', { onClick: onClose, className: 'text-ctext2 hover:text-ctext' }, h(X, { className: 'w-5 h-5' })),
    ),
    h('div', { className: 'flex gap-1 p-1 bg-sunken rounded-lg mb-5' },
      ['create', 'join'].map(m =>
        h('button', {
          key: m, type: 'button', onClick: () => setMode(m),
          className: cn('flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === m ? 'bg-surface text-ctext shadow-sm' : 'text-ctext2'),
        }, m === 'create' ? t('create') : t('join'))
      ),
    ),
    h('form', { onSubmit: submit, className: 'space-y-4' },
      mode === 'create' ? [
        h('div', { key: 'n' }, h(Label, null, t('teamName')),
          h(Input, { value: name, onChange: e => setName(e.target.value), required: true })),
        h('div', { key: 'd' }, h(Label, null, t('description')),
          h(Textarea, { value: desc, onChange: e => setDesc(e.target.value), rows: 3 })),
      ] : [
        h('div', { key: 'c' }, h(Label, null, t('teamCode')),
          h(Input, { value: code, onChange: e => setCode(e.target.value.toUpperCase()), className: 'font-mono uppercase', maxLength: 6, required: true })),
      ],
      err && h('div', { className: 'text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2' }, err),
      h('div', { className: 'flex justify-end gap-2 pt-2' },
        h(Button, { type: 'button', variant: 'ghost', onClick: onClose }, t('cancel')),
        h(Button, { type: 'submit', disabled: loading },
          loading && h(Spinner, { className: 'w-4 h-4' }), mode === 'create' ? t('create') : t('join')),
      ),
    ),
  );
}
