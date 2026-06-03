// js/realtimeNotifications.js

import { supabase } from './config.js';

let swRegistration = null;

// ── Service Worker qeydiyyatı ─────────────────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('SW qeydiyyat oldu:', reg.scope);
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.error('SW xəta:', err);
    return null;
  }
}

// ── Bildiriş icazəsi al ───────────────────────────────────────────────────
async function askPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── SW-ə mesaj göndər (tab bağlı olsa belə işləyir) ──────────────────────
function notifySW(type, data) {
  if (!swRegistration?.active) return;
  swRegistration.active.postMessage({ type, ...data });
}

// ── Realtime abunəlik ─────────────────────────────────────────────────────
function subscribeRealtime() {
  // tasks
  supabase
    .channel('sw:tasks')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks' },
      (payload) => {
        console.log('Yeni task:', payload.new);
        notifySW('NEW_TASK', {
          id: payload.new.id,
          title: payload.new.title ?? payload.new.name ?? 'Yeni tapşırıq',
        });
      }
    )
    .subscribe((status) => console.log('tasks realtime:', status));

  // task_approval_requests
  supabase
    .channel('sw:approvals')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'task_approval_requests' },
      (payload) => {
        console.log('Yeni təsdiq:', payload.new);
        notifySW('NEW_APPROVAL', {
          id: payload.new.id,
          title: payload.new.title ?? payload.new.description ?? 'Yeni təsdiq tələbi',
        });
      }
    )
    .subscribe((status) => console.log('approvals realtime:', status));
}

// ── Əsas funksiya — main.js-dən çağır ────────────────────────────────────
export async function initRealtimeNotifications() {
  await registerSW();
  await askPermission();
  subscribeRealtime();
}
