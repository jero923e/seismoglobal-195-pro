import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import * as maplibregl from 'maplibre-gl';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CountryProfile } from '../data/countries195';
import type { ClusteredEvent } from '../utils/seismicClassifier';
import type { FavoriteLocation } from './FavoriteLocations';
import {
  getCartoClave,
  setCartoClave,
  getRasterVoyagerUrl,
  getVectorVoyagerGlUrl,
  getGoogleStreetViewUrl,
  getGoogleMapsSearchUrl,
  MAP_CONFIG,
  MAP_LAYERS,
} from '../config/mapConfig';
import {
  GEOLOGICAL_FAULTS,
  getNearestFault,
  type GeologicalFault,
} from '../services/faultsService';
import {
  reverseGeocodeGranular,
  calculateDistanceKm,
  type GranularLocation,
} from '../services/localityService';
import {
  Plus,
  Minus,
  Navigation,
  Compass,
  Layers,
  Key,
  Crosshair,
  Flame,
  X,
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

export type MapLayerId = 'google_streets' | 'google_hybrid' | 'google_terrain' | 'voyager' | 'dark' | 'vector_gl';

interface GoogleStyleMapProps {
  country: CountryProfile;
  events: ClusteredEvent[];
  selectedEvent: ClusteredEvent | null;
  onSelectEvent: (event: ClusteredEvent) => void;
  userLocation?: { lat: number; lng: number } | null;
  favorites: FavoriteLocation[];
  onSetLocationCoords?: (id: string, lat: number, lng: number, details: GranularLocation) => void;
  activePinningId: string | null;
  onStopPinning?: () => void;
  waveSimulation?: WaveSimulationState | null;
}

export const GoogleStyleMap: React.FC<GoogleStyleMapProps> = ({
  country,
  events,
  selectedEvent,
  onSelectEvent,
  userLocation,
  favorites,
  onSetLocationCoords,
  activePinningId,
  onStopPinning,
  waveSimulation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Map instances
  const leafletMapRef = useRef<L.Map | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteOverlayRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const faultsLayerRef = useRef<L.LayerGroup | null>(null);
  const favoritesLayerRef = useRef<L.LayerGroup | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);
  const waveLayersRef = useRef<{ circleP: L.Circle | null; circleS: L.Circle | null }>({
    circleP: null,
    circleS: null,
  });

  const maplibreMapRef = useRef<maplibregl.Map | null>(null);
  const maplibreMarkersRef = useRef<maplibregl.Marker[]>([]);

  // State: Default to Google Maps Satélite Híbrido for high visual impact
  const [activeLayer, setActiveLayer] = useState<MapLayerId>('google_hybrid');
  const [showFaults, setShowFaults] = useState<boolean>(true);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [cartoKey, setCartoKeyState] = useState<string>(() => getCartoClave());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [selectedFault, setSelectedFault] = useState<GeologicalFault | null>(null);
  const [selectedFaultDistKm, setSelectedFaultDistKm] = useState<number | null>(null);
  const [reverseDetails, setReverseDetails] = useState<GranularLocation | null>(null);
  const [isLoadingReverse, setIsLoadingReverse] = useState<boolean>(false);
  const [distanceToUserKm, setDistanceToUserKm] = useState<number | null>(null);

  // Target reference location (Casa if set, else user GPS, else Capital)
  const casaLocation = favorites.find((f) => f.id === 'casa' && f.isSet);
  const referencePoint = casaLocation
    ? { lat: casaLocation.lat, lng: casaLocation.lng, label: 'Mi Casa' }
    : userLocation
    ? { lat: userLocation.lat, lng: userLocation.lng, label: 'Tu GPS' }
    : { lat: country.lat, lng: country.lng, label: `Capital (${country.capital})` };

  // Calculate distance & reverse geocoding for selected earthquake
  useEffect(() => {
    if (!selectedEvent) {
      setDistanceToUserKm(null);
      setReverseDetails(null);
      return;
    }

    const dist = calculateDistanceKm(
      selectedEvent.lat,
      selectedEvent.lng,
      referencePoint.lat,
      referencePoint.lng
    );
    setDistanceToUserKm(Math.round(dist));

    let isCancelled = false;
    setIsLoadingReverse(true);
    reverseGeocodeGranular(selectedEvent.lat, selectedEvent.lng).then((res) => {
      if (!isCancelled) {
        setReverseDetails(res);
        setIsLoadingReverse(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [selectedEvent, referencePoint.lat, referencePoint.lng]);

  // Clean up map engines
  const cleanupMaps = useCallback(() => {
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
  // 1. LEAFLET INITIALIZATION (GOOGLE MAPS STYLE)
  // -------------------------------------------------------------
  const initLeafletMap = useCallback(() => {
    if (!mapContainerRef.current) return;
    cleanupMaps();

    const zoom = calculateZoom(country.maxradiuskm);
    const map = L.map(mapContainerRef.current, {
      center: [country.lat, country.lng],
      zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: false, // We use custom Google Maps style controls
      attributionControl: false,
    });

    // Official Google Maps & Carto Voyager Layer Selection
    let tileUrl = MAP_LAYERS.google_hybrid.url;
    let maxLayerZoom = 20;
    let subdomains: string | string[] = ['mt0', 'mt1', 'mt2', 'mt3'];

    if (activeLayer === 'google_streets') {
      tileUrl = MAP_LAYERS.google_streets.url;
      maxLayerZoom = 20;
      subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    } else if (activeLayer === 'google_hybrid') {
      tileUrl = MAP_LAYERS.google_hybrid.url;
      maxLayerZoom = 20;
      subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    } else if (activeLayer === 'google_terrain') {
      tileUrl = MAP_LAYERS.google_terrain.url;
      maxLayerZoom = 20;
      subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    } else if (activeLayer === 'voyager') {
      tileUrl = getRasterVoyagerUrl(cartoKey);
      maxLayerZoom = 20;
      subdomains = 'abcd';
    } else if (activeLayer === 'dark') {
      tileUrl = MAP_LAYERS.dark.url;
      maxLayerZoom = 20;
      subdomains = 'abcd';
    }

    const baseTile = L.tileLayer(tileUrl, {
      maxZoom: maxLayerZoom,
      subdomains,
    });

    baseTile.on('tileerror', () => {
      if (activeTileLayerRef.current === baseTile) {
        map.removeLayer(baseTile);
        const osmFallback = L.tileLayer(MAP_CONFIG.osmFallbackUrl, { maxZoom: 19 }).addTo(map);
        activeTileLayerRef.current = osmFallback;
      }
    });

    baseTile.addTo(map);
    activeTileLayerRef.current = baseTile;

    if (satelliteOverlayRef.current) {
      satelliteOverlayRef.current.remove();
      satelliteOverlayRef.current = null;
    }

    // Layer groups
    const faultsLayer = L.layerGroup().addTo(map);
    faultsLayerRef.current = faultsLayer;

    const favoritesLayer = L.layerGroup().addTo(map);
    favoritesLayerRef.current = favoritesLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Handle click for pinning locations
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (activePinningId && onSetLocationCoords) {
        const { lat, lng } = e.latlng;
        try {
          const details = await reverseGeocodeGranular(lat, lng);
          onSetLocationCoords(activePinningId, lat, lng, details);
          if (onStopPinning) onStopPinning();
        } catch {
          if (onStopPinning) onStopPinning();
        }
      }
    });

    leafletMapRef.current = map;

    // GUARANTEE: Invalidate size immediately to prevent gray tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [country, cartoKey, activeLayer, activePinningId, onSetLocationCoords, onStopPinning, cleanupMaps]);

  // -------------------------------------------------------------
  // 2. MAPLIBRE GL INITIALIZATION (VECTORIAL VOYAGER GL)
  // -------------------------------------------------------------
  const initMapLibreGl = useCallback(() => {
    if (!mapContainerRef.current) return;
    cleanupMaps();

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

      glMap.on('error', () => {
        console.warn('MapLibre GL Voyager style fallback');
      });

      glMap.on('click', async (e: maplibregl.MapMouseEvent) => {
        if (activePinningId && onSetLocationCoords) {
          const { lat, lng } = e.lngLat;
          const details = await reverseGeocodeGranular(lat, lng);
          onSetLocationCoords(activePinningId, lat, lng, details);
          if (onStopPinning) onStopPinning();
        }
      });

      maplibreMapRef.current = glMap;
    } catch {
      setActiveLayer('voyager');
    }
  }, [country, cartoKey, activePinningId, onSetLocationCoords, onStopPinning, cleanupMaps]);

  // Switch engine on layer change
  useEffect(() => {
    if (activeLayer === 'vector_gl') {
      initMapLibreGl();
    } else {
      initLeafletMap();
    }

    return () => {
      cleanupMaps();
    };
  }, [activeLayer, initLeafletMap, initMapLibreGl, cleanupMaps]);

  // Invalidate map size on window resize
  useEffect(() => {
    const handleResize = () => {
      if (leafletMapRef.current) leafletMapRef.current.invalidateSize();
      if (maplibreMapRef.current) maplibreMapRef.current.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Smooth camera flight when country changes
  useEffect(() => {
    const zoom = calculateZoom(country.maxradiuskm);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([country.lat, country.lng], zoom, {
        duration: 1.4,
      });
    }

    if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [country.lng, country.lat],
        zoom: zoom - 0.5,
        duration: 1400,
      });
    }
  }, [country]);

  // Smooth camera flight when an event is selected
  useEffect(() => {
    if (!selectedEvent) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([selectedEvent.lat, selectedEvent.lng], Math.max(leafletMapRef.current.getZoom(), 9), {
        duration: 1.2,
      });
    }

    if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({
        center: [selectedEvent.lng, selectedEvent.lat],
        zoom: Math.max(maplibreMapRef.current.getZoom(), 9),
        duration: 1200,
      });
    }
  }, [selectedEvent]);

  // -------------------------------------------------------------
  // RENDER ACTIVE GEOLOGICAL FAULTS LAYER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!leafletMapRef.current || !faultsLayerRef.current) return;
    const layer = faultsLayerRef.current;
    layer.clearLayers();

    if (!showFaults) return;

    GEOLOGICAL_FAULTS.forEach((fault) => {
      const isCritical = fault.activityLevel.includes('Crítico');
      const color = isCritical ? '#ef4444' : '#f97316'; // Red or Orange

      const polyline = L.polyline(fault.coordinates, {
        color,
        weight: 3.5,
        dashArray: '8, 6',
        opacity: 0.88,
      });

      // Fault details tooltip and click handler
      const tooltipContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 11px;">
          <div style="font-weight: 800; color: ${color};">${fault.name}</div>
          <div style="font-size: 10px; color: #64748b;">${fault.slipType} • ${fault.activityLevel}</div>
        </div>
      `;
      polyline.bindTooltip(tooltipContent, { sticky: true });

      polyline.on('click', () => {
        // Calculate distance from fault to user's house
        const nearestToFault = getNearestFault(referencePoint.lat, referencePoint.lng);
        setSelectedFault(fault);
        setSelectedFaultDistKm(nearestToFault.distanceKm);
      });

      layer.addLayer(polyline);
    });
  }, [showFaults, referencePoint]);

  // -------------------------------------------------------------
  // RENDER FAVORITE LOCATIONS (CASA, COLEGIO, TRABAJO, FINCA)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!leafletMapRef.current || !favoritesLayerRef.current) return;
    const layer = favoritesLayerRef.current;
    layer.clearLayers();

    favorites.forEach((fav) => {
      if (!fav.isSet) return;

      const favIcon = L.divIcon({
        className: 'custom-favorite-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(6, 182, 212, 0.3); animation: seismic-pulse 2.2s infinite;"></div>
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #0f172a; border: 2.5px solid #06b6d4; box-shadow: 0 0 10px rgba(6, 182, 212, 0.8); display: flex; align-items: center; justify-content: center; font-size: 13px;">
              ${fav.emoji}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([fav.lat, fav.lng], {
        icon: favIcon,
        zIndexOffset: 1500,
      });

      const nearestFault = getNearestFault(fav.lat, fav.lng);

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px; color: #0f172a; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 13px; color: #0f172a;">
            <span>${fav.emoji}</span>
            <span>${fav.name}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            <div><strong>Ubicación:</strong> ${fav.municipality || 'Fijado'}</div>
            ${fav.vereda ? `<div><strong>Vereda:</strong> ${fav.vereda}</div>` : ''}
            <div><strong>Falla activa cercana:</strong> ${nearestFault.fault.shortName} (${nearestFault.distanceKm} km)</div>
          </div>
          <div style="margin-top: 6px; display: flex; gap: 4px;">
            <a href="${getGoogleStreetViewUrl(fav.lat, fav.lng)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0284c7; color: #ffffff; text-decoration: none; padding: 4px 6px; border-radius: 5px; font-size: 9px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">
              📷 Street View
            </a>
            <a href="${getGoogleMapsSearchUrl(fav.lat, fav.lng)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #334155; color: #ffffff; text-decoration: none; padding: 4px 6px; border-radius: 5px; font-size: 9px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">
              🗺️ Google Maps
            </a>
          </div>
        </div>
      `);

      layer.addLayer(marker);
    });
  }, [favorites]);

  // -------------------------------------------------------------
  // RENDER SEISMIC EVENT MARKERS
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Leaflet Markers
    if (leafletMapRef.current && markersLayerRef.current) {
      const layer = markersLayerRef.current;
      layer.clearLayers();

      events.forEach((ev) => {
        const isSelected = selectedEvent?.id === ev.id;
        const isMainshock = ev.classification === 'MAINSHOCK';
        const isAftershock = ev.classification === 'AFTERSHOCK';

        const color = getMagnitudeColor(ev.mag);
        const ringSize = Math.max(26, Math.min(68, Math.round(ev.mag * 10)));
        const coreSize = Math.max(12, Math.min(26, Math.round(ev.mag * 3.8)));

        const divIcon = L.divIcon({
          className: 'seismic-concentric-icon',
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
          icon: divIcon,
          zIndexOffset: isSelected ? 500 : isMainshock ? 200 : 50,
        });

        const nearestF = getNearestFault(ev.lat, ev.lng);

        const popup = `
          <div style="font-family: system-ui, sans-serif; min-width: 220px; color: #0f172a; padding: 4px;">
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
              <div><strong>Intensidad:</strong> ${ev.mercalliRoman} (${ev.mercalliDescription})</div>
              <div><strong>Falla geológica:</strong> ${nearestF.fault.shortName} (${nearestF.distanceKm} km)</div>
              <div><strong>Fecha:</strong> ${ev.timeFormatted}</div>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 6px;">
              <a href="${getGoogleStreetViewUrl(ev.lat, ev.lng)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #0284c7; color: #ffffff; text-decoration: none; padding: 6px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                <span>📷 Street View 360°</span>
              </a>
              <a href="${getGoogleMapsSearchUrl(ev.lat, ev.lng)}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #334155; color: #ffffff; text-decoration: none; padding: 6px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                <span>🗺️ Google Maps</span>
              </a>
            </div>
          </div>
        `;
        marker.bindPopup(popup);

        marker.on('click', () => {
          onSelectEvent(ev);
        });

        layer.addLayer(marker);
      });
    }

    // 2. MapLibre GL Markers
    if (maplibreMapRef.current) {
      const glMap = maplibreMapRef.current;
      maplibreMarkersRef.current.forEach((m) => m.remove());
      maplibreMarkersRef.current = [];

      events.forEach((ev) => {
        const color = getMagnitudeColor(ev.mag);
        const coreSize = Math.max(12, Math.min(26, Math.round(ev.mag * 3.8)));

        const el = document.createElement('div');
        el.style.width = `${coreSize}px`;
        el.style.height = `${coreSize}px`;
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = '2px solid #ffffff';
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

        el.addEventListener('click', () => onSelectEvent(ev));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ev.lng, ev.lat])
          .addTo(glMap);

        maplibreMarkersRef.current.push(marker);
      });
    }
  }, [events, selectedEvent, onSelectEvent, activeLayer]);

  // Distance line between selected earthquake and user's reference point
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (distanceLineRef.current) {
      distanceLineRef.current.remove();
      distanceLineRef.current = null;
    }

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

      distanceLineRef.current = line;
    }
  }, [selectedEvent, referencePoint]);

  // P & S Wave Simulation Rings
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    if (waveLayersRef.current.circleP) {
      waveLayersRef.current.circleP.remove();
      waveLayersRef.current.circleP = null;
    }
    if (waveLayersRef.current.circleS) {
      waveLayersRef.current.circleS.remove();
      waveLayersRef.current.circleS = null;
    }

    if (!waveSimulation || !waveSimulation.active) return;

    // Onda P (amarillo/cian, compresional rápida)
    const circleP = L.circle([waveSimulation.epicenterLat, waveSimulation.epicenterLng], {
      radius: waveSimulation.radiusPKm * 1000,
      color: '#eab308',
      weight: 2.5,
      dashArray: '5, 5',
      fillColor: '#eab308',
      fillOpacity: 0.12,
    }).addTo(map);

    // Onda S (rojo/carmesí, destructiva)
    const circleS = L.circle([waveSimulation.epicenterLat, waveSimulation.epicenterLng], {
      radius: waveSimulation.radiusSKm * 1000,
      color: '#ef4444',
      weight: 3.5,
      fillColor: '#ef4444',
      fillOpacity: 0.22,
    }).addTo(map);

    waveLayersRef.current.circleP = circleP;
    waveLayersRef.current.circleS = circleS;
  }, [waveSimulation]);

  // Zoom in / Zoom out handlers (Google Maps style)
  const handleZoomIn = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomIn();
    if (maplibreMapRef.current) maplibreMapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) leafletMapRef.current.zoomOut();
    if (maplibreMapRef.current) maplibreMapRef.current.zoomOut();
  };

  const handleCenterOnLocation = () => {
    const pt = referencePoint;
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([pt.lat, pt.lng], 15, { duration: 1.2 });
    }
    if (maplibreMapRef.current) {
      maplibreMapRef.current.flyTo({ center: [pt.lng, pt.lat], zoom: 15, duration: 1200 });
    }
  };

  const handleResetNorth = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([country.lat, country.lng], calculateZoom(country.maxradiuskm), { duration: 1 });
    }
    if (maplibreMapRef.current) {
      maplibreMapRef.current.resetNorthPitch({ duration: 1000 });
    }
  };

  return (
    <div className="relative w-full">
      {/* 
        CRITICAL ZERO-FAILURE GUARDRAIL:
        h-[calc(100dvh-200px)] min-h-[480px] md:h-[680px] w-full relative z-0 rounded-2xl overflow-hidden shadow-2xl bg-slate-950
      */}
      <div
        ref={mapContainerRef}
        className={`h-[calc(100dvh-200px)] min-h-[480px] md:h-[680px] w-full relative z-0 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 ${
          activePinningId ? 'cursor-crosshair ring-4 ring-rose-500/80' : ''
        }`}
        tabIndex={0}
      />

      {/* Pinning Banner if active */}
      {activePinningId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-rose-600 text-white px-5 py-2.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Crosshair className="w-4 h-4" />
          <span className="text-xs font-black tracking-wide">
            Haz clic en el mapa para fijar tu ubicación favorita exacta
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onStopPinning) onStopPinning();
            }}
            className="ml-2 px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 text-[10px] font-mono"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* GOOGLE MAPS STYLE FLOATING CONTROLS                       */}
      {/* ========================================================= */}

      {/* BOTTOM-LEFT: Miniature Layer Selector (Google Maps style) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
        <div className="relative">
          {/* Main Thumbnail Trigger Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLayerMenu((prev) => !prev);
            }}
            className="group relative flex items-center gap-2.5 p-1.5 pr-3.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
            title="Capas del mapa (Voyager, Satélite HD, Terreno, Nocturno, Fallas)"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-600 bg-slate-950 flex items-center justify-center shrink-0 shadow-inner">
              <Layers className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Capas</div>
              <div className="text-xs font-black truncate max-w-[100px]">
                {MAP_LAYERS[activeLayer]?.name || 'Capas'}
              </div>
            </div>
          </button>

          {/* Floating Thumbnail Drawer */}
          {showLayerMenu && (
            <div className="absolute bottom-full left-0 mb-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-3xl p-3 shadow-2xl w-72 space-y-3 animate-fade-in z-30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Tipo de Mapa & Capas</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLayerMenu(false);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid of 5 Map Styles */}
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(MAP_LAYERS) as MapLayerId[]).map((layerId) => {
                  const layer = MAP_LAYERS[layerId];
                  const isSelected = activeLayer === layerId;
                  return (
                    <button
                      key={layerId}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLayer(layerId);
                        setShowLayerMenu(false);
                      }}
                      className={`p-2 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{layer.name}</div>
                      <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{layer.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              {/* Active Geological Faults Toggle */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-200 font-bold">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Fallas Geológicas</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFaults((prev) => !prev);
                  }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                    showFaults
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {showFaults ? 'Activadas' : 'Desactivadas'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM-RIGHT: Floating Navigation Controls (+ / - / GPS / Compass) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center space-y-2 pointer-events-auto">
        {/* Reset North / Compass */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleResetNorth();
          }}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700 shadow-xl backdrop-blur-md transition-all"
          title="Orientar al Norte / Recentrar País"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* Center on My Location (GPS / Mi Casa) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCenterOnLocation();
          }}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700 shadow-xl backdrop-blur-md transition-all"
          title="Centrar en Mi Ubicación (Casa / GPS)"
        >
          <Navigation className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Zoom Controls Container (Google Maps +/-) */}
        <div className="flex flex-col bg-slate-900/90 border border-slate-700 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="p-3 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border-b border-slate-800"
            title="Acercar (Zoom +)"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="p-3 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
            title="Alejar (Zoom -)"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TOP-RIGHT: Active Faults Quick Badge & Carto Key Setup */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 pointer-events-auto">
        {/* Faults Quick Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowFaults((prev) => !prev);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shadow-xl backdrop-blur-md ${
            showFaults
              ? 'bg-rose-950/80 text-rose-300 border-rose-600'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
          }`}
          title="Alternar capa de fallas geológicas activas"
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Fallas: {showFaults ? 'ON' : 'OFF'}</span>
        </button>

        {/* Carto Key Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setKeyInput(cartoKey);
            setIsKeyModalOpen(true);
          }}
          className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 shadow-xl backdrop-blur-md transition-colors"
          title="Configurar clave VITE_CARTO_CLAVE"
        >
          <Key className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* SELECTED FAULT MODAL / BANNER */}
      {selectedFault && (
        <div className="absolute top-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-rose-500 rounded-3xl p-4 shadow-2xl max-w-sm pointer-events-auto animate-fade-in">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              <h4 className="font-bold text-xs text-white">{selectedFault.name}</h4>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFault(null);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-slate-300">
            <div><strong>Desplazamiento:</strong> {selectedFault.slipType}</div>
            <div><strong>Actividad Sísmica:</strong> <span className="text-rose-400 font-bold">{selectedFault.activityLevel}</span></div>
            <div><strong>Tasa de desplazamiento:</strong> {selectedFault.slipRateMmYear}</div>
            <div><strong>Magnitud máxima:</strong> {selectedFault.maxExpectedMag}</div>
            {selectedFaultDistKm !== null && (
              <div className="mt-2 pt-2 border-t border-slate-800 font-mono text-cyan-300 font-bold">
                Distancia a {referencePoint.label}: {selectedFaultDistKm} km
              </div>
            )}
          </div>
        </div>
      )}

      {/* SELECTED EARTHQUAKE MICRO-LOCATION BANNER */}
      {selectedEvent && (
        <div className="absolute bottom-6 left-32 right-32 z-20 hidden md:flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-rose-500/60 rounded-2xl px-4 py-2.5 shadow-2xl pointer-events-auto">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-2">
                <span>{selectedEvent.place}</span>
                <span className="text-rose-400 font-mono">M {selectedEvent.mag.toFixed(1)}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {isLoadingReverse ? 'Resolviendo vereda y municipio...' : reverseDetails ? reverseDetails.displayName : ''}
              </div>
            </div>
          </div>

          {distanceToUserKm !== null && (
            <div className="text-right border-l border-slate-800 pl-4 font-mono text-xs">
              <span className="text-[10px] text-slate-400 block">Distancia a {referencePoint.label}</span>
              <span className="font-bold text-rose-400">{distanceToUserKm} km</span>
            </div>
          )}
        </div>
      )}

      {/* CARTO CLAVE MODAL */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-white font-black text-base">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Configuración de Clave CARTO Voyager</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ingresa tu clave de CARTO (`VITE_CARTO_CLAVE` o `TU_CLAVE`). Si no tienes una, déjala en blanco para usar el tier público de acceso abierto de Voyager.
            </p>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Ejemplo: TU_CLAVE_CARTO"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsKeyModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCartoClave(keyInput);
                  setCartoKeyState(keyInput);
                  setIsKeyModalOpen(false);
                  initLeafletMap();
                }}
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
  if (mag < 3.0) return '#10b981';
  if (mag < 4.5) return '#f59e0b';
  if (mag < 6.0) return '#f97316';
  return '#e11d48';
}

function calculateZoom(maxradiuskm: number): number {
  if (maxradiuskm <= 150) return 8;
  if (maxradiuskm <= 350) return 7;
  if (maxradiuskm <= 700) return 6;
  if (maxradiuskm <= 1200) return 5;
  if (maxradiuskm <= 2000) return 4;
  return 3;
}

export { GoogleStyleMap as GoogleSeismicMap };
export default GoogleStyleMap;
