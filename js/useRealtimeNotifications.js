// hooks/useRealtimeNotifications.js
// Qoy bu faylı: src/hooks/useRealtimeNotifications.js

'use client'; // Next.js App Router üçün

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useRealtimeNotifications() {
  useEffect(() => {
    // ── Bildiriş icazəsi al ──────────────────────────────
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // ── tasks cədvəlini dinlə ────────────────────────────
    const taskChannel = supabase
      .channel('realtime:public:tasks')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          const task = payload.new;
          console.log('Yeni task:', task);

          if (Notification.permission === 'granted') {
            new Notification('Yeni Tapşırıq', {
              body: task.title ?? task.name ?? 'Yeni tapşırıq əlavə edildi',
              icon: '/favicon.ico',
              tag: `task-${task.id}`,
            });
          }
        }
      )
      .subscribe();

    // ── task_approval_requests cədvəlini dinlə ───────────
    const approvalChannel = supabase
      .channel('realtime:public:approvals')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_approval_requests' },
        (payload) => {
          const approval = payload.new;
          console.log('Yeni təsdiq:', approval);

          if (Notification.permission === 'granted') {
            new Notification('Yeni Təsdiq Tələbi', {
              body: approval.title ?? approval.description ?? 'Yeni təsdiq tələbi gəldi',
              icon: '/favicon.ico',
              tag: `approval-${approval.id}`,
            });
          }
        }
      )
      .subscribe();

    // ── Komponent unmount olduqda kanalları bağla ────────
    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(approvalChannel);
    };
  }, []);
}
