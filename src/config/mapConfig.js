/**
 * Configuración del Motor Cartográfico Hiperrealista Oficial
 * Google Maps + Carto Voyager + GIS
 * SeismoGlobal 195 Pro: 24/7 Early Warning & GIS System
 */

const CARTO_STORAGE_KEY = 'seismoglobal_carto_clave';
const GOOGLE_KEY_STORAGE = 'seismoglobal_google_maps_key';

/**
 * Obtiene la clave de CARTO configurada desde:
 * 1. localStorage (editable desde la interfaz)
 * 2. Variable de entorno VITE_CARTO_CLAVE (.env)
 * 3. Cadena vacía por defecto (funciona con el tier público abierto de Carto Voyager)
 */
export function getCartoClave() {
  try {
    const saved = localStorage.getItem(CARTO_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch {
    // Si localStorage no está disponible
  }

  const envKey = import.meta.env.VITE_CARTO_CLAVE;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }

  return '';
}

/**
 * Guarda una nueva clave de CARTO en localStorage
 * @param {string} clave 
 */
export function setCartoClave(clave) {
  try {
    if (clave && clave.trim()) {
      localStorage.setItem(CARTO_STORAGE_KEY, clave.trim());
    } else {
      localStorage.removeItem(CARTO_STORAGE_KEY);
    }
  } catch {
    // Ignore error
  }
}

/**
 * Obtiene la clave de Google Maps opcional desde localStorage o variable de entorno
 */
export function getGoogleMapsApiKey() {
  try {
    const saved = localStorage.getItem(GOOGLE_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // Ignore
  }
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

export function setGoogleMapsApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem(GOOGLE_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GOOGLE_KEY_STORAGE);
    }
  } catch {
    // Ignore
  }
}

/**
 * Genera la URL de teselas Raster Carto Voyager (Leaflet)
 * @param {string} [customClave]
 * @returns {string}
 */
export function getRasterVoyagerUrl(customClave) {
  const clave = customClave !== undefined ? customClave : getCartoClave();
  if (clave && clave.trim()) {
    return `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?clave=${encodeURIComponent(clave)}`;
  }
  return 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
}

/**
 * Genera la URL de estilo Vectorial GL Carto Voyager (MapLibre GL)
 * @param {string} [customClave]
 * @returns {string}
 */
export function getVectorVoyagerGlUrl(customClave) {
  const clave = customClave !== undefined ? customClave : getCartoClave();
  if (clave && clave.trim()) {
    return `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json?clave=${encodeURIComponent(clave)}`;
  }
  return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
}

/**
 * Genera el enlace directo a Google Street View en 360° para cualquier coordenada
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
export function getGoogleStreetViewUrl(lat, lng) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

/**
 * Genera el enlace directo a Google Maps para navegación / búsqueda
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
export function getGoogleMapsSearchUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Catálogo Oficial de Capas Cartográficas Hiperrealistas
 * Incluye Google Maps Oficial (Calles, Satélite Híbrido, Terreno) y Carto Voyager
 */
export const MAP_LAYERS = {
  google_streets: {
    id: 'google_streets',
    name: 'Google Calles',
    subtitle: 'Google Maps estándar en español',
    type: 'raster',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=es',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=18&y=31&z=6&hl=es',
  },
  google_hybrid: {
    id: 'google_hybrid',
    name: 'Google Satélite Híbrido',
    subtitle: 'Casas, techos, caminos veredales y calles',
    type: 'raster',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=es',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=18&y=31&z=6&hl=es',
  },
  google_terrain: {
    id: 'google_terrain',
    name: 'Google Terreno',
    subtitle: 'Relieve topográfico e hidrografía',
    type: 'raster',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=es',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    thumbnail: 'https://mt1.google.com/vt/lyrs=p&x=18&y=31&z=6&hl=es',
  },
  voyager: {
    id: 'voyager',
    name: 'Carto Voyager',
    subtitle: 'Calles, veredas, municipios y casas',
    type: 'raster',
    getUrl: (key) => getRasterVoyagerUrl(key),
    maxZoom: 20,
    thumbnail: 'https://basemaps.cartocdn.com/rastertiles/voyager/6/18/31.png',
  },
  dark: {
    id: 'dark',
    name: 'Modo Táctico Nocturno',
    subtitle: 'CartoDB Dark Matter',
    type: 'raster',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    thumbnail: 'https://basemaps.cartocdn.com/dark_all/6/18/31.png',
  },
  vector_gl: {
    id: 'vector_gl',
    name: 'Carto Vectorial GL',
    subtitle: 'MapLibre 3D dinámico',
    type: 'vector',
    getStyleUrl: (key) => getVectorVoyagerGlUrl(key),
    maxZoom: 20,
    thumbnail: 'https://basemaps.cartocdn.com/rastertiles/voyager/6/18/31.png',
  },
};

export const MAP_CONFIG = {
  rasterVoyagerUrl: getRasterVoyagerUrl(),
  vectorVoyagerGlUrl: getVectorVoyagerGlUrl(),
  googleStreetsUrl: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=es',
  googleHybridUrl: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=es',
  googleTerrainUrl: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=es',
  osmFallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  minZoom: 1,
  maxZoom: 20, // Zoom ultra profundo hasta nivel de calle, vereda y casa
  defaultZoom: 6,
  attribution: '&copy; Google Maps &copy; OpenStreetMap contributors &copy; CARTO',
};

export default MAP_CONFIG;
