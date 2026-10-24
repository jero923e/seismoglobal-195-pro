/**
 * Generador y Exportador de Historial Sísmico a Excel / CSV
 * Incluye UTF-8 BOM (\uFEFF) para compatibilidad total con Microsoft Excel en español
 * SeismoGlobal 195 Pro: GIS & Early Warning System
 */

import type { ClusteredEvent } from './seismicClassifier';
import type { FavoriteLocation } from '../components/FavoriteLocations';
import { calculateDistanceKm } from '../services/localityService';
import { getNearestFault } from '../services/faultsService';

/**
 * Genera y descarga instantáneamente el archivo CSV/Excel del historial sísmico
 */
export function exportSeismicHistoryToExcel(
  events: ClusteredEvent[],
  countryName: string,
  favorites: FavoriteLocation[] = []
): void {
  if (!events || events.length === 0) {
    alert('No hay eventos sísmicos en el historial para exportar.');
    return;
  }

  // Pre-extraer coordenadas de las 4 ubicaciones favoritas
  const casa = favorites.find((f) => f.id === 'casa' && f.isSet);
  const colegio = favorites.find((f) => f.id === 'colegio' && f.isSet);
  const trabajo = favorites.find((f) => f.id === 'trabajo' && f.isSet);
  const finca = favorites.find((f) => f.id === 'finca' && f.isSet);

  // Encabezados en español con delimitador punto y coma (estándar de Excel en Europa y Latinoamérica)
  const headers = [
    'ID Evento',
    'Clasificación Sísmica',
    'Réplicas Asociadas',
    'Fecha y Hora (UTC)',
    'Fecha y Hora Local',
    'País',
    'Localidad / Municipio / Vereda',
    'Magnitud',
    'Tipo de Magnitud',
    'Profundidad (km)',
    'Intensidad Mercalli (MMI)',
    'Descripción Mercalli',
    'Latitud Epicentro',
    'Longitud Epicentro',
    'Distancia a Capital (km)',
    'Distancia a Mi Casa (km)',
    'Distancia a Colegio (km)',
    'Distancia a Trabajo (km)',
    'Distancia a Finca (km)',
    'Falla Geológica Activa Más Cercana',
    'Distancia a Falla (km)',
    'Tipo de Desplazamiento Falla',
    'Nivel de Riesgo Falla',
    'Enlace Oficial USGS',
  ];

  const rows: string[] = [];

  // UTF-8 BOM (\uFEFF) para forzar a Excel a abrir con tildes, eñes y caracteres especiales correctos
  rows.push('\uFEFF' + headers.map(escapeCsvValue).join(';'));

  events.forEach((ev) => {
    // Clasificación legible
    const clasificacion =
      ev.classification === 'MAINSHOCK'
        ? 'Sismo Principal (Mainshock)'
        : ev.classification === 'AFTERSHOCK'
        ? `Réplica de evento ${ev.parentMainshockId || ''}`
        : 'Evento Aislado';

    // Distancias a ubicaciones favoritas
    const distCasa = casa ? Math.round(calculateDistanceKm(ev.lat, ev.lng, casa.lat, casa.lng)) : 'N/D';
    const distColegio = colegio ? Math.round(calculateDistanceKm(ev.lat, ev.lng, colegio.lat, colegio.lng)) : 'N/D';
    const distTrabajo = trabajo ? Math.round(calculateDistanceKm(ev.lat, ev.lng, trabajo.lat, trabajo.lng)) : 'N/D';
    const distFinca = finca ? Math.round(calculateDistanceKm(ev.lat, ev.lng, finca.lat, finca.lng)) : 'N/D';

    // Falla geológica más cercana
    const nearestFault = getNearestFault(ev.lat, ev.lng);

    const values = [
      ev.id,
      clasificacion,
      ev.aftershockCount > 0 ? `${ev.aftershockCount} réplicas` : '0',
      ev.timeFormatted,
      new Date(ev.time).toLocaleString('es-ES'),
      countryName,
      ev.place,
      ev.mag.toFixed(1),
      ev.magType,
      ev.depthKm.toFixed(1),
      ev.mercalliRoman,
      ev.mercalliDescription,
      ev.lat.toFixed(4),
      ev.lng.toFixed(4),
      ev.distanceToCapitalKm,
      distCasa,
      distColegio,
      distTrabajo,
      distFinca,
      nearestFault.fault.name,
      nearestFault.distanceKm,
      nearestFault.fault.slipType,
      nearestFault.fault.activityLevel,
      ev.url,
    ];

    rows.push(values.map(escapeCsvValue).join(';'));
  });

  const csvContent = rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const cleanCountry = countryName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `SeismoGlobal_195_Pro_${cleanCountry}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
