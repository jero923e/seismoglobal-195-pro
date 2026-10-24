import { calculateHaversineDistance } from './geoUtils';

export type EventClassification = 'MAINSHOCK' | 'AFTERSHOCK' | 'FORESHOCK' | 'ISOLATED';

export interface RawSeismicFeature {
  id: string;
  properties: {
    mag: number;
    magType?: string;
    place: string;
    time: number;
    updated?: number;
    url: string;
    detail?: string;
    felt?: number | null;
    cdi?: number | null;
    mmi?: number | null;
    alert?: string | null;
    status?: string;
    tsunami?: number;
    sig?: number;
    net?: string;
    code?: string;
    ids?: string;
    sources?: string;
    types?: string;
    nst?: number | null;
    dmin?: number | null;
    rms?: number | null;
    gap?: number | null;
    title?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lon, lat, depth]
  };
}

export interface ClusteredEvent {
  id: string;
  mag: number;
  magType: string;
  place: string;
  time: number;
  timeFormatted: string;
  timeRelative: string;
  lat: number;
  lng: number;
  depthKm: number;
  distanceToCapitalKm: number;
  url: string;
  classification: EventClassification;
  mercalliRoman: string;
  mercalliDescription: string;
  parentMainshockId?: string;
  parentMainshockPlace?: string;
  aftershocks: ClusteredEvent[];
  aftershockCount: number;
  maxAftershockMag: number;
}

export interface CountrySeismicMetrics {
  totalEvents: number;
  mainshocksCount: number;
  aftershocksCount: number;
  maxMag: number;
  maxMagEvent: ClusteredEvent | null;
  avgDepthKm: number;
  shallowCount: number; // < 70 km
  intermediateCount: number; // 70 - 300 km
  deepCount: number; // > 300 km
  aftershockRatioPercent: number;
}

/**
 * Spatial-temporal clustering algorithm to separate Mainshocks, Aftershocks, and Foreshocks
 * Space window: up to 100 km (or scaling with magnitude)
 * Time window: up to 14 days following the mainshock
 */
