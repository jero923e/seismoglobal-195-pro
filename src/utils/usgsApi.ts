import type { RawSeismicFeature } from './seismicClassifier';
import { getCountryByCode, COUNTRIES_195 } from '../data/countries195';
import type { CountryProfile } from '../data/countries195';

const USGS_FDSN_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export interface QuerySeismicParams {
  lat: number;
  lng: number;
  maxradiuskm: number;
  minmagnitude?: number;
  daysBack?: number;
  limit?: number;
}

/**
 * Query USGS FDSN Event Web Service in GeoJSON format
 */
export async function queryUSGSEarthquakes(
  params: QuerySeismicParams
): Promise<RawSeismicFeature[]> {
  const {
    lat,
    lng,
    maxradiuskm,
    minmagnitude = 2.0,
    daysBack = 30,
    limit = 250,
  } = params;

  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();

  const url = new URL(USGS_FDSN_BASE);
  url.searchParams.set('format', 'geojson');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('maxradiuskm', Math.round(maxradiuskm).toString());
  url.searchParams.set('minmagnitude', minmagnitude.toString());
  url.searchParams.set('starttime', startDate);
  url.searchParams.set('endtime', endDate);
  url.searchParams.set('orderby', 'time');
  url.searchParams.set('limit', limit.toString());

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Error en USGS FDSN Web Service: HTTP ${res.status}`);
    }

    const data = await res.json();
    return (data.features as RawSeismicFeature[]) || [];
  } catch (err) {
    // If specific radial search fails, attempt fallback to real-time global feed
    try {
      const fallbackRes = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
      );
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return (fallbackData.features as RawSeismicFeature[]) || [];
      }
    } catch {
      // Ignore
    }
    throw err;
  }
}

/**
 * Detect current country using browser Geolocation + Nominatim OpenStreetMap Reverse Geocoding
 */
export async function detectCurrentCountry(): Promise<CountryProfile | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocalización no soportada en este navegador');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode with OpenStreetMap Nominatim
          const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`;

          const res = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'SeismoGlobal195-App/1.0',
            },
          });

          if (!res.ok) {
            throw new Error('Fallo al resolver geocodificación inversa');
          }

          const geoData = await res.json();
          const countryCode = geoData?.address?.country_code?.toUpperCase();

          if (countryCode) {
            const found = getCountryByCode(countryCode);
            if (found) {
              resolve(found);
              return;
            }
          }

          // Fallback: search nearest country by coordinates if code not resolved
          resolve(findNearestCountry(latitude, longitude));
        } catch (err) {
          reject(err);
        }
      },
      (err) => {
        reject(new Error(`Permiso de geolocalización denegado: ${err.message}`));
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  });
}

function findNearestCountry(lat: number, lng: number): CountryProfile | null {
  let closest: CountryProfile | null = null;
  let minDist = Infinity;
  for (const c of COUNTRIES_195) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < minDist) {
      minDist = d;
      closest = c;
    }
  }
  return closest;
}
