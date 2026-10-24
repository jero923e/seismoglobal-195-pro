import React, { useState } from 'react';
import type { ClusteredEvent } from '../utils/seismicClassifier';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
} from 'lucide-react';

interface EventFeedListProps {
  events: ClusteredEvent[];
  selectedEvent: ClusteredEvent | null;
  onSelectEvent: (event: ClusteredEvent) => void;
}

type FeedFilter = 'ALL' | 'MAINSHOCKS' | 'WITH_AFTERSHOCKS';

export const EventFeedList: React.FC<EventFeedListProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
}) => {
  const [filter, setFilter] = useState<FeedFilter>('ALL');
  const [expandedMainshocks, setExpandedMainshocks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMainshocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group events by mainshocks (and isolated events)
  const mainshockGroups = events.filter((e) => {
    if (filter === 'WITH_AFTERSHOCKS') {
      return e.classification === 'MAINSHOCK' && e.aftershockCount > 0;
    }
    if (filter === 'MAINSHOCKS') {
      return e.classification === 'MAINSHOCK';
    }
    return e.classification !== 'AFTERSHOCK';
  });

  const filteredGroups = mainshockGroups.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.place.toLowerCase().includes(q) ||
      e.mag.toString().includes(q) ||
      e.aftershocks.some((a) => a.place.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl backdrop-blur-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
            <span>Sismos & Agrupación de Réplicas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono">
              {events.length} eventos
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clasificación sismológica automática según proximidad espacio-temporal (&lt;100 km)
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              filter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilter('MAINSHOCKS');
            }}
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              filter === 'MAINSHOCKS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Principales
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilter('WITH_AFTERSHOCKS');
            }}
            className={`px-2.5 py-1 rounded-xl transition-colors ${
              filter === 'WITH_AFTERSHOCKS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Con Réplicas
          </button>
        </div>
      </div>

      {/* Quick Search in List */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtrar por localidad o magnitud..."
          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Events List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
            No se encontraron eventos en este criterio de búsqueda.
          </div>
        ) : (
          filteredGroups.map((ev) => {
            const isSelected = selectedEvent?.id === ev.id;
            const isExpanded = expandedMainshocks.has(ev.id);
            const hasAftershocks = ev.aftershockCount > 0;
            const magColor = getMagnitudeBadgeClass(ev.mag);

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                {/* Mainshock Card Header */}
                <div className="p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 min-w-0">
                    {/* Magnitude Badge */}
                    <div
                      className={`px-2.5 py-1.5 rounded-xl font-mono font-black text-sm shrink-0 flex flex-col items-center justify-center border shadow-sm ${magColor}`}
                    >
                      <span>M {ev.mag.toFixed(1)}</span>
                      <span className="text-[9px] font-normal opacity-80 uppercase tracking-tighter">
                        {ev.magType}
                      </span>
                    </div>

                    {/* Event Meta */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            ev.classification === 'MAINSHOCK'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {ev.classification === 'MAINSHOCK' ? 'Sismo Principal' : 'Aislado'}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">
                          {ev.timeRelative}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1 truncate" title={ev.place}>
                        {ev.place}
                      </h4>

                      <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span>Prof: <strong className="text-slate-200">{ev.depthKm} km</strong></span>
                        <span>Dist: <strong className="text-cyan-400">{ev.distanceToCapitalKm} km</strong></span>
                        <span className="text-amber-300 font-semibold">MMI {ev.mercalliRoman} ({ev.mercalliDescription})</span>
                        <span>{ev.timeFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Aftershock Accordion Button */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Ver ficha oficial USGS"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {hasAftershocks && (
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(ev.id, e)}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30 transition-colors"
                        title="Ver réplicas de este sismo"
                      >
                        <span>{ev.aftershockCount} réplicas</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Timeline of Aftershocks */}
                {hasAftershocks && isExpanded && (
                  <div className="bg-slate-900/90 border-t border-slate-800/80 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-400">
                      <span>Línea de Tiempo de Réplicas (Secuencia Sísmica)</span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        Máx réplica: M {ev.maxAftershockMag.toFixed(1)}
                      </span>
                    </div>

                    <div className="relative pl-4 space-y-2 border-l-2 border-amber-500/40 ml-2">
                      {ev.aftershocks.map((aft) => {
                        const isAftSelected = selectedEvent?.id === aft.id;
                        const timeOffsetSec = Math.round((aft.time - ev.time) / 1000);
                        const offsetLabel = formatOffsetTime(timeOffsetSec);

                        return (
                          <div
                            key={aft.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectEvent(aft);
                            }}
                            className={`relative p-2 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                              isAftSelected
                                ? 'bg-amber-950/40 border-amber-500 text-white'
                                : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />

                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="font-mono font-bold text-amber-400 text-xs shrink-0">
                                M {aft.mag.toFixed(1)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-white">{aft.place}</p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  Prof: {aft.depthKm} km • {aft.timeFormatted}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono font-bold text-cyan-400 shrink-0 ml-2">
                              +{offsetLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function getMagnitudeBadgeClass(mag: number): string {
  if (mag < 3.0) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (mag < 4.5) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (mag < 6.0) return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  return 'bg-rose-600 text-white border-rose-400 animate-pulse';
}

function formatOffsetTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = (sec / 3600).toFixed(1);
  return `${hr}h`;
}
