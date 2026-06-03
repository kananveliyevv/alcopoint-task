// ─────────────────────────────────────────────────────────
// js/team.js — TeamView + all sub-components
//   TasksTab, KanbanView (drag-drop), ListView, TaskCard,
//   TaskForm, TaskDetail, EditTaskForm, ChatPanel,
//   ChecklistPanel, ApprovalsTab, MembersTab, SettingsTab,
//   ReportsTab, KpiCard, PriorityFlag
// ─────────────────────────────────────────────────────────
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import {
  Plus, CheckSquare, Settings, X, Check, AlertCircle,
  MessageSquare, Calendar, Flag, Copy, Trash2, Send, Crown,
  User as UserIcon, ArrowRight, ShieldCheck, Hourglass,
  LayoutGrid, List, Inbox, BarChart3, Search,
  Play, Square, Clock, Repeat, ListChecks, ChevronDown,
  AtSign,
} from 'lucide-react';
import { supabase, STATUSES, PRIORITIES } from './config.js';
import { useAuth, usePrefs }              from './contexts.js';
import { cn, formatDate, formatDateTime, formatDuration, parseMentions, renderWithMentions, notifyTaskCreated, notifyTaskDone, notifyWarning } from './utils.js';
import {
  Button, Input, Textarea, Select, Label, Badge,
  Avatar, Modal, Spinner,
} from './components.js';

const h = React.createElement;

// ── PriorityFlag ──────────────────────────────────────────
function PriorityFlag({ priority }) {
  const { t } = usePrefs();
  const map = {
    urgent: { color: 'text-accent',   tk: 'priorityUrgent' },
    high:   { color: 'text-amber-500', tk: 'priorityHigh'   },
    medium: { color: 'text-ctext2',   tk: 'priorityMedium'  },
    low:    { color: 'text-ctext3',   tk: 'priorityLow'     },
  };
  const p = map[priority] || map.medium;
  return h('div', { className: cn('flex items-center gap-1', p.color), title: t(p.tk) },
    h(Flag, { className: 'w-3 h-3' }));
}

