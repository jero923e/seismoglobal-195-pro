import React, { useState } from 'react';
import type { ClusteredEvent } from '../utils/seismicClassifier';
import {
  calculateDistanceKm,
  reverseGeocodeGranular,
} from '../services/localityService';
import { getNearestFault } from '../services/faultsService';
import {
  Home,
  MapPin,
  Navigation,
  Compass,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Check,
  Crosshair,
} from 'lucide-react';

export interface FavoriteLocation {
  id: string;
  type: 'casa' | 'colegio' | 'trabajo' | 'finca' | 'custom';
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  municipality?: string;
  vereda?: string;
  state?: string;
  country?: string;
  isSet: boolean;
  updatedAt?: string;
}

const STORAGE_KEY = 'seismoglobal_favorite_locations_v2';

const DEFAULT_FAVORITES: FavoriteLocation[] = [
  {
    id: 'casa',
    type: 'casa',
    name: 'Mi Casa',
    emoji: '🏠',
    lat: 6.1585,
    lng: -75.6432,
    municipality: 'La Estrella',
    vereda: 'Vereda Miraflores',
    state: 'Antioquia',
    country: 'Colombia',
    isSet: true,
  },
  {
    id: 'colegio',
    type: 'colegio',
    name: 'Colegio / Universidad',
    emoji: '🎓',
    lat: 6.2005,
    lng: -75.5785,
    municipality: 'Medellín',
    vereda: 'El Poblado (Sede Educativa)',
    state: 'Antioquia',
    country: 'Colombia',
    isSet: true,
  },
  {
    id: 'trabajo',
    type: 'trabajo',
    name: 'Mi Trabajo / Oficina',
    emoji: '💼',
    lat: 6.2442,
    lng: -75.5736,
    municipality: 'Medellín',
    vereda: 'Centro Financiero & Alpujarra',
    state: 'Antioquia',
    country: 'Colombia',
    isSet: true,
  },
  {
    id: 'finca',
    type: 'finca',
    name: 'Mi Finca / Refugio Rural',
    emoji: '🌿',
    lat: 6.1472,
    lng: -75.6515,
    municipality: 'La Estrella / Caldas',
    vereda: 'Vereda Pueblo Viejo / Tablaza',
    state: 'Antioquia',
    country: 'Colombia',
    isSet: true,
  },
];

export function getSavedFavorites(): FavoriteLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FAVORITES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FAVORITES;
    return parsed;
  } catch {
    return DEFAULT_FAVORITES;
  }
}

export function saveFavorites(favs: FavoriteLocation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // Ignore error
  }
}

interface FavoriteLocationsProps {
  latestEvent: ClusteredEvent | null;
  onFocusLocation: (lat: number, lng: number, zoom?: number) => void;
  onStartPinning: (targetId: string, locationName: string) => void;
  activePinningId: string | null;
  favorites?: FavoriteLocation[];
  onFavoritesChange?: (favs: FavoriteLocation[]) => void;
}

