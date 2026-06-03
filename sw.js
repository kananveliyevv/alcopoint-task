self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
 
self.addEventListener('message', (e) => {
  if (e.data?.type === 'NEW_TASK') {
    self.registration.showNotification('Yeni Tapşırıq', {
      body: e.data.title || 'Yeni tapşırıq əlavə edildi',
      icon: '/logo.png',
      tag: `task-${e.data.id}`,
    });
  }
  if (e.data?.type === 'NEW_APPROVAL') {
    self.registration.showNotification('Yeni Təsdiq Tələbi', {
      body: e.data.title || 'Yeni təsdiq tələbi gəldi',
      icon: '/logo.png',
      tag: `approval-${e.data.id}`,
    });
  }
});
 
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ('focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
