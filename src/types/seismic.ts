export type SensorState = 'INACTIVO' | 'CALIBRANDO' | 'MONITOREANDO' | 'ALERTA';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SeismicTelemetry {
  // Raw acceleration including gravity (m/s²)
  raw: Vector3D;
  // Raw acceleration normalized in G (1G = 9.80665 m/s²)
  rawG: Vector3D;
  // High-Pass filtered linear acceleration (m/s² and G)
  filtered: Vector3D;
  filteredG: Vector3D;
  // Total vectorial magnitude including gravity: sqrt(ax^2 + ay^2 + az^2) in G
  totalMagnitudeG: number;
  // Deviation from 1G: |sqrt(ax^2 + ay^2 + az^2) - 1G| in G
  netVectorG: number;
  // High-pass filtered net acceleration in G (dynamic oscillation magnitude)
  dynamicPGA_G: number;
  // Peak recorded acceleration since monitoring started (in G)
  peakG: number;
  // Milliseconds the acceleration has currently stayed above threshold
  sustainedDurationMs: number;
  // Sample timestamp (ms)
  timestamp: number;
}

export interface SeismicConfig {
  // Threshold to trigger alert (in G, default 0.25g)
  thresholdG: number;
  // Required sustained duration over threshold to trigger alert (in ms, default 150ms)
  sustainedMs: number;
  // High-pass filter coefficient (0.0 to 1.0, default 0.85)
  filterAlpha: number;
  // Calibration duration in ms (default 2000ms)
  calibrationDurationMs: number;
  // Configurable Geological / USGS network endpoint
  networkEndpoint: string;
  // Alert radius in km (default 300 km)
  networkRadiusKm: number;
  // Alert minimum magnitude (default 4.5)
  networkMinMag: number;
}

export type SimulationMagnitude = 'low' | 'medium' | 'critical';

export interface SimulationPreset {
  id: SimulationMagnitude;
  label: string;
  sublabel: string;
  peakG: number;
  durationMs: number;
  frequencyHz: number;
  description: string;
}

/**
 * Historical event logged in IndexedDB/LocalStorage
 */
export type SeismicEventType = 'LOCAL_SENSOR' | 'NETWORK_ALERT' | 'SIMULATION';

export interface SeismicEventRecord {
  id: string;
  timestamp: number;
  isoDate: string;
  peakG: number;
  peakMSS: number;
  durationMs: number;
  type: SeismicEventType;
  details: {
    magnitude?: number;
    epicenter?: string;
    distanceKm?: number;
    notes?: string;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * External USGS Earthquake GeoJSON feature model
 */
export interface USGSEarthquake {
  id: string;
  place: string;
  mag: number;
  time: number; // UTC ms
  url: string;
  longitude: number;
  latitude: number;
  depthKm: number;
  distanceKm: number;
  etaSeconds: number; // Remaining time until S-wave arrives
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface NetworkAlertState {
  isActive: boolean;
  earthquake: USGSEarthquake | null;
  etaSeconds: number;
  wavePhase: 'CALCULATING' | 'P_WAVE_APPROACHING' | 'S_WAVE_INCOMING' | 'IMPACT_ZONE';
}
