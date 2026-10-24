import React, { useState, useMemo } from 'react';
import { COUNTRIES_195 } from '../data/countries195';
import type { CountryProfile } from '../data/countries195';
import { Search, X, Globe, Navigation, Check } from 'lucide-react';

interface CountrySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: CountryProfile;
  onSelectCountry: (country: CountryProfile) => void;
  onDetectCountry: () => Promise<void>;
  isDetecting: boolean;
}

type RegionFilter = 'TODOS' | 'América' | 'Europa' | 'Asia' | 'África' | 'Oceanía';

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCountry,
  onSelectCountry,
  onDetectCountry,
  isDetecting,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('TODOS');

  // Filtered countries list
  const filteredCountries = useMemo(() => {
    let list = COUNTRIES_195;

    if (selectedRegion !== 'TODOS') {
      list = list.filter((c) => c.region === selectedRegion);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.capital.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, selectedRegion]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0 flex items-center gap-2">
                <span>Directorio Sismológico Global</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                  195 Países
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecciona cualquier nación soberana para consultar su sismicidad y protocolos
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Auto Detect Location Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDetectCountry();
              }}
              disabled={isDetecting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-lg shadow-cyan-600/20"
              title="Detectar mi país actual mediante GPS"
            >
              <Navigation className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>{isDetecting ? 'Localizando...' : 'Detectar mi país'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Region Filters */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar país por nombre, capital o código ISO (ej: Chile, México, Japón, ES, JP)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Region Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(['TODOS', 'América', 'Europa', 'Asia', 'África', 'Oceanía'] as RegionFilter[]).map(
              (reg) => (
                <button
                  type="button"
                  key={reg}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRegion(reg);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                    selectedRegion === reg
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {reg}
                </button>
              )
            )}
            <span className="text-[11px] text-slate-500 ml-auto font-mono">
              {filteredCountries.length} resultados
            </span>
          </div>
        </div>

        {/* Countries Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredCountries.map((c) => {
            const isSelected = selectedCountry.code === c.code;

            return (
              <button
                type="button"
                key={c.code}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCountry(c);
                  onClose();
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-white ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-2xl shrink-0">{c.flag}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({c.code})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      Cap: {c.capital} • Radio: {c.maxradiuskm} km
                    </div>
                    <div className="text-[9px] mt-1 font-mono flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.2 rounded ${
                          c.riskLevel.includes('Crítico')
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : c.riskLevel === 'Alto'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.riskLevel}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="p-1 rounded-full bg-cyan-500 text-black shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500 px-5">
          <span>Organizado por regiones continentales estándar de la ONU</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
