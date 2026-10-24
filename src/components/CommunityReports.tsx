import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Send,
  MapPin,
  Clock,
  Users,
  Flame,
  Zap,
  Waves,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────
export interface CommunityReport {
  id: string;
  timestamp: string;
  country: string;
  municipality: string;
  vereda: string;
  mercalliLevel: number;
  mercalliLabel: string;
  effects: string[];
  lat: number;
  lng: number;
}

// ─── Constantes ────────────────────────────────────────────────────────
const STORAGE_KEY = 'seismoglobal_community_reports_v1';

const MERCALLI_OPTIONS = [
  {
    level: 2,
    label: 'II — Débil',
    color: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    description: 'Sentido solo por pocas personas en reposo en pisos altos.',
    emoji: '😐',
  },
  {
    level: 4,
    label: 'IV — Moderado',
    color: 'from-amber-400 to-amber-500',
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    description: 'Ventanas y puertas vibran. Se siente como camión pesado.',
    emoji: '😟',
  },
  {
    level: 6,
    label: 'VI — Fuerte',
    color: 'from-orange-500 to-red-500',
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/10',
    text: 'text-orange-300',
    description: 'Difícil mantenerse de pie. Muebles se desplazan. Grietas en muros.',
    emoji: '😨',
  },
  {
    level: 8,
    label: 'VIII — Severo',
    color: 'from-red-600 to-rose-700',
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-300',
    description: 'Daño considerable en estructuras. Caída de chimeneas y columnas.',
    emoji: '🤯',
  },
];

const EFFECT_OPTIONS = [
  { id: 'lamps', label: 'Se movieron lámparas', emoji: '💡' },
  { id: 'windows', label: 'Sonaron ventanas', emoji: '🪟' },
  { id: 'objects_fell', label: 'Se cayeron objetos', emoji: '📦' },
  { id: 'power_out', label: 'Se fue la energía', emoji: '⚡' },
  { id: 'cracks', label: 'Aparecieron grietas', emoji: '🧱' },
  { id: 'water_moved', label: 'Agua se agitó en recipientes', emoji: '🥤' },
  { id: 'animals', label: 'Animales se alteraron', emoji: '🐕' },
  { id: 'alarm', label: 'Sonaron alarmas de autos', emoji: '🚗' },
];

const SAMPLE_REPORTS: CommunityReport[] = [
  {
    id: 'sample-1',
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    country: 'Colombia',
    municipality: 'Medellín',
    vereda: 'El Poblado',
    mercalliLevel: 4,
    mercalliLabel: 'IV — Moderado',
    effects: ['Se movieron lámparas', 'Sonaron ventanas'],
    lat: 6.2105,
    lng: -75.5701,
  },
  {
    id: 'sample-2',
    timestamp: new Date(Date.now() - 7200_000).toISOString(),
    country: 'Colombia',
    municipality: 'La Estrella',
    vereda: 'Vereda Miraflores',
    mercalliLevel: 6,
    mercalliLabel: 'VI — Fuerte',
    effects: ['Se cayeron objetos', 'Se fue la energía', 'Aparecieron grietas'],
    lat: 6.1585,
    lng: -75.6432,
  },
  {
    id: 'sample-3',
    timestamp: new Date(Date.now() - 1800_000).toISOString(),
    country: 'Colombia',
    municipality: 'Envigado',
    vereda: 'Centro',
    mercalliLevel: 2,
    mercalliLabel: 'II — Débil',
    effects: ['Se movieron lámparas'],
    lat: 6.1714,
    lng: -75.5860,
  },
  {
    id: 'sample-4',
    timestamp: new Date(Date.now() - 10800_000).toISOString(),
    country: 'Colombia',
    municipality: 'Caldas',
    vereda: 'Vereda La Valeria',
    mercalliLevel: 4,
    mercalliLabel: 'IV — Moderado',
    effects: ['Sonaron ventanas', 'Agua se agitó en recipientes', 'Animales se alteraron'],
    lat: 6.0892,
    lng: -75.6363,
  },
  {
    id: 'sample-5',
    timestamp: new Date(Date.now() - 5400_000).toISOString(),
    country: 'México',
    municipality: 'CDMX',
    vereda: 'Colonia Roma Norte',
    mercalliLevel: 6,
    mercalliLabel: 'VI — Fuerte',
    effects: ['Se cayeron objetos', 'Sonaron alarmas de autos', 'Se fue la energía'],
    lat: 19.4194,
    lng: -99.1555,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────
function getSavedReports(): CommunityReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_REPORTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_REPORTS;
    return parsed;
  } catch {
    return SAMPLE_REPORTS;
  }
}

function saveReports(reports: CommunityReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // ignore
  }
}

