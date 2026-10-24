/**
 * Servicio de Micro-Localización Granular y Geocodificación Inversa
 * Utiliza Photon Komoot y Nominatim OpenStreetMap
 * SeismoGlobal 195 Pro
 */

export interface GranularLocation {
  displayName: string;
  country: string;
  countryCode: string;
  state?: string; // Departamento / Estado / Provincia
  municipality?: string; // Ciudad / Municipio
  vereda?: string; // Vereda / Corregimiento / Caserío / Barrio / Sector rural
  street?: string; // Calle / Dirección
  houseNumber?: string; // Número de casa
  lat: number;
  lng: number;
  type: string;
  source: 'photon' | 'nominatim' | 'manual';
}

export interface UserHomeLocation {
  name: string;
  customLabel?: string;
  lat: number;
  lng: number;
  country: string;
  state?: string;
  municipality?: string;
  vereda?: string;
  isGps: boolean;
  updatedAt: string;
}

const HOME_STORAGE_KEY = 'seismoglobal_mi_casa_location';
const REVERSE_CACHE = new Map<string, GranularLocation>();

/**
 * Busca ubicaciones multinivel con la API de Photon (Komoot)
 * Nivel: País -> Departamento -> Municipio -> Vereda / Barrio -> Casa / Calle
 */
export async function searchGranularLocations(
  query: string,
  countryLat?: number,
  countryLng?: number,
  limit: number = 8
): Promise<GranularLocation[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  try {
    const params = new URLSearchParams({
      q: cleanQuery,
      limit: String(limit),
      lang: 'es',
    });

    if (countryLat !== undefined && countryLng !== undefined) {
      params.append('lat', String(countryLat));
      params.append('lon', String(countryLng));
    }

    const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
    if (!res.ok) throw new Error(`Error en Photon: ${res.status}`);

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) return [];

    return data.features.map((feat: any) => {
      const p = feat.properties || {};
      const coords = feat.geometry?.coordinates || [0, 0];
      const lng = coords[0];
      const lat = coords[1];

      // Extraer niveles territoriales
      const country = p.country || '';
      const countryCode = (p.countrycode || '').toUpperCase();
      const state = p.state || p.county || '';
      const municipality = p.city || p.town || p.district || '';
      const vereda = p.village || p.hamlet || p.suburb || p.locality || p.neighbourhood || '';
      const street = p.street || '';
      const houseNumber = p.housenumber || '';

      // Construcción del nombre legible
      const parts: string[] = [];
      if (p.name) parts.push(p.name);
      if (vereda && vereda !== p.name) parts.push(vereda);
      if (municipality && municipality !== p.name && municipality !== vereda) parts.push(municipality);
      if (state && state !== municipality) parts.push(state);
      if (country) parts.push(country);

      const displayName = parts.join(', ') || p.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      return {
        displayName,
        country,
        countryCode,
        state,
        municipality,
        vereda,
        street,
        houseNumber,
        lat,
        lng,
        type: p.type || p.osm_value || 'locality',
        source: 'photon',
      };
    });
  } catch (err) {
    console.warn('Fallo en búsqueda Photon, intentando fallback con Nominatim:', err);
    return searchNominatimFallback(cleanQuery, limit);
  }
}

/**
 * Fallback de búsqueda con OpenStreetMap Nominatim
 */
async function searchNominatimFallback(query: string, limit: number): Promise<GranularLocation[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
      'accept-language': 'es',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'SeismoGlobal-195-Pro/2.0 (seismoglobal@civildefense.app)',
      },
    });

    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items.map((it: any) => {
      const a = it.address || {};
      const country = a.country || '';
      const countryCode = (a.country_code || '').toUpperCase();
      const state = a.state || a.region || a.province || '';
      const municipality = a.city || a.town || a.municipality || a.county || '';
      const vereda = a.village || a.hamlet || a.suburb || a.locality || a.neighbourhood || '';
      const street = a.road || a.street || '';
      const houseNumber = a.house_number || '';

      return {
        displayName: it.display_name,
        country,
        countryCode,
        state,
        municipality,
        vereda,
        street,
        houseNumber,
        lat: parseFloat(it.lat),
        lng: parseFloat(it.lon),
        type: it.type || 'place',
        source: 'nominatim',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Geocodificación inversa de alta precisión (zoom=18) para sismos o puntos en el mapa
 * Desglosa: País -> Departamento -> Municipio -> Vereda / Localidad cercana
 */
export async function reverseGeocodeGranular(lat: number, lng: number): Promise<GranularLocation> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (REVERSE_CACHE.has(cacheKey)) {
    return REVERSE_CACHE.get(cacheKey)!;
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      zoom: '18', // Nivel vereda, calle o casa
      addressdetails: '1',
      'accept-language': 'es',
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        'User-Agent': 'SeismoGlobal-195-Pro/2.0 (seismoglobal@civildefense.app)',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const a = data.address || {};
    const country = a.country || 'Zona Marítima / Internacional';
    const countryCode = (a.country_code || '').toUpperCase();
    const state = a.state || a.region || a.province || a.state_district || '';
    const municipality = a.city || a.town || a.municipality || a.county || '';
    const vereda = a.village || a.hamlet || a.suburb || a.locality || a.neighbourhood || a.isolated_dwelling || '';
    const street = a.road || a.street || '';
    const houseNumber = a.house_number || '';

    // Nombre jerárquico multinivel
    const hierarchy: string[] = [];
    if (vereda) hierarchy.push(`Vereda/Sector: ${vereda}`);
    if (municipality) hierarchy.push(municipality);
    if (state) hierarchy.push(state);
    if (country) hierarchy.push(country);

    const displayName = hierarchy.length > 0 ? hierarchy.join(' • ') : data.display_name || `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`;

    const result: GranularLocation = {
      displayName,
      country,
      countryCode,
      state,
      municipality,
      vereda,
      street,
      houseNumber,
      lat,
      lng,
      type: data.type || 'epicenter_location',
      source: 'nominatim',
    };

    REVERSE_CACHE.set(cacheKey, result);
    return result;
  } catch {
    const fallback: GranularLocation = {
      displayName: `Coordenadas: ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
      country: 'Epicentro',
      countryCode: '',
      lat,
      lng,
      type: 'coordinate',
      source: 'manual',
    };
    return fallback;
  }
}

/**
 * Gestión de la ubicación fijada: "Mi Casa / Mi Vereda / Mi Municipio"
 */
export function getSavedHomeLocation(): UserHomeLocation | null {
  try {
    const raw = localStorage.getItem(HOME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHomeLocation(home: UserHomeLocation): void {
  try {
    localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(home));
  } catch {
    // Ignore error
  }
}

export function clearHomeLocation(): void {
  try {
    localStorage.removeItem(HOME_STORAGE_KEY);
  } catch {
    // Ignore error
  }
}

/**
 * Calcula la distancia exacta en km entre dos puntos (fórmula Haversine)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio medio de la Tierra en km
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
