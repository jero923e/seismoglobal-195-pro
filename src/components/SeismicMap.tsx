import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import * as maplibregl from 'maplibre-gl';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CountryProfile } from '../data/countries195';
import type { ClusteredEvent } from '../utils/seismicClassifier';
import {
  getCartoClave,
  setCartoClave,
  getRasterVoyagerUrl,
  getVectorVoyagerGlUrl,
  MAP_CONFIG,
} from '../config/mapConfig';
import {
  reverseGeocodeGranular,
  calculateDistanceKm,
  type GranularLocation,
  type UserHomeLocation,
} from '../services/localityService';
import {
  Layers,
  Crosshair,
  Radar,
  Compass,
  Key,
  Home,
} from 'lucide-react';

export interface WaveSimulationState {
  active: boolean;
  epicenterLat: number;
  epicenterLng: number;
  radiusPKm: number;
  radiusSKm: number;
  etaSeconds: number;
  mag: number;
  locationName: string;
}

export type MapEngineMode = 'raster-voyager' | 'vector-voyager' | 'tactical-radar';

interface SeismicMapProps {
  country: CountryProfile;
  events: ClusteredEvent[];
  selectedEvent: ClusteredEvent | null;
  onSelectEvent: (event: ClusteredEvent) => void;
  userLocation?: { lat: number; lng: number } | null;
  homeLocation?: UserHomeLocation | null;
  onSetHomeLocation?: (home: UserHomeLocation) => void;
  isPinningHome?: boolean;
  onStopPinningHome?: () => void;
  waveSimulation?: WaveSimulationState | null;
}

