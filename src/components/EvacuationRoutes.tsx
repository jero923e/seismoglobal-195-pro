import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Footprints,
  Plus,
  Trash2,
  Edit2,
  Check,
  Shield,
  TreePine,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────
export interface EvacuationPoint {
  id: string;
  favoriteId: string;
  name: string;
  lat: number;
  lng: number;
  type: 'parque' | 'cancha' | 'zona_abierta' | 'custom';
}

interface FavoriteLocationBasic {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  municipality?: string;
  vereda?: string;
  isSet: boolean;
}

const STORAGE_KEY = 'seismoglobal_evacuation_points_v1';

// ─── Default Points ────────────────────────────────────────────────────
const DEFAULT_POINTS: EvacuationPoint[] = [
  {
    id: 'evac-casa',
    favoriteId: 'casa',
    name: 'Parque El Vergel (zona abierta)',
    lat: 6.1595,
    lng: -75.6410,
    type: 'parque',
  },
  {
    id: 'evac-colegio',
    favoriteId: 'colegio',
    name: 'Cancha deportiva Astorga',
    lat: 6.2020,
    lng: -75.5765,
    type: 'cancha',
  },
  {
    id: 'evac-trabajo',
    favoriteId: 'trabajo',
    name: 'Plaza Botero (zona peatonal abierta)',
    lat: 6.2520,
    lng: -75.5690,
    type: 'zona_abierta',
  },
  {
    id: 'evac-finca',
    favoriteId: 'finca',
    name: 'Potrero alto sin cables ni muros',
    lat: 6.1490,
    lng: -75.6490,
    type: 'zona_abierta',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────
function getSavedPoints(): EvacuationPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POINTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_POINTS;
    return parsed;
  } catch {
    return DEFAULT_POINTS;
  }
}

function savePoints(pts: EvacuationPoint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pts));
  } catch { /* ignore */ }
}

function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateWalkingMinutes(distanceMeters: number): number {
  // Fast walking ≈ 6 km/h = 100 m/min
  return Math.max(1, Math.round(distanceMeters / 100));
}

function getPointTypeEmoji(type: string): string {
  switch (type) {
    case 'parque': return '🌳';
    case 'cancha': return '⚽';
    case 'zona_abierta': return '🏕️';
    default: return '📍';
  }
}

// ─── Component ─────────────────────────────────────────────────────────
interface EvacuationRoutesProps {
  favorites: FavoriteLocationBasic[];
}

export function EvacuationRoutes({ favorites }: EvacuationRoutesProps) {
  const [points, setPoints] = useState<EvacuationPoint[]>(() => getSavedPoints());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');

  useEffect(() => {
    savePoints(points);
  }, [points]);

  const getPointForFavorite = (favId: string) =>
    points.find((p) => p.favoriteId === favId);

  const handleStartEdit = (pt: EvacuationPoint) => {
    setEditingId(pt.id);
    setEditName(pt.name);
    setEditLat(pt.lat.toFixed(6));
    setEditLng(pt.lng.toFixed(6));
  };

  const handleSaveEdit = (ptId: string) => {
    setPoints((prev) =>
      prev.map((p) =>
        p.id === ptId
          ? {
              ...p,
              name: editName.trim() || p.name,
              lat: parseFloat(editLat) || p.lat,
              lng: parseFloat(editLng) || p.lng,
            }
          : p
      )
    );
    setEditingId(null);
  };

  const handleAddPoint = (favId: string) => {
    const fav = favorites.find((f) => f.id === favId);
    if (!fav) return;

    const newPt: EvacuationPoint = {
      id: `evac-${favId}-${Date.now()}`,
      favoriteId: favId,
      name: 'Nuevo punto de encuentro',
      lat: fav.lat + 0.001,
      lng: fav.lng + 0.001,
      type: 'custom',
    };
    setPoints((prev) => [...prev, newPt]);
    handleStartEdit(newPt);
  };

  const handleDeletePoint = (ptId: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== ptId));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
              Protección Preventiva
            </div>
            <h3 className="text-lg font-black text-white">Puntos de Encuentro y Rutas Seguras</h3>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Asigna a cada sitio (Casa, Colegio, Trabajo, Finca) su Punto de Encuentro Seguro más cercano: un parque, cancha abierta o zona libre de cables y muros.
        </p>
      </div>

      {/* Location Cards */}
      {favorites
        .filter((f) => f.isSet)
        .map((fav) => {
          const point = getPointForFavorite(fav.id);
          const isEditing = point && editingId === point.id;
          const distMeters = point ? calculateDistanceMeters(fav.lat, fav.lng, point.lat, point.lng) : 0;
          const walkMins = point ? estimateWalkingMinutes(distMeters) : 0;

          return (
            <div
              key={fav.id}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 transition-all hover:border-emerald-500/30"
            >
              {/* Favorite header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{fav.emoji}</span>
                  <div>
                    <h4 className="text-sm font-black text-white">{fav.name}</h4>
                    {fav.municipality && (
                      <p className="text-[10px] text-slate-500">
                        {fav.municipality}{fav.vereda ? ` — ${fav.vereda}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {!point && (
                  <button
                    type="button"
                    onClick={() => handleAddPoint(fav.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Asignar Punto
                  </button>
                )}
              </div>

              {/* Evacuation point detail */}
              {point && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                        placeholder="Nombre del punto de encuentro"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.000001"
                          value={editLat}
                          onChange={(e) => setEditLat(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="Latitud"
                        />
                        <input
                          type="number"
                          step="0.000001"
                          value={editLng}
                          onChange={(e) => setEditLng(e.target.value)}
                          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="Longitud"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(point.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <Check className="w-3 h-3" />
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getPointTypeEmoji(point.type)}</span>
                          <div>
                            <p className="text-xs font-bold text-emerald-300">{point.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(point)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePoint(point.id)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Route info strip */}
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Navigation className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{Math.round(distMeters)} m</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700" />
                        <div className="flex items-center gap-1 text-amber-400">
                          <Footprints className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{walkMins} min caminando rápido</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700" />
                        <div className="flex items-center gap-1 text-cyan-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] text-slate-400">~{Math.round(walkMins * 0.6)} min corriendo</span>
                        </div>
                      </div>

                      {/* Visual route indicator */}
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <span className="text-sm">{fav.emoji}</span>
                        <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-emerald-500/60 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex gap-1">
                              {[...Array(Math.min(8, Math.max(3, Math.round(distMeters / 100))))].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-emerald-400 opacity-60"
                                  style={{ animationDelay: `${i * 0.1}s` }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm">{getPointTypeEmoji(point.type)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {/* Info note */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
        <p className="text-[10px] text-slate-500">
          💡 Puntos ideales: canchas deportivas, parques amplios, potreros alejados de laderas, zonas peatonales sin cables eléctricos ni muros altos.
        </p>
      </div>
    </div>
  );
}

export default EvacuationRoutes;
