/**
 * Base de Datos Precargada de Regiones, Departamentos, Municipios y Veredas
 * SeismoGlobal 195 Pro: 24/7 Early Warning & GIS System
 */

export interface PreloadedLocation {
  id: string;
  name: string;
  displayName: string;
  category: 'vereda' | 'municipio' | 'ciudad' | 'departamento' | 'foco_sismico';
  country: string;
  countryCode: string;
  state: string; // Departamento / Provincia / Región
  municipality: string; // Municipio o Ciudad
  vereda?: string; // Vereda / Barrio / Sector rural
  lat: number;
  lng: number;
  description: string;
  seismicRisk: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
  nearestFaultName: string;
}

export const PRELOADED_LOCATIONS: PreloadedLocation[] = [
  // ================= COLOMBIA - ANTIOQUIA & LA ESTRELLA =================
  {
    id: 'co_ant_la_estrella_miraflores',
    name: 'Vereda Miraflores (La Estrella)',
    displayName: 'Vereda Miraflores, La Estrella, Antioquia, Colombia',
    category: 'vereda',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'La Estrella',
    vereda: 'Miraflores',
    lat: 6.1585,
    lng: -75.6432,
    description: 'Sector residencial y rural en las estribaciones occidentales de La Estrella. Falla de Romeral próxima.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_la_estrella_san_jose',
    name: 'Vereda San José (La Estrella)',
    displayName: 'Vereda San José, La Estrella, Antioquia, Colombia',
    category: 'vereda',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'La Estrella',
    vereda: 'San José',
    lat: 6.1620,
    lng: -75.6380,
    description: 'Comunidad residencial en ladera montañosa con vigilancia geotécnica y sísmica activa.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_la_estrella_pueblo_viejo',
    name: 'Vereda Pueblo Viejo (La Estrella)',
    displayName: 'Vereda Pueblo Viejo, La Estrella, Antioquia, Colombia',
    category: 'vereda',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'La Estrella',
    vereda: 'Pueblo Viejo',
    lat: 6.1472,
    lng: -75.6515,
    description: 'Zona de fincas campestres, veredas agrícolas y asentamientos rurales en el sur del Valle de Aburrá.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_la_estrella_tablaza',
    name: 'Vereda La Tablaza (La Estrella)',
    displayName: 'Vereda La Tablaza, La Estrella, Antioquia, Colombia',
    category: 'vereda',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'La Estrella',
    vereda: 'La Tablaza',
    lat: 6.1388,
    lng: -75.6410,
    description: 'Corredor semi-industrial y rural de alta densidad en el límite con Caldas Antioquia.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_la_estrella_centro',
    name: 'Municipio de La Estrella (Parque Principal)',
    displayName: 'La Estrella, Valle de Aburrá, Antioquia, Colombia',
    category: 'municipio',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'La Estrella',
    lat: 6.1578,
    lng: -75.6431,
    description: 'Cabecera municipal de La Estrella, conocida como la Ciudad Siderense. Monitoreo SIATA.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_medellin_poblado',
    name: 'Medellín - El Poblado & EAFIT',
    displayName: 'El Poblado, Medellín, Antioquia, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'Medellín',
    vereda: 'El Poblado',
    lat: 6.2005,
    lng: -75.5785,
    description: 'Zona universitaria, corporativa y residencial de alta plusvalía en el sur de Medellín.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_medellin_centro',
    name: 'Medellín - Centro Financiero & Alpujarra',
    displayName: 'Centro Administrativo La Alpujarra, Medellín, Antioquia, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'Medellín',
    lat: 6.2442,
    lng: -75.5736,
    description: 'Centro gubernamental y de negocios de Medellín y el departamento de Antioquia.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_ant_rionegro',
    name: 'Rionegro - Oriente Antioqueño',
    displayName: 'Rionegro, Oriente Antioqueño, Colombia',
    category: 'municipio',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'Rionegro',
    lat: 6.1552,
    lng: -75.3737,
    description: 'Valle de San Nicolás, Aeropuerto José María Córdova y zona industrial del oriente.',
    seismicRisk: 'Moderado',
    nearestFaultName: 'Falla Otú-Pericos',
  },
  {
    id: 'co_ant_murindo',
    name: 'Murindó - Zona Sísmica Crítica de Urabá',
    displayName: 'Murindó, Urabá / Atrato, Antioquia, Colombia',
    category: 'foco_sismico',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Antioquia',
    municipality: 'Murindó',
    lat: 6.9958,
    lng: -76.7583,
    description: 'Epicentro del destructivo terremoto de Murindó de 1992 (Mw 7.1). Falla de Murindó activa.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Falla Activa de Murindó - Atrato',
  },

  // ================= COLOMBIA - OTRAS REGIONES CLAVE =================
  {
    id: 'co_bogota_d_c',
    name: 'Bogotá D.C. - Capital de la República',
    displayName: 'Bogotá D.C., Cundinamarca, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Bogotá D.C.',
    municipality: 'Bogotá D.C.',
    lat: 4.6097,
    lng: -74.0817,
    description: 'Sabana de Bogotá. Depósito lacustre blando propenso a amplificación de ondas sísmicas.',
    seismicRisk: 'Moderado',
    nearestFaultName: 'Falla Frontal de la Cordillera Oriental',
  },
  {
    id: 'co_sant_mesa_de_los_santos',
    name: 'Mesa de Los Santos (Nido Sísmico de Bucaramanga)',
    displayName: 'Mesa de Los Santos, Santander, Colombia',
    category: 'foco_sismico',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Santander',
    municipality: 'Los Santos',
    vereda: 'La Purnia / El Diamante',
    lat: 6.7844,
    lng: -73.1250,
    description: 'Segundo nido sísmico más activo del mundo con cientos de eventos profundos (140-160 km) mensuales.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Falla de Bucaramanga - Santa Marta',
  },
  {
    id: 'co_valle_cali',
    name: 'Cali - Santiago de Cali',
    displayName: 'Santiago de Cali, Valle del Cauca, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Valle del Cauca',
    municipality: 'Cali',
    lat: 3.4516,
    lng: -76.5320,
    description: 'Valle del Río Cauca, expuesta a fallas corticales activas y la zona de subducción del Pacífico.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Sistema de Fallas Cauca-Almaguer',
  },
  {
    id: 'co_caldas_manizales',
    name: 'Manizales - Eje Cafetero',
    displayName: 'Manizales, Caldas, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Caldas',
    municipality: 'Manizales',
    lat: 5.0689,
    lng: -75.5174,
    description: 'Topografía de alta montaña sobre la Falla de Romeral y cercanía al volcán Nevado del Ruiz.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },
  {
    id: 'co_narino_pasto',
    name: 'Pasto - San Juan de Pasto',
    displayName: 'Pasto, Nariño, Colombia',
    category: 'ciudad',
    country: 'Colombia',
    countryCode: 'CO',
    state: 'Nariño',
    municipality: 'Pasto',
    lat: 1.2136,
    lng: -77.2811,
    description: 'Zona andina austral a los pies del volcán Galeras y sobre fallas transcurrentes del sur.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Sistema de Fallas de Romeral',
  },

  // ================= MÉXICO =================
  {
    id: 'mx_cdmx_cuauhtemoc',
    name: 'Ciudad de México - Cuauhtémoc & Roma/Condesa',
    displayName: 'Alcaldía Cuauhtémoc, Ciudad de México, México',
    category: 'ciudad',
    country: 'México',
    countryCode: 'MX',
    state: 'Ciudad de México',
    municipality: 'Cuauhtémoc',
    lat: 19.4326,
    lng: -99.1332,
    description: 'Zona Lacustre III-b con amplificación sísmica extrema por depósitos de arcilla blanda.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Fosa Mesoamericana (Zona de Subducción Cocos-Norteamérica)',
  },
  {
    id: 'mx_oaxaca_capital',
    name: 'Oaxaca de Juárez - Valles Centrales',
    displayName: 'Oaxaca de Juárez, Oaxaca, México',
    category: 'ciudad',
    country: 'México',
    countryCode: 'MX',
    state: 'Oaxaca',
    municipality: 'Oaxaca',
    lat: 17.0732,
    lng: -96.7266,
    description: 'Estado con mayor porcentaje de sismicidad del país debido al contacto Cocos-Norteamérica.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Fosa Mesoamericana (Zona de Subducción Cocos-Norteamérica)',
  },
  {
    id: 'mx_guerrero_acapulco',
    name: 'Acapulco de Juárez - Brecha de Guerrero',
    displayName: 'Acapulco, Guerrero, México',
    category: 'ciudad',
    country: 'México',
    countryCode: 'MX',
    state: 'Guerrero',
    municipality: 'Acapulco',
    lat: 16.8531,
    lng: -99.8237,
    description: 'Ubicado frente a la Brecha Sísmica de Guerrero, con potencial de terremoto Mw > 8.0.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Fosa Mesoamericana (Zona de Subducción Cocos-Norteamérica)',
  },

  // ================= CHILE =================
  {
    id: 'cl_santiago_centro',
    name: 'Santiago de Chile - Plaza de Armas',
    displayName: 'Santiago, Región Metropolitana, Chile',
    category: 'ciudad',
    country: 'Chile',
    countryCode: 'CL',
    state: 'Región Metropolitana',
    municipality: 'Santiago',
    lat: -33.4489,
    lng: -70.6693,
    description: 'Cuenca de Santiago, flanqueada por la Falla de San Ramón al este y la subducción de Nazca al oeste.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Megathrust Fosa Nazca-Chile',
  },
  {
    id: 'cl_valparaiso_vina',
    name: 'Valparaíso & Viña del Mar',
    displayName: 'Valparaíso, Región de Valparaíso, Chile',
    category: 'ciudad',
    country: 'Chile',
    countryCode: 'CL',
    state: 'Valparaíso',
    municipality: 'Valparaíso',
    lat: -33.0472,
    lng: -71.6127,
    description: 'Borde costero pacífico altamente expuesto a tsunamis y sismos de subducción interplaca.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Megathrust Fosa Nazca-Chile',
  },
  {
    id: 'cl_biobio_concepcion',
    name: 'Concepción & Talcahuano',
    displayName: 'Concepción, Región del Biobío, Chile',
    category: 'ciudad',
    country: 'Chile',
    countryCode: 'CL',
    state: 'Biobío',
    municipality: 'Concepción',
    lat: -36.8270,
    lng: -73.0503,
    description: 'Epicentro del terremoto y tsunami del 27F de 2010 (Mw 8.8). Infraestructura sismorresistente.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Megathrust Fosa Nazca-Chile',
  },

  // ================= PERÚ =================
  {
    id: 'pe_lima_miraflores',
    name: 'Lima - Miraflores & Costa Verde',
    displayName: 'Miraflores, Lima Metropolitana, Perú',
    category: 'ciudad',
    country: 'Perú',
    countryCode: 'PE',
    state: 'Lima',
    municipality: 'Lima',
    vereda: 'Miraflores',
    lat: -12.1211,
    lng: -77.0298,
    description: 'Frente al silencio sísmico de Lima de más de 270 años (desde 1746) con energía acumulada.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Megathrust Fosa Nazca-Chile',
  },
  {
    id: 'pe_arequipa',
    name: 'Arequipa - Ciudad Blanca',
    displayName: 'Arequipa, Departamento de Arequipa, Perú',
    category: 'ciudad',
    country: 'Perú',
    countryCode: 'PE',
    state: 'Arequipa',
    municipality: 'Arequipa',
    lat: -16.4090,
    lng: -71.5375,
    description: 'Región volcánica y andina azotada por sismos históricos en 2001 y 1868.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Megathrust Fosa Nazca-Chile',
  },

  // ================= JAPÓN =================
  {
    id: 'jp_tokyo_shinjuku',
    name: 'Tokyo - Shinjuku & Chiyoda',
    displayName: 'Shinjuku, Tokio, Japón',
    category: 'ciudad',
    country: 'Japón',
    countryCode: 'JP',
    state: 'Kanto',
    municipality: 'Tokyo',
    lat: 35.6938,
    lng: 139.7034,
    description: 'Metrópolis sobre triple unión tectónica (Pacífico, Filipinas, Norteamérica). Red JMA.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Fosa de Japón y Nankai',
  },
  {
    id: 'jp_sendai_miyagi',
    name: 'Sendai - Miyagi (Tohoku)',
    displayName: 'Sendai, Prefectura de Miyagi, Japón',
    category: 'ciudad',
    country: 'Japón',
    countryCode: 'JP',
    state: 'Tohoku',
    municipality: 'Sendai',
    lat: 38.2682,
    lng: 140.8694,
    description: 'Epicentro en tierra cercano al megaterremoto de Tohoku de 2011 (Mw 9.1).',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Fosa de Japón y Nankai',
  },

  // ================= ESTADOS UNIDOS =================
  {
    id: 'us_ca_san_francisco',
    name: 'San Francisco - California Bay Area',
    displayName: 'San Francisco, California, Estados Unidos',
    category: 'ciudad',
    country: 'Estados Unidos',
    countryCode: 'US',
    state: 'California',
    municipality: 'San Francisco',
    lat: 37.7749,
    lng: -122.4194,
    description: 'Sobre la Falla de San Andrés y Hayward. Escenario del gran terremoto e incendio de 1906.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Falla de San Andrés (San Andreas Fault)',
  },
  {
    id: 'us_ca_los_angeles',
    name: 'Los Angeles - Downtown & Hollywood',
    displayName: 'Los Angeles, California, Estados Unidos',
    category: 'ciudad',
    country: 'Estados Unidos',
    countryCode: 'US',
    state: 'California',
    municipality: 'Los Angeles',
    lat: 34.0522,
    lng: -118.2437,
    description: 'Compleja red de fallas ciegas de cabalgamiento (Northridge 1994 Mw 6.7). Red ShakeAlert.',
    seismicRisk: 'Crítico',
    nearestFaultName: 'Falla de San Andrés (San Andreas Fault)',
  },

  // ================= ESPAÑA =================
  {
    id: 'es_murcia_lorca',
    name: 'Lorca - Murcia (Falla de Alhama)',
    displayName: 'Lorca, Región de Murcia, España',
    category: 'municipio',
    country: 'España',
    countryCode: 'ES',
    state: 'Región de Murcia',
    municipality: 'Lorca',
    lat: 37.6712,
    lng: -1.7017,
    description: 'Zona más sísmica de la península ibérica. Terremoto superficial de Lorca de 2011 (Mw 5.1).',
    seismicRisk: 'Alto',
    nearestFaultName: 'Falla de Alhama de Murcia',
  },
  {
    id: 'es_granada',
    name: 'Granada - Andalucía',
    displayName: 'Granada, Andalucía, España',
    category: 'ciudad',
    country: 'España',
    countryCode: 'ES',
    state: 'Andalucía',
    municipality: 'Granada',
    lat: 37.1773,
    lng: -3.5986,
    description: 'Cuenca sedimentaria de Granada con enjambres sísmicos frecuentes por compresión euro-africana.',
    seismicRisk: 'Alto',
    nearestFaultName: 'Fallas Béticas',
  },
];

/**
 * Busca ubicaciones precargadas por texto (nombre, municipio, vereda o departamento)
 */
export function searchPreloadedLocations(query: string, countryCode?: string): PreloadedLocation[] {
  const q = query.toLowerCase().trim();
  let list = PRELOADED_LOCATIONS;

  if (countryCode) {
    const cUpper = countryCode.toUpperCase();
    const filtered = list.filter((l) => l.countryCode === cUpper);
    if (filtered.length > 0) list = filtered;
  }

  if (!q) return list;

  return list.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.displayName.toLowerCase().includes(q) ||
      l.municipality.toLowerCase().includes(q) ||
      (l.vereda && l.vereda.toLowerCase().includes(q)) ||
      l.state.toLowerCase().includes(q) ||
      l.country.toLowerCase().includes(q)
  );
}

/**
 * Retorna las ubicaciones precargadas para un país específico
 */
export function getPreloadedByCountry(countryCode: string): PreloadedLocation[] {
  const cUpper = countryCode.toUpperCase();
  return PRELOADED_LOCATIONS.filter((l) => l.countryCode === cUpper);
}

export default PRELOADED_LOCATIONS;
