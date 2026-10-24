import React from 'react';
import type { CountryProfile } from '../data/countries195';
import { Activity, Bell, BellOff, Sliders, Download, ChevronDown } from 'lucide-react';

interface SeismicHeaderProps {
  country: CountryProfile;
  onOpenCountryModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenDrill?: () => void;
  onExportExcel?: () => void;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export const SeismicHeader: React.FC<SeismicHeaderProps> = ({
  country,
  onOpenCountryModal,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenDrill,
  onExportExcel,
  onInstallPwa,
  canInstallPwa,
}) => {
  return (
    <header className="w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Seismic Live Indicator */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 shadow-lg shadow-cyan-500/20 text-white shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-white m-0 truncate">
                SeismoGlobal <span className="text-cyan-400">195 Pro</span>
              </h1>
              <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 uppercase shrink-0">
                GIS & Early Warning
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              Red Sísmica Oficial 195 Países • Cartografía Estilo Google Maps • Protección Civil
            </p>
          </div>
        </div>

        {/* Center / Right: Quick Country Selector, Drill Action & Controls */}
        <div className="flex items-center space-x-2">
          {/* OFICIAL BOTÓN: INICIAR SIMULACRO SÍSMICO */}
          {onOpenDrill && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrill();
              }}
              className="relative group overflow-hidden flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-900/40 border border-rose-400/50 transition-all transform hover:scale-[1.02] active:scale-95"
              title="Iniciar Simulacro Sísmico Interactivo con sirena y propagación de ondas P y S"
            >
              <span className="animate-ping absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
              <span className="text-sm">🚨</span>
              <span className="hidden xs:inline sm:inline">SIMULACRO SÍSMICO</span>
              <span className="inline xs:hidden sm:hidden">SIMULACRO</span>
            </button>
          )}

          {/* Export to Excel / CSV */}
          {onExportExcel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExportExcel();
              }}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-bold transition-all shadow-sm"
              title="Exportar Historial Sísmico a Excel / CSV (UTF-8 BOM)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          )}

          {/* Active Country Button Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCountryModal();
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 transition-colors shadow-sm text-xs font-bold"
            title="Seleccionar entre los 195 países soberanos"
          >
            <span className="text-base">{country.flag}</span>
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{country.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {canInstallPwa && onInstallPwa && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInstallPwa();
              }}
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
              title="Instalar como App PWA"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={`p-2 rounded-xl border transition-all ${
              isMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
            }`}
            title={isMuted ? 'Activar sirena sísmica' : 'Silenciar sirena'}
            aria-label="Silenciar sonido"
          >
            {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-colors"
            title="Parámetros sísmicos y endpoints"
            aria-label="Configuración"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
