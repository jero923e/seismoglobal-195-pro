import React from 'react';
import type { SeismicConfig, PermissionStatus } from '../types/seismic';
import { X, Sliders, Volume2, Shield, RotateCcw, Globe, Radio } from 'lucide-react';
import { seismicAudio } from '../utils/audioAlert';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SeismicConfig;
  onChangeConfig: (newConfig: Partial<SeismicConfig>) => void;
  permissionStatus: PermissionStatus;
}

const PRESET_ENDPOINTS = [
  {
    name: 'USGS Global (Última hora, todos los sismos)',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  },
  {
    name: 'USGS Significativos (Último día, M4.5+)',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  },
  {
    name: 'USGS América & Global (Último día, M2.5+)',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  permissionStatus,
}) => {
  if (!isOpen) return null;

  const handleTestSound = () => {
    seismicAudio.playBeep(880, 0.25);
  };

  const handleResetDefaults = () => {
    onChangeConfig({
      thresholdG: 0.25,
      sustainedMs: 150,
      filterAlpha: 0.85,
      networkEndpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
      networkRadiusKm: 300,
      networkMinMag: 4.5,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100000] pointer-events-auto flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white m-0">
              Configuración & Parámetros Sísmicos
            </h3>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Local Sensor Parameters */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Radio className="w-4 h-4" />
            <span>Sensor Local (Acelerómetro & Filtros)</span>
          </div>

          {/* Threshold Slider */}
          <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                Umbral de Alerta Sísmica Local (G)
              </span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {config.thresholdG.toFixed(2)} g
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.60"
              step="0.01"
              value={config.thresholdG}
              onChange={(e) => onChangeConfig({ thresholdG: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Estándar sísmico: 0.25g. Valores menores aumentan sensibilidad ante trepidaciones leves.
            </p>
          </div>

          {/* Sustained Shaking Duration Slider */}
          <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                Persistencia Mínima Requerida
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {config.sustainedMs} ms
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="400"
              step="10"
              value={config.sustainedMs}
              onChange={(e) => onChangeConfig({ sustainedMs: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Por defecto 150 ms. Evita falsos positivos ante golpes secos o caídas de celular.
            </p>
          </div>

          {/* Filter Alpha Slider */}
          <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">
                Coeficiente de Filtro de Paso Alto (α)
              </span>
              <span className="font-mono font-bold text-indigo-400 text-sm">
                {config.filterAlpha.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.70"
              max="0.95"
              step="0.01"
              value={config.filterAlpha}
              onChange={(e) => onChangeConfig({ filterAlpha: parseFloat(e.target.value) })}
              className="w-full accent-indigo-400 cursor-pointer"
            />
            <p className="text-[10px] text-slate-500">
              Velocidad de sustracción de gravedad estática (1G = 9.81 m/s²).
            </p>
          </div>
        </div>

        {/* Section 2: External Seismic Network (USGS / Local Geologic API) */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Globe className="w-4 h-4" />
            <span>Red Sísmica Externa (USGS / Servicio Geológico)</span>
          </div>

          {/* Endpoint Configuration */}
          <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs">
            <label className="font-semibold text-slate-300 block">
              Endpoint GeoJSON del Servicio Sísmico:
            </label>
            <input
              type="url"
              value={config.networkEndpoint}
              onChange={(e) => onChangeConfig({ networkEndpoint: e.target.value })}
              placeholder="https://.../geojson"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 font-mono text-[11px] text-cyan-300 focus:outline-none focus:border-cyan-500"
            />

            {/* Presets */}
            <div className="pt-1 space-y-1">
              <span className="text-[10px] text-slate-400">Presets disponibles:</span>
              <div className="flex flex-col gap-1">
                {PRESET_ENDPOINTS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeConfig({ networkEndpoint: preset.url });
                    }}
                    className={`text-left text-[10px] px-2 py-1 rounded border truncate transition-colors ${
                      config.networkEndpoint === preset.url
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Network Radius & Min Magnitude Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Radius */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-300">Radio de Alerta</span>
                <span className="font-mono font-bold text-amber-400">
                  {config.networkRadiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="25"
                value={config.networkRadiusKm}
                onChange={(e) => onChangeConfig({ networkRadiusKm: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <p className="text-[9px] text-slate-500">Por defecto: 300 km.</p>
            </div>

            {/* Min Magnitude */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-300">Magnitud Mínima</span>
                <span className="font-mono font-bold text-rose-400">
                  M {config.networkMinMag.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="6.0"
                step="0.1"
                value={config.networkMinMag}
                onChange={(e) => onChangeConfig({ networkMinMag: parseFloat(e.target.value) })}
                className="w-full accent-rose-400 cursor-pointer"
              />
              <p className="text-[9px] text-slate-500">Por defecto: M 4.5.</p>
            </div>
          </div>
        </div>

        {/* Hardware & Diagnostics Status */}
        <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Permiso de Sensor Móvil:</span>
          </div>
          <span className="font-mono uppercase font-bold text-emerald-400">
            {permissionStatus}
          </span>
        </div>

        {/* Sound Test Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTestSound();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors border border-slate-700"
        >
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span>Probar Tono de Sirena Sintetizado</span>
        </button>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleResetDefaults();
            }}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores Iniciales</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-lg shadow-cyan-600/30"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
