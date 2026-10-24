const EARTH_RADIUS_KM = 6371.0;
const P_WAVE_VELOCITY_KMS = 6.0; // P-wave speed (~6 km/s)
const S_WAVE_VELOCITY_KMS = 3.5; // S-wave speed (~3.5 km/s, destructive shear wave)

/**
 * Calculate Great-Circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface WaveArrivalInfo {
  distanceKm: number;
  travelTimeP_Sec: number;
  travelTimeS_Sec: number;
  elapsedSec: number;
  remainingP_Sec: number;
  remainingS_Sec: number;
  wavePhase: 'CALCULATING' | 'P_WAVE_APPROACHING' | 'S_WAVE_INCOMING' | 'IMPACT_ZONE';
}

/**
 * Calculate estimated time of arrival (ETA) for P and S seismic waves
 */
export function calculateWaveArrival(
  distanceKm: number,
  originTimestampMs: number,
  currentTimestampMs: number = Date.now()
): WaveArrivalInfo {
  const travelTimeP_Sec = distanceKm / P_WAVE_VELOCITY_KMS;
  const travelTimeS_Sec = distanceKm / S_WAVE_VELOCITY_KMS;

  const elapsedSec = Math.max(0, (currentTimestampMs - originTimestampMs) / 1000);

  const remainingP_Sec = Math.round(travelTimeP_Sec - elapsedSec);
  const remainingS_Sec = Math.round(travelTimeS_Sec - elapsedSec);

  let wavePhase: WaveArrivalInfo['wavePhase'] = 'CALCULATING';

  if (remainingS_Sec > 0) {
    if (remainingP_Sec > 0) {
      wavePhase = 'P_WAVE_APPROACHING';
    } else {
      wavePhase = 'S_WAVE_INCOMING';
    }
  } else {
    wavePhase = 'IMPACT_ZONE';
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    travelTimeP_Sec: Math.round(travelTimeP_Sec),
    travelTimeS_Sec: Math.round(travelTimeS_Sec),
    elapsedSec: Math.round(elapsedSec),
    remainingP_Sec,
    remainingS_Sec,
    wavePhase,
  };
}
