import React, { useState } from 'react';
import type { SeismicEventRecord, SeismicEventType } from '../types/seismic';
import {
  FileText,
  Download,
  Trash2,
  Filter,
  Activity,
  Radio,
  Play,
  RotateCcw,
  Clock,
  Zap,
} from 'lucide-react';

interface EventLogTableProps {
  events: SeismicEventRecord[];
  onDeleteEvent: (id: string) => void;
  onClearAll: () => void;
  onExportJSON: () => void;
  onRefresh: () => void;
}

export const EventLogTable: React.FC<EventLogTableProps> = ({
  events,
  onDeleteEvent,
  onClearAll,
  onExportJSON,
  onRefresh,
}) => {
  const [filterType, setFilterType] = useState<SeismicEventType | 'ALL'>('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.type === filterType;
  });

  // Calculate summary metrics
  const totalEvents = events.length;
  const maxHistoricalG = events.reduce((max, e) => Math.max(max, e.peakG), 0);
  const totalDurationSec = Math.round(
    events.reduce((sum, e) => sum + e.durationMs, 0) / 1000
  );

  const getTypeBadge = (type: SeismicEventType) => {
    switch (type) {
      case 'LOCAL_SENSOR':
        return {
          icon: Activity,
          label: 'Sensor Local',
          color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
      case 'NETWORK_ALERT':
        return {
          icon: Radio,
          label: 'Red USGS',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'SIMULATION':
        return {
          icon: Play,
          label: 'Simulación',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        };
    }
  };

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-xl space-y-5">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white m-0">
              Registro Local de Actividad & Sismos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Eventos anómalos y pre-alertas almacenados en IndexedDB / LocalStorage
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON Button */}
          <button
            onClick={onExportJSON}
            disabled={events.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors shadow-lg shadow-cyan-600/20"
            title="Descargar eventos en formato JSON"
          >
            <Download className="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Recargar eventos"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Clear Log */}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={events.length === 0}
            className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-30 text-rose-400 border border-rose-800/50 transition-colors"
            title="Limpiar registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation Prompt */}
      {showClearConfirm && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-200">
          <span>¿Seguro que deseas borrar permanentemente todos los eventos guardados?</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClearAll();
                setShowClearConfirm(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Sí, Borrar Todo
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Total Eventos</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {totalEvents}
          </div>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>PGA Máx Histórico</span>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-1">
            {maxHistoricalG.toFixed(3)} <span className="text-sm font-normal text-slate-400">g</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tiempo Sísmico Total</span>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-300 mt-1">
            {totalDurationSec} <span className="text-sm font-normal text-slate-400">seg</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="text-slate-400 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrar por:</span>
        </span>

        {[
          { id: 'ALL', label: 'Todos' },
          { id: 'LOCAL_SENSOR', label: 'Sensor Local' },
          { id: 'NETWORK_ALERT', label: 'Red USGS' },
          { id: 'SIMULATION', label: 'Simulación' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as SeismicEventType | 'ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              filterType === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/50">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-3">Fecha y Hora</th>
              <th className="py-3 px-3">Tipo</th>
              <th className="py-3 px-3">PGA Máximo</th>
              <th className="py-3 px-3">Duración</th>
              <th className="py-3 px-3">Detalles / Epicentro</th>
              <th className="py-3 px-3 text-right">Acción</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  No hay eventos registrados en este filtro. Active el sensor o ejecute una simulación para registrar actividad.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => {
                const badge = getTypeBadge(event.type);
                const Icon = badge.icon;
                const formattedDate = new Date(event.timestamp).toLocaleString();

                return (
                  <tr key={event.id} className="hover:bg-slate-900/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Event Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    {/* Peak Acceleration */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-amber-400">{event.peakG.toFixed(3)}g</span>
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({event.peakMSS.toFixed(1)} m/s²)
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                      {event.durationMs >= 1000
                        ? `${(event.durationMs / 1000).toFixed(1)} s`
                        : `${event.durationMs} ms`}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-3 font-sans text-slate-300 max-w-xs truncate">
                      {event.details.epicenter || event.details.notes || 'Anomalía registrada'}
                      {event.details.magnitude && (
                        <span className="ml-1 text-cyan-400 font-mono font-bold">
                          (M {event.details.magnitude})
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Eliminar evento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