export const SeismicMap: React.FC<SeismicMapProps> = ({
  country,
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
  homeLocation,
  onSetHomeLocation,
  isPinningHome = false,
  onStopPinningHome,
  waveSimulation,
}) => {
  // Container refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Engine instances
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const leafletCoverageCircleRef = useRef<L.Circle | null>(null);
  const leafletDistanceLineRef = useRef<L.Polyline | null>(null);
  const leafletHomeMarkerRef = useRef<L.Marker | null>(null);
  const leafletWaveLayersRef = useRef<{ circleP: L.Circle | null; circleS: L.Circle | null }>({
    circleP: null,
    circleS: null,
  });

  const maplibreMapRef = useRef<maplibregl.Map | null>(null);
  const maplibreMarkersRef = useRef<maplibregl.Marker[]>([]);
  const maplibreHomeMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Component State
  const [engineMode, setEngineMode] = useState<MapEngineMode>('raster-voyager');
  const [cartoKey, setCartoKeyState] = useState<string>(() => getCartoClave());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [reverseDetails, setReverseDetails] = useState<GranularLocation | null>(null);
  const [isLoadingReverse, setIsLoadingReverse] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Target reference point for distance (Mi Casa if set, else user GPS, else Capital)
  const referencePoint = homeLocation
    ? { lat: homeLocation.lat, lng: homeLocation.lng, label: homeLocation.customLabel || 'Mi Casa / Vereda' }
    : userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Tu GPS Actual' }
    : { lat: country.lat, lng: country.lng, label: `Capital (${country.capital})` };

  // Calculate distance when selectedEvent or referencePoint changes
  useEffect(() => {
    if (!selectedEvent) {
      setDistanceKm(null);
      setReverseDetails(null);
      return;
    }

    const dist = calculateDistanceKm(
      selectedEvent.lat,
      selectedEvent.lng,
      referencePoint.lat,
      referencePoint.lng
    );
    setDistanceKm(Math.round(dist));

    // High-precision reverse geocoding (zoom 18) for the selected earthquake epicenter
    let isCancelled = false;
    setIsLoadingReverse(true);
    reverseGeocodeGranular(selectedEvent.lat, selectedEvent.lng).then((details) => {
      if (!isCancelled) {
        setReverseDetails(details);
        setIsLoadingReverse(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedEvent, referencePoint.lat, referencePoint.lng]);

  // Clean up both map engines
  const cleanupEngines = useCallback(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    if (maplibreMapRef.current) {
      maplibreMapRef.current.remove();
      maplibreMapRef.current = null;
    }
    maplibreMarkersRef.current = [];
  }, []);

  // -------------------------------------------------------------
  // 1. LEAFLET ENGINE (RASTER VOYAGER & TACTICAL RADAR)
  // -------------------------------------------------------------
  const initLeafletMap = useCallback(() => {
    if (!mapContainerRef.current) return;
    cleanupEngines();

    const zoom = calculateZoom(country.maxradiuskm);
    const map = L.map(mapContainerRef.current, {
      center: [country.lat, country.lng],
      zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const rasterUrl = getRasterVoyagerUrl(cartoKey);
    const tileLayer = L.tileLayer(rasterUrl, {
      maxZoom: MAP_CONFIG.maxZoom,
      subdomains: 'abcd',
    });

    tileLayer.on('tileerror', () => {
      // Fallback automatically to OSM standard if custom key or Carto fails
      if (leafletTileLayerRef.current === tileLayer) {
        map.removeLayer(tileLayer);
        const osmFallback = L.tileLayer(MAP_CONFIG.osmFallbackUrl, {
          maxZoom: 19,
        }).addTo(map);
        leafletTileLayerRef.current = osmFallback;
      }
    });

    tileLayer.addTo(map);
    leafletTileLayerRef.current = tileLayer;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    leafletMarkersLayerRef.current = markersLayer;

    // Handle map click when "Fijar Mi Casa" is active
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (isPinningHome && onSetHomeLocation) {
        const { lat, lng } = e.latlng;
        try {
          const granular = await reverseGeocodeGranular(lat, lng);
          const newHome: UserHomeLocation = {
            name: granular.displayName,
            customLabel: granular.vereda
              ? `Mi Vereda: ${granular.vereda}`
              : granular.municipality
              ? `Mi Municipio: ${granular.municipality}`
              : `Mi Casa en ${country.name}`,
            lat,
            lng,
            country: granular.country || country.name,
            state: granular.state,
            municipality: granular.municipality,
            vereda: granular.vereda,
            isGps: false,
            updatedAt: new Date().toISOString(),
          };
          onSetHomeLocation(newHome);
          if (onStopPinningHome) onStopPinningHome();
        } catch {
          // Fallback
          onSetHomeLocation({
            name: `Casa / Vereda en ${country.name}`,
            lat,
            lng,
            country: country.name,
            isGps: false,
            updatedAt: new Date().toISOString(),
          });
          if (onStopPinningHome) onStopPinningHome();
        }
      }
    });

    leafletMapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [country, cartoKey, isPinningHome, onSetHomeLocation, onStopPinningHome, cleanupEngines]);

  // -------------------------------------------------------------
  // 2. MAPLIBRE GL ENGINE (VECTORIAL VOYAGER GL)
  // -------------------------------------------------------------
  const initMapLibreGlMap = useCallback(() => {
    if (!mapContainerRef.current) return;
    cleanupEngines();

    const vectorUrl = getVectorVoyagerGlUrl(cartoKey);
    const zoom = calculateZoom(country.maxradiuskm);

    try {
      const glMap = new maplibregl.Map({
        container: mapContainerRef.current,
        style: vectorUrl,
        center: [country.lng, country.lat],
        zoom: zoom - 0.5,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        attributionControl: false,
      });

      glMap.addControl(new maplibregl.NavigationControl(), 'bottom-right');

      glMap.on('error', () => {
        // If vector GL style fails (e.g. invalid key or CORS), fallback cleanly to Raster
        console.warn('MapLibre GL Voyager style fallback to Raster');
      });

      glMap.on('click', async (e: maplibregl.MapMouseEvent) => {
        if (isPinningHome && onSetHomeLocation) {
          const { lat, lng } = e.lngLat;
          const granular = await reverseGeocodeGranular(lat, lng);
          const newHome: UserHomeLocation = {
            name: granular.displayName,
            customLabel: granular.vereda
              ? `Mi Vereda: ${granular.vereda}`
              : granular.municipality
              ? `Mi Municipio: ${granular.municipality}`
              : `Mi Casa en ${country.name}`,
            lat,
            lng,
            country: granular.country || country.name,
            state: granular.state,
            municipality: granular.municipality,
            vereda: granular.vereda,
            isGps: false,
            updatedAt: new Date().toISOString(),
          };
          onSetHomeLocation(newHome);
          if (onStopPinningHome) onStopPinningHome();
        }
      });

      maplibreMapRef.current = glMap;
    } catch (err) {
      console.error('Error initializing MapLibre GL:', err);
      // Fallback to Raster
      setEngineMode('raster-voyager');
    }
  }, [country, cartoKey, isPinningHome, onSetHomeLocation, onStopPinningHome, cleanupEngines]);

  // Switch engine on mode change
  useEffect(() => {
    if (engineMode === 'vector-voyager') {
      initMapLibreGlMap();
    } else {
      initLeafletMap();
    }

    return () => {
      cleanupEngines();
    };
  }, [engineMode, initLeafletMap, initMapLibreGlMap, cleanupEngines]);

  // Handle Country Change (flyTo)
  useEffect(() => {
    const zoom = calculateZoom(country.maxradiuskm);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([country.lat, country.lng], zoom, {
        duration: 1.4,
      });

      if (leafletCoverageCircleRef.current) {
        leafletCoverageCircleRef.current.remove();
      }

      const circle = L.circle([country.lat, country.lng], {
        radius: country.maxradiuskm * 1000,
        color: engineMode === 'tactical-radar' ? '#00ffcc' : '#0284c7',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: engineMode === 'tactical-radar' ? '#00ffcc' : '#0284c7',
        fillOpacity: 0.04,
      }).addTo(leafletMapRef.current);

      leafletCoverageCircleRef.current = circle;
    }

    if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [country.lng, country.lat],
        zoom: zoom - 0.5,
        duration: 1400,
      });
    }
  }, [country, engineMode]);

  // Fly to selected event when chosen in list or search
  useEffect(() => {
    if (!selectedEvent) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([selectedEvent.lat, selectedEvent.lng], Math.max(leafletMapRef.current.getZoom(), 8), {
        duration: 1.2,
      });
    }

    if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [selectedEvent.lng, selectedEvent.lat],
        zoom: Math.max(maplibreMapRef.current.getZoom(), 8),
        duration: 1200,
      });
    }
  }, [selectedEvent]);

  // -------------------------------------------------------------
  // RENDER MARKERS (LEAFLET & MAPLIBRE GL)
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Render in Leaflet
    if (leafletMapRef.current && leafletMarkersLayerRef.current) {
      const layer = leafletMarkersLayerRef.current;
      layer.clearLayers();

      events.forEach((ev) => {
        const isSelected = selectedEvent?.id === ev.id;
        const isMainshock = ev.classification === 'MAINSHOCK';
        const isAftershock = ev.classification === 'AFTERSHOCK';

        const color = getMagnitudeColor(ev.mag);
        const ringSize = Math.max(26, Math.min(68, Math.round(ev.mag * 10)));
        const coreSize = Math.max(12, Math.min(26, Math.round(ev.mag * 3.8)));

        const customDivIcon = L.divIcon({
          className: 'seismic-leaflet-custom-marker',
          html: `
            <div class="seismic-marker-concentric" style="width: ${ringSize}px; height: ${ringSize}px; color: ${color};">
              <div class="seismic-marker-ring" style="width: ${ringSize}px; height: ${ringSize}px;"></div>
              ${ev.mag >= 4.5 ? `<div class="seismic-marker-ring-delayed" style="width: ${ringSize * 1.3}px; height: ${ringSize * 1.3}px;"></div>` : ''}
              <div class="seismic-marker-core" style="
                width: ${coreSize}px; 
                height: ${coreSize}px; 
                background: ${color}; 
                border: ${isSelected ? '3px solid #ffffff' : isMainshock ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.7)'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: monospace;
                font-size: 9px;
                font-weight: 900;
                color: #ffffff;
              ">
                ${ev.mag >= 4.0 ? ev.mag.toFixed(1) : ''}
              </div>
            </div>
          `,
          iconSize: [ringSize, ringSize],
          iconAnchor: [ringSize / 2, ringSize / 2],
        });

        const marker = L.marker([ev.lat, ev.lng], {
          icon: customDivIcon,
          zIndexOffset: isSelected ? 500 : isMainshock ? 200 : 50,
        });

        // Popup HTML
        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 220px; color: #0f172a; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 16px; font-weight: 900; color: ${color};">
                M ${ev.mag.toFixed(1)} <span style="font-size: 11px; color: #64748b;">${ev.magType}</span>
              </span>
              <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${
                isMainshock ? '#fee2e2; color: #b91c1c;' : isAftershock ? '#fef3c7; color: #92400e;' : '#f1f5f9; color: #475569;'
              }">
                ${isMainshock ? 'SISMO PRINCIPAL' : isAftershock ? 'RÉPLICA' : 'AISLADO'}
              </span>
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
              ${ev.place}
            </div>
            <div style="font-size: 11px; color: #334155; line-height: 1.4; background: #f8fafc; padding: 6px; border-radius: 8px;">
              <div><strong>Profundidad:</strong> ${ev.depthKm} km</div>
              <div><strong>Intensidad Mercalli:</strong> ${ev.mercalliRoman} (${ev.mercalliDescription})</div>
              <div><strong>Fecha:</strong> ${ev.timeFormatted}</div>
              ${
                isMainshock && ev.aftershockCount > 0
                  ? `<div style="margin-top: 4px; color: #b45309; font-weight: bold;">⚡ ${ev.aftershockCount} réplicas registradas</div>`
                  : ''
              }
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onSelectEvent(ev);
        });

        layer.addLayer(marker);
      });
    }

    // 2. Render in MapLibre GL
    if (maplibreMapRef.current) {
      const glMap = maplibreMapRef.current;
      maplibreMarkersRef.current.forEach((m) => m.remove());
      maplibreMarkersRef.current = [];

      events.forEach((ev) => {
        const isSelected = selectedEvent?.id === ev.id;
        const color = getMagnitudeColor(ev.mag);
        const coreSize = Math.max(12, Math.min(26, Math.round(ev.mag * 3.8)));

        const el = document.createElement('div');
        el.className = 'maplibre-custom-seismic-marker';
        el.style.width = `${coreSize}px`;
        el.style.height = `${coreSize}px`;
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = isSelected ? '3px solid #ffffff' : '1.5px solid rgba(255,255,255,0.8)';
        el.style.boxShadow = `0 0 10px ${color}`;
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.color = '#ffffff';
        el.style.fontSize = '9px';
        el.style.fontWeight = 'bold';
        el.style.fontFamily = 'monospace';
        el.innerText = ev.mag >= 4.0 ? ev.mag.toFixed(1) : '';

        el.addEventListener('click', () => {
          onSelectEvent(ev);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ev.lng, ev.lat])
          .addTo(glMap);

        maplibreMarkersRef.current.push(marker);
      });
    }
  }, [events, selectedEvent, onSelectEvent, engineMode]);

  // -------------------------------------------------------------
  // "MI CASA / MI VEREDA" MARKER & DISTANCE LINE
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Leaflet Home Marker & Distance line
    if (leafletMapRef.current) {
      const map = leafletMapRef.current;

      if (leafletHomeMarkerRef.current) {
        leafletHomeMarkerRef.current.remove();
        leafletHomeMarkerRef.current = null;
      }
      if (leafletDistanceLineRef.current) {
        leafletDistanceLineRef.current.remove();
        leafletDistanceLineRef.current = null;
      }

      // Draw Home Marker if set
      if (homeLocation) {
        const homeIcon = L.divIcon({
          className: 'custom-home-marker-icon',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: seismic-pulse 2s infinite;"></div>
              <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 12px #34d399; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                🏠
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([homeLocation.lat, homeLocation.lng], {
          icon: homeIcon,
          zIndexOffset: 1200,
        }).addTo(map);

        marker.bindTooltip(`🏠 ${homeLocation.customLabel || homeLocation.name}`, {
          direction: 'top',
          offset: [0, -14],
          className: 'font-mono text-xs font-bold bg-slate-900 text-emerald-300 border-emerald-500',
        });

        leafletHomeMarkerRef.current = marker;
      }

      // Draw Distance line from selectedEvent to referencePoint
      if (selectedEvent) {
        const line = L.polyline(
          [
            [selectedEvent.lat, selectedEvent.lng],
            [referencePoint.lat, referencePoint.lng],
          ],
          {
            color: '#f43f5e',
            weight: 2.5,
            dashArray: '6, 8',
            opacity: 0.9,
          }
        ).addTo(map);

        leafletDistanceLineRef.current = line;
      }
    }

    // 2. MapLibre GL Home Marker
    if (maplibreMapRef.current) {
      const glMap = maplibreMapRef.current;
      if (maplibreHomeMarkerRef.current) {
        maplibreHomeMarkerRef.current.remove();
        maplibreHomeMarkerRef.current = null;
      }

      if (homeLocation) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 10px #34d399; display: flex; align-items: center; justify-content: center; font-size: 14px;">
            🏠
          </div>
        `;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([homeLocation.lng, homeLocation.lat])
          .addTo(glMap);
        maplibreHomeMarkerRef.current = marker;
      }
    }
  }, [homeLocation, selectedEvent, referencePoint, engineMode]);

  // -------------------------------------------------------------
  // P & S WAVE SIMULATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (leafletWaveLayersRef.current.circleP) {
      leafletWaveLayersRef.current.circleP.remove();
      leafletWaveLayersRef.current.circleP = null;
    }
    if (leafletWaveLayersRef.current.circleS) {
      leafletWaveLayersRef.current.circleS.remove();
      leafletWaveLayersRef.current.circleS = null;
    }

    if (!waveSimulation || !waveSimulation.active) return;

    // Onda P (compresional, rápida, azul/cian)
    const circleP = L.circle([waveSimulation.epicenterLat, waveSimulation.epicenterLng], {
      radius: waveSimulation.radiusPKm * 1000,
      color: '#06b6d4',
      weight: 2.5,
      dashArray: '5, 5',
      fillColor: '#06b6d4',
      fillOpacity: 0.1,
    }).addTo(map);

    // Onda S (cizalla, destructiva, roja/carmesí)
    const circleS = L.circle([waveSimulation.epicenterLat, waveSimulation.epicenterLng], {
      radius: waveSimulation.radiusSKm * 1000,
      color: '#f43f5e',
      weight: 3.5,
      fillColor: '#f43f5e',
      fillOpacity: 0.2,
    }).addTo(map);

    leafletWaveLayersRef.current.circleP = circleP;
    leafletWaveLayersRef.current.circleS = circleS;
  }, [waveSimulation]);

  // Save Carto Clave
  const handleSaveCartoClave = () => {
    setCartoClave(keyInputValue);
    setCartoKeyState(keyInputValue);
    setIsKeyModalOpen(false);

    // Re-init current engine with new key
    if (engineMode === 'vector-voyager') {
      initMapLibreGlMap();
    } else {
      initLeafletMap();
    }
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* 
        CRITICAL EXPLICIT REQUIREMENT: 
        h-[600px] w-full relative z-10 for the primary map DOM container
      */}
      <div
        ref={mapContainerRef}
        className={`h-[600px] w-full relative z-10 outline-none ${
          isPinningHome ? 'cursor-crosshair' : ''
        }`}
        tabIndex={0}
      />

      {/* Pinning Home Location Indicator Banner */}
      {isPinningHome && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Home className="w-4 h-4" />
          <span className="text-xs font-black tracking-wide">
            Haz clic en el mapa para fijar tu casa o vereda exacta
          </span>
          <button
            onClick={onStopPinningHome}
            className="ml-2 px-2 py-0.5 rounded-full bg-black/30 hover:bg-black/50 text-[10px] font-mono"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Radar Tactical Canvas Scanning Overlay */}
      {engineMode === 'tactical-radar' && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-[520px] h-[520px] rounded-full border border-cyan-500/40 relative">
              <div className="absolute inset-0 m-auto w-[360px] h-[360px] rounded-full border border-cyan-500/30"></div>
              <div className="absolute inset-0 m-auto w-[180px] h-[180px] rounded-full border border-cyan-500/20"></div>
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-400/30"></div>
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-400/30"></div>
            </div>
          </div>
          <div className="radar-sweep-line"></div>
          <div className="absolute top-4 right-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            RADAR TÁCTICO VOYAGER
          </div>
        </div>
      )}

      {/* Top Left: Dual Engine Voyager Switcher & Clave Config */}
      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 shadow-2xl text-xs space-y-2 max-w-[310px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-slate-200 font-black">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Motor Cartográfico Dual</span>
            </div>
            <button
              onClick={() => {
                setKeyInputValue(cartoKey);
                setIsKeyModalOpen(true);
              }}
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1"
              title="Configurar clave VITE_CARTO_CLAVE"
            >
              <Key className="w-3 h-3 text-amber-400" />
              <span>{cartoKey ? 'Clave Activa' : 'Configurar Clave'}</span>
            </button>
          </div>

          {/* Engine Selector: Raster Voyager (Leaflet) / Vectorial GL (MapLibre) / Radar */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => setEngineMode('raster-voyager')}
              className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                engineMode === 'raster-voyager'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raster Voyager
            </button>
            <button
              onClick={() => setEngineMode('vector-voyager')}
              className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                engineMode === 'vector-voyager'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vectorial GL
            </button>
            <button
              onClick={() => setEngineMode('tactical-radar')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all text-center ${
                engineMode === 'tactical-radar'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radar className="w-3 h-3" />
              Radar
            </button>
          </div>

          {/* Zoom Level Indicator & Street Level Note */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Nivel: Vereda & Calle (Zoom 1-19)</span>
            <span className="text-cyan-400 font-bold">CARTO Voyager</span>
          </div>
        </div>
      </div>

      {/* Top Right: Quick Actions */}
      <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2 pointer-events-auto">
        <button
          onClick={() => {
            if (leafletMapRef.current) {
              leafletMapRef.current.flyTo([country.lat, country.lng], calculateZoom(country.maxradiuskm), { duration: 1 });
            }
            if (maplibreMapRef.current) {
              maplibreMapRef.current.flyTo({ center: [country.lng, country.lat], zoom: calculateZoom(country.maxradiuskm) - 0.5, duration: 1000 });
            }
          }}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 shadow-xl backdrop-blur-md transition-all hover:text-cyan-400"
          title={`Recentrar en ${country.name}`}
        >
          <Compass className="w-4 h-4" />
        </button>

        {homeLocation && (
          <button
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.flyTo([homeLocation.lat, homeLocation.lng], 15, { duration: 1.2 });
              }
              if (maplibreMapRef.current) {
                maplibreMapRef.current.flyTo({ center: [homeLocation.lng, homeLocation.lat], zoom: 15, duration: 1200 });
              }
            }}
            className="p-2.5 rounded-2xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 shadow-xl backdrop-blur-md transition-all"
            title="Enfocar Mi Casa / Vereda"
          >
            <Home className="w-4 h-4" />
          </button>
        )}

        {selectedEvent && (
          <button
            onClick={() => {
              if (leafletMapRef.current) {
                leafletMapRef.current.flyTo([selectedEvent.lat, selectedEvent.lng], 9, { duration: 1 });
              }
              if (maplibreMapRef.current) {
                maplibreMapRef.current.flyTo({ center: [selectedEvent.lng, selectedEvent.lat], zoom: 9, duration: 1000 });
              }
            }}
            className="p-2.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 shadow-xl backdrop-blur-md transition-all"
            title="Enfocar Epicentro Seleccionado"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Center: High Precision Reverse Geocoding Banner for Selected Earthquake (zoom 18) */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-20 bg-slate-900/95 backdrop-blur-md border border-rose-500/50 rounded-2xl p-3 shadow-2xl max-w-md pointer-events-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-xs font-mono font-bold text-rose-400 uppercase">
                  Epicentro Seleccionado (M {selectedEvent.mag.toFixed(1)})
                </span>
              </div>

              {/* Granular Micro-location breakdown */}
              <div className="mt-1 text-xs font-bold text-white">
                {isLoadingReverse ? (
                  <span className="text-slate-400 font-mono text-[11px] animate-pulse">
                    Geocodificando a nivel de vereda y municipio...
                  </span>
                ) : reverseDetails ? (
                  <div className="space-y-0.5">
                    <div className="text-slate-200">{reverseDetails.displayName}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      {reverseDetails.vereda && (
                        <span className="text-emerald-300 font-bold">Vereda: {reverseDetails.vereda}</span>
                      )}
                      {reverseDetails.municipality && (
                        <span>• Municipio: {reverseDetails.municipality}</span>
                      )}
                      {reverseDetails.state && (
                        <span>• {reverseDetails.state}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span>{selectedEvent.place}</span>
                )}
              </div>

              {/* Exact distance to Mi Casa / User */}
              {distanceKm !== null && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Distancia a {referencePoint.label}:</span>
                  <span className="font-bold text-rose-400">{distanceKm} km</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carto Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-white font-black text-base">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Configuración de Clave CARTO Voyager</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ingresa tu clave de acceso de CARTO para activar las teselas Raster y Vectoriales Voyager de alta velocidad con tu cuenta, o déjala en blanco para usar el acceso estándar abierto.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">
                Clave CARTO (VITE_CARTO_CLAVE):
              </label>
              <input
                type="text"
                value={keyInputValue}
                onChange={(e) => setKeyInputValue(e.target.value)}
                placeholder="Ejemplo: TU_CLAVE_CARTO_VOYAGER"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div><strong>URL Raster:</strong> {getRasterVoyagerUrl(keyInputValue)}</div>
              <div><strong>URL Vectorial:</strong> {getVectorVoyagerGlUrl(keyInputValue)}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCartoClave}
                className="px-5 py-2 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg"
              >
                Guardar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getMagnitudeColor(mag: number): string {
  if (mag < 3.0) return '#10b981'; // Emerald
  if (mag < 4.5) return '#f59e0b'; // Amber
  if (mag < 6.0) return '#f97316'; // Orange
  return '#e11d48'; // Rose
}

function calculateZoom(maxradiuskm: number): number {
  if (maxradiuskm <= 150) return 8;
  if (maxradiuskm <= 350) return 7;
  if (maxradiuskm <= 700) return 6;
  if (maxradiuskm <= 1200) return 5;
  if (maxradiuskm <= 2000) return 4;
  return 3;
}
