// Service Worker para PWA e Notificações Web Push do PRATIC System

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escuta eventos de Push vindos do backend (mesmo com o navegador/app fechado)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Agência Prátic';
    const options = {
      body: payload.body || payload.message || 'Você recebeu uma nova notificação.',
      icon: payload.icon || '/SIMBOLO-BRANCO.png',
      badge: payload.badge || '/SIMBOLO-BRANCO.png',
      tag: payload.tag || `pratic-${Date.now()}`,
      data: {
        url: payload.url || '/admin/dashboard',
        ...payload.data
      },
      vibrate: [60, 40, 60],
      requireInteraction: payload.type === 'mention' || payload.type === 'demand',
      actions: [
        { action: 'open', title: 'Abrir' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    // Fallback para texto plano se não for JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Agência Prátic', {
        body: text,
        icon: '/SIMBOLO-BRANCO.png',
        badge: '/SIMBOLO-BRANCO.png',
        data: { url: '/admin/dashboard' }
      })
    );
  }
});

// Ao clicar na notificação do sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Procura uma janela já aberta do sistema
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Se nenhuma estiver aberta, abre nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
