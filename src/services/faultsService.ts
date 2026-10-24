/**
 * Servicio de Fallas Geológicas Activas y Límites de Placas Tectónicas
 * GEM Global Active Faults / USGS Quaternary Faults & Sistemas Regionales
 * SeismoGlobal 195 Pro: GIS & Early Warning System
 */

export interface GeologicalFault {
  id: string;
  name: string;
  shortName: string;
  region: string;
  slipType: 'Inversa / Cabalgamiento' | 'Rumbo / Transcurrente Dextral' | 'Rumbo / Transcurrente Sinistral' | 'Normal / Distensiva' | 'Subducción / Megathrust' | 'Dorsal Divergente';
  activityLevel: 'Crítico (Muy Alta Sismicidad)' | 'Alto' | 'Moderado';
  slipRateMmYear: string;
  maxExpectedMag: string;
  description: string;
  coordinates: [number, number][]; // [lat, lng][]
}

export interface NearestFaultResult {
  fault: GeologicalFault;
  distanceKm: number;
}

/**
 * Catálogo Geoespacial de Fallas Geológicas Activas y Zonas de Cizalla Mayores
 */
export const GEOLOGICAL_FAULTS: GeologicalFault[] = [
  // --- AMÉRICA DEL SUR Y ANDES ---
  {
    id: 'falla_romeral',
    name: 'Sistema de Fallas de Romeral (Colombia)',
    shortName: 'Falla de Romeral',
    region: 'Colombia (Cordillera Central / Valle del Cauca / Antioquia / Nariño)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '1.5 - 3.2 mm/año',
    maxExpectedMag: 'Mw 7.2 - 7.5',
    description: 'Megacizalla andina activa que atraviesa de sur a norte ciudades principales, municipios y veredas en Colombia. Altamente sismogénica.',
    coordinates: [
      [1.2, -77.3],
      [2.4, -76.6],
      [3.5, -76.5],
      [4.5, -75.7],
      [5.5, -75.6],
      [6.3, -75.5],
      [7.2, -75.4],
      [8.1, -75.3],
    ],
  },
  {
    id: 'falla_cauca_almaguer',
    name: 'Sistema de Fallas Cauca-Almaguer (Colombia)',
    shortName: 'Falla Cauca-Almaguer',
    region: 'Valle del Cauca / Cauca / Nariño / Risaralda / Antioquia',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '2.0 - 4.5 mm/año',
    maxExpectedMag: 'Mw 7.3 - 7.6',
    description: 'Estructura tectónica longitudinal que delimita la Cordillera Occidental y el Valle del Río Cauca. Generadora de terremotos históricos profundos y corticales.',
    coordinates: [
      [1.0, -77.5],
      [2.1, -76.8],
      [3.2, -76.6],
      [4.2, -76.1],
      [5.1, -75.9],
      [6.0, -75.8],
      [6.8, -75.7],
    ],
  },
  {
    id: 'falla_murindo',
    name: 'Falla Activa de Murindó - Atrato (Antioquia / Chocó)',
    shortName: 'Falla de Murindó',
    region: 'Antioquia (Urabá) / Chocó (Cuenca del Atrato)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '4.0 - 7.0 mm/año',
    maxExpectedMag: 'Mw 7.2 - 7.5',
    description: 'Falla causante de los terremotos destructivos de Murindó de 1992 (Mw 7.1 y 6.8). Afecta directamente los municipios y veredas del Urabá antioqueño y Chocó.',
    coordinates: [
      [6.5, -77.0],
      [6.9, -76.8],
      [7.2, -76.6],
      [7.6, -76.4],
      [8.0, -76.3],
    ],
  },
  {
    id: 'falla_frontal_oriental',
    name: 'Falla Frontal de la Cordillera Oriental (Colombia / Venezuela)',
    shortName: 'Falla Frontal Oriental',
    region: 'Piedemonte Llanero / Meta / Casanare / Boyacá / Arauca',
    slipType: 'Inversa / Cabalgamiento',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '3.0 - 5.0 mm/año',
    maxExpectedMag: 'Mw 7.3 - 7.7',
    description: 'Falla de cabalgamiento frontal del bloque andino sobre el cratón suramericano. Generadora de fuertes sismos en el piedemonte.',
    coordinates: [
      [3.2, -74.1],
      [4.1, -73.6],
      [4.9, -73.2],
      [5.8, -72.6],
      [6.9, -71.9],
      [7.8, -71.5],
    ],
  },
  {
    id: 'falla_bocono',
    name: 'Falla de Boconó (Venezuela)',
    shortName: 'Falla de Boconó',
    region: 'Andes venezolanos (Mérida / Táchira / Lara)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '5.0 - 9.0 mm/año',
    maxExpectedMag: 'Mw 7.5 - 7.8',
    description: 'Límite de escape tectónico del Bloque de Maracaibo hacia el noreste. Falla sismogénica principal de los Andes venezolanos.',
    coordinates: [
      [7.6, -72.2],
      [8.5, -71.2],
      [9.4, -70.3],
      [10.1, -69.4],
      [10.5, -68.2],
    ],
  },
  {
    id: 'fosa_subduccion_nazca',
    name: 'Zona de Subducción Fosa Perú-Chile (Megathrust Nazca-Suramérica)',
    shortName: 'Megathrust Fosa Nazca-Chile',
    region: 'Costa del Pacífico (Chile, Perú, Ecuador, Colombia)',
    slipType: 'Subducción / Megathrust',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '65 - 75 mm/año',
    maxExpectedMag: 'Mw 8.5 - 9.5',
    description: 'La zona de subducción más rápida y activa del planeta. Origen del terremoto de Valdivia 1960 (9.5 Mw) y Maule 2010 (8.8 Mw).',
    coordinates: [
      [4.5, -78.5],
      [0.0, -81.0],
      [-5.5, -81.8],
      [-12.0, -78.5],
      [-18.5, -72.0],
      [-23.5, -71.5],
      [-30.0, -72.2],
      [-36.5, -74.0],
      [-43.0, -75.5],
    ],
  },
  {
    id: 'falla_liquinie_ofqui',
    name: 'Zona de Falla Liquiñe-Ofqui (Chile)',
    shortName: 'Falla Liquiñe-Ofqui',
    region: 'Sur de Chile (Regiones de Los Ríos, Los Lagos y Aysén)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Alto',
    slipRateMmYear: '6.0 - 9.0 mm/año',
    maxExpectedMag: 'Mw 7.1 - 7.6',
    description: 'Larga falla intra-arco de más de 1.000 km que acomoda la convergencia oblicua de la placa de Nazca y controla el volcanismo andino.',
    coordinates: [
      [-38.5, -71.8],
      [-40.2, -72.1],
      [-42.1, -72.6],
      [-44.5, -73.3],
      [-46.5, -74.2],
    ],
  },
  {
    id: 'falla_atacama',
    name: 'Sistema de Falla de Atacama (Norte de Chile)',
    shortName: 'Falla de Atacama',
    region: 'Norte Grande de Chile (Antofagasta / Tarapacá)',
    slipType: 'Rumbo / Transcurrente Sinistral',
    activityLevel: 'Alto',
    slipRateMmYear: '1.0 - 2.5 mm/año',
    maxExpectedMag: 'Mw 7.0 - 7.4',
    description: 'Falla cortical paralela a la costa norte chilena que corta la Cordillera de la Costa.',
    coordinates: [
      [-22.0, -70.2],
      [-23.5, -70.4],
      [-25.0, -70.5],
      [-26.5, -70.6],
    ],
  },

  // --- AMÉRICA CENTRAL, CARIBE Y NORTEAMÉRICA ---
  {
    id: 'falla_san_andres',
    name: 'Sistema de Fallas de San Andrés (San Andreas Fault System, EE. UU. / México)',
    shortName: 'Falla de San Andrés',
    region: 'California (EE. UU.) y Baja California (México)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '25 - 35 mm/año',
    maxExpectedMag: 'Mw 7.8 - 8.2',
    description: 'Falla de transformación continental entre la Placa Pacífica y la Placa Norteamericana. Origen del terremoto de San Francisco 1906.',
    coordinates: [
      [31.8, -115.8],
      [33.5, -116.5],
      [34.3, -117.8],
      [35.3, -119.8],
      [36.8, -121.5],
      [37.8, -122.5],
      [39.5, -123.8],
      [40.3, -124.5],
    ],
  },
  {
    id: 'fosa_mesoamericana',
    name: 'Fosa Mesoamericana / Subducción de Cocos (México y Centroamérica)',
    shortName: 'Fosa Mesoamericana (Cocos)',
    region: 'Pacífico mexicano (Guerrero, Oaxaca, Chiapas) y Centroamérica (Guatemala, El Salvador, Nicaragua, Costa Rica)',
    slipType: 'Subducción / Megathrust',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '55 - 85 mm/año',
    maxExpectedMag: 'Mw 8.0 - 8.6',
    description: 'Zona de subducción entre la Placa de Cocos y las placas Norteamericana y del Caribe. Origen de los grandes terremotos de México y Centroamérica.',
    coordinates: [
      [18.5, -104.5],
      [16.8, -100.5],
      [15.5, -96.5],
      [14.2, -92.5],
      [12.8, -88.5],
      [10.5, -85.5],
      [8.5, -83.5],
    ],
  },
  {
    id: 'falla_motagua_polochic',
    name: 'Sistema de Fallas Motagua-Polochic (Guatemala / Caribe)',
    shortName: 'Falla de Motagua',
    region: 'Guatemala, Honduras, Mar Caribe',
    slipType: 'Rumbo / Transcurrente Sinistral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '18 - 22 mm/año',
    maxExpectedMag: 'Mw 7.5 - 7.9',
    description: 'Límite transformante entre la Placa Norteamericana y la Placa del Caribe. Origen del trágico terremoto de Guatemala de 1976.',
    coordinates: [
      [15.2, -92.0],
      [15.0, -90.5],
      [15.3, -89.2],
      [15.7, -88.0],
      [16.2, -86.5],
    ],
  },
  {
    id: 'fosa_cascadia',
    name: 'Zona de Subducción de Cascadia (EE. UU. / Canadá)',
    shortName: 'Megathrust de Cascadia',
    region: 'Noroeste del Pacífico (Oregón, Washington, Columbia Británica)',
    slipType: 'Subducción / Megathrust',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '35 - 45 mm/año',
    maxExpectedMag: 'Mw 9.0 - 9.3',
    description: 'Subducción de la Placa de Juan de Fuca bajo Norteamérica. Capaz de megaterremotos M9+ con tsunamis transoceánicos.',
    coordinates: [
      [40.5, -125.0],
      [43.0, -125.5],
      [46.0, -125.8],
      [48.5, -126.5],
      [51.0, -128.5],
    ],
  },

  // --- EUROPA, MEDITERRÁNEO Y MEDIO ORIENTE ---
  {
    id: 'falla_norte_anatolia',
    name: 'Falla del Norte de Anatolia (North Anatolian Fault, Turquía)',
    shortName: 'Falla Norte de Anatolia',
    region: 'Norte de Turquía / Mar de Mármara / Estambul',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '20 - 25 mm/año',
    maxExpectedMag: 'Mw 7.6 - 7.9',
    description: 'Falla activa semejante a la falla de San Andrés. Atraviesa el norte de Turquía amenazando directamente el área metropolitana de Estambul.',
    coordinates: [
      [39.8, 39.5],
      [40.3, 36.5],
      [40.8, 33.5],
      [40.7, 30.5],
      [40.7, 28.5],
      [40.5, 26.5],
    ],
  },
  {
    id: 'falla_este_anatolia',
    name: 'Falla del Este de Anatolia (East Anatolian Fault, Turquía / Siria)',
    shortName: 'Falla Este de Anatolia',
    region: 'Sureste de Turquía / Noroeste de Siria',
    slipType: 'Rumbo / Transcurrente Sinistral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '8 - 10 mm/año',
    maxExpectedMag: 'Mw 7.8 - 8.0',
    description: 'Falla de rumbo que delimita el escape de la placa de Anatolia. Detonó los devastadores terremotos de magnitud 7.8 y 7.5 de 2023.',
    coordinates: [
      [36.2, 36.0],
      [37.1, 36.9],
      [37.9, 38.0],
      [38.6, 39.5],
      [39.3, 40.5],
    ],
  },
  {
    id: 'falla_mar_muerto',
    name: 'Transformada del Mar Muerto (Dead Sea Transform, Oriente Medio)',
    shortName: 'Falla del Mar Muerto',
    region: 'Israel, Jordania, Líbano, Siria',
    slipType: 'Rumbo / Transcurrente Sinistral',
    activityLevel: 'Alto',
    slipRateMmYear: '4 - 5 mm/año',
    maxExpectedMag: 'Mw 7.2 - 7.5',
    description: 'Límite de placas que separa la Placa Arábiga de la Placa Africana a través del Valle del Jordán y el Mar Muerto.',
    coordinates: [
      [28.0, 34.5],
      [30.5, 35.2],
      [32.0, 35.5],
      [34.0, 36.0],
      [36.0, 36.3],
    ],
  },

  // --- ASIA Y PACÍFICO OCCIDENTAL ---
  {
    id: 'megathrust_japon',
    name: 'Fosa de Japón y Nankai Trough (Megathrust Japón)',
    shortName: 'Fosa de Japón / Fosa de Nankai',
    region: 'Costa este de Honshu / Nankai (Japón)',
    slipType: 'Subducción / Megathrust',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '80 - 90 mm/año',
    maxExpectedMag: 'Mw 8.6 - 9.1',
    description: 'Subducción de la Placa Pacífica y Filipina. Origen del terremoto y tsunami de Tohoku de 2011 (9.1 Mw).',
    coordinates: [
      [33.0, 136.0],
      [35.0, 141.5],
      [38.0, 143.5],
      [41.0, 144.5],
      [44.0, 147.0],
    ],
  },
  {
    id: 'megathrust_sonda',
    name: 'Zona de Subducción de Sonda (Sumatra / Java, Indonesia)',
    shortName: 'Megathrust de Sonda',
    region: 'Indonesia (Sumatra, Java, Islas de la Sonda)',
    slipType: 'Subducción / Megathrust',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '60 - 70 mm/año',
    maxExpectedMag: 'Mw 8.8 - 9.3',
    description: 'Subducción de la Placa Indoaustraliana. Origen del colosal megaterremoto y tsunami del océano Índico de 2004 (9.2 Mw).',
    coordinates: [
      [5.5, 93.0],
      [1.0, 97.0],
      [-3.0, 100.5],
      [-6.5, 104.5],
      [-8.5, 110.0],
      [-10.0, 116.0],
    ],
  },
  {
    id: 'falla_alpina_nz',
    name: 'Falla Alpina (Alpine Fault, Nueva Zelanda)',
    shortName: 'Falla Alpina de N. Zelanda',
    region: 'Isla Sur de Nueva Zelanda (Alpes del Sur)',
    slipType: 'Rumbo / Transcurrente Dextral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '25 - 38 mm/año',
    maxExpectedMag: 'Mw 8.0 - 8.2',
    description: 'Límite transformante activo entre la Placa Pacífica y la Australiana a lo largo de toda la Isla Sur de Nueva Zelanda.',
    coordinates: [
      [-44.5, 168.0],
      [-43.5, 170.0],
      [-42.5, 171.8],
      [-41.5, 173.5],
    ],
  },
  {
    id: 'falla_filipinas',
    name: 'Zona de la Falla de Filipinas (Philippine Fault Zone)',
    shortName: 'Falla de Filipinas',
    region: 'Archipiélago Filipino (Luzón, Visayas, Mindanao)',
    slipType: 'Rumbo / Transcurrente Sinistral',
    activityLevel: 'Crítico (Muy Alta Sismicidad)',
    slipRateMmYear: '20 - 35 mm/año',
    maxExpectedMag: 'Mw 7.5 - 7.9',
    description: 'Falla longitudinal de más de 1.200 km que acomoda el movimiento oblicuo entre la Placa del Mar de Filipinas y la Placa Euroasiática.',
    coordinates: [
      [17.5, 121.0],
      [15.5, 121.8],
      [13.0, 123.5],
      [10.5, 125.0],
      [8.0, 126.0],
    ],
  },
];

