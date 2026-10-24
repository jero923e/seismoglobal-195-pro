import React from 'react';
import type { USGSEarthquake, UserLocation } from '../types/seismic';
import { Globe, RefreshCw, MapPin, AlertTriangle, ExternalLink, Zap } from 'lucide-react';

interface NetworkMonitorCardProps {
  userLocation: UserLocation | null;
  locationStatus: 'prompt' | 'granted' | 'denied' | 'simulated';
  earthquakes: USGSEarthquake[];
  isFetching: boolean;
  lastFetchTime: number | null;
  fetchError: string | null;
  onRefresh: () => void;
  onRequestLocation: () => void;
  onSimulateNetworkEvent: () => void;
}

export const NetworkMonitorCard: React.FC<NetworkMonitorCardProps> = ({
  userLocation,
  locationStatus,
  earthquakes,
  isFetching,
  lastFetchTime,
  fetchError,
  onRefresh,
  onRequestLocation,
  onSimulateNetworkEvent,
}) => {
  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white m-0 flex items-center gap-2">
              <span>Red Sísmica Global (USGS GeoJSON)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monitoreo continuo en radio &lt;300 km y Magnitud &gt;4.5 para cálculo de onda S
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Simulate Network Alert */}
          <button
            onClick={onSimulateNetworkEvent}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
            title="Probar pre-alerta de red con onda S entrante"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simular M5.8 (165km)</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
            title="Consultar sismos ahora"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Geolocation & Diagnostics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-xs">
        {/* User Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Ubicación Estación:</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-mono text-slate-200">
              {userLocation
                ? `${userLocation.latitude.toFixed(3)}°, ${userLocation.longitude.toFixed(3)}°`
                : 'Detectando...'}
            </span>
            <button
              onClick={onRequestLocation}
              className="text-[10px] text-cyan-400 hover:underline"
              title="Actualizar geolocalización"
            >
              ({locationStatus})
            </button>
          </div>
        </div>

        {/* Sync Info */}
        <div className="flex items-center justify-between text-slate-400">
          <span>Última sincronización:</span>
          <span className="font-mono text-slate-300">
            {lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Iniciando...'}
          </span>
        </div>
      </div>

      {/* Error Banner if API fails */}
      {fetchError && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Earthquake list from USGS */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400 px-1">
          <span>Sismos Recientes Registrados (Última hora)</span>
          <span className="font-mono text-[11px] text-slate-500">Total: {earthquakes.length}</span>
        </div>

        {earthquakes.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-500">
            {isFetching ? 'Consultando feed GeoJSON de USGS...' : 'Sin sismos significativos reportados en la última hora.'}
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {earthquakes.slice(0, 6).map((eq) => {
              const isNearby = eq.distanceKm <= 300;
              const isHighMag = eq.mag >= 4.5;

              return (
                <div
                  key={eq.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    isNearby && isHighMag
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : isNearby
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950/50 border-slate-800/70 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                        eq.mag >= 5.0
                          ? 'bg-rose-600 text-white'
                          : eq.mag >= 4.0
                          ? 'bg-amber-500 text-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      M {eq.mag.toFixed(1)}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-white">{eq.place}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {new Date(eq.time).toLocaleTimeString()} • Profundidad: {eq.depthKm} km
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isNearby ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {eq.distanceKm} km
                    </span>

                    <a
                      href={eq.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-slate-400 hover:text-cyan-400"
                      title="Ver detalles en USGS"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
