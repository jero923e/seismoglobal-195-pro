/**
 * Service Worker Oficial de SeismoGlobal 195 Pro
 * Sistema Sismológico 24/7 & Protección Civil
 * Incluye Notificación Persistente de Acceso Rápido, Caché Offline y Web Push
 */

const CACHE_NAME = 'seismoglobal-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/seismic-icon.svg',
  '/favicon.svg',
];

const PERSISTENT_NOTIFICATION_TAG = 'seismoglobal-persistent-247';

// -------------------------------------------------------------
// CICLO DE VIDA: INSTALACIÓN Y ACTIVACIÓN
// -------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// -------------------------------------------------------------
// CACHÉ Y ESTRATEGIA NETWORK FIRST CON FALLBACK OFFLINE
// -------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que sean de APIs dinámicas (USGS, Photon, Map tiles)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (
    url.hostname.includes('earthquake.usgs.gov') ||
    url.hostname.includes('photon.komoot.io') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('cartocdn.com')
  ) {
    return; // Dejar pasar a red directamente
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        });
    })
  );
});

// -------------------------------------------------------------
// NOTIFICACIÓN PERSISTENTE DE ACCESO RÁPIDO EN BARRA DE ESTADO
// -------------------------------------------------------------
async function showPersistentMonitorNotification(customBody) {
  const title = '🟢 SeismoGlobal 24/7 Activo | Vigilando Casa, Colegio, Trabajo y Finca';
  const options = {
    body: customBody || 'Sistema sismológico centinela activo en segundo plano. Toca para ver el mapa o activar SOS.',
    icon: '/seismic-icon.svg',
    badge: '/seismic-icon.svg',
    tag: PERSISTENT_NOTIFICATION_TAG,
    renotify: false,
    silent: true,
    requireInteraction: true, // Persistente en pantalla
    data: { url: '/#monitor' },
    actions: [
      { action: 'open_sos', title: '🚨 Alarma SOS' },
      { action: 'open_map', title: '🗺️ Ver Epicentro' },
    ],
  };

  return self.registration.showNotification(title, options);
}

// -------------------------------------------------------------
// ALERTA TEMPRANA SÍSMICA CRÍTICA
// -------------------------------------------------------------
async function showEarlyWarningNotification(alertData) {
  const mag = alertData.mag ? alertData.mag.toFixed(1) : 'Sismo';
  const place = alertData.place || 'Zona cercana';
  const title = `🚨 ALERTA SÍSMICA TEMPRANA: M ${mag} - ${place}`;
  
  const options = {
    body: `¡Atención! Posible llegada de ondas sísmicas a tus ubicaciones. Inicia protocolo de protección civil.`,
    icon: '/seismic-icon.svg',
    badge: '/seismic-icon.svg',
    tag: 'seismic-critical-alert',
    renotify: true,
    vibrate: [500, 200, 500, 200, 500],
    requireInteraction: true,
    data: { url: '/#emergency' },
    actions: [
      { action: 'open_sos', title: '🚨 ABRIR SOS' },
      { action: 'open_map', title: '🗺️ VER MAPA' },
    ],
  };

  return self.registration.showNotification(title, options);
}

// -------------------------------------------------------------
// GESTIÓN DE ACCIONES AL TOCAR LA NOTIFICACIÓN (NOTIFICATIONCLICK)
// -------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  let targetUrl = '/';

  if (action === 'open_sos') {
    targetUrl = '/#emergency';
  } else if (action === 'open_map') {
    targetUrl = '/#monitor';
  } else if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta en alguna pestaña, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION_TRIGGERED',
            action: action || 'focus',
            targetUrl,
          });
          return client.focus();
        }
      }
      // Si está cerrada, abrirla
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// -------------------------------------------------------------
// MENSAJERÍA ENTRE CLIENTE (MAIN THREAD) Y SERVICE WORKER
// -------------------------------------------------------------
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SHOW_PERSISTENT_MONITOR':
      showPersistentMonitorNotification(payload?.body);
      break;

    case 'DISMISS_PERSISTENT_MONITOR':
      self.registration.getNotifications({ tag: PERSISTENT_NOTIFICATION_TAG }).then((notifications) => {
        notifications.forEach((n) => n.close());
      });
      break;

    case 'DISPATCH_SEISMIC_ALERT':
      if (payload) {
        showEarlyWarningNotification(payload);
      }
      break;

    default:
      break;
  }
});