/**
 * Calcula la distancia mínima de un punto (lat, lng) a todas las fallas geológicas
 */
export function getNearestFault(lat: number, lng: number): NearestFaultResult {
  let nearestFault = GEOLOGICAL_FAULTS[0];
  let minDistanceKm = Infinity;

  GEOLOGICAL_FAULTS.forEach((fault) => {
    // Calcular distancia a cada segmento de la línea
    for (let i = 0; i < fault.coordinates.length - 1; i++) {
      const p1 = fault.coordinates[i];
      const p2 = fault.coordinates[i + 1];
      const dist = distanceToSegmentKm(lat, lng, p1[0], p1[1], p2[0], p2[1]);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        nearestFault = fault;
      }
    }
  });

  return {
    fault: nearestFault,
    distanceKm: Math.round(minDistanceKm * 10) / 10,
  };
}

/**
 * Retorna las fallas que pasan a menos de un radio en km
 */
export function getFaultsNearLocation(lat: number, lng: number, maxRadiusKm: number = 250): NearestFaultResult[] {
  const results: NearestFaultResult[] = [];

  GEOLOGICAL_FAULTS.forEach((fault) => {
    let minD = Infinity;
    for (let i = 0; i < fault.coordinates.length - 1; i++) {
      const p1 = fault.coordinates[i];
      const p2 = fault.coordinates[i + 1];
      const d = distanceToSegmentKm(lat, lng, p1[0], p1[1], p2[0], p2[1]);
      if (d < minD) minD = d;
    }

    if (minD <= maxRadiusKm) {
      results.push({
        fault,
        distanceKm: Math.round(minD * 10) / 10,
      });
    }
  });

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Calcula la distancia euclidiana esférica mínima de un punto P a un segmento de línea AB
 */
function distanceToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  // Coordenadas aproximadas en plano euclidiano en km
  const latFactor = 111.0;
  const lngFactor = 111.0 * Math.cos((pLat * Math.PI) / 180);

  const px = (pLng - aLng) * lngFactor;
  const py = (pLat - aLat) * latFactor;

  const bx = (bLng - aLng) * lngFactor;
  const by = (bLat - aLat) * latFactor;

  const abLenSquared = bx * bx + by * by;
  if (abLenSquared === 0) {
    return Math.sqrt(px * px + py * py);
  }

  // Proyección escalar
  let t = (px * bx + py * by) / abLenSquared;
  t = Math.max(0, Math.min(1, t));

  const projX = t * bx;
  const projY = t * by;

  const dx = px - projX;
  const dy = py - projY;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula la distancia exacta en km de una falla a un punto (lat, lng)
 */
export function calculateFaultDistanceToPointKm(fault: GeologicalFault, lat: number, lng: number): number {
  let minD = Infinity;
  for (let i = 0; i < fault.coordinates.length - 1; i++) {
    const p1 = fault.coordinates[i];
    const p2 = fault.coordinates[i + 1];
    const d = distanceToSegmentKm(lat, lng, p1[0], p1[1], p2[0], p2[1]);
    if (d < minD) minD = d;
  }
  return Math.round(minD * 10) / 10;
}

/**
 * Retorna un FeatureCollection GeoJSON con todas las fallas
 */
export function getFaultsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: GEOLOGICAL_FAULTS.map((fault) => ({
      type: 'Feature',
      id: fault.id,
      properties: {
        name: fault.name,
        shortName: fault.shortName,
        region: fault.region,
        slipType: fault.slipType,
        activityLevel: fault.activityLevel,
        slipRate: fault.slipRateMmYear,
        maxExpectedMag: fault.maxExpectedMag,
        description: fault.description,
      },
      geometry: {
        type: 'LineString',
        coordinates: fault.coordinates.map((pt) => [pt[1], pt[0]]), // GeoJSON expects [lng, lat]
      },
    })),
  };
}

