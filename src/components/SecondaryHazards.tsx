import React, { useMemo } from 'react';
import {
  Mountain,
  Waves,
  Flame,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import type { ClusteredEvent } from '../utils/seismicClassifier';

// ─── Volcano Catalog ───────────────────────────────────────────────────
interface VolcanoEntry {
  name: string;
  country: string;
  lat: number;
  lng: number;
  alertLevel: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  lastActivity: string;
  type: string;
}

const ACTIVE_VOLCANOES: VolcanoEntry[] = [
  { name: 'Nevado del Ruiz', country: 'Colombia', lat: 4.8917, lng: -75.3217, alertLevel: 'amarillo', lastActivity: 'Sismicidad volcánica frecuente y emisiones de SO₂', type: 'Estratovolcán' },
  { name: 'Cerro Machín', country: 'Colombia', lat: 4.4833, lng: -75.3833, alertLevel: 'amarillo', lastActivity: 'Actividad sísmica baja pero constante. Altamente peligroso.', type: 'Domo de lava' },
  { name: 'Galeras', country: 'Colombia', lat: 1.2278, lng: -77.3600, alertLevel: 'amarillo', lastActivity: 'Emisiones fumarólicas activas y sismos volcano-tectónicos', type: 'Estratovolcán' },
  { name: 'Puracé', country: 'Colombia', lat: 2.3167, lng: -76.3833, alertLevel: 'verde', lastActivity: 'Actividad fumarólica moderada persistente', type: 'Estratovolcán' },
  { name: 'Nevado del Huila', country: 'Colombia', lat: 2.9333, lng: -76.0333, alertLevel: 'amarillo', lastActivity: 'Sismicidad frecuente y deformación del edificio volcánico', type: 'Estratovolcán' },
  { name: 'Popocatépetl', country: 'México', lat: 19.0225, lng: -98.6222, alertLevel: 'amarillo', lastActivity: 'Exhalaciones con ceniza y fragmentos incandescentes', type: 'Estratovolcán' },
  { name: 'Colima (Volcán de Fuego)', country: 'México', lat: 19.5117, lng: -103.6167, alertLevel: 'amarillo', lastActivity: 'Explosiones y flujos piroclásticos moderados', type: 'Estratovolcán' },
  { name: 'Villarrica', country: 'Chile', lat: -39.4200, lng: -71.9400, alertLevel: 'amarillo', lastActivity: 'Actividad estromboliana y lago de lava intermitente', type: 'Estratovolcán' },
  { name: 'Cotopaxi', country: 'Ecuador', lat: -0.6833, lng: -78.4367, alertLevel: 'amarillo', lastActivity: 'Emisiones de ceniza y gases. Glaciar en retroceso.', type: 'Estratovolcán' },
  { name: 'Monte Fuji', country: 'Japón', lat: 35.3606, lng: 138.7274, alertLevel: 'verde', lastActivity: 'Sin actividad reciente. Monitoreo permanente.', type: 'Estratovolcán' },
  { name: 'Monte Etna', country: 'Italia', lat: 37.7510, lng: 14.9934, alertLevel: 'naranja', lastActivity: 'Flujos de lava y paroxismos estrombolianos frecuentes', type: 'Estratovolcán' },
  { name: 'Estrómboli', country: 'Italia', lat: 38.7890, lng: 15.2130, alertLevel: 'naranja', lastActivity: 'Explosiones estrombolianas continuas', type: 'Estratovolcán' },
  { name: 'Kilauea', country: 'EE.UU. (Hawái)', lat: 19.4210, lng: -155.2870, alertLevel: 'naranja', lastActivity: 'Erupciones efusivas y flujos de lava intermitentes', type: 'Volcán en escudo' },
  { name: 'Taal', country: 'Filipinas', lat: 14.0113, lng: 120.9980, alertLevel: 'amarillo', lastActivity: 'Emisiones de gas volcánico y sismicidad elevada', type: 'Caldera' },
];

function getAlertColor(level: string): string {
  switch (level) {
    case 'verde': return 'text-emerald-400';
    case 'amarillo': return 'text-amber-400';
    case 'naranja': return 'text-orange-400';
    case 'rojo': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function getAlertBg(level: string): string {
  switch (level) {
    case 'verde': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'amarillo': return 'bg-amber-500/10 border-amber-500/30';
    case 'naranja': return 'bg-orange-500/10 border-orange-500/30';
    case 'rojo': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-slate-800 border-slate-700';
  }
}

function getAlertEmoji(level: string): string {
  switch (level) {
    case 'verde': return '🟢';
    case 'amarillo': return '🟡';
    case 'naranja': return '🟠';
    case 'rojo': return '🔴';
    default: return '⚪';
  }
}

// ─── Analysis functions ────────────────────────────────────────────────
interface LandslideRisk {
  level: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  label: string;
  detail: string;
}

function analyzeLandslideRisk(event: ClusteredEvent | null): LandslideRisk {
  if (!event) return { level: 'none', label: 'Sin datos', detail: 'No hay sismo seleccionado para evaluar.' };

  const mag = event.mag;
  const depthKm = event.depthKm ?? 30;

  if (mag < 3.5) return { level: 'low', label: 'Riesgo Bajo', detail: 'Magnitud insuficiente para provocar deslizamientos significativos.' };
  if (mag < 4.5) return { level: 'moderate', label: 'Riesgo Moderado', detail: 'Posibles desprendimientos menores en laderas inestables o vías rurales empinadas.' };
  if (mag < 5.5) return { level: 'high', label: 'Riesgo Alto', detail: 'Deslizamientos probables en cordilleras, veredas montañosas y vías rurales con pendientes pronunciadas. Precaución con lluvias posteriores.' };
  return { level: 'critical', label: 'Riesgo Crítico', detail: `Sismo M${mag.toFixed(1)} capaz de generar remoción en masa, represamiento de ríos y derrumbes masivos en laderas y taludes. Evacúe zonas montañosas.` };
}

interface TsunamiRisk {
  level: 'none' | 'low' | 'watch' | 'warning';
  label: string;
  detail: string;
}

function analyzeTsunamiRisk(event: ClusteredEvent | null): TsunamiRisk {
  if (!event) return { level: 'none', label: 'Sin datos', detail: 'No hay sismo seleccionado.' };

  const mag = event.mag;
  const depthKm = event.depthKm ?? 30;
  // Check if oceanic: very rough heuristic — if far from major land masses or known subduction zones
  // We use magnitude and depth thresholds primarily
  const isShallow = depthKm < 70;

  if (mag < 5.5) return { level: 'none', label: 'Sin Alerta', detail: 'Magnitud insuficiente para generar tsunami. Se requiere Mw ≥ 6.5 y epicentro oceánico superficial.' };
  if (mag < 6.5) return { level: 'low', label: 'Bajo', detail: 'Magnitud moderada. Tsunami poco probable, salvo epicentro costero y foco muy superficial.' };
  if (!isShallow) return { level: 'low', label: 'Bajo (Foco Profundo)', detail: `Profundidad ${depthKm} km. Los sismos profundos rara vez generan tsunamis significativos.` };
  if (mag < 7.5) return { level: 'watch', label: 'VIGILANCIA', detail: `Sismo M${mag.toFixed(1)} superficial (${depthKm} km). Si el epicentro es oceánico o cercano a la costa, existe posibilidad de tsunami local. Monitoree alertas oficiales PTWC/NOAA.` };
  return { level: 'warning', label: 'ALERTA DE TSUNAMI', detail: `¡Sismo M${mag.toFixed(1)} superficial (${depthKm} km)! Condiciones para tsunami destructivo si el epicentro es oceánico. Aléjese inmediatamente de la costa. Diríjase a terreno elevado (+30 m).` };
}

function getLandslideColor(level: string): string {
  switch (level) {
    case 'low': return 'text-emerald-400';
    case 'moderate': return 'text-amber-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function getTsunamiColor(level: string): string {
  switch (level) {
    case 'none':
    case 'low': return 'text-emerald-400';
    case 'watch': return 'text-amber-400';
    case 'warning': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

// ─── Component ─────────────────────────────────────────────────────────
interface SecondaryHazardsProps {
  selectedEvent: ClusteredEvent | null;
  events: ClusteredEvent[];
  countryName: string;
}

export function SecondaryHazards({ selectedEvent, events, countryName }: SecondaryHazardsProps) {
  const landslide = useMemo(() => analyzeLandslideRisk(selectedEvent), [selectedEvent]);
  const tsunami = useMemo(() => analyzeTsunamiRisk(selectedEvent), [selectedEvent]);

  // Find strongest recent event for analysis
  const strongestEvent = useMemo(() => {
    if (events.length === 0) return null;
    return events.reduce((max, ev) => (ev.mag > max.mag ? ev : max), events[0]);
  }, [events]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border border-rose-500/40 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">
              Monitor de Amenazas Secundarias
            </div>
            <h3 className="text-lg font-black text-white">Deslizamientos, Tsunamis y Volcanes</h3>
          </div>
        </div>
        {selectedEvent && (
          <p className="text-xs text-slate-400">
            Análisis basado en el sismo seleccionado: <span className="text-white font-bold">M{selectedEvent.mag.toFixed(1)}</span> —{' '}
            <span className="text-slate-300">{selectedEvent.place}</span>
          </p>
        )}
      </div>

      {/* Landslide Risk */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-black text-white">Riesgo de Deslizamiento / Remoción en Masa</h4>
        </div>
        <div className={`p-3 rounded-xl border ${
          landslide.level === 'critical' ? 'bg-red-950/40 border-red-500/30' :
          landslide.level === 'high' ? 'bg-orange-950/40 border-orange-500/30' :
          landslide.level === 'moderate' ? 'bg-amber-950/40 border-amber-500/30' :
          'bg-slate-800/60 border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black uppercase tracking-wider ${getLandslideColor(landslide.level)}`}>
              {landslide.level === 'critical' ? '🔴' : landslide.level === 'high' ? '🟠' : landslide.level === 'moderate' ? '🟡' : '🟢'} {landslide.label}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{landslide.detail}</p>
        </div>
        {landslide.level === 'high' || landslide.level === 'critical' ? (
          <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/20 text-[10px] text-amber-200">
            ⚠️ <strong>Recomendación:</strong> Evite vías rurales en laderas empinadas, especialmente si hay lluvias recientes. Reporte derrumbes al número de emergencias de su municipio.
          </div>
        ) : null}
      </div>

      {/* Tsunami Risk */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h4 className="text-sm font-black text-white">Evaluador de Alerta de Tsunami</h4>
        </div>
        <div className={`p-3 rounded-xl border ${
          tsunami.level === 'warning' ? 'bg-red-950/40 border-red-500/30 animate-pulse' :
          tsunami.level === 'watch' ? 'bg-amber-950/40 border-amber-500/30' :
          'bg-slate-800/60 border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-black uppercase tracking-wider ${getTsunamiColor(tsunami.level)}`}>
              {tsunami.level === 'warning' ? '🌊🔴' : tsunami.level === 'watch' ? '🌊🟡' : '🌊🟢'} {tsunami.label}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{tsunami.detail}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700 text-[10px] text-slate-400">
          <Info className="w-3 h-3 inline mr-1 text-cyan-400" />
          Criterios: Epicentro oceánico/costero + Profundidad &lt; 70 km + Magnitud ≥ 6.5 Mw. Fuente: PTWC / NOAA / JMA.
        </div>
      </div>

      {/* Volcanic Activity Catalog */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-5 h-5 text-red-400" />
          <h4 className="text-sm font-black text-white">Catálogo de Volcanes Activos Cercanos</h4>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
            {ACTIVE_VOLCANOES.length} volcanes
          </span>
        </div>

        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {ACTIVE_VOLCANOES.map((vol) => (
            <div
              key={vol.name}
              className={`p-3 rounded-xl border ${getAlertBg(vol.alertLevel)} flex items-start gap-3 transition-all hover:scale-[1.003]`}
            >
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-lg">{vol.alertLevel === 'rojo' ? '🌋' : '🏔️'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-white">{vol.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getAlertBg(vol.alertLevel)} ${getAlertColor(vol.alertLevel)}`}>
                    {getAlertEmoji(vol.alertLevel)} {vol.alertLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{vol.country}</span>
                  <span>•</span>
                  <span>{vol.type}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{vol.lastActivity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SecondaryHazards;