// ═══════════════════════════════════════════════════════════
// TEAM VIEW
// ═══════════════════════════════════════════════════════════
export function TeamView({ team, onTeamUpdate }) {
  const { profile }   = useAuth();
  const { t }         = usePrefs();
  const [tab, setTab] = useState('tasks');
  const [view, setView] = useState('kanban');
  const [tasks, setTasks]     = useState([]);
  const [members, setMembers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Filters
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTag, setFilterTag]       = useState('');

  const isLeader = team.my_role === 'leader';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasksRes, membersRes, approvalsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('team_id', team.id)
        .order('position').order('created_at', { ascending: false }),
      supabase.from('team_members').select('role, joined_at, profiles(*)')
        .eq('team_id', team.id),
      supabase.from('task_approval_requests')
        .select('*, tasks(title), profiles!task_approval_requests_requested_by_fkey(*)')
        .eq('team_id', team.id).order('created_at', { ascending: false }),
    ]);
    setTasks(tasksRes.data || []);
    setMembers(
      (membersRes.data || []).filter(m => m.profiles)
        .map(m => ({ ...m.profiles, role: m.role, joined_at: m.joined_at }))
    );
    setApprovals(approvalsRes.data || []);
    setLoading(false);
  }, [team.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
useEffect(() => {
    const ch = supabase.channel(`team-${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',
        filter: `team_id=eq.${team.id}` }, loadData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_approval_requests',
        filter: `team_id=eq.${team.id}` }, (payload) => {
          loadData();
          if (isLeader && Notification.permission === 'granted') {
            new Notification('Yeni Təsdiq Tələbi', {
              body: 'İşçi tapşırıq statusunu dəyişmək istəyir',
              icon: '/logo.png',
              tag: `approval-${payload.new.id}`,
            });
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'task_approval_requests',
        filter: `team_id=eq.${team.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members',
        filter: `team_id=eq.${team.id}` }, loadData)
      .subscribe();
    return () => supabase.removeChannel(ch);
}, [team.id, loadData, isLeader]);
  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (filterStatus   !== 'all' && task.status   !== filterStatus)   return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && task.assignee_id)  return false;
      if (filterAssignee !== 'unassigned' && task.assignee_id !== filterAssignee) return false;
    }
    if (filterTag && !(task.tags || []).some(tg => tg.toLowerCase().includes(filterTag.toLowerCase()))) return false;
    return true;
  }), [tasks, search, filterStatus, filterPriority, filterAssignee, filterTag]);

  const allTags = useMemo(() => {
    const s = new Set();
    tasks.forEach(tt => (tt.tags || []).forEach(tg => s.add(tg)));
    return [...s];
  }, [tasks]);

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const hasFilters = search || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all' || filterTag;
  const clearFilters = () => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); setFilterAssignee('all'); setFilterTag(''); };

  const tabs = [
    { id: 'tasks',     label: t('tasks'),     icon: CheckSquare },
    { id: 'approvals', label: t('approvals'), icon: Inbox, badge: pendingCount },
    { id: 'members',   label: t('members'),   icon: UserIcon },
    { id: 'reports',   label: t('reports'),   icon: BarChart3 },
    ...(isLeader ? [{ id: 'settings', label: t('settings'), icon: Settings }] : []),
  ];

  return h('div', { className: 'flex flex-col h-full overflow-hidden' },

    // ── Team header ───────────────────────────────────────
    h('div', { className: 'border-b border-edge px-6 py-3.5 flex items-center justify-between flex-shrink-0 bg-base' },
      h('div', null,
        h('div', { className: 'flex items-center gap-2.5 mb-0.5' },
          h('h1', { className: 'text-lg font-bold tracking-tight' }, team.name),
          isLeader
            ? h(Badge, { variant: 'leader' }, h(Crown,    { className: 'w-2.5 h-2.5' }), t('leader'))
            : h(Badge, { variant: 'worker' }, h(UserIcon, { className: 'w-2.5 h-2.5' }), t('worker')),
        ),
        h('div', { className: 'flex items-center gap-2 text-xs text-ctext3' },
          h('span', null, members.length, ' ', t('membersCount')),
          h('span', { className: 'text-edge' }, '·'),
          h('code', { className: 'font-mono' }, t('teamCode'), ': ', team.team_code),
          h('button', { onClick: () => navigator.clipboard.writeText(team.team_code), className: 'text-ctext3 hover:text-accent transition-colors' },
            h(Copy, { className: 'w-3 h-3' })),
        ),
      ),
      tab === 'tasks' && h('div', { className: 'flex items-center gap-2' },
        h('div', { className: 'flex gap-0.5 p-0.5 bg-sunken border border-edge rounded-lg' },
          h('button', { onClick: () => setView('kanban'), className: cn('p-1.5 rounded-md transition-colors', view === 'kanban' ? 'bg-surface text-ctext shadow-sm' : 'text-ctext3 hover:text-ctext') }, h(LayoutGrid, { className: 'w-4 h-4' })),
          h('button', { onClick: () => setView('list'),   className: cn('p-1.5 rounded-md transition-colors', view === 'list'   ? 'bg-surface text-ctext shadow-sm' : 'text-ctext3 hover:text-ctext') }, h(List,       { className: 'w-4 h-4' })),
        ),
        h(Button, { onClick: () => setNewTaskOpen(true) }, h(Plus, { className: 'w-4 h-4' }), t('newTask')),
      ),
    ),

    // ── Tabs ──────────────────────────────────────────────
    h('div', { className: 'border-b border-edge px-6 flex gap-0 flex-shrink-0 bg-base' },
      tabs.map(tt => h('button', {
        key: tt.id, onClick: () => setTab(tt.id),
        className: cn('px-4 py-3 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition-colors font-medium',
          tab === tt.id ? 'border-accent text-ctext' : 'border-transparent text-ctext3 hover:text-ctext'),
      },
        h(tt.icon, { className: 'w-3.5 h-3.5' }), tt.label,
        tt.badge > 0 && h('span', { className: 'ml-1 bg-accent text-white text-[10px] font-bold rounded-full px-1.5 leading-4' }, tt.badge),
      )),
    ),

    // ── Filter bar ────────────────────────────────────────
    tab === 'tasks' && h('div', { className: 'border-b border-edge px-5 py-2 flex items-center gap-2 flex-wrap bg-surface flex-shrink-0' },
      h('div', { className: 'relative min-w-[180px] flex-1 max-w-xs' },
        h(Search, { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ctext3 pointer-events-none' }),
        h(Input, { value: search, onChange: e => setSearch(e.target.value), placeholder: t('searchTasks'), className: 'pl-8 py-1.5 text-xs' }),
      ),
      h(Select, { value: filterStatus,   onChange: e => setFilterStatus(e.target.value),   className: 'w-auto py-1.5 text-xs' },
        h('option', { value: 'all' }, t('allStatuses')), STATUSES.map(s => h('option', { key: s.id, value: s.id }, t(s.tk)))),
      h(Select, { value: filterPriority, onChange: e => setFilterPriority(e.target.value), className: 'w-auto py-1.5 text-xs' },
        h('option', { value: 'all' }, t('allPriorities')), PRIORITIES.map(p => h('option', { key: p.id, value: p.id }, t(p.tk)))),
      h(Select, { value: filterAssignee, onChange: e => setFilterAssignee(e.target.value), className: 'w-auto py-1.5 text-xs' },
        h('option', { value: 'all' }, t('allAssignees')),
        h('option', { value: 'unassigned' }, t('unassigned')),
        members.map(m => h('option', { key: m.id, value: m.id }, m.full_name))),
      allTags.length > 0 && h(Select, { value: filterTag, onChange: e => setFilterTag(e.target.value), className: 'w-auto py-1.5 text-xs' },
        h('option', { value: '' }, t('tags')), allTags.map(tg => h('option', { key: tg, value: tg }, '#' + tg))),
      hasFilters && h('button', { onClick: clearFilters, className: 'text-xs text-accent hover:underline font-semibold' }, t('clearFilters')),
    ),

    // ── Tab content ───────────────────────────────────────
    h('div', { className: 'flex-1 overflow-auto scrollbar-thin' },
      loading
        ? h('div', { className: 'flex items-center justify-center h-full' }, h(Spinner, { className: 'w-6 h-6 text-accent' }))
        : tab === 'tasks'     ? h(TasksTab,     { view, tasks: filteredTasks, allTasks: tasks, members, team, isLeader, onEdit: setEditingTask, onChange: loadData })
        : tab === 'approvals' ? h(ApprovalsTab, { approvals, team, isLeader, onChange: loadData })
        : tab === 'members'   ? h(MembersTab,   { members, team, isLeader, onChange: loadData })
        : tab === 'reports'   ? h(ReportsTab,   { tasks, members })
        : tab === 'settings'  ? h(SettingsTab,  { team, onChange: () => { loadData(); onTeamUpdate?.(); } })
        : null,
    ),

    // ── Modals ────────────────────────────────────────────
    h(Modal, { open: newTaskOpen, onClose: () => setNewTaskOpen(false), size: 'lg' },
      h(TaskForm, { team, members, onClose: () => setNewTaskOpen(false), onDone: () => { loadData(); setNewTaskOpen(false); } })),
    h(Modal, { open: !!editingTask, onClose: () => setEditingTask(null), size: 'xl' },
      editingTask && h(TaskDetail, { task: editingTask, team, members, isLeader, onClose: () => setEditingTask(null), onChange: loadData })),
  );
}

// ═══════════════════════════════════════════════════════════
// TASKS TAB
// ═══════════════════════════════════════════════════════════
function TasksTab({ view, tasks, allTasks, members, team, isLeader, onEdit, onChange }) {
  const { t } = usePrefs();
  if (allTasks.length === 0) return h('div', { className: 'p-16 text-center' },
    h('div', { className: 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-elev mb-4' },
      h(CheckSquare, { className: 'w-7 h-7 text-ctext3' })),
    h('h3', { className: 'text-lg font-display font-semibold mb-1' }, t('noTasks')),
    h('p',  { className: 'text-sm text-ctext2' }, t('noTasksDesc')));
  return view === 'kanban'
    ? h(KanbanView, { tasks, members, team, isLeader, onEdit, onChange })
    : h(ListView,   { tasks, members, onEdit });
}

// ── Kanban (drag & drop) ──────────────────────────────────
function KanbanView({ tasks, members, team, isLeader, onEdit, onChange }) {
  const { profile }      = useAuth();
  const { t }            = usePrefs();
  const [dragId, setDragId]         = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dropTarget, setDropTarget]  = useState(null);
  const [reqMsg, setReqMsg]          = useState('');
  const [busy, setBusy]              = useState(false);

  const needsApproval = (task, toStatus) => {
    if (isLeader) return false;
    const free = [['todo','in_progress'],['in_progress','todo']];
    return !free.some(([a,b]) => task.status === a && toStatus === b);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault(); setDragOverCol(null);
    const id   = e.dataTransfer.getData('text/plain') || dragId;
    const task = tasks.find(t => t.id === id);
    setDragId(null);
    if (!task || task.status === newStatus) return;
    if (needsApproval(task, newStatus)) { setDropTarget({ task, newStatus }); return; }
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (newStatus === 'done') notifyTaskDone(task.title);
    onChange();
  };

  const submitReq = async () => {
    if (!dropTarget) return; setBusy(true);
    try {
      await supabase.from('task_approval_requests').insert({
        task_id: dropTarget.task.id, team_id: team.id, requested_by: profile.id,
        from_status: dropTarget.task.status, to_status: dropTarget.newStatus,
        message: reqMsg, status: 'pending',
      });
      setDropTarget(null); setReqMsg(''); notifyWarning('Tapşırıq üçün təsdiq tələb olunur: ' + (dropTarget?.task?.title || ''));
      onChange();
    } finally { setBusy(false); }
  };

  return h('div', { className: 'p-6 flex gap-4 min-h-full' },
    STATUSES.map(status => {
      const colTasks = tasks.filter(tt => tt.status === status.id);
      return h('div', {
        key: status.id,
        className: cn('kanban-col w-72 flex-shrink-0 flex flex-col rounded-xl p-2 border border-transparent', dragOverCol === status.id && 'drag-over'),
        onDragOver:  e  => { e.preventDefault(); setDragOverCol(status.id); },
        onDragLeave: () => setDragOverCol(null),
        onDrop:      e  => handleDrop(e, status.id),
      },
        h('div', { className: 'flex items-center gap-2 mb-3 px-1' },
          h('div', { className: cn('w-2 h-2 rounded-full', `bg-${status.color}`) }),
          h('h3', { className: 'text-xs font-bold uppercase tracking-widest text-ctext2' }, t(status.tk)),
          h('span', { className: 'text-xs text-ctext3 font-mono' }, colTasks.length),
        ),
        h('div', { className: 'space-y-2 flex-1 min-h-[60px]' },
          colTasks.map(task => h(TaskCard, {
            key: task.id, task, members,
            isDragging: dragId === task.id,
            onDragStart: e => { e.dataTransfer.setData('text/plain', task.id); setDragId(task.id); e.dataTransfer.effectAllowed = 'move'; },
            onDragEnd:   () => { setDragId(null); setDragOverCol(null); },
            onEdit,
          })),
        ),
      );
    }),
    // Approval request modal (triggered by drag)
    h(Modal, { open: !!dropTarget, onClose: () => { setDropTarget(null); setReqMsg(''); } },
      dropTarget && h('div', { className: 'p-6' },
        h('div', { className: 'flex items-center justify-between mb-4' },
          h('h3', { className: 'text-lg font-semibold flex items-center gap-2' },
            h(ShieldCheck, { className: 'w-5 h-5 text-accent' }), t('requiresApproval')),
          h('button', { onClick: () => setDropTarget(null), className: 'text-ctext2 hover:text-ctext' }, h(X, { className: 'w-5 h-5' })),
        ),
        h('p', { className: 'text-sm text-ctext2 mb-1' }, '"', dropTarget.task.title, '"'),
        h('div', { className: 'flex items-center gap-2 text-xs mb-4' },
          h(Badge, null, t(STATUSES.find(s => s.id === dropTarget.task.status)?.tk)),
          h(ArrowRight, { className: 'w-3 h-3 text-ctext3' }),
          h(Badge, { variant: 'ember' }, t(STATUSES.find(s => s.id === dropTarget.newStatus)?.tk)),
        ),
        h(Textarea, { value: reqMsg, onChange: e => setReqMsg(e.target.value), rows: 2, placeholder: t('whyChange'), className: 'mb-3' }),
        h('div', { className: 'flex justify-end gap-2' },
          h(Button, { variant: 'ghost', onClick: () => setDropTarget(null) }, t('cancel')),
          h(Button, { onClick: submitReq, disabled: busy },
            busy && h(Spinner, { className: 'w-4 h-4' }), h(Send, { className: 'w-3.5 h-3.5' }), t('sendForApproval')),
        ),
      ),
    ),
  );
}

function TaskCard({ task, members, isDragging, onDragStart, onDragEnd, onEdit }) {
  const { lang } = usePrefs();
  const assignee = members.find(m => m.id === task.assignee_id);
  return h('div', {
    draggable: true, onDragStart, onDragEnd,
    onClick: () => onEdit(task),
    'data-priority': task.priority,
    className: cn('bg-surface border border-edge hover:border-edge/60 rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm', isDragging && 'task-drag'),
  },
    h('div', { className: 'text-sm font-semibold text-ctext mb-1.5 leading-snug' }, task.title),
    task.description && h('div', { className: 'text-xs text-ctext2 mb-2 line-clamp-2' }, task.description),
    (task.tags || []).length > 0 && h('div', { className: 'flex flex-wrap gap-1 mb-2' },
      task.tags.slice(0, 3).map(tg => h('span', { key: tg, className: 'tag-chip' }, '#', tg))),
    h('div', { className: 'flex items-center justify-between gap-2' },
      h('div', { className: 'flex items-center gap-2 text-xs text-ctext3' },
        (task.start_date || task.due_date) && h('div', { className: 'flex items-center gap-1' },
          h(Calendar, { className: 'w-3 h-3' }),
          h('span', null, formatDate(task.due_date || task.start_date))),
        task.recurrence && h(Repeat, { className: 'w-3 h-3 text-accent', title: task.recurrence.type }),
        h(PriorityFlag, { priority: task.priority }),
      ),
      assignee && h(Avatar, { user: assignee, size: 'xs' }),
    ),
  );
}

// ── List view ─────────────────────────────────────────────
function ListView({ tasks, members, onEdit }) {
  const { t, lang } = usePrefs();
  return h('div', { className: 'p-6' },
    h('div', { className: 'bg-surface border border-edge rounded-xl overflow-hidden' },
      h('div', { className: 'grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-edge text-[10px] uppercase tracking-widest text-ctext3 font-bold' },
        h('div', { className: 'col-span-4' }, t('title')),
        h('div', { className: 'col-span-2' }, t('status')),
        h('div', { className: 'col-span-1' }, t('priority')),
        h('div', { className: 'col-span-2' }, t('assignee')),
        h('div', { className: 'col-span-2' }, t('tags')),
        h('div', { className: 'col-span-1' }, t('dueDate')),
      ),
      tasks.map(task => {
        const assignee = members.find(m => m.id === task.assignee_id);
        const status   = STATUSES.find(s => s.id === task.status);
        return h('div', {
          key: task.id, onClick: () => onEdit(task), 'data-priority': task.priority,
          className: 'grid grid-cols-12 gap-3 px-4 py-3 border-b border-edge last:border-0 hover:bg-elev cursor-pointer items-center',
        },
          h('div', { className: 'col-span-4 text-sm font-medium text-ctext truncate' }, task.title),
          h('div', { className: 'col-span-2' },
            h('div', { className: 'flex items-center gap-1.5 text-xs text-ctext2' },
              h('div', { className: cn('w-1.5 h-1.5 rounded-full', `bg-${status?.color}`) }), t(status?.tk))),
          h('div', { className: 'col-span-1' }, h(PriorityFlag, { priority: task.priority })),
          h('div', { className: 'col-span-2' }, assignee
            ? h('div', { className: 'flex items-center gap-1.5' }, h(Avatar, { user: assignee, size: 'xs' }), h('span', { className: 'text-xs text-ctext2 truncate' }, assignee.full_name))
            : h('span', { className: 'text-xs text-ctext3' }, '—')),
          h('div', { className: 'col-span-2 flex flex-wrap gap-1' },
            (task.tags || []).slice(0, 2).map(tg => h('span', { key: tg, className: 'tag-chip' }, '#', tg))),
          h('div', { className: 'col-span-1 text-xs text-ctext2' }, formatDate(task.due_date) || '—'),
        );
      }),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// TASK FORM
// ═══════════════════════════════════════════════════════════
function TaskForm({ team, members, onClose, onDone }) {
  const { profile } = useAuth();
  const { t }       = usePrefs();
  const [title, setTitle]         = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]       = useState('todo');
  const [priority, setPriority]   = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate]     = useState('');
  const [estimated, setEstimated] = useState('');
  const [tags, setTags]           = useState([]);
  const [tagInput, setTagInput]   = useState('');
  const [recurType, setRecurType] = useState('none');
  const [recurInterval, setRecurInterval] = useState(1);
  const [err, setErr]             = useState('');
  const [loading, setLoading]     = useState(false);

  const addTag = () => {
    const v = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        team_id: team.id, title, description, status, priority,
        assignee_id: assigneeId || null,
        start_date: startDate || null, due_date: dueDate || null,
        estimated_hours: estimated ? parseFloat(estimated) : null,
        tags,
        recurrence: recurType !== 'none' ? { type: recurType, interval: parseInt(recurInterval) || 1 } : null,
        created_by: profile.id,
      });
      if (error) throw error;
      notifyTaskCreated(title);
      onDone();
    } catch (ex) { setErr(ex.message); } finally { setLoading(false); }
  };

  return h('div', { className: 'p-6' },
    h('div', { className: 'flex items-center justify-between mb-5' },
      h('h2', { className: 'text-xl font-display font-semibold' }, t('newTask')),
      h('button', { onClick: onClose, className: 'text-ctext2 hover:text-ctext' }, h(X, { className: 'w-5 h-5' })),
    ),
    h('form', { onSubmit: submit, className: 'space-y-4' },
      h('div', null, h(Label, null, t('title')),
        h(Input, { value: title, onChange: e => setTitle(e.target.value), required: true, autoFocus: true })),
      h('div', null, h(Label, null, t('description')),
        h(Textarea, { value: description, onChange: e => setDescription(e.target.value), rows: 3 })),
      h('div', { className: 'grid grid-cols-2 gap-3' },
        h('div', null, h(Label, null, t('status')),
          h(Select, { value: status, onChange: e => setStatus(e.target.value) },
            STATUSES.map(s => h('option', { key: s.id, value: s.id }, t(s.tk))))),
        h('div', null, h(Label, null, t('priority')),
          h(Select, { value: priority, onChange: e => setPriority(e.target.value) },
            PRIORITIES.map(p => h('option', { key: p.id, value: p.id }, t(p.tk))))),
      ),
      h('div', { className: 'grid grid-cols-2 gap-3' },
        h('div', null, h(Label, null, t('assignee')),
          h(Select, { value: assigneeId, onChange: e => setAssigneeId(e.target.value) },
            h('option', { value: '' }, t('noone')), members.map(m => h('option', { key: m.id, value: m.id }, m.full_name)))),
        h('div', null, h(Label, null, t('estimated')),
          h(Input, { type: 'number', step: '0.5', min: '0', value: estimated, onChange: e => setEstimated(e.target.value), placeholder: '0' })),
      ),
      h('div', { className: 'grid grid-cols-2 gap-3' },
        h('div', null, h(Label, null, t('startDate')),
          h(Input, { type: 'date', value: startDate, onChange: e => setStartDate(e.target.value) })),
        h('div', null, h(Label, null, t('dueDate')),
          h(Input, { type: 'date', value: dueDate, onChange: e => setDueDate(e.target.value) })),
      ),
      h('div', null,
        h(Label, null, t('tags')),
        h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
          tags.map(tg => h('span', { key: tg, className: 'tag-chip' }, '#', tg,
            h('button', { type: 'button', onClick: () => setTags(tags.filter(x => x !== tg)), className: 'ml-1 hover:text-red-500' }, h(X, { className: 'w-2.5 h-2.5' })))),
        ),
        h(Input, { value: tagInput, onChange: e => setTagInput(e.target.value),
          onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } },
          placeholder: t('tagsPlaceholder') }),
      ),
      h('div', null,
        h(Label, null, t('recurrence')),
        h('div', { className: 'flex gap-2 items-center' },
          h(Select, { value: recurType, onChange: e => setRecurType(e.target.value), className: 'flex-1' },
            h('option', { value: 'none' },    t('noRepeat')),
            h('option', { value: 'daily' },   t('daily')),
            h('option', { value: 'weekly' },  t('weekly')),
            h('option', { value: 'monthly' }, t('monthly')),
          ),
          recurType !== 'none' && h('div', { className: 'flex items-center gap-2 text-xs text-ctext2' },
            t('every'),
            h(Input, { type: 'number', min: 1, value: recurInterval, onChange: e => setRecurInterval(e.target.value), className: 'w-16 text-center' }),
          ),
        ),
      ),
      err && h('div', { className: 'text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2' }, err),
      h('div', { className: 'flex justify-end gap-2 pt-2' },
        h(Button, { type: 'button', variant: 'ghost', onClick: onClose }, t('cancel')),
        h(Button, { type: 'submit', disabled: loading }, loading && h(Spinner, { className: 'w-4 h-4' }), t('create')),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// TASK DETAIL
// ═══════════════════════════════════════════════════════════
function TaskDetail({ task: initTask, team, members, isLeader, onClose, onChange }) {
  const { profile } = useAuth();
  const { t, lang } = usePrefs();
  const [task, setTask]         = useState(initTask);
  const [detailTab, setDetailTab] = useState('chat');
  const [comments, setComments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [pendingReq, setPendingReq]   = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [reqMessage, setReqMessage]     = useState('');
  const [editing, setEditing]           = useState(false);
  const [busy, setBusy]                 = useState(false);
  const [err, setErr]                   = useState('');
  const [timerTick, setTimerTick]       = useState(0);

  const loadAll = useCallback(async () => {
    const [cRes, rRes, chRes, tRes] = await Promise.all([
      supabase.from('task_comments').select('*, profiles(*)').eq('task_id', task.id).order('created_at'),
      supabase.from('task_approval_requests').select('*').eq('task_id', task.id).eq('status', 'pending').maybeSingle(),
      supabase.from('task_checklist_items').select('*').eq('task_id', task.id).order('position').order('created_at'),
      supabase.from('task_time_entries').select('*, profiles(*)').eq('task_id', task.id).order('started_at', { ascending: false }),
    ]);
    setComments(cRes.data || []);
    setPendingReq(rRes.data || null);
    setChecklist(chRes.data || []);
    setTimeEntries(tRes.data || []);
    setActiveTimer((tRes.data || []).find(e => e.user_id === profile.id && !e.ended_at) || null);
  }, [task.id, profile.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const ch = supabase.channel(`task-${task.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments',        filter: `task_id=eq.${task.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_checklist_items', filter: `task_id=eq.${task.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_time_entries',    filter: `task_id=eq.${task.id}` }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [task.id, loadAll]);

  useEffect(() => {
    if (!activeTimer) return;
    const iv = setInterval(() => setTimerTick(x => x + 1), 1000);
    return () => clearInterval(iv);
  }, [activeTimer]);

  const assignee = members.find(m => m.id === task.assignee_id);
  const creator  = members.find(m => m.id === task.created_by);
  const status   = STATUSES.find(s => s.id === task.status);

  const needsApproval = (toStatus) => {
    if (isLeader) return false;
    const free = [['todo','in_progress'],['in_progress','todo']];
    return !free.some(([a,b]) => task.status === a && toStatus === b);
  };

  const directMove = async (newStatus) => {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      if (error) throw error;
      setTask({ ...task, status: newStatus }); onChange();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const requestChange = async (newStatus) => {
    setBusy(true); setErr('');
    try {
      const { error } = await supabase.from('task_approval_requests').insert({
        task_id: task.id, team_id: team.id, requested_by: profile.id,
        from_status: task.status, to_status: newStatus, message: reqMessage, status: 'pending',
      });
      if (error) throw error;
      setReqMessage(''); setTargetStatus(null);
      await loadAll(); onChange();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const cancelRequest = async () => {
    setBusy(true);
    try { await supabase.from('task_approval_requests').delete().eq('id', pendingReq.id); await loadAll(); onChange(); }
    finally { setBusy(false); }
  };

  const saveEdit = async (updates) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', task.id).select().single();
      if (error) throw error;
      setTask(data); setEditing(false); onChange();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const deleteTask = async () => {
    if (!confirm(t('confirmDeleteTask'))) return; setBusy(true);
    try { await supabase.from('tasks').delete().eq('id', task.id); onChange(); onClose(); }
    finally { setBusy(false); }
  };

  const startTimer = async () => {
    await supabase.from('task_time_entries').insert({ task_id: task.id, team_id: team.id, user_id: profile.id, started_at: new Date().toISOString() });
    loadAll();
  };
  const stopTimer = async () => {
    if (!activeTimer) return;
    const end = new Date();
    const dur = Math.round((end - new Date(activeTimer.started_at)) / 1000);
    await supabase.from('task_time_entries').update({ ended_at: end.toISOString(), duration_seconds: dur }).eq('id', activeTimer.id);
    loadAll();
  };

  const totalSeconds = useMemo(() => {
    const done = timeEntries.filter(e => e.duration_seconds).reduce((a, e) => a + e.duration_seconds, 0);
    const live = activeTimer ? Math.round((Date.now() - new Date(activeTimer.started_at)) / 1000) : 0;
    return done + live;
  }, [timeEntries, activeTimer, timerTick]);

  const canEdit = isLeader || task.created_by === profile.id || task.assignee_id === profile.id;

  return h('div', { className: 'flex flex-col max-h-[85vh]' },
    // Header
    h('div', { className: 'p-6 border-b border-edge flex items-start justify-between gap-4 flex-shrink-0' },
      h('div', { className: 'flex-1 min-w-0' },
        editing
          ? h(EditTaskForm, { task, members, onSave: saveEdit, onCancel: () => setEditing(false), busy })
          : h('div', null,
              h('h2', { className: 'text-2xl font-display-italic mb-2' }, task.title),
              h('div', { className: 'flex items-center gap-2 flex-wrap text-xs text-ctext2' },
                h('div', { className: 'flex items-center gap-1.5' },
                  h('div', { className: cn('w-1.5 h-1.5 rounded-full', `bg-${status?.color}`) }), t(status?.tk)),
                h('span', { className: 'text-edge' }, '·'),
                h(PriorityFlag, { priority: task.priority }),
                h('span', null, t(PRIORITIES.find(p => p.id === task.priority)?.tk)),
                task.start_date && [h('span', { key: 'sd', className: 'text-edge' }, '·'), h('span', { key: 'sdv' }, t('startDate'), ': ', formatDate(task.start_date))],
                task.due_date   && [h('span', { key: 'dd', className: 'text-edge' }, '·'), h('span', { key: 'ddv' }, t('dueDate'),   ': ', formatDate(task.due_date))],
                task.recurrence && [h('span', { key: 'r', className: 'text-edge' }, '·'), h('div', { key: 'rv', className: 'flex items-center gap-1 text-accent' }, h(Repeat, { className: 'w-3 h-3' }), t(task.recurrence.type))],
                (task.tags || []).length > 0 && h('div', { className: 'flex flex-wrap gap-1 w-full mt-1' },
                  task.tags.map(tg => h('span', { key: tg, className: 'tag-chip' }, '#', tg))),
              ),
            )
      ),
      h('div', { className: 'flex items-center gap-1 flex-shrink-0' },
        canEdit && !editing && h('button', { onClick: () => setEditing(true), className: 'p-1.5 text-ctext3 hover:text-ctext hover:bg-elev rounded-lg', title: t('editTask') }, h(Settings, { className: 'w-4 h-4' })),
        canEdit && h('button', { onClick: deleteTask, className: 'p-1.5 text-ctext3 hover:text-red-500 hover:bg-elev rounded-lg', title: t('deleteTask') }, h(Trash2, { className: 'w-4 h-4' })),
        h('button', { onClick: onClose, className: 'p-1.5 text-ctext3 hover:text-ctext hover:bg-elev rounded-lg' }, h(X, { className: 'w-5 h-5' })),
      ),
    ),

    h('div', { className: 'flex-1 overflow-y-auto scrollbar-thin' },
      h('div', { className: 'grid grid-cols-3' },
        // ── Left (main) ──────────────────────────────────
        h('div', { className: 'col-span-2 p-6 space-y-5 border-r border-edge' },
          !editing && task.description && h('p', { className: 'text-sm text-ctext2 whitespace-pre-wrap leading-relaxed' }, task.description),
          // Status change panel
          !editing && h('div', { className: 'p-4 bg-sunken border border-edge rounded-xl' },
            h('div', { className: 'text-[10px] uppercase tracking-widest text-ctext3 mb-3 font-bold flex items-center gap-1.5' },
              h(ArrowRight, { className: 'w-3 h-3' }), t('statusChange')),
            pendingReq
              ? h('div', { className: 'flex items-center justify-between gap-3' },
                  h('div', { className: 'flex items-center gap-2 text-sm' },
                    h(Hourglass, { className: 'w-4 h-4 text-amber-500' }),
                    h('span', null, t('awaitingApproval'), ': ',
                      h('b', null, t(STATUSES.find(s => s.id === pendingReq.from_status)?.tk)), ' ',
                      h(ArrowRight, { className: 'w-3 h-3 inline' }), ' ',
                      h('b', { className: 'text-accent' }, t(STATUSES.find(s => s.id === pendingReq.to_status)?.tk)))),
                  pendingReq.requested_by === profile.id && h(Button, { size: 'sm', variant: 'ghost', onClick: cancelRequest, disabled: busy }, t('withdraw')),
                )
              : targetStatus
              ? h('div', null,
                  h('div', { className: 'flex items-center gap-2 text-sm mb-3' },
                    h(ShieldCheck, { className: 'w-4 h-4 text-accent' }),
                    h('span', null, t('requiresApproval'), ': ', h('span', { className: 'font-bold text-accent' }, t(STATUSES.find(s => s.id === targetStatus)?.tk))),
                  ),
                  h(Textarea, { value: reqMessage, onChange: e => setReqMessage(e.target.value), rows: 2, placeholder: t('whyChange'), className: 'mb-3' }),
                  h('div', { className: 'flex gap-2' },
                    h(Button, { size: 'sm', variant: 'ghost', onClick: () => { setTargetStatus(null); setReqMessage(''); } }, t('cancel')),
                    h(Button, { size: 'sm', onClick: () => requestChange(targetStatus), disabled: busy },
                      busy && h(Spinner, { className: 'w-3 h-3' }), h(Send, { className: 'w-3.5 h-3.5' }), t('sendForApproval')),
                  ),
                )
              : h('div', { className: 'flex flex-wrap gap-2' },
                  STATUSES.filter(s => s.id !== task.status).map(s => {
                    const needs = needsApproval(s.id);
                    return h('button', {
                      key: s.id, onClick: () => needs ? setTargetStatus(s.id) : directMove(s.id), disabled: busy,
                      className: 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-elev hover:bg-edge border border-edge rounded-lg font-medium transition-colors',
                    },
                      h('div', { className: cn('w-1.5 h-1.5 rounded-full', `bg-${s.color}`) }),
                      t(s.tk),
                      needs && h(ShieldCheck, { className: 'w-3 h-3 text-accent' }));
                  }),
                ),
          ),
          err && h('div', { className: 'text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2' }, err),
          // Inner tabs
          h('div', { className: 'flex gap-0 border-b border-edge' },
            [
              { id: 'chat',      icon: MessageSquare, label: t('chat'),      badge: comments.length },
              { id: 'checklist', icon: ListChecks,    label: t('checklist'), badge: `${checklist.filter(c=>c.is_done).length}/${checklist.length}` },
            ].map(it => h('button', {
              key: it.id, onClick: () => setDetailTab(it.id),
              className: cn('px-4 py-2.5 text-sm flex items-center gap-1.5 border-b-2 -mb-px transition-colors font-medium',
                detailTab === it.id ? 'border-accent text-ctext' : 'border-transparent text-ctext3 hover:text-ctext'),
            }, h(it.icon, { className: 'w-3.5 h-3.5' }), it.label,
              it.badge && it.badge !== '0/0' && h('span', { className: 'text-[10px] text-ctext3 ml-1' }, '(', it.badge, ')'),
            )),
          ),
          detailTab === 'chat'      && h(ChatPanel,      { task, team, members, comments, onChange: loadAll }),
          detailTab === 'checklist' && h(ChecklistPanel, { task, team, items: checklist, onChange: loadAll }),
        ),

        // ── Right (sidebar) ──────────────────────────────
        h('div', { className: 'p-6 space-y-5' },
          // Assignee
          h('div', null,
            h('div', { className: 'text-[10px] uppercase tracking-widest text-ctext3 mb-2 font-bold' }, t('assignee')),
            assignee ? h('div', { className: 'flex items-center gap-2' }, h(Avatar, { user: assignee, size: 'sm' }), h('span', { className: 'text-sm text-ctext' }, assignee.full_name))
                     : h('span', { className: 'text-sm text-ctext3' }, t('unassigned')),
          ),
          // Creator
          h('div', null,
            h('div', { className: 'text-[10px] uppercase tracking-widest text-ctext3 mb-2 font-bold' }, t('created')),
            creator ? h('div', { className: 'flex items-center gap-2' }, h(Avatar, { user: creator, size: 'sm' }), h('span', { className: 'text-sm text-ctext' }, creator.full_name))
                    : h('span', { className: 'text-sm text-ctext3' }, '—'),
          ),
          // Estimated
          task.estimated_hours && h('div', null,
            h('div', { className: 'text-[10px] uppercase tracking-widest text-ctext3 mb-2 font-bold' }, t('estimated')),
            h('div', { className: 'text-sm text-ctext' }, task.estimated_hours, ' ', t('hrs')),
          ),
          // Time tracking
          h('div', { className: 'p-4 bg-sunken border border-edge rounded-xl' },
            h('div', { className: 'text-[10px] uppercase tracking-widest text-ctext3 mb-2 font-bold flex items-center gap-1.5' },
              h(Clock, { className: 'w-3 h-3' }), t('timeTracking')),
            h('div', { className: 'text-2xl font-mono font-bold text-ctext mb-3' }, formatDuration(totalSeconds)),
            activeTimer
              ? h('div', { className: 'space-y-2' },
                  h('div', { className: 'flex items-center gap-2 text-xs text-emerald-500' },
                    h('div', { className: 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' }), t('currentlyTracking')),
                  h(Button, { size: 'sm', variant: 'danger', onClick: stopTimer, className: 'w-full justify-center' },
                    h(Square, { className: 'w-3.5 h-3.5' }), t('stopTimer')),
                )
              : h(Button, { size: 'sm', onClick: startTimer, className: 'w-full justify-center' },
                  h(Play, { className: 'w-3.5 h-3.5' }), t('startTimer')),
            timeEntries.length > 0 && h('div', { className: 'mt-3 pt-3 border-t border-edge space-y-1.5' },
              Object.entries(timeEntries.filter(e => e.duration_seconds).reduce((acc, e) => {
                const k = e.user_id;
                if (!acc[k]) acc[k] = { user: e.profiles, total: 0 };
                acc[k].total += e.duration_seconds;
                return acc;
              }, {})).map(([uid, info]) =>
                h('div', { key: uid, className: 'flex items-center justify-between text-xs' },
                  h('div', { className: 'flex items-center gap-1.5 text-ctext2' },
                    h(Avatar, { user: info.user, size: 'xs' }), h('span', null, info.user?.full_name)),
                  h('span', { className: 'font-mono text-ctext' }, formatDuration(info.total)),
                )
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

function EditTaskForm({ task, members, onSave, onCancel, busy }) {
  const { t } = usePrefs();
  const [title, setTitle]         = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority]   = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [startDate, setStartDate] = useState(task.start_date || '');
  const [dueDate, setDueDate]     = useState(task.due_date || '');
  const [estimated, setEstimated] = useState(task.estimated_hours || '');
  const [tags, setTags]           = useState(task.tags || []);
  const [tagInput, setTagInput]   = useState('');
  const addTag = () => {
    const v = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  };
  return h('div', { className: 'space-y-3' },
    h(Input, { value: title, onChange: e => setTitle(e.target.value), className: 'text-lg font-semibold' }),
    h(Textarea, { value: description, onChange: e => setDescription(e.target.value), rows: 3 }),
    h('div', { className: 'grid grid-cols-2 gap-2' },
      h(Select, { value: priority, onChange: e => setPriority(e.target.value) },
        PRIORITIES.map(p => h('option', { key: p.id, value: p.id }, t(p.tk)))),
      h(Select, { value: assigneeId, onChange: e => setAssigneeId(e.target.value) },
        h('option', { value: '' }, t('noone')), members.map(m => h('option', { key: m.id, value: m.id }, m.full_name))),
    ),
    h('div', { className: 'grid grid-cols-3 gap-2' },
      h(Input, { type: 'date', value: startDate, onChange: e => setStartDate(e.target.value), title: t('startDate') }),
      h(Input, { type: 'date', value: dueDate,   onChange: e => setDueDate(e.target.value),   title: t('dueDate')   }),
      h(Input, { type: 'number', step: '0.5', value: estimated, onChange: e => setEstimated(e.target.value), placeholder: t('estimated') }),
    ),
    h('div', null,
      h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
        tags.map(tg => h('span', { key: tg, className: 'tag-chip' }, '#', tg,
          h('button', { type: 'button', onClick: () => setTags(tags.filter(x => x !== tg)), className: 'ml-1 hover:text-red-500' }, h(X, { className: 'w-2.5 h-2.5' }))))),
      h(Input, { value: tagInput, onChange: e => setTagInput(e.target.value),
        onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } },
        placeholder: t('tagsPlaceholder') }),
    ),
    h('div', { className: 'flex gap-2' },
      h(Button, { size: 'sm', variant: 'ghost', onClick: onCancel, type: 'button' }, t('cancel')),
      h(Button, { size: 'sm', onClick: () => onSave({ title, description, priority,
        assignee_id: assigneeId || null, start_date: startDate || null,
        due_date: dueDate || null, estimated_hours: estimated ? parseFloat(estimated) : null, tags,
      }), disabled: busy }, busy && h(Spinner, { className: 'w-3 h-3' }), t('save')),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// CHAT PANEL
// ═══════════════════════════════════════════════════════════
function ChatPanel({ task, team, members, comments, onChange }) {
  const { profile }    = useAuth();
  const { t, lang }    = usePrefs();
  const [text, setText]               = useState('');
  const [busy, setBusy]               = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(0);
  const inputRef  = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [comments]);

  const handleChange = (e) => {
    const v = e.target.value; setText(v);
    const before = v.slice(0, e.target.selectionStart);
    const m = before.match(/@(\w*)$/);
    if (m) { setMentionStart(e.target.selectionStart - m[0].length); setMentionQuery(m[1]); setMentionOpen(true); }
    else setMentionOpen(false);
  };

  const insertMention = (member) => {
    const before = text.slice(0, mentionStart);
    const after  = text.slice(mentionStart + 1 + mentionQuery.length);
    setText(before + '@' + member.username + ' ' + after);
    setMentionOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const filteredMembers = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    return members.filter(m => m.username.includes(q) || m.full_name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, members]);

  const submit = async (e) => {
    e.preventDefault(); if (!text.trim()) return; setBusy(true);
    try {
      await supabase.from('task_comments').insert({
        task_id: task.id, team_id: team.id, user_id: profile.id,
        content: text, mentioned_user_ids: parseMentions(text, members),
      });
      setText(''); await onChange();
    } finally { setBusy(false); }
  };

  return h('div', { className: 'flex flex-col', style: { height: '380px' } },
    h('div', { ref: scrollRef, className: 'flex-1 overflow-y-auto scrollbar-thin space-y-3 pr-1 mb-3' },
      comments.length === 0 && h('div', { className: 'text-center text-sm text-ctext3 py-8' }, t('noComments')),
      comments.map(c => {
        const mine = c.user_id === profile.id;
        return h('div', { key: c.id, className: cn('flex gap-2.5', mine && 'flex-row-reverse') },
          h(Avatar, { user: c.profiles, size: 'sm' }),
          h('div', { className: cn('flex-1 min-w-0 max-w-[80%]', mine && 'text-right') },
            h('div', { className: cn('flex items-baseline gap-2 mb-0.5', mine && 'justify-end') },
              h('span', { className: 'text-xs font-semibold text-ctext' }, c.profiles?.full_name),
              h('span', { className: 'text-[10px] text-ctext3' }, formatDateTime(c.created_at))),
            h('div', { className: cn('inline-block text-sm rounded-xl px-3 py-2 whitespace-pre-wrap text-left',
              mine ? 'bg-accent/15 text-ctext rounded-tr-sm' : 'bg-elev text-ctext2 rounded-tl-sm',
            ) }, renderWithMentions(c.content, members)),
          ),
        );
      }),
    ),
    h('form', { onSubmit: submit, className: 'relative flex-shrink-0' },
      mentionOpen && filteredMembers.length > 0 && h('div', { className: 'absolute bottom-full mb-1 left-0 right-0 bg-surface border border-edge rounded-xl shadow-xl z-10 overflow-hidden' },
        filteredMembers.map(m => h('button', { key: m.id, type: 'button', onClick: () => insertMention(m),
          className: 'w-full text-left px-3 py-2 hover:bg-elev flex items-center gap-2 text-sm' },
          h(Avatar, { user: m, size: 'xs' }),
          h('span', { className: 'font-medium' }, m.full_name),
          h('span', { className: 'text-ctext3 text-xs' }, '@', m.username),
        )),
      ),
      h('div', { className: 'flex gap-2' },
        h('div', { className: 'flex-1 relative' },
          h(AtSign, { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ctext3 pointer-events-none' }),
          h('input', {
            ref: inputRef, value: text, onChange: handleChange,
            placeholder: t('addComment'),
            className: 'w-full bg-surface border border-edge rounded-xl pl-8 pr-3 py-2 text-sm text-ctext placeholder:text-ctext3 focus:outline-none focus:border-accent',
          }),
        ),
        h(Button, { type: 'submit', disabled: busy || !text.trim() }, h(Send, { className: 'w-3.5 h-3.5' })),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// CHECKLIST PANEL
// ═══════════════════════════════════════════════════════════
function ChecklistPanel({ task, team, items, onChange }) {
  const { profile } = useAuth();
  const { t }       = usePrefs();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault(); if (!text.trim()) return; setBusy(true);
    try {
      await supabase.from('task_checklist_items').insert({ task_id: task.id, team_id: team.id, content: text, created_by: profile.id, position: items.length });
      setText(''); onChange();
    } finally { setBusy(false); }
  };
  const toggle = async (item) => { await supabase.from('task_checklist_items').update({ is_done: !item.is_done }).eq('id', item.id); onChange(); };
  const remove = async (id)   => { await supabase.from('task_checklist_items').delete().eq('id', id); onChange(); };

  const done = items.filter(i => i.is_done).length;
  const pct  = items.length === 0 ? 0 : Math.round(done / items.length * 100);

  return h('div', { className: 'space-y-3' },
    items.length > 0 && h('div', null,
      h('div', { className: 'flex items-center justify-between text-xs text-ctext2 mb-1.5' },
        h('span', null, done, '/', items.length, ' completed'),
        h('span', { className: 'font-mono font-bold' }, pct, '%'),
      ),
      h('div', { className: 'progress-bar' }, h('div', { className: 'progress-bar-fill', style: { width: pct + '%' } })),
    ),
    h('div', { className: 'space-y-1' },
      items.map(item => h('div', { key: item.id, className: 'flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-elev group' },
        h('button', { onClick: () => toggle(item), className: cn('ntx-check', item.is_done && 'checked') },
          item.is_done && h(Check, { className: 'w-2.5 h-2.5 text-white' })),
        h('span', { className: cn('flex-1 text-sm', item.is_done ? 'text-ctext3 line-through' : 'text-ctext') }, item.content),
        h('button', { onClick: () => remove(item.id), className: 'opacity-0 group-hover:opacity-100 text-ctext3 hover:text-red-500' },
          h(X, { className: 'w-3.5 h-3.5' })),
      )),
    ),
    h('form', { onSubmit: add, className: 'flex gap-2' },
      h(Input, { value: text, onChange: e => setText(e.target.value), placeholder: t('addChecklistItem') }),
      h(Button, { type: 'submit', size: 'sm', disabled: busy || !text.trim() }, h(Plus, { className: 'w-3.5 h-3.5' })),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// APPROVALS TAB
// ═══════════════════════════════════════════════════════════
function ApprovalsTab({ approvals, isLeader, onChange }) {
  const { profile } = useAuth();
  const { t }       = usePrefs();
  const pending  = approvals.filter(a => a.status === 'pending');
  const reviewed = approvals.filter(a => a.status !== 'pending').slice(0, 20);
  const [busy, setBusy]           = useState(null);
  const [rejectMsg, setRejectMsg] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  const review = async (id, status, message) => {
    setBusy(id);
    try {
      await supabase.from('task_approval_requests').update({ status, reviewed_by: profile.id, review_message: message || null, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (status === 'approved') {
        const req = approvals.find(a => a.id === id);
        if (req) await supabase.from('tasks').update({ status: req.to_status }).eq('id', req.task_id);
      }
      await onChange(); setRejectingId(null); setRejectMsg('');
    } finally { setBusy(null); }
  };

  if (pending.length === 0 && reviewed.length === 0) return h('div', { className: 'p-16 text-center' },
    h('div', { className: 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-elev mb-4' }, h(Inbox, { className: 'w-7 h-7 text-ctext3' })),
    h('h3', { className: 'text-lg font-display font-semibold mb-1' }, t('noApprovals')),
    h('p', { className: 'text-sm text-ctext2' }, t('noApprovalsDesc')));

  return h('div', { className: 'p-6 max-w-3xl space-y-8' },
    pending.length > 0 && h('div', null,
      h('h3', { className: 'text-sm font-bold mb-3 flex items-center gap-2' },
        h(Hourglass, { className: 'w-4 h-4 text-amber-500' }), t('pending'), ' (', pending.length, ')'),
      h('div', { className: 'space-y-3' },
        pending.map(req => h('div', { key: req.id, className: 'bg-surface border border-edge rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-3 mb-3' },
            h(Avatar, { user: req.profiles, size: 'sm' }),
            h('div', { className: 'flex-1' },
              h('div', { className: 'text-sm' }, h('span', { className: 'font-semibold' }, req.profiles?.full_name), h('span', { className: 'text-ctext2' }, ' ', t('wantsToMove'))),
              h('div', { className: 'text-sm font-semibold mt-0.5' }, '"', req.tasks?.title, '"'),
              h('div', { className: 'flex items-center gap-2 mt-2 text-xs' },
                h(Badge, null, t(STATUSES.find(s => s.id === req.from_status)?.tk)),
                h(ArrowRight, { className: 'w-3 h-3 text-ctext3' }),
                h(Badge, { variant: 'ember' }, t(STATUSES.find(s => s.id === req.to_status)?.tk))),
              req.message && h('div', { className: 'mt-2 text-sm text-ctext2 bg-sunken border border-edge rounded-lg px-3 py-2' }, req.message),
            ),
          ),
          isLeader && rejectingId !== req.id && h('div', { className: 'flex gap-2 justify-end' },
            h(Button, { size: 'sm', variant: 'danger', onClick: () => setRejectingId(req.id), disabled: busy === req.id }, h(X, { className: 'w-3.5 h-3.5' }), t('reject')),
            h(Button, { size: 'sm', onClick: () => review(req.id, 'approved'), disabled: busy === req.id },
              busy === req.id && h(Spinner, { className: 'w-3 h-3' }), h(Check, { className: 'w-3.5 h-3.5' }), t('confirm')),
          ),
          isLeader && rejectingId === req.id && h('div', { className: 'space-y-2 pt-2 border-t border-edge' },
            h(Textarea, { value: rejectMsg, onChange: e => setRejectMsg(e.target.value), rows: 2, placeholder: t('whyReject') }),
            h('div', { className: 'flex gap-2 justify-end' },
              h(Button, { size: 'sm', variant: 'ghost', onClick: () => { setRejectingId(null); setRejectMsg(''); } }, t('cancel')),
              h(Button, { size: 'sm', variant: 'danger', onClick: () => review(req.id, 'rejected', rejectMsg) }, t('reject')),
            ),
          ),
          !isLeader && h('div', { className: 'text-xs text-ctext3 italic' }, t('awaitingLeader')),
        )),
      ),
    ),
    reviewed.length > 0 && h('div', null,
      h('h3', { className: 'text-sm font-bold mb-3 text-ctext2' }, t('history')),
      h('div', { className: 'space-y-2' },
        reviewed.map(req => h('div', { key: req.id, className: 'bg-surface border border-edge rounded-lg p-3 flex items-center justify-between gap-3' },
          h('div', { className: 'flex items-center gap-2 text-sm flex-1 min-w-0' },
            h(Avatar, { user: req.profiles, size: 'xs' }),
            h('span', { className: 'text-ctext2 truncate' }, req.profiles?.full_name, ' · ', req.tasks?.title)),
          h(Badge, { variant: req.status }, req.status === 'approved' ? t('approved') : t('rejected')),
        )),
      ),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// MEMBERS TAB
// ═══════════════════════════════════════════════════════════
function MembersTab({ members, team, isLeader, onChange }) {
  const { profile } = useAuth();
  const { t }       = usePrefs();
  const [busy, setBusy] = useState(null);

  const changeRole   = async (id, role) => { setBusy(id); try { await supabase.from('team_members').update({ role }).eq('team_id', team.id).eq('user_id', id); await onChange(); } finally { setBusy(null); } };
  const removeMember = async (id) => { if (!confirm(t('confirmRemoveMember'))) return; setBusy(id); try { await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', id); await onChange(); } finally { setBusy(null); } };

  const sorted = [...members].sort((a,b) => {
    if (a.role === 'leader' && b.role !== 'leader') return -1;
    if (a.role !== 'leader' && b.role === 'leader') return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return h('div', { className: 'p-6 max-w-3xl' },
    h('div', { className: 'flex items-center justify-between mb-5' },
      h('h3', { className: 'font-bold' }, t('members'), ' (', members.length, ')'),
      h('div', { className: 'flex items-center gap-2 text-xs text-ctext2' },
        t('inviteCode'), ':',
        h('code', { className: 'font-mono text-accent bg-surface border border-edge px-2 py-0.5 rounded-md' }, team.team_code),
        h('button', { onClick: () => navigator.clipboard.writeText(team.team_code), className: 'text-ctext3 hover:text-accent' }, h(Copy, { className: 'w-3.5 h-3.5' })),
      ),
    ),
    h('div', { className: 'bg-surface border border-edge rounded-xl overflow-hidden' },
      sorted.map((m, i) => h('div', { key: m.id, className: cn('flex items-center gap-3 px-4 py-3', i !== sorted.length - 1 && 'border-b border-edge') },
        h(Avatar, { user: m, size: 'md' }),
        h('div', { className: 'flex-1 min-w-0' },
          h('div', { className: 'font-semibold text-sm flex items-center gap-2' },
            m.full_name,
            m.id === profile.id && h('span', { className: 'text-xs text-ctext3' }, '(', t('you'), ')'),
          ),
          h('div', { className: 'text-xs text-ctext3' }, '@', m.username),
        ),
        h(Badge, { variant: m.role }, m.role === 'leader' ? h(Crown, { className: 'w-2.5 h-2.5' }) : h(UserIcon, { className: 'w-2.5 h-2.5' }),
          m.role === 'leader' ? t('leader') : t('worker')),
        isLeader && m.id !== profile.id && h('div', { className: 'flex items-center gap-1 ml-2' },
          h('button', { onClick: () => changeRole(m.id, m.role === 'leader' ? 'worker' : 'leader'), disabled: busy === m.id, className: 'text-xs text-ctext2 hover:text-accent px-2 py-1 rounded-lg hover:bg-elev' },
            m.role === 'leader' ? t('makeWorker') : t('makeLeader')),
          h('button', { onClick: () => removeMember(m.id), disabled: busy === m.id, className: 'text-ctext2 hover:text-red-500 p-1.5 rounded-lg hover:bg-elev' },
            h(Trash2, { className: 'w-3.5 h-3.5' })),
        ),
      )),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════
function SettingsTab({ team, onChange }) {
  const { t }                         = usePrefs();
  const [name, setName]               = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [busy, setBusy]               = useState(false);
  const [msg, setMsg]                 = useState('');

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    try { await supabase.from('teams').update({ name, description }).eq('id', team.id); setMsg(t('save') + ' ✓'); onChange(); }
    finally { setBusy(false); setTimeout(() => setMsg(''), 2000); }
  };
  const deleteTeam = async () => {
    if (!confirm(t('deleteTeamConfirm'))) return;
    await supabase.from('teams').delete().eq('id', team.id);
    window.location.reload();
  };

  return h('div', { className: 'p-6 max-w-lg space-y-4' },
    h('form', { onSubmit: save, className: 'bg-surface border border-edge rounded-xl p-5 space-y-4' },
      h('h3', { className: 'font-bold mb-1' }, t('teamSettings')),
      h('div', null, h(Label, null, t('teamName')),        h(Input,    { value: name,        onChange: e => setName(e.target.value),        required: true })),
      h('div', null, h(Label, null, t('description')), h(Textarea, { value: description, onChange: e => setDescription(e.target.value), rows: 3 })),
      h('div', { className: 'flex items-center justify-between' },
        msg && h('span', { className: 'text-xs text-emerald-500 font-semibold' }, msg),
        h(Button, { type: 'submit', disabled: busy, className: 'ml-auto' }, busy && h(Spinner, { className: 'w-3.5 h-3.5' }), t('save')),
      ),
    ),
    h('div', { className: 'bg-red-500/5 border border-red-500/20 rounded-xl p-5' },
      h('h3', { className: 'font-bold text-red-500 mb-1' }, t('dangerZone')),
      h('p', { className: 'text-xs text-ctext2 mb-3' }, t('deleteTeamDesc')),
      h(Button, { variant: 'danger', size: 'sm', onClick: deleteTeam }, h(Trash2, { className: 'w-3.5 h-3.5' }), t('deleteTeam')),
    ),
  );
}

// ═══════════════════════════════════════════════════════════
// REPORTS TAB
// ═══════════════════════════════════════════════════════════
function KpiCard({ label, value, icon: Icon, color }) {
  return h('div', { className: 'bg-surface border border-edge rounded-xl p-4' },
    h('div', { className: 'flex items-center justify-between mb-2' },
      h('span', { className: 'text-[10px] uppercase tracking-widest text-ctext3 font-bold' }, label),
      h(Icon, { className: cn('w-4 h-4', color) }),
    ),
    h('div', { className: 'text-3xl font-display font-bold' }, value),
  );
}

function ReportsTab({ tasks, members }) {
  const { t, lang } = usePrefs();

  const stats = useMemo(() => ({
    total:     tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    active:    tasks.filter(t => t.status === 'in_progress' || t.status === 'in_review').length,
    overdue:   tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()).length,
  }), [tasks]);

  const byStatus   = useMemo(() => STATUSES.map(s  => ({ ...s,  count: tasks.filter(t => t.status === s.id).length })), [tasks]);
  const byPriority = useMemo(() => PRIORITIES.map(p => ({ ...p, count: tasks.filter(t => t.priority === p.id).length })), [tasks]);

  const byAssignee = useMemo(() => {
    const m = new Map();
    members.forEach(mb => m.set(mb.id, { user: mb, count: 0, done: 0 }));
    tasks.forEach(t => { if (t.assignee_id && m.has(t.assignee_id)) { const s = m.get(t.assignee_id); s.count++; if (t.status === 'done') s.done++; } });
    return [...m.values()].filter(x => x.count > 0).sort((a,b) => b.count - a.count);
  }, [tasks, members]);

  const trend = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const n = new Date(d); n.setDate(n.getDate() + 1);
      days.push({ date: d, count: tasks.filter(t => t.completed_at && new Date(t.completed_at) >= d && new Date(t.completed_at) < n).length });
    }
    return days;
  }, [tasks]);

  const maxTrend = Math.max(1, ...trend.map(d => d.count));
  const maxStatus = Math.max(1, ...byStatus.map(s => s.count));
  const maxPriority = Math.max(1, ...byPriority.map(p => p.count));

  if (tasks.length === 0) return h('div', { className: 'p-16 text-center' },
    h('div', { className: 'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-elev mb-4' }, h(BarChart3, { className: 'w-7 h-7 text-ctext3' })),
    h('h3', { className: 'text-lg font-display font-semibold mb-1' }, t('noData')),
    h('p', { className: 'text-sm text-ctext2' }, t('noTasksDesc')));

  const pColors = { urgent: 'bg-accent', high: 'bg-amber-500', medium: 'bg-ctext2', low: 'bg-ctext3' };

  return h('div', { className: 'p-6 space-y-5 max-w-5xl' },
    // KPI
    h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
      h(KpiCard, { label: t('totalTasks'),     value: stats.total,     icon: CheckSquare, color: 'text-ctext' }),
      h(KpiCard, { label: t('completedTasks'), value: stats.completed, icon: Check,       color: 'text-emerald-500' }),
      h(KpiCard, { label: t('activeTasks'),    value: stats.active,    icon: Hourglass,   color: 'text-sky-500' }),
      h(KpiCard, { label: t('overdueTasks'),   value: stats.overdue,   icon: AlertCircle, color: 'text-red-500' }),
    ),
    h('div', { className: 'grid lg:grid-cols-2 gap-4' },
      // Status
      h('div', { className: 'bg-surface border border-edge rounded-xl p-5' },
        h('h3', { className: 'text-sm font-bold mb-4' }, t('tasksByStatus')),
        h('div', { className: 'space-y-3' },
          byStatus.map(s => h('div', { key: s.id },
            h('div', { className: 'flex items-center justify-between text-xs mb-1' },
              h('div', { className: 'flex items-center gap-2 text-ctext2' }, h('div', { className: cn('w-2 h-2 rounded-full', `bg-${s.color}`) }), t(s.tk)),
              h('span', { className: 'font-mono font-bold text-ctext' }, s.count),
            ),
            h('div', { className: 'progress-bar' }, h('div', { className: cn('progress-bar-fill', `bg-${s.color}`), style: { width: (s.count / maxStatus * 100) + '%' } })),
          )),
        ),
      ),
      // Priority
      h('div', { className: 'bg-surface border border-edge rounded-xl p-5' },
        h('h3', { className: 'text-sm font-bold mb-4' }, t('tasksByPriority')),
        h('div', { className: 'space-y-3' },
          byPriority.map(p => h('div', { key: p.id },
            h('div', { className: 'flex items-center justify-between text-xs mb-1' },
              h('div', { className: 'flex items-center gap-2 text-ctext2' }, h(Flag, { className: 'w-3 h-3' }), t(p.tk)),
              h('span', { className: 'font-mono font-bold text-ctext' }, p.count),
            ),
            h('div', { className: 'progress-bar' }, h('div', { className: cn('progress-bar-fill', pColors[p.id]), style: { width: (p.count / maxPriority * 100) + '%' } })),
          )),
        ),
      ),
      // Assignee
      h('div', { className: 'bg-surface border border-edge rounded-xl p-5' },
        h('h3', { className: 'text-sm font-bold mb-4' }, t('tasksByAssignee')),
        byAssignee.length === 0
          ? h('p', { className: 'text-sm text-ctext3' }, t('noData'))
          : h('div', { className: 'space-y-3' },
              byAssignee.map(a => h('div', { key: a.user.id, className: 'flex items-center gap-3' },
                h(Avatar, { user: a.user, size: 'sm' }),
                h('div', { className: 'flex-1 min-w-0' },
                  h('div', { className: 'flex items-center justify-between text-xs mb-1' },
                    h('span', { className: 'truncate text-ctext font-medium' }, a.user.full_name),
                    h('span', { className: 'font-mono text-ctext2' }, a.done, '/', a.count),
                  ),
                  h('div', { className: 'progress-bar' }, h('div', { className: 'progress-bar-fill', style: { width: (a.done / a.count * 100) + '%' } })),
                ),
              )),
            ),
      ),
      // Trend
      h('div', { className: 'bg-surface border border-edge rounded-xl p-5' },
        h('h3', { className: 'text-sm font-bold mb-4' }, t('completionTrend')),
        h('svg', { viewBox: '0 0 600 200', className: 'w-full h-36' },
          [0, 0.25, 0.5, 0.75, 1].map(p =>
            h('line', { key: p, x1: 0, x2: 600, y1: 180 * p + 10, y2: 180 * p + 10, stroke: 'rgb(var(--c-edge-subtle))', strokeWidth: 1 })),
          trend.map((d, i) => {
            const bw = 600 / trend.length - 2;
            const bh = (d.count / maxTrend) * 170;
            return h('rect', { key: i, x: i * (600 / trend.length) + 1, y: 190 - bh, width: bw, height: bh, fill: 'rgb(var(--c-accent))', opacity: d.count > 0 ? 0.85 : 0, rx: 2 });
          }),
          trend.map((d, i) => i % 5 === 0 && h('text', { key: 'lbl' + i,
            x: i * (600 / trend.length) + (600 / trend.length / 2), y: 200,
            fontSize: 9, fill: 'rgb(var(--c-text-3))', textAnchor: 'middle',
          }, d.date.getDate() + '/' + (d.date.getMonth() + 1))),
        ),
      ),
    ),
  );
}
