import React from 'react';
import type { CountrySeismicMetrics, ClusteredEvent } from '../utils/seismicClassifier';
import { Activity, Zap, GitFork, ArrowDownRight } from 'lucide-react';

interface SeismicStatsPanelProps {
  metrics: CountrySeismicMetrics;
  onSelectEvent: (event: ClusteredEvent) => void;
}

export const SeismicStatsPanel: React.FC<SeismicStatsPanelProps> = ({
  metrics,
  onSelectEvent,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {/* Metric 1: Total Earthquakes */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Sismos Registrados</span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-3xl font-black font-mono text-white">
            {metrics.totalEvents}
          </span>
          <span className="text-xs text-slate-500 font-mono">eventos</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          En el radio nacional (últimos 30 días)
        </p>
      </div>

      {/* Metric 2: Aftershocks Classified */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold">
          <GitFork className="w-4 h-4 text-amber-400" />
          <span>Total de Réplicas</span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-3xl font-black font-mono text-amber-400">
            {metrics.aftershocksCount}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            ({metrics.aftershockRatioPercent}%)
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Clasificadas por algoritmo espacio-temporal
        </p>
      </div>

      {/* Metric 3: Maximum Magnitude */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold">
          <Zap className="w-4 h-4 text-rose-400" />
          <span>Magnitud Máxima</span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span
            className={`text-3xl font-black font-mono ${
              metrics.maxMag >= 6.0
                ? 'text-rose-400'
                : metrics.maxMag >= 4.5
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {metrics.maxMag > 0 ? `M ${metrics.maxMag.toFixed(1)}` : 'N/D'}
          </span>
        </div>
        {metrics.maxMagEvent ? (
          <button
            onClick={() => onSelectEvent(metrics.maxMagEvent!)}
            className="text-[10px] text-cyan-400 hover:underline truncate mt-1 block text-left"
            title={metrics.maxMagEvent.place}
          >
            Ver epicentro: {metrics.maxMagEvent.place}
          </button>
        ) : (
          <p className="text-[10px] text-slate-500 mt-1">Sin eventos mayores</p>
        )}
      </div>

      {/* Metric 4: Average Depth */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold">
          <ArrowDownRight className="w-4 h-4 text-indigo-400" />
          <span>Profundidad Media</span>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-3xl font-black font-mono text-indigo-300">
            {metrics.avgDepthKm}
          </span>
          <span className="text-xs text-slate-500 font-mono">km</span>
        </div>
        <div className="flex items-center space-x-2 text-[9px] font-mono text-slate-400 mt-1">
          <span title="Superficial (<70 km)">Sup: {metrics.shallowCount}</span>
          <span>•</span>
          <span title="Intermedia (70-300 km)">Int: {metrics.intermediateCount}</span>
          <span>•</span>
          <span title="Profunda (>300 km)">Prof: {metrics.deepCount}</span>
        </div>
      </div>
    </div>
  );
};
