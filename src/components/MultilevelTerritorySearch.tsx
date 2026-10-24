import React, { useState, useEffect, useRef } from 'react';
import {
  searchGranularLocations,
  reverseGeocodeGranular,
  saveHomeLocation,
  type GranularLocation,
  type UserHomeLocation,
} from '../services/localityService';
import type { CountryProfile } from '../data/countries195';
import { searchPreloadedLocations } from '../data/preloadedLocations';
import {
  Search,
  Home,
  Navigation,
  Building2,
  TreePine,
  X,
} from 'lucide-react';

interface MultilevelTerritorySearchProps {
  country: CountryProfile;
  homeLocation: UserHomeLocation | null;
  onSelectLocation: (loc: GranularLocation) => void;
  onSetHomeLocation: (home: UserHomeLocation) => void;
  onActivatePinOnMap: () => void;
  isPinningActive: boolean;
}

export const MultilevelTerritorySearch: React.FC<MultilevelTerritorySearchProps> = ({
  country,
  homeLocation,
  onSelectLocation,
  onSetHomeLocation,
  onActivatePinOnMap,
  isPinningActive,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GranularLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Instant preloaded search combined with debounced online search
  useEffect(() => {
    const cleanQuery = query.trim();

    // 1. Instant local search from preloaded catalog
    const localMatches = searchPreloadedLocations(cleanQuery, country.code);
    const convertedLocal: GranularLocation[] = localMatches.slice(0, 6).map((item) => ({
      displayName: item.displayName,
      country: item.country,
      countryCode: item.countryCode,
      state: item.state,
      municipality: item.municipality,
      vereda: item.vereda,
      lat: item.lat,
      lng: item.lng,
      type: item.category,
      source: 'manual',
    }));

    if (cleanQuery.length < 2) {
      if (isOpen && convertedLocal.length > 0) {
        setResults(convertedLocal);
      } else {
        setResults([]);
      }
      setIsSearching(false);
      return;
    }

    // Set local matches first for instant zero-latency feedback
    if (convertedLocal.length > 0) {
      setResults(convertedLocal);
      setIsOpen(true);
    }

    // 2. Debounced online search via Photon / Nominatim
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchGranularLocations(cleanQuery, country.lat, country.lng, 8);
        // Merge without duplicates
        const combined = [...convertedLocal];
        found.forEach((f) => {
          if (!combined.some((c) => Math.abs(c.lat - f.lat) < 0.005 && Math.abs(c.lng - f.lng) < 0.005)) {
            combined.push(f);
          }
        });
        setResults(combined);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, country, isOpen]);

  // Handle GPS detection for "Mi Casa / Mi Vereda"
  const handleDetectGpsHome = () => {
    if (!('geolocation' in navigator)) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const granular = await reverseGeocodeGranular(lat, lng);

          const newHome: UserHomeLocation = {
            name: granular.displayName,
            customLabel: 'Mi Ubicación GPS (Casa / Vereda)',
            lat,
            lng,
            country: granular.country || country.name,
            state: granular.state,
            municipality: granular.municipality,
            vereda: granular.vereda,
            isGps: true,
            updatedAt: new Date().toISOString(),
          };

          saveHomeLocation(newHome);
          onSetHomeLocation(newHome);
          onSelectLocation(granular);
        } catch (err) {
          alert('Error al resolver la dirección exacta por GPS: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        alert('Permiso de GPS denegado o no disponible: ' + err.message);
        setIsDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectResult = (loc: GranularLocation) => {
    onSelectLocation(loc);
    setQuery(loc.displayName);
    setIsOpen(false);
  };

  const handleSetResultAsHome = (loc: GranularLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHome: UserHomeLocation = {
      name: loc.displayName,
      customLabel: loc.vereda ? `Mi Vereda: ${loc.vereda}` : loc.municipality ? `Mi Municipio: ${loc.municipality}` : loc.displayName,
      lat: loc.lat,
      lng: loc.lng,
      country: loc.country || country.name,
      state: loc.state,
      municipality: loc.municipality,
      vereda: loc.vereda,
      isGps: false,
      updatedAt: new Date().toISOString(),
    };
    saveHomeLocation(newHome);
    onSetHomeLocation(newHome);
    onSelectLocation(loc);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Multilevel Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className={`w-4 h-4 ${isSearching ? 'animate-spin text-cyan-400' : ''}`} />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder={`Buscar en ${country.name}: Departamento, Municipio, Vereda o Casa...`}
            className="w-full bg-slate-900/90 border border-slate-800 text-white rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-xl transition-all"
          />

          {query && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Location Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* GPS Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDetectGpsHome();
            }}
            disabled={isDetectingGps}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-md disabled:opacity-50"
            title="Detectar y fijar mi casa por GPS"
          >
            <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden md:inline">Mi GPS</span>
          </button>

          {/* Click on Map to Pin Home Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onActivatePinOnMap();
            }}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isPinningActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse border border-rose-500 shadow-rose-600/30'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
            title="Haz clic en cualquier punto del mapa para fijar tu casa o vereda exacta"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{isPinningActive ? 'Haz clic en el mapa...' : 'Fijar Casa'}</span>
          </button>
        </div>
      </div>

      {/* Pinned Home Location Status Badge */}
      {homeLocation && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider shrink-0">
              🏠 Mi Vivienda / Vereda Fijada:
            </span>
            <span className="text-slate-200 truncate text-[11px] font-medium">
              {homeLocation.customLabel || homeLocation.name}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span>
              {homeLocation.lat.toFixed(4)}°, {homeLocation.lng.toFixed(4)}°
            </span>
          </div>
        </div>
      )}

      {/* Autocomplete Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Resultados Territoriales ({results.length})</span>
            <span className="text-cyan-400 font-bold">Photon & OpenStreetMap</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {results.map((loc, idx) => {
              const isRural = !!loc.vereda;
              return (
                <div
                  key={`${loc.lat}-${loc.lng}-${idx}`}
                  onClick={() => handleSelectResult(loc)}
                  className="p-3 hover:bg-slate-800/80 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 shrink-0">
                      {isRural ? (
                        <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                      ) : loc.street ? (
                        <Home className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white group-hover:text-cyan-300 leading-snug">
                        {loc.displayName}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        {loc.vereda && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
                            Vereda: {loc.vereda}
                          </span>
                        )}
                        {loc.municipality && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                            Municipio: {loc.municipality}
                          </span>
                        )}
                        {loc.state && (
                          <span className="text-slate-400">
                            {loc.state}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Button to pin this directly as user's home */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetResultAsHome(loc, e);
                    }}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors shrink-0 text-[10px] font-bold flex items-center gap-1"
                    title="Fijar este punto como Mi Casa / Mi Vereda"
                  >
                    <Home className="w-3 h-3" />
                    <span className="hidden sm:inline">Fijar Casa</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
