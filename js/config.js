// ─────────────────────────────────────────────────────────
// js/config.js — Supabase client + shared constants
// ─────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

// ⚠️  Replace with your own Supabase project values
export const SUPABASE_URL     =  'https://eferozgkqhhkdgekqlhh.supabase.co';
export const SUPABASE_ANON_KEY= 'sb_publishable_Hy769-TrtR1SZDaNNuSRRw_RMfl_NuD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const STATUSES = [
  { id: 'todo',        tk: 'statusTodo',       color: 'gray-400'    },
  { id: 'in_progress', tk: 'statusInProgress', color: 'sky-500'     },
  { id: 'in_review',   tk: 'statusInReview',   color: 'amber-500'   },
  { id: 'done',        tk: 'statusDone',       color: 'emerald-500' },
];

export const PRIORITIES = [
  { id: 'low',    tk: 'priorityLow'    },
  { id: 'medium', tk: 'priorityMedium' },
  { id: 'high',   tk: 'priorityHigh'   },
  { id: 'urgent', tk: 'priorityUrgent' },
];
