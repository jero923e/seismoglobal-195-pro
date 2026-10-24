import { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { getDefaultCountry } from './data/countries195';
import type { CountryProfile } from './data/countries195';
import { queryUSGSEarthquakes, detectCurrentCountry } from './utils/usgsApi';
import {
  classifySeismicEvents,
} from './utils/seismicClassifier';
import type {
  ClusteredEvent,
  CountrySeismicMetrics,
} from './utils/seismicClassifier';
import { SeismicHeader } from './components/SeismicHeader';
import { CountryProfileCard } from './components/CountryProfileCard';
import { CountrySelectorModal } from './components/CountrySelectorModal';
import { SeismicStatsPanel } from './components/SeismicStatsPanel';
import { GoogleStyleMap } from './components/GoogleStyleMap';
import type { WaveSimulationState } from './components/GoogleStyleMap';
import { FavoriteLocations, getSavedFavorites, saveFavorites, type FavoriteLocation } from './components/FavoriteLocations';
import { SeismicDrillModal } from './components/SeismicDrillModal';
import { exportSeismicHistoryToExcel } from './utils/excelExporter';
import { EventFeedList } from './components/EventFeedList';
import { LocalSeismograph } from './components/LocalSeismograph';
import { EventLogTable } from './components/EventLogTable';
import { EmergencyCenter } from './components/EmergencyCenter';
import { BackgroundStatusBanner } from './components/BackgroundStatusBanner';
import { SettingsModal } from './components/SettingsModal';
import { seismicDB } from './utils/indexedDB';
import { seismicAudio } from './utils/audioAlert';
import { soundAlarm } from './utils/soundAlarm';
import type { SeismicConfig, SeismicEventRecord } from './types/seismic';
import { MultilevelTerritorySearch } from './components/MultilevelTerritorySearch';
import { CommunityReports } from './components/CommunityReports';
import { EvacuationRoutes } from './components/EvacuationRoutes';
import { VulnerabilityCalculator } from './components/VulnerabilityCalculator';
import { SecondaryHazards } from './components/SecondaryHazards';
import { FamilySafetyCircle } from './components/FamilySafetyCircle';
import { SurvivalTrainer } from './components/SurvivalTrainer';
import {
  getSavedHomeLocation,
  type UserHomeLocation,
  type GranularLocation,
} from './services/localityService';
import {
  RefreshCw,
  Map as MapIcon,
  Globe,
  FileText,
  ShieldAlert,
  Download,
  Radio,
  MapPin,
  Activity,
  Play,
  Square,
  Volume2,
  Shield,
  Users,
  Brain,
  Building,
  Waves,
  Heart,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type MainTab = 'map' | 'countries' | 'drill' | 'sos' | 'favorites' | 'seismograph' | 'database' | 'prevention';
export type SOSSubTab = 'main' | 'hazards' | 'family';
export type PreventionSubTab = 'community' | 'vulnerability' | 'trainer';

export function App() {
  // REGLA 1: activeTab NUNCA cambia automáticamente por ningún efecto, fetch o timer
  const [activeTab, setActiveTab] = useState<MainTab>('map');
  const [country, setCountry] = useState<CountryProfile>(getDefaultCountry());
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [homeLocation, setHomeLocation] = useState<UserHomeLocation | null>(() => getSavedHomeLocation());
  const [isPinningHome, setIsPinningHome] = useState<boolean>(false);
  const [waveSimulation, setWaveSimulation] = useState<WaveSimulationState | null>(null);

  // MÓDULO 4: Gestor de Ubicaciones Favoritas (Casa, Colegio, Trabajo, Finca)
  const [favorites, setFavorites] = useState<FavoriteLocation[]>(() => getSavedFavorites());
  const [activePinningId, setActivePinningId] = useState<string | null>(null);

  // MÓDULO 6: Modal de Simulacro Sísmico
  const [isDrillOpen, setIsDrillOpen] = useState<boolean>(false);

  // Sub-tab state for SOS and Prevention (never changes activeTab)
  const [sosSubTab, setSosSubTab] = useState<SOSSubTab>('main');
  const [preventionSubTab, setPreventionSubTab] = useState<PreventionSubTab>('community');

  // Time & Magnitude Query Filters
  const [daysBack, setDaysBack] = useState<number>(30);
  const [minMagnitude, setMinMagnitude] = useState<number>(2.0);

  // Datos sísmicos
  const [rawFeatures, setRawFeatures] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClusteredEvent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Settings & Audio
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [loggedEvents, setLoggedEvents] = useState<SeismicEventRecord[]>([]);

  const [config, setConfig] = useState<SeismicConfig>({
    thresholdG: 0.25,
    sustainedMs: 150,
    filterAlpha: 0.85,
    calibrationDurationMs: 1800,
    networkEndpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    networkRadiusKm: 300,
    networkMinMag: 4.5,
  });

  // Estado dedicado para el apartado de Simulacro en pantalla completa
  const [inlineDrillMag, setInlineDrillMag] = useState<5.2 | 6.8 | 8.2>(6.8);
  const [inlineDrillTarget, setInlineDrillTarget] = useState<string>('casa');
  const [inlineDrillRunning, setInlineDrillRunning] = useState<boolean>(false);
  const [inlineDrillEta, setInlineDrillEta] = useState<number>(24);
  const [inlineDrillTimer, setInlineDrillTimer] = useState<number | null>(null);
  const [inlineChecklist, setInlineChecklist] = useState({
    covered: false,
    utilitiesCut: false,
    awayFromGlass: false,
    backpackGrabbed: false,
  });

  // Detect user GPS coords silently on mount if allowed
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { timeout: 8000, enableHighAccuracy: false }
      );
    }
  }, []);

  // REGLA 4: useMemo aísla el cálculo pesado de sismos, réplicas y estadísticas
  const { events, metrics } = useMemo(() => {
    if (!rawFeatures || rawFeatures.length === 0) {
      return {
        events: [] as ClusteredEvent[],
        metrics: {
          totalEvents: 0,
          mainshocksCount: 0,
          aftershocksCount: 0,
          maxMag: 0,
          maxMagEvent: null,
          avgDepthKm: 0,
          shallowCount: 0,
          intermediateCount: 0,
          deepCount: 0,
          aftershockRatioPercent: 0,
        } as CountrySeismicMetrics,
      };
    }

    const result = classifySeismicEvents(
      rawFeatures,
      country.lat,
      country.lng,
      100, // 100 km space window
      14 // 14 days aftershock window
    );

    return {
      events: result.allEvents,
      metrics: result.metrics,
    };
  }, [rawFeatures, country.lat, country.lng]);

  // Sincroniza el evento seleccionado cuando llegan datos nuevos sin tocar activeTab
  useEffect(() => {
    if (metrics.maxMagEvent) {
      setSelectedEvent((prev) => (prev ? prev : metrics.maxMagEvent));
    } else if (events.length > 0) {
      setSelectedEvent((prev) => (prev ? prev : events[0]));
    }
  }, [metrics.maxMagEvent, events]);

  // Consulta de sismos FDSN USGS: NUNCA toca activeTab ni desmonta modales
  const loadCountryEarthquakes = useCallback(
    async (targetCountry: CountryProfile, days = daysBack, minMag = minMagnitude) => {
      setIsLoading(true);
      setQueryError(null);

      try {
        const raw = await queryUSGSEarthquakes({
          lat: targetCountry.lat,
          lng: targetCountry.lng,
          maxradiuskm: targetCountry.maxradiuskm,
          daysBack: days,
          minmagnitude: minMag,
          limit: 300,
        });

        startTransition(() => {
          setRawFeatures(raw);
        });
      } catch (err) {
        setQueryError(
          err instanceof Error
            ? err.message
            : 'Error al consultar el servicio web USGS FDSN'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [daysBack, minMagnitude]
  );

  // Consulta inicial y al cambiar país o filtros
  useEffect(() => {
    loadCountryEarthquakes(country, daysBack, minMagnitude);
  }, [country, daysBack, minMagnitude, loadCountryEarthquakes]);

  // Invalida tamaño de Leaflet únicamente al cambiar a la pestaña 'map'
  useEffect(() => {
    if (activeTab === 'map') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Carga base de datos local IndexedDB
  const refreshLocalDatabase = useCallback(async () => {
    try {
      const records = await seismicDB.getAllEvents();
      setLoggedEvents(records);
    } catch {
      // Ignorar errores en modo offline
    }
  }, []);

  useEffect(() => {
    refreshLocalDatabase();
  }, [refreshLocalDatabase]);

  // Detección GPS de país
  const handleDetectCurrentCountry = async () => {
    setIsDetectingLocation(true);
    try {
      const detected = await detectCurrentCountry();
      if (detected) {
        setCountry(detected);
        setUserCoords({ lat: detected.lat, lng: detected.lng });
        setIsCountryModalOpen(false);
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'No se pudo detectar el país actual por geolocalización'
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Toggle sonido de audio general
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    seismicAudio.setMuted(next);
  };

  // Manejo de instalación PWA
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleSetFavoriteCoords = (
    id: string,
    lat: number,
    lng: number,
    details: GranularLocation
  ) => {
    const updated = favorites.map((fav) => {
      if (fav.id === id) {
        return {
          ...fav,
          lat,
          lng,
          isSet: true,
          municipality: details.municipality || details.displayName.split(',')[0],
          vereda: details.vereda || 'Ubicación seleccionada en mapa',
          state: details.state,
          country: details.country,
          updatedAt: new Date().toISOString(),
        };
      }
      return fav;
    });
    setFavorites(updated);
    saveFavorites(updated);
    setActivePinningId(null);
  };

  // Iniciar Simulacro en Pantalla (Apartado Simulacro)
  const handleStartInlineDrill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await soundAlarm.ensureAudioUnlocked();

    setInlineDrillRunning(true);
    setInlineChecklist({
      covered: false,
      utilitiesCut: false,
      awayFromGlass: false,
      backpackGrabbed: false,
    });

    const totalSeconds = 25;
    setInlineDrillEta(totalSeconds);

    await soundAlarm.startDualOscillatorSiren();
    soundAlarm.speakInstruction(
      `Alerta de simulacro sísmico oficial. Sismo simulado magnitud ${inlineDrillMag}. Onda destructiva aproximándose en 25 segundos. Mantén la calma, agáchate, cúbrete y sujétate con fuerza.`
    );

    let remaining = totalSeconds;
    const interval = window.setInterval(() => {
      remaining -= 1;
      setInlineDrillEta(Math.max(0, remaining));
      if (remaining <= 0) {
        window.clearInterval(interval);
        setInlineDrillTimer(null);
      }
    }, 1000);

    setInlineDrillTimer(interval);
  };

  const handleStopInlineDrill = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inlineDrillTimer) {
      window.clearInterval(inlineDrillTimer);
      setInlineDrillTimer(null);
    }
    soundAlarm.stopAll();
    setInlineDrillRunning(false);
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#07090e] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Institutional Top Bar (Header) */}
      <SeismicHeader
        country={country}
        onOpenCountryModal={() => setIsCountryModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrill={async () => {
          await soundAlarm.ensureAudioUnlocked();
          setActiveTab('drill');
        }}
        onExportExcel={() => exportSeismicHistoryToExcel(events, country.name, favorites)}
        onInstallPwa={handleInstallPwa}
        canInstallPwa={!!deferredPrompt}
      />

      {/* Barra de Navegación de Escritorio (Desktop Tabs) */}
      <nav className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 z-40 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('map');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'map'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span>🗺️ Mapa Principal</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('countries');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'countries'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md shadow-blue-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>🌍 195 Países & Sismos ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              await soundAlarm.ensureAudioUnlocked();
              setActiveTab('drill');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'drill'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>🚨 Simulacro Sísmico</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('sos');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'sos'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md shadow-rose-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>🆘 Centro SOS</span>
            <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800/80 rounded-full text-[10px] font-mono">
              8 FUNCIONES
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('favorites');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'favorites'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>📍 Mis Sitios</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('seismograph');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'seismograph'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>📈 Sismógrafo</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('database');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'database'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-md shadow-indigo-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Log ({loggedEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('prevention');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              activeTab === 'prevention'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-md shadow-violet-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4 text-violet-400" />
            <span>🛡️ Prevención</span>
            <span className="px-1.5 py-0.2 bg-violet-950 text-violet-300 border border-violet-800/80 rounded-full text-[10px] font-mono">NUEVO</span>
          </button>
        </div>

        {/* Quick Range / Excel on Desktop */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exportSeismicHistoryToExcel(events, country.name, favorites);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-bold transition-all"
            title="Descargar archivo Excel / CSV del historial sísmico"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <select
            value={daysBack}
            onChange={(e) => setDaysBack(parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>

          <select
            value={minMagnitude}
            onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value={1.5}>M &ge; 1.5</option>
            <option value={2.0}>M &ge; 2.0</option>
            <option value={3.5}>M &ge; 3.5</option>
            <option value={4.5}>M &ge; 4.5</option>
          </select>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadCountryEarthquakes(country, daysBack, minMagnitude);
            }}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50"
            title="Recargar datos del USGS FDSN"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </nav>

      {/* REGLA 2: Contenedor Principal. Si activeTab !== 'map', el mapa se oculta completamente y no bloquea */}
      <div className="flex-1 w-full overflow-hidden relative">
        {/* ========================================================================= */}
        {/* APARTADO 1: 🗺️ MAPA (Visible solo cuando activeTab === 'map')             */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-full relative z-0 overflow-hidden ${
            activeTab === 'map' ? 'block' : 'hidden pointer-events-none'
          }`}
        >
          <div className="w-full h-full p-2 sm:p-4 overflow-y-auto pb-20 md:pb-4">
            <div className="max-w-7xl mx-auto space-y-4">
              <BackgroundStatusBanner
                favorites={favorites}
                onOpenSOS={() => setActiveTab('sos')}
                onOpenDrill={async () => {
                  await soundAlarm.ensureAudioUnlocked();
                  setActiveTab('drill');
                }}
              />

              {queryError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>⚠️ {queryError}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQueryError(null);
                    }}
                    className="text-slate-400 hover:text-white text-xs underline ml-2"
                  >
                    Descartar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-8">
                  <GoogleStyleMap
                    country={country}
                    events={events}
                    selectedEvent={selectedEvent}
                    onSelectEvent={(ev) => setSelectedEvent(ev)}
                    userLocation={userCoords}
                    favorites={favorites}
                    onSetLocationCoords={handleSetFavoriteCoords}
                    activePinningId={activePinningId}
                    onStopPinning={() => setActivePinningId(null)}
                    waveSimulation={waveSimulation}
                  />
                </div>

                <div className="lg:col-span-4 space-y-3">
                  <EventFeedList
                    events={events}
                    selectedEvent={selectedEvent}
                    onSelectEvent={(ev) => setSelectedEvent(ev)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* APARTADO 2: 🌍 195 PAÍSES, MUNICIPIOS, VEREDAS & SISMOS                   */}
        {/* ========================================================================= */}
        {activeTab === 'countries' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div>
                  <h2 className="text-base font-black text-white">Explorador Territorial de 195 Países & Sismicidad</h2>
                  <p className="text-xs text-slate-400">Departamentos, municipios y veredas con réplicas y exportación de datos.</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSeismicHistoryToExcel(events, country.name, favorites);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Excel / CSV ({events.length} sismos)</span>
                </button>
              </div>

              <CountryProfileCard
                country={country}
                onChangeCountryClick={() => setIsCountryModalOpen(true)}
              />

              <MultilevelTerritorySearch
                country={country}
                homeLocation={homeLocation}
                onSelectLocation={(loc: GranularLocation) => {
                  setUserCoords({ lat: loc.lat, lng: loc.lng });
                }}
                onSetHomeLocation={(newHome: UserHomeLocation) => setHomeLocation(newHome)}
                onActivatePinOnMap={() => {
                  setIsPinningHome((prev) => !prev);
                }}
                isPinningActive={isPinningHome}
              />

              <SeismicStatsPanel
                metrics={metrics}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />

              <EventFeedList
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 3: 🚨 SIMULACRO SÍSMICO INTERACTIVO COMPLETO                    */}
        {/* ========================================================================= */}
        {activeTab === 'drill' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50">
                      <Radio className="w-7 h-7 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                        Protección Civil Oficial • 195 PRO
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white">
                        Simulacro Sísmico Nacional
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrillOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    Abrir en Modal Flotante
                  </button>
                </div>

                {/* 1. Selección de Magnitud (5.2, 6.8, 8.2) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    1. Magnitud del Terremoto Simulado:
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineDrillMag(5.2);
                      }}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        inlineDrillMag === 5.2
                          ? 'bg-amber-500/30 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-lg font-black text-amber-400">5.2 Mw</div>
                      <div className="text-xs font-bold text-slate-200">Moderado</div>
                      <div className="text-[10px] text-slate-400">Alerta preventiva</div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineDrillMag(6.8);
                      }}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        inlineDrillMag === 6.8
                          ? 'bg-orange-500/30 border-orange-400 text-white shadow-lg shadow-orange-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-lg font-black text-orange-400">6.8 Mw</div>
                      <div className="text-xs font-bold text-slate-200">Fuerte</div>
                      <div className="text-[10px] text-slate-400">Daño estructural</div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineDrillMag(8.2);
                      }}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        inlineDrillMag === 8.2
                          ? 'bg-rose-500/30 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-lg font-black text-rose-500">8.2 Mw</div>
                      <div className="text-xs font-bold text-slate-200">Megaterremoto</div>
                      <div className="text-[10px] text-slate-400">Destrucción severa</div>
                    </button>
                  </div>
                </div>

                {/* 2. Lugar de Impacto a Proteger */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    2. Ubicación a Proteger:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {favorites.map((fav) => (
                      <button
                        type="button"
                        key={fav.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInlineDrillTarget(fav.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                          inlineDrillTarget === fav.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-base">{fav.emoji}</span>
                        <span className="truncate">{fav.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Cronómetro & Alarma en Vivo */}
                {inlineDrillRunning ? (
                  <div className="p-6 rounded-2xl bg-rose-950/80 border-2 border-rose-500 animate-pulse text-center space-y-4">
                    <div className="text-sm font-black text-rose-300 uppercase tracking-widest flex items-center justify-center gap-2">
                      <Volume2 className="w-5 h-5 animate-bounce" />
                      <span>¡Sirena Sísmica de Doble Oscilador Activa (880/1320 Hz)!</span>
                    </div>

                    <div className="text-5xl font-black font-mono text-white">
                      {inlineDrillEta}s
                    </div>
                    <p className="text-xs text-rose-200">
                      Tiempo estimado para impacto de Onda Secundaria (S). ¡Agáchate, cúbrete y sujétate!
                    </p>

                    <button
                      type="button"
                      onClick={handleStopInlineDrill}
                      className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider border border-rose-500"
                    >
                      <Square className="w-4 h-4 inline mr-2" />
                      <span>Detener Alarma / Finalizar Simulacro</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleStartInlineDrill}
                      className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01]"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>Iniciar Simulacro con Alarma Sonora y Voz</span>
                    </button>
                  </div>
                )}

                {/* 4. Checklist de Evaluación */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Protocolo de Evacuación (Marca las acciones realizadas):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setInlineChecklist((prev) => ({ ...prev, covered: !prev.covered }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        inlineChecklist.covered
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{inlineChecklist.covered ? '✓' : '○'}</span>
                      <span>1. Me agaché, cubrí y sujeté firmemente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setInlineChecklist((prev) => ({ ...prev, utilitiesCut: !prev.utilitiesCut }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        inlineChecklist.utilitiesCut
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{inlineChecklist.utilitiesCut ? '✓' : '○'}</span>
                      <span>2. Cerré llaves de gas y corté electricidad</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setInlineChecklist((prev) => ({ ...prev, awayFromGlass: !prev.awayFromGlass }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        inlineChecklist.awayFromGlass
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{inlineChecklist.awayFromGlass ? '✓' : '○'}</span>
                      <span>3. Me alejé de vidrios y estantes peligrosos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setInlineChecklist((prev) => ({ ...prev, backpackGrabbed: !prev.backpackGrabbed }))
                      }
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        inlineChecklist.backpackGrabbed
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{inlineChecklist.backpackGrabbed ? '✓' : '○'}</span>
                      <span>4. Tomé la mochila de emergencia de 72h</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 4: 🆘 CENTRO SOS & SUPERVIVENCIA (con sub-pestañas)            */}
        {/* ========================================================================= */}
        {activeTab === 'sos' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* SOS Sub-Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSosSubTab('main'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    sosSubTab === 'main'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>🆘 SOS Central</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSosSubTab('hazards'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    sosSubTab === 'hazards'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>⚠️ Amenazas</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSosSubTab('family'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    sosSubTab === 'family'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>👨‍👩‍👧‍👦 Familia</span>
                </button>
              </div>

              {/* SOS Sub-Content */}
              {sosSubTab === 'main' && (
                <EmergencyCenter
                  country={country}
                  selectedEvent={selectedEvent}
                  onUpdateWaveSimulation={setWaveSimulation}
                  userCoords={userCoords}
                  homeLocation={homeLocation}
                />
              )}
              {sosSubTab === 'hazards' && (
                <SecondaryHazards
                  selectedEvent={selectedEvent}
                  events={events}
                  countryName={country.name}
                />
              )}
              {sosSubTab === 'family' && (
                <FamilySafetyCircle />
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 5: 📍 MIS SITIOS (Casa, Colegio, Trabajo, Finca + Evacuación)    */}
        {/* ========================================================================= */}
        {activeTab === 'favorites' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                <h2 className="text-base font-black text-white">Gestor de Ubicaciones Vitales & Protección Personal</h2>
                <p className="text-xs text-slate-400">Edita coordenadas, activa fijación GPS y consulta distancias a sismos y fallas geológicas activas.</p>
              </div>

              <FavoriteLocations
                latestEvent={events.length > 0 ? events[0] : null}
                onFocusLocation={(lat, lng) => {
                  setUserCoords({ lat, lng });
                }}
                onStartPinning={(targetId) => {
                  setActivePinningId(targetId);
                }}
                activePinningId={activePinningId}
                favorites={favorites}
                onFavoritesChange={(newFavs) => setFavorites(newFavs)}
              />

              {/* Puntos de Encuentro y Rutas Seguras */}
              <EvacuationRoutes favorites={favorites} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 6: 📈 SISMÓGRAFO EN TIEMPO REAL                                  */}
        {/* ========================================================================= */}
        {activeTab === 'seismograph' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
              <LocalSeismograph country={country} />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 7: 📁 REGISTRO LOCAL INDEXEDDB                                   */}
        {/* ========================================================================= */}
        {activeTab === 'database' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-6">
              <EventLogTable
                events={loggedEvents}
                onDeleteEvent={async (id) => {
                  await seismicDB.deleteEvent(id);
                  refreshLocalDatabase();
                }}
                onClearAll={async () => {
                  await seismicDB.clearAll();
                  refreshLocalDatabase();
                }}
                onExportJSON={() => seismicDB.exportAsJSON()}
                onRefresh={refreshLocalDatabase}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* APARTADO 8: 🛡️ PREVENCIÓN / COMUNIDAD (3 sub-pestañas)                   */}
        {/* ========================================================================= */}
        {activeTab === 'prevention' && (
          <div className="w-full h-full overflow-y-auto bg-slate-950 p-3 sm:p-6 pb-24 z-20 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Prevention Sub-Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreventionSubTab('community'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    preventionSubTab === 'community'
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>📢 Reportes</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreventionSubTab('vulnerability'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    preventionSubTab === 'vulnerability'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>🏗️ Vulnerabilidad</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreventionSubTab('trainer'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    preventionSubTab === 'trainer'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>🧠 Entrena</span>
                </button>
              </div>

              {/* Prevention Sub-Content */}
              {preventionSubTab === 'community' && (
                <CommunityReports userCoords={userCoords} />
              )}
              {preventionSubTab === 'vulnerability' && (
                <VulnerabilityCalculator userCoords={userCoords} />
              )}
              {preventionSubTab === 'trainer' && (
                <SurvivalTrainer />
              )}
            </div>
          </div>
        )}
      </div>

      {/* REGLA 3 & 6: Barra de Navegación Inferior en Celular FIJA (fixed z-[99999] pointer-events-auto) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-[99999] pointer-events-auto flex justify-around items-center px-2 safe-area-bottom">
        {/* TAB 1: 🗺️ Mapa */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('map');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'map' ? 'text-cyan-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MapIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Mapa</span>
        </button>

        {/* TAB 2: 🌍 Países */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('countries');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
            activeTab === 'countries' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Globe className="w-5 h-5 mb-0.5" />
            {events.length > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-blue-500 text-white rounded-full text-[8px] font-mono font-bold leading-none">
                {events.length > 99 ? '99+' : events.length}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Países</span>
        </button>

        {/* TAB 3: 🚨 Simulacro */}
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            await soundAlarm.ensureAudioUnlocked();
            setActiveTab('drill');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'drill' ? 'text-amber-300 font-bold' : 'text-amber-400'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center -mt-3 shadow-lg shadow-amber-500/20">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <span className="text-[10px] font-bold leading-tight mt-0.5">Simulacro</span>
        </button>

        {/* TAB 4: 🆘 Centro SOS */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('sos');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'sos' ? 'text-rose-400 font-bold' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-5 h-5 mb-0.5 text-rose-500" />
          <span className="text-[10px] leading-tight">SOS</span>
        </button>

        {/* TAB 5: 📍 Mis Sitios */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('favorites');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'favorites' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Sitios</span>
        </button>

        {/* TAB 6: 🛡️ Prevención */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab('prevention');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            activeTab === 'prevention' ? 'text-violet-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Shield className="w-5 h-5 mb-0.5 text-violet-400" />
          <span className="text-[10px] leading-tight">Prevención</span>
        </button>
      </nav>

      {/* MÓDULO 6: Modal Flotante Oficial de Simulacro Sísmico */}
      <SeismicDrillModal
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        country={country}
        favorites={favorites}
        onTriggerMapWave={(sim) => {
          setWaveSimulation(sim);
        }}
      />

      {/* Selector de 195 Países Modal */}
      <CountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountry={country}
        onSelectCountry={(selected) => setCountry(selected)}
        onDetectCountry={handleDetectCurrentCountry}
        isDetecting={isDetectingLocation}
      />

      {/* Modal de Configuración */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onChangeConfig={(newCfg) => setConfig((prev) => ({ ...prev, ...newCfg }))}
        permissionStatus="granted"
      />
    </div>
  );
}

export default App;
