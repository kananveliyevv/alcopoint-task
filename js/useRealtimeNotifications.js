import { supabase } from './config.js';

export function initRealtimeNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  supabase
    .channel('realtime:public:tasks')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tasks' },
      (payload) => {
        const task = payload.new;
        if (Notification.permission === 'granted') {
          new Notification('Yeni Tapşırıq', {
            body: task.title ?? task.name ?? 'Yeni tapşırıq əlavə edildi',
            icon: '/logo.png',
            tag: `task-${task.id}`,
          });
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime status:', status);
    });
}
