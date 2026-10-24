/**
 * Web Worker en Segundo Plano: Daemon Sísmico 24/7
 * SeismoGlobal 195 Pro: 24/7 Early Warning & GIS System
 * Consulta el feed en tiempo real de USGS cada 30 segundos
 * y vigila Casa, Colegio, Trabajo y Finca sin bloquear el hilo principal.
 */

let pollingInterval = null;
let pollFrequencyMs = 30000; // 30 segundos
let isRunning = false;
let seenEventIds = new Set();
let lastSyncTimestamp = null;
let monitoredFavorites = [];
let queryEndpoint = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchUSGSFeed() {
  try {
    const response = await fetch(queryEndpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    const data = await response.json();
    lastSyncTimestamp = Date.now();

    if (!data || !Array.isArray(data.features)) {
      return;
    }

    const newAlerts = [];

    data.features.forEach((feature) => {
      const id = feature.id;
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [0, 0, 0];
      const lng = coords[0];
      const lat = coords[1];
      const depth = coords[2] || 10;
      const mag = props.mag || 0;

      if (!seenEventIds.has(id)) {
        seenEventIds.add(id);

        // Calcular distancias y ETAs hacia Casa, Colegio, Trabajo y Finca
        const distances = monitoredFavorites
          .filter((fav) => fav.isSet)
          .map((fav) => {
            const distKm = Math.round(calculateDistanceKm(lat, lng, fav.lat, fav.lng));
            const etaP = Math.max(1, Math.round(distKm / 6.0));
            const etaS = Math.max(1, Math.round(distKm / 3.5));
            return {
              id: fav.id,
              name: fav.name,
              emoji: fav.emoji,
              distKm,
              etaPSeconds: etaP,
              etaSSeconds: etaS,
            };
          });

        // Determinar si representa una alerta crítica para alguna ubicación (distancia <= 350 km y M >= 3.5 o M >= 5.5 global)
        const isNearFavorite = distances.some((d) => d.distKm <= 350 && mag >= 3.5);
        const isMajorGlobal = mag >= 5.8;

        if (isNearFavorite || isMajorGlobal) {
          newAlerts.push({
            id,
            mag,
            place: props.place || 'Ubicación desconocida',
            time: props.time || Date.now(),
            lat,
            lng,
            depth,
            distances,
            isNearFavorite,
            isMajorGlobal,
          });
        }
      }
    });

    // Reportar estado y alertas al hilo principal
    self.postMessage({
      type: 'DAEMON_HEARTBEAT',
      payload: {
        isRunning: true,
        lastSync: lastSyncTimestamp,
        totalSeen: seenEventIds.size,
        newAlertsCount: newAlerts.length,
      },
    });

    if (newAlerts.length > 0) {
      self.postMessage({
        type: 'SEISMIC_ALERTS_DETECTED',
        payload: {
          alerts: newAlerts,
          timestamp: Date.now(),
        },
      });
    }
  } catch (err) {
    self.postMessage({
      type: 'DAEMON_ERROR',
      payload: {
        message: err instanceof Error ? err.message : String(err),
        timestamp: Date.now(),
      },
    });
  }
}

function startDaemon() {
  if (isRunning) return;
  isRunning = true;
  fetchUSGSFeed();
  pollingInterval = setInterval(fetchUSGSFeed, pollFrequencyMs);
}

function stopDaemon() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isRunning = false;
  self.postMessage({
    type: 'DAEMON_HEARTBEAT',
    payload: {
      isRunning: false,
      lastSync: lastSyncTimestamp,
      totalSeen: seenEventIds.size,
    },
  });
}

// Escuchar instrucciones desde el hilo principal
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'START':
      if (payload?.favorites) {
        monitoredFavorites = payload.favorites;
      }
      if (payload?.endpoint) {
        queryEndpoint = payload.endpoint;
      }
      startDaemon();
      break;

    case 'STOP':
      stopDaemon();
      break;

    case 'UPDATE_FAVORITES':
      if (payload?.favorites) {
        monitoredFavorites = payload.favorites;
      }
      break;

    case 'SYNC_NOW':
      fetchUSGSFeed();
      break;

    case 'PING':
      self.postMessage({
        type: 'PONG',
        payload: {
          isRunning,
          lastSync: lastSyncTimestamp,
          seenCount: seenEventIds.size,
        },
      });
      break;

    default:
      break;
  }
});