export const FavoriteLocations: React.FC<FavoriteLocationsProps> = ({
  latestEvent,
  onFocusLocation,
  onStartPinning,
  activePinningId,
  favorites: externalFavorites,
  onFavoritesChange,
}) => {
  const [internalFavorites, setInternalFavorites] = useState<FavoriteLocation[]>(() => getSavedFavorites());
  const favorites = externalFavorites || internalFavorites;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDetectingGpsId, setIsDetectingGpsId] = useState<string | null>(null);

  const updateFavorite = (id: string, updates: Partial<FavoriteLocation>) => {
    const next = favorites.map((fav) => {
      if (fav.id === id) {
        return {
          ...fav,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return fav;
    });
    setInternalFavorites(next);
    saveFavorites(next);
    if (onFavoritesChange) {
      onFavoritesChange(next);
    }
  };

  const handleUseGps = (fav: FavoriteLocation) => {
    if (!('geolocation' in navigator)) {
      alert('Tu dispositivo no soporta geolocalización GPS.');
      return;
    }

    setIsDetectingGpsId(fav.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const details = await reverseGeocodeGranular(lat, lng);

          updateFavorite(fav.id, {
            lat,
            lng,
            isSet: true,
            municipality: details.municipality || details.displayName.split(',')[0],
            vereda: details.vereda || 'Localidad GPS',
            state: details.state,
            country: details.country,
          });
          onFocusLocation(lat, lng, 16);
        } catch (err) {
          console.error(err);
        } finally {
          setIsDetectingGpsId(null);
        }
      },
      (err) => {
        alert('Permiso GPS no concedido: ' + err.message);
        setIsDetectingGpsId(null);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Gestor de Ubicaciones Favoritas</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 uppercase">
                GIS 4 Puntos
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Monitoreo simultáneo de proximidad a sismos y fallas activas
            </p>
          </div>
        </div>
      </div>

      {/* Grid of the 4 Favorite Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {favorites.map((fav) => {
          const isPinningThis = activePinningId === fav.id;

          // Compute distance to latest earthquake
          const distanceToQuakeKm = latestEvent && fav.isSet
            ? Math.round(calculateDistanceKm(fav.lat, fav.lng, latestEvent.lat, latestEvent.lng))
            : null;

          // Compute alert status based on distance and magnitude
          let alertStatus: 'safe' | 'caution' | 'danger' = 'safe';
          if (distanceToQuakeKm !== null && latestEvent) {
            if (distanceToQuakeKm <= 60 && latestEvent.mag >= 4.5) {
              alertStatus = 'danger';
            } else if (distanceToQuakeKm <= 180 && latestEvent.mag >= 3.8) {
              alertStatus = 'caution';
            }
          }

          // Compute distance to nearest geological fault
          const nearestFault = fav.isSet ? getNearestFault(fav.lat, fav.lng) : null;

          return (
            <div
              key={fav.id}
              className={`p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isPinningThis
                  ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-500/20'
                  : fav.isSet
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-slate-950/40 border-dashed border-slate-800 opacity-80'
              }`}
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{fav.emoji}</span>
                    {editingId === fav.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white w-28"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editName.trim()) updateFavorite(fav.id, { name: editName.trim() });
                            setEditingId(null);
                          }}
                          className="text-emerald-400 p-0.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-xs text-white flex items-center gap-1">
                        {fav.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(fav.id);
                            setEditName(fav.name);
                          }}
                          className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  {/* Status Indicator Badge */}
                  {fav.isSet ? (
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                        alertStatus === 'danger'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                          : alertStatus === 'caution'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {alertStatus === 'danger' ? (
                        <>
                          <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                          <span>Alerta Roja</span>
                        </>
                      ) : alertStatus === 'caution' ? (
                        <>
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                          <span>Precaución</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Seguro</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-slate-500">Sin fijar</span>
                  )}
                </div>

                {/* Territorial Location Breakdown */}
                {fav.isSet ? (
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-slate-200 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{fav.municipality || 'Municipio fijado'}</span>
                    </div>
                    {fav.vereda && (
                      <div className="text-[10px] text-emerald-400 font-mono truncate">
                        Vereda: {fav.vereda}
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-slate-500">
                      {fav.lat.toFixed(4)}°, {fav.lng.toFixed(4)}°
                    </div>

                    {/* Nearest Geological Fault Info */}
                    {nearestFault && (
                      <div className="pt-1.5 border-t border-slate-800/80 text-[10px]">
                        <span className="text-slate-400 block font-mono">Falla geológica activa:</span>
                        <div className="font-bold text-amber-300 truncate" title={nearestFault.fault.name}>
                          {nearestFault.fault.shortName}
                        </div>
                        <div className="font-mono text-slate-400">
                          A <strong className="text-white">{nearestFault.distanceKm} km</strong> de distancia
                        </div>
                      </div>
                    )}

                    {/* Distance and ETA to latest earthquake */}
                    {distanceToQuakeKm !== null && latestEvent && (
                      <div className="pt-1 border-t border-slate-800/60 text-[10px] font-mono space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Distancia Sismo:</span>
                          <span className={`font-bold ${alertStatus === 'danger' ? 'text-rose-400' : 'text-slate-200'}`}>
                            {distanceToQuakeKm} km (M {latestEvent.mag.toFixed(1)})
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-amber-300">
                          <span>ETA Onda P (6.0 km/s):</span>
                          <span className="font-bold">{Math.max(1, Math.round(distanceToQuakeKm / 6.0))}s</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-rose-400">
                          <span>ETA Onda S (3.5 km/s):</span>
                          <span className="font-bold">{Math.max(1, Math.round(distanceToQuakeKm / 3.5))}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Fija esta ubicación para recibir telemetría de proximidad sismológica continua.
                  </p>
                )}
              </div>

              {/* Actions Button Bar */}
              <div className="pt-3 border-t border-slate-800/80 mt-2 flex items-center gap-1.5">
                {fav.isSet && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusLocation(fav.lat, fav.lng, 16);
                    }}
                    className="flex-1 py-1 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                    title="Enfocar en el mapa"
                  >
                    <Compass className="w-3 h-3 text-cyan-400" />
                    <span>Ver</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPinning(fav.id, fav.name);
                  }}
                  className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isPinningThis
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                  title="Fijar haciendo clic en el mapa"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{isPinningThis ? 'Clic en mapa' : 'Fijar'}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseGps(fav);
                  }}
                  disabled={isDetectingGpsId === fav.id}
                  className="p-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors disabled:opacity-50"
                  title="Usar coordenadas GPS actuales"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isDetectingGpsId === fav.id ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