export function classifySeismicEvents(
  features: RawSeismicFeature[],
  countryCapitalLat: number,
  countryCapitalLng: number,
  maxSpaceWindowKm = 100,
  maxTimeWindowDays = 14
): {
  allEvents: ClusteredEvent[];
  mainshocksWithAftershocks: ClusteredEvent[];
  metrics: CountrySeismicMetrics;
} {
  if (!features || features.length === 0) {
    return {
      allEvents: [],
      mainshocksWithAftershocks: [],
      metrics: {
        totalEvents: 0,
        mainshocksCount: 0,
        aftershocksCount: 0,
        maxMag: 0,
        maxMagEvent: null,
        avgDepthKm: 0,
        shallowCount: 0,
        intermediateCount: 0,
        deepCount: 0,
        aftershockRatioPercent: 0,
      },
    };
  }

  const maxTimeWindowMs = maxTimeWindowDays * 24 * 60 * 60 * 1000;

  // 1. Initial conversion and standardization
  const parsedList: ClusteredEvent[] = features.map((f) => {
    const [lon, lat, depth] = f.geometry.coordinates;
    const dist = calculateHaversineDistance(countryCapitalLat, countryCapitalLng, lat, lon);
    const m = f.properties.mag ?? 0;
    const mercalli = estimateMercalliIntensity(m, depth);

    return {
      id: f.id,
      mag: m,
      magType: (f.properties.magType || 'Mw').toUpperCase(),
      place: f.properties.place || 'Epicentro no especificado',
      time: f.properties.time,
      timeFormatted: new Date(f.properties.time).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      timeRelative: getRelativeTimeString(f.properties.time),
      lat,
      lng: lon,
      depthKm: Math.round(depth * 10) / 10,
      distanceToCapitalKm: Math.round(dist * 10) / 10,
      url: f.properties.url || 'https://earthquake.usgs.gov',
      classification: 'ISOLATED',
      mercalliRoman: mercalli.roman,
      mercalliDescription: mercalli.desc,
      aftershocks: [],
      aftershockCount: 0,
      maxAftershockMag: 0,
    };
  });

  // Sort chronologically ascending for clustering analysis
  parsedList.sort((a, b) => a.time - b.time);

  // 2. Space-Time Seismological Clustering
  // We iterate through events: for each event, we test if it belongs to an earlier larger event's cluster
  const mainshockMap = new Map<string, ClusteredEvent>();

  for (let i = 0; i < parsedList.length; i++) {
    const current = parsedList[i];
    let parentCandidate: ClusteredEvent | null = null;
    let minDistance = Infinity;

    // Search backwards for the most significant earlier event in space & time
    for (let j = i - 1; j >= 0; j--) {
      const prior = parsedList[j];
      const timeDiff = current.time - prior.time;

      if (timeDiff > maxTimeWindowMs) continue; // Outside time window

      const dist = calculateHaversineDistance(current.lat, current.lng, prior.lat, prior.lng);

      if (dist <= maxSpaceWindowKm) {
        // If prior event has a larger magnitude, current event is an aftershock!
        if (prior.mag > current.mag) {
          if (dist < minDistance) {
            minDistance = dist;
            parentCandidate = prior;
          }
        } else if (current.mag > prior.mag && (prior.classification === 'ISOLATED' || prior.classification === 'MAINSHOCK')) {
          // If current event is larger, prior event was actually a Foreshock (Precursor)!
          prior.classification = 'FORESHOCK';
        }
      }
    }

    if (parentCandidate) {
      // Find root mainshock if parentCandidate is chained
      let root = parentCandidate;
      while (root.parentMainshockId && mainshockMap.has(root.parentMainshockId)) {
        root = mainshockMap.get(root.parentMainshockId)!;
      }

      current.classification = 'AFTERSHOCK';
      current.parentMainshockId = root.id;
      current.parentMainshockPlace = root.place;

      root.classification = 'MAINSHOCK';
      root.aftershocks.push(current);
      root.aftershockCount = root.aftershocks.length;
      root.maxAftershockMag = Math.max(root.maxAftershockMag, current.mag);

      mainshockMap.set(root.id, root);
    } else {
      if (current.classification !== 'FORESHOCK') {
        current.classification = 'MAINSHOCK';
      }
      mainshockMap.set(current.id, current);
    }
  }

  // Sort descending by time for display (most recent first)
  parsedList.sort((a, b) => b.time - a.time);

  // Grouped list of mainshocks (with their nested aftershocks sorted chronologically)
  const mainshocksWithAftershocks = parsedList.filter(
    (e) => e.classification === 'MAINSHOCK' || (e.classification === 'ISOLATED' && e.aftershockCount === 0)
  );

  mainshocksWithAftershocks.forEach((m) => {
    m.aftershocks.sort((a, b) => b.time - a.time);
  });

  // 3. Compute Country Metrics
  let totalDepth = 0;
  let maxMag = 0;
  let maxMagEvent: ClusteredEvent | null = null;
  let shallowCount = 0;
  let intermediateCount = 0;
  let deepCount = 0;
  let aftershocksCount = 0;
  let mainshocksCount = 0;

  parsedList.forEach((ev) => {
    totalDepth += ev.depthKm;
    if (ev.mag > maxMag) {
      maxMag = ev.mag;
      maxMagEvent = ev;
    }

    if (ev.depthKm < 70) shallowCount++;
    else if (ev.depthKm <= 300) intermediateCount++;
    else deepCount++;

    if (ev.classification === 'AFTERSHOCK') aftershocksCount++;
    else mainshocksCount++;
  });

  const avgDepthKm = parsedList.length > 0 ? Math.round((totalDepth / parsedList.length) * 10) / 10 : 0;
  const aftershockRatioPercent =
    parsedList.length > 0 ? Math.round((aftershocksCount / parsedList.length) * 100) : 0;

  return {
    allEvents: parsedList,
    mainshocksWithAftershocks,
    metrics: {
      totalEvents: parsedList.length,
      mainshocksCount,
      aftershocksCount,
      maxMag: Math.round(maxMag * 10) / 10,
      maxMagEvent,
      avgDepthKm,
      shallowCount,
      intermediateCount,
      deepCount,
      aftershockRatioPercent,
    },
  };
}

function getRelativeTimeString(timestamp: number): string {
  const diffSec = Math.round((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return `Hace ${diffSec} seg`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

export function estimateMercalliIntensity(mag: number, _depthKm: number): { roman: string; desc: string } {
  if (mag < 2.5) return { roman: 'I - II', desc: 'Imperceptible a muy débil' };
  if (mag < 3.5) return { roman: 'III', desc: 'Débil (sentido en reposo)' };
  if (mag < 4.5) return { roman: 'IV', desc: 'Moderado (vibran ventanas y vajillas)' };
  if (mag < 5.5) return { roman: 'V - VI', desc: 'Fuerte (sentido por todos, oscilan lámparas)' };
  if (mag < 6.5) return { roman: 'VII', desc: 'Muy Fuerte (daños leves en estructuras)' };
  if (mag < 7.5) return { roman: 'VIII', desc: 'Dañino / Severo (caída de muros y chimeneas)' };
  return { roman: 'IX - XII', desc: 'Violento / Destructivo (ruina estructural generalizada)' };
}