function timeSince(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'Hace unos segundos';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

function getMercalliColor(level: number): string {
  if (level <= 2) return 'text-emerald-400';
  if (level <= 4) return 'text-amber-400';
  if (level <= 6) return 'text-orange-400';
  return 'text-red-400';
}

function getMercalliBg(level: number): string {
  if (level <= 2) return 'bg-emerald-500/15 border-emerald-500/30';
  if (level <= 4) return 'bg-amber-500/15 border-amber-500/30';
  if (level <= 6) return 'bg-orange-500/15 border-orange-500/30';
  return 'bg-red-500/15 border-red-500/30';
}

// ─── Component ─────────────────────────────────────────────────────────
interface CommunityReportsProps {
  userCoords?: { lat: number; lng: number } | null;
}

export function CommunityReports({ userCoords }: CommunityReportsProps) {
  const [reports, setReports] = useState<CommunityReport[]>(() => getSavedReports());
  const [showForm, setShowForm] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);

  // Form state
  const [formCountry, setFormCountry] = useState('Colombia');
  const [formMunicipality, setFormMunicipality] = useState('');
  const [formVereda, setFormVereda] = useState('');
  const [formMercalli, setFormMercalli] = useState<number | null>(null);
  const [formEffects, setFormEffects] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveReports(reports);
  }, [reports]);

  const toggleEffect = (label: string) => {
    setFormEffects((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label]
    );
  };

  const handleSubmit = useCallback(() => {
    if (!formMercalli || !formMunicipality.trim()) return;

    const newReport: CommunityReport = {
      id: `user-${Date.now()}`,
      timestamp: new Date().toISOString(),
      country: formCountry,
      municipality: formMunicipality.trim(),
      vereda: formVereda.trim() || 'Centro',
      mercalliLevel: formMercalli,
      mercalliLabel:
        MERCALLI_OPTIONS.find((m) => m.level === formMercalli)?.label || `${formMercalli}`,
      effects: formEffects,
      lat: userCoords?.lat || 6.17 + (Math.random() - 0.5) * 0.1,
      lng: userCoords?.lng || -75.6 + (Math.random() - 0.5) * 0.1,
    };

    setReports((prev) => [newReport, ...prev]);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setShowForm(false);
      setFormMercalli(null);
      setFormEffects([]);
      setFormMunicipality('');
      setFormVereda('');
    }, 2500);
  }, [formCountry, formMunicipality, formVereda, formMercalli, formEffects, userCoords]);

  const displayedReports = showAllReports ? reports : reports.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-950 border border-violet-500/40 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/40">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest">
                Reportes Comunitarios en Vivo
              </div>
              <h3 className="text-lg font-black text-white">¿Sentiste un Temblor?</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-700 text-[10px] font-mono font-bold">
              {reports.length} reportes
            </span>
          </div>
        </div>

        {/* Toggle form button */}
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="w-full py-3 rounded-xl bg-violet-600/80 hover:bg-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-violet-500/20"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{showForm ? 'Cerrar Formulario' : 'Reportar Sismo Sentido'}</span>
          {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-violet-500/30 space-y-5 animate-fade-in">
          {submitted ? (
            <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-2">
              <ThumbsUp className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-emerald-300 font-bold text-sm">¡Reporte enviado con éxito!</p>
              <p className="text-slate-400 text-xs">Tu reporte ayuda a mapear la intensidad real del sismo en tu municipio y vereda.</p>
            </div>
          ) : (
            <>
              {/* Location Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Colombia"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Municipio *
                  </label>
                  <input
                    type="text"
                    value={formMunicipality}
                    onChange={(e) => setFormMunicipality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Ej: Medellín, Envigado..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Vereda / Barrio
                  </label>
                  <input
                    type="text"
                    value={formVereda}
                    onChange={(e) => setFormVereda(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Ej: El Poblado, Miraflores..."
                  />
                </div>
              </div>

              {/* Mercalli Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Intensidad Percibida (Escala Mercalli Modificada)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MERCALLI_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.level}
                      onClick={() => setFormMercalli(opt.level)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formMercalli === opt.level
                          ? `${opt.bg} ${opt.border} ${opt.text} shadow-lg ring-2 ring-offset-1 ring-offset-slate-900 ring-current`
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-2xl mb-1">{opt.emoji}</div>
                      <div className={`text-xs font-black ${formMercalli === opt.level ? opt.text : ''}`}>
                        {opt.label}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-tight">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Effects */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Efectos Observados (selecciona los que aplican)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EFFECT_OPTIONS.map((eff) => (
                    <button
                      type="button"
                      key={eff.id}
                      onClick={() => toggleEffect(eff.label)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                        formEffects.includes(eff.label)
                          ? 'bg-violet-500/20 border-violet-500/60 text-violet-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{eff.emoji}</span>
                      <span className="leading-tight">{eff.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formMercalli || !formMunicipality.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-600/20"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Reporte Ciudadano</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Recent Reports List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-violet-400" />
            Reportes Ciudadanos Recientes por Municipio/Vereda
          </h4>
        </div>
        <div className="space-y-1.5">
          {displayedReports.map((report) => (
            <div
              key={report.id}
              className={`p-3 rounded-xl border ${getMercalliBg(report.mercalliLevel)} flex items-start gap-3 transition-all hover:scale-[1.005]`}
            >
              {/* Intensity badge */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${getMercalliColor(report.mercalliLevel)} bg-slate-900/80 border border-current/30`}
              >
                {report.mercalliLevel}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-white truncate">
                    {report.municipality}
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[10px] text-slate-400 truncate">{report.vereda}</span>
                  <span className={`text-[10px] font-bold ${getMercalliColor(report.mercalliLevel)}`}>
                    {report.mercalliLabel}
                  </span>
                </div>
                {report.effects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {report.effects.map((eff) => (
                      <span
                        key={eff}
                        className="px-1.5 py-0.5 rounded-md bg-slate-800/80 text-[9px] text-slate-400 border border-slate-700/50"
                      >
                        {eff}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{timeSince(report.timestamp)}</span>
                  <MapPin className="w-3 h-3 ml-1" />
                  <span>{report.country}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reports.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllReports(!showAllReports)}
            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-800 transition-colors flex items-center justify-center gap-1"
          >
            {showAllReports ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver todos ({reports.length} reportes)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default CommunityReports;
