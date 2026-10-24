import React from 'react';
import type { SeismicTelemetry, SeismicConfig } from '../types/seismic';
import { Zap, Clock, Maximize2, RotateCcw } from 'lucide-react';

interface TelemetryGaugesProps {
  telemetry: SeismicTelemetry;
  config: SeismicConfig;
  onResetPeak: () => void;
}

export const TelemetryGauges: React.FC<TelemetryGaugesProps> = ({
  telemetry,
  config,
  onResetPeak,
}) => {
  const { netVectorG, totalMagnitudeG, dynamicPGA_G, peakG, sustainedDurationMs, rawG, filteredG } =
    telemetry;

  // Percentage of threshold achieved (0 to 100%+)
  const thresholdRatio = Math.min((netVectorG / config.thresholdG) * 100, 100);
  const isOverThreshold = netVectorG >= config.thresholdG;

  // Percentage of sustained duration achieved (0 to 100% toward 150ms)
  const sustainedRatio = Math.min((sustainedDurationMs / config.sustainedMs) * 100, 100);
  const isSustainedTriggered = sustainedDurationMs >= config.sustainedMs;

  return (
    <div className="space-y-4">
      {/* Primary KPI Hero: Net Vector Acceleration sqrt(ax^2+ay^2+az^2) - 1G */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-xl">
        {/* Glow backdrop based on threshold */}
        <div
          className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
            isOverThreshold ? 'bg-rose-500/25' : 'bg-cyan-500/10'
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
                Aceleración Vectorial Neta (Desviación 1G)
              </h2>
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Fórmula: |√(a<sub>x</sub>² + a<sub>y</sub>² + a<sub>z</sub>²) - 1G|
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                isOverThreshold
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Umbral: {config.thresholdG.toFixed(2)}g
            </span>
          </div>
        </div>

        {/* Big Number Gauge */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tight transition-colors duration-150 ${
                isOverThreshold ? 'text-rose-400' : 'text-cyan-400'
              }`}
            >
              {netVectorG.toFixed(3)}
            </span>
            <span className="text-2xl font-bold text-slate-400">g</span>
            <span className="text-sm font-mono text-slate-500 ml-2">
              ({(netVectorG * 9.80665).toFixed(2)} m/s²)
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Magnitud Bruta: <span className="text-slate-200">{totalMagnitudeG.toFixed(3)} g</span>
          </div>
        </div>

        {/* Progress Bar towards 0.25g threshold */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Intensidad de Aceleración</span>
            <span>{thresholdRatio.toFixed(0)}% del umbral</span>
          </div>
          <div className="w-full h-3 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isOverThreshold
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 shadow-lg shadow-rose-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${thresholdRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Secondary Metrics: Sustained Shaking Timer & Peak PGA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shaking Persistence Gauge (150ms verification) */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">
                Persistencia Sostenida (&gt;{config.sustainedMs}ms)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                isSustainedTriggered
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : sustainedDurationMs > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
            >
              {isSustainedTriggered ? 'Alarma Sostenida' : sustainedDurationMs > 0 ? 'Muestreando' : 'Reposo'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-mono text-amber-400">
                {sustainedDurationMs}
              </span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Meta: {config.sustainedMs} ms
            </span>
          </div>

          <div className="mt-2 w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isSustainedTriggered ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{ width: `${sustainedRatio}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Filtra golpes accidentales o caídas momentáneas (&lt;150ms).
          </p>
        </div>

        {/* Peak Acceleration & High-Pass PGA */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Maximize2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">Pico de Aceleración (PGA)</span>
            </div>
            <button
              onClick={onResetPeak}
              className="text-[10px] text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors"
              title="Reiniciar pico"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black font-mono text-indigo-300">
                {peakG.toFixed(3)}
              </span>
              <span className="text-xs text-slate-400 font-mono">g</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-slate-400">
                Dinámica HPF: <span className="text-slate-200">{dynamicPGA_G.toFixed(3)}g</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-3">
            Pico de aceleración del terreno registrado en la sesión activa.
          </p>
        </div>
      </div>

      {/* Tri-Axial Breakdown (X, Y, Z) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Descomposición Triaxial (Aceleración Lineal HPF vs Bruta)
          </span>
          <span className="text-[10px] font-mono text-slate-500">Unidades: G</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {/* Axis X */}
          <div className="bg-slate-950/70 border border-red-500/20 rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-red-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Eje X (Lat)
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              {filteredG.x.toFixed(3)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Bruto: {rawG.x.toFixed(2)}
            </div>
          </div>

          {/* Axis Y */}
          <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Eje Y (Long)
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              {filteredG.y.toFixed(3)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Bruto: {rawG.y.toFixed(2)}
            </div>
          </div>

          {/* Axis Z */}
          <div className="bg-slate-950/70 border border-blue-500/20 rounded-xl p-2.5">
            <div className="text-[11px] font-bold text-blue-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Eje Z (Vert)
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              {filteredG.z.toFixed(3)}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              Bruto: {rawG.z.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
