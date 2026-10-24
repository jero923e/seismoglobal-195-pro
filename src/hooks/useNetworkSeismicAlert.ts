import { useState, useEffect, useRef, useCallback } from 'react';
import type { USGSEarthquake, UserLocation, NetworkAlertState, SeismicEventRecord } from '../types/seismic';
import { calculateHaversineDistance, calculateWaveArrival } from '../utils/geoUtils';
import { seismicAudio } from '../utils/audioAlert';

const DEFAULT_USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
const POLLING_INTERVAL_MS = 60000; // 1 minute

interface UseNetworkSeismicAlertProps {
  customEndpoint?: string;
  minMag?: number;
  maxRadiusKm?: number;
  onEventLogged?: (event: SeismicEventRecord) => void;
}

export function useNetworkSeismicAlert({
  customEndpoint = DEFAULT_USGS_URL,
  minMag = 4.5,
  maxRadiusKm = 300,
  onEventLogged,
}: UseNetworkSeismicAlertProps = {}) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'simulated'>('prompt');
  const [recentEarthquakes, setRecentEarthquakes] = useState<USGSEarthquake[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<NetworkAlertState>({
    isActive: false,
    earthquake: null,
    etaSeconds: 0,
    wavePhase: 'CALCULATING',
  });

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggedAlertIdsRef = useRef<Set<string>>(new Set());

  /**
   * Request Geolocation
   */
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setLocationStatus('granted');
      },
      () => {
        // Fallback default coordinates (e.g. Mexico City / Seismic Belt: 19.4326, -99.1332)
        setUserLocation({
          latitude: 19.4326,
          longitude: -99.1332,
          accuracy: 500,
          timestamp: Date.now(),
        });
        setLocationStatus('simulated');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  /**
   * Fetch from USGS or local geological API
   */
  const fetchEarthquakes = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch(customEndpoint, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Error en API sísmica: HTTP ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];

      const currentLat = userLocation?.latitude ?? 19.4326;
      const currentLon = userLocation?.longitude ?? -99.1332;

      const parsed: USGSEarthquake[] = features.map((f: {
        id: string;
        properties: { place: string; mag: number; time: number; url: string };
        geometry: { coordinates: [number, number, number] };
      }) => {
        const [lon, lat, depth] = f.geometry.coordinates;
        const dist = calculateHaversineDistance(currentLat, currentLon, lat, lon);
        const arrival = calculateWaveArrival(dist, f.properties.time, Date.now());

        return {
          id: f.id,
          place: f.properties.place || 'Epicentro desconocido',
          mag: f.properties.mag || 0,
          time: f.properties.time,
          url: f.properties.url,
          longitude: lon,
          latitude: lat,
          depthKm: Math.round(depth * 10) / 10,
          distanceKm: Math.round(dist * 10) / 10,
          etaSeconds: arrival.remainingS_Sec,
        };
      });

      // Sort by recency
      parsed.sort((a, b) => b.time - a.time);
      setRecentEarthquakes(parsed);
      setLastFetchTime(Date.now());

      // Check condition: Magnitude >= minMag (default 4.5) AND Distance <= maxRadiusKm (default 300 km)
      const criticalEvent = parsed.find((eq) => eq.mag >= minMag && eq.distanceKm <= maxRadiusKm);

      if (criticalEvent) {
        triggerIncomingWaveAlert(criticalEvent);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Error al conectar con la red sísmica');
    } finally {
      setIsFetching(false);
    }
  }, [customEndpoint, userLocation, minMag, maxRadiusKm]);

  /**
   * Trigger incoming wave early warning with live countdown
   */
  const triggerIncomingWaveAlert = useCallback(
    (earthquake: USGSEarthquake) => {
      // Calculate wave timing
      const arrival = calculateWaveArrival(earthquake.distanceKm, earthquake.time, Date.now());

      setAlertState({
        isActive: true,
        earthquake,
        etaSeconds: Math.max(0, arrival.remainingS_Sec),
        wavePhase: arrival.wavePhase,
      });

      seismicAudio.startAlarm();

      // Log event to database once per event ID
      if (!loggedAlertIdsRef.current.has(earthquake.id)) {
        loggedAlertIdsRef.current.add(earthquake.id);

        if (onEventLogged) {
          const record: SeismicEventRecord = {
            id: `net_${earthquake.id}_${Date.now()}`,
            timestamp: Date.now(),
            isoDate: new Date().toISOString(),
            peakG: Math.min(1.2, (earthquake.mag / 10) * 0.8), // estimated PGA from mag
            peakMSS: Math.min(1.2, (earthquake.mag / 10) * 0.8) * 9.80665,
            durationMs: Math.max(8000, earthquake.mag * 3000),
            type: 'NETWORK_ALERT',
            details: {
              magnitude: earthquake.mag,
              epicenter: earthquake.place,
              distanceKm: earthquake.distanceKm,
              notes: `Alerta temprana de red externa (USGS/Sismológico). S-Wave ETA: ${arrival.remainingS_Sec}s`,
            },
            userLocation: userLocation
              ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
              : undefined,
          };
          onEventLogged(record);
        }
      }

      // Start countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setAlertState((prev) => {
          if (!prev.isActive || !prev.earthquake) return prev;

          const currentArrival = calculateWaveArrival(
            prev.earthquake.distanceKm,
            prev.earthquake.time,
            Date.now()
          );

          if (currentArrival.remainingS_Sec <= -30) {
            // Auto close after 30 seconds post-impact
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            seismicAudio.stopAlarm();
            return {
              isActive: false,
              earthquake: null,
              etaSeconds: 0,
              wavePhase: 'IMPACT_ZONE',
            };
          }

          return {
            ...prev,
            etaSeconds: Math.max(0, currentArrival.remainingS_Sec),
            wavePhase: currentArrival.wavePhase,
          };
        });
      }, 500);
    },
    [userLocation, onEventLogged]
  );

  /**
   * Simulate a realistic incoming seismic wave event (M 5.8 at 165 km)
   */
  const simulateNetworkEarthquake = useCallback(
    (customMag = 5.8, customDistKm = 165) => {
      const syntheticEQ: USGSEarthquake = {
        id: `sim_net_${Date.now()}`,
        place: 'Costa del Pacífico / Zona de Subducción',
        mag: customMag,
        time: Date.now() - 6000, // Happened 6 seconds ago
        url: 'https://earthquake.usgs.gov/',
        latitude: (userLocation?.latitude ?? 19.43) + 1.2,
        longitude: (userLocation?.longitude ?? -99.13) - 1.1,
        depthKm: 22.4,
        distanceKm: customDistKm,
        etaSeconds: Math.round(customDistKm / 3.5 - 6),
      };

      triggerIncomingWaveAlert(syntheticEQ);
    },
    [userLocation, triggerIncomingWaveAlert]
  );

  /**
   * Dismiss the active network pre-alert
   */
  const dismissNetworkAlert = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    seismicAudio.stopAlarm();
    setAlertState({
      isActive: false,
      earthquake: null,
      etaSeconds: 0,
      wavePhase: 'IMPACT_ZONE',
    });
  }, []);

  // Periodic polling
  useEffect(() => {
    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, POLLING_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [fetchEarthquakes]);

  return {
    userLocation,
    locationStatus,
    recentEarthquakes,
    isFetching,
    lastFetchTime,
    fetchError,
    alertState,
    fetchEarthquakes,
    simulateNetworkEarthquake,
    dismissNetworkAlert,
    requestLocation,
  };
}
