// Service Worker para PWA e Notificações Web Push do PRATIC System

const CACHE_VERSION = 'v2';
const CACHE_NAME = `pratic-shell-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Só assets estáticos verdadeiramente imutáveis por deploy — nada de HTML de
// rota nem chunk JS/CSS do Next (já são hasheados e cacheados via headers
// do próprio Next/Vercel; duplicar aqui só complica invalidação).
const APP_SHELL = [
  '/manifest.json',
  OFFLINE_URL,
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('pratic-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function timeoutAfter(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

// Navegação (abrir uma rota): sempre tenta rede primeiro (é um CRM, dado
// desatualizado é pior que uma espera curta); se a rede não responder em
// 4s ou falhar, cai para a página offline cacheada.
async function networkFirstNavigate(request) {
  try {
    const response = await Promise.race([fetch(request), timeoutAfter(4000)]);
    if (response) return response;
  } catch {
    // segue para o fallback abaixo
  }
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(OFFLINE_URL)) || Response.error();
}

// Assets do Next com hash no nome: imutáveis, seguro cachear agressivamente.
async function cacheFirst(request) {
  const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
  if (isDev) return fetch(request);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// Ícones/imagens/sons estáticos: serve do cache na hora, atualiza em segundo plano.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Fora da própria origem (ex.: Supabase, APIs externas): deixa passar sem
  // interceptar — não faz sentido cachear ou aplicar timeout nessas chamadas.
  if (url.origin !== self.location.origin) return;

  // Rotas da própria API: network-only, nunca cache. Dado desatualizado
  // num CRM interno é pior que um erro de rede explícito.
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(req));
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  if (/\.(png|jpe?g|svg|webp|ico|mp3|wav|m4a)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }
});

// Escuta eventos de Push vindos do backend (mesmo com o navegador/app fechado)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Agência Prátic';
    const options = {
      body: payload.body || payload.message || 'Você recebeu uma nova notificação.',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
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
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: '/admin/dashboard' }
      })
    );
  }
});

// Ao clicar na notificação do sistema (no corpo, ou na action "Abrir" —
// hoje só existe essa action, mas o branch fica pronto para uma segunda
// action futura que não deva abrir/focar janela, ex. "Marcar como lida").
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action && event.action !== 'open') return;

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
