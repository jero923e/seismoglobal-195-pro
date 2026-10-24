import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SensorState,
  PermissionStatus,
  SeismicTelemetry,
  SeismicConfig,
  Vector3D,
  SimulationMagnitude
} from '../types/seismic';
import { seismicAudio } from '../utils/audioAlert';

const STANDARD_GRAVITY_MSS = 9.80665;

const DEFAULT_CONFIG: SeismicConfig = {
  thresholdG: 0.25, // 0.25g threshold per requirements
  sustainedMs: 150, // 150ms sustained shaking requirement
  filterAlpha: 0.85, // High-pass filter constant
  calibrationDurationMs: 1800,
  networkEndpoint: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  networkRadiusKm: 300,
  networkMinMag: 4.5,
};

const INITIAL_TELEMETRY: SeismicTelemetry = {
  raw: { x: 0, y: 0, z: STANDARD_GRAVITY_MSS },
  rawG: { x: 0, y: 0, z: 1.0 },
  filtered: { x: 0, y: 0, z: 0 },
  filteredG: { x: 0, y: 0, z: 0 },
  totalMagnitudeG: 1.0,
  netVectorG: 0.0,
  dynamicPGA_G: 0.0,
  peakG: 0.0,
  sustainedDurationMs: 0,
  timestamp: Date.now(),
};

export function useSeismicSensor(customConfig: Partial<SeismicConfig> = {}) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  const [sensorState, setSensorState] = useState<SensorState>('INACTIVO');
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('prompt');
  const [telemetry, setTelemetry] = useState<SeismicTelemetry>(INITIAL_TELEMETRY);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationMag, setActiveSimulationMag] = useState<SimulationMagnitude | null>(null);

  // References for high-frequency physics calculation without React render overhead
  const stateRef = useRef<SensorState>('INACTIVO');
  stateRef.current = sensorState;

  const configRef = useRef<SeismicConfig>(config);
  configRef.current = config;

  // Filter state (complementary high-pass tracker for DC gravity)
  const gravityRef = useRef<Vector3D>({ x: 0, y: 0, z: STANDARD_GRAVITY_MSS });
  const prevRawRef = useRef<Vector3D>({ x: 0, y: 0, z: STANDARD_GRAVITY_MSS });
  const peakGRef = useRef<number>(0.0);

  // Sustained shaking time tracking
  const shakingStartTimeRef = useRef<number | null>(null);
  const lastAboveThresholdTimeRef = useRef<number | null>(null);

  // Calibration accumulators
  const calibrationSamplesRef = useRef<Vector3D[]>([]);
  const calibrationStartTimeRef = useRef<number>(0);

  // Simulation animation frame handle
  const simulationTimerRef = useRef<number | null>(null);

  // Alert auto-cooldown timer
  const alertCooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check browser capability on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('DeviceMotionEvent' in window)) {
      setPermissionStatus('unsupported');
      setErrorMessage('Este dispositivo o navegador no soporta DeviceMotionEvent de aceleración.');
    } else if (
      typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission !== 'function'
    ) {
      // Android or standard browser where permission is implicit or granted by origin
      setPermissionStatus('granted');
    }
  }, []);

  /**
   * Request motion sensor permissions (essential for iOS 13+ Safari & modern security contexts)
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

    // Warm up audio context on user gesture
    seismicAudio.playBeep(440, 0.05);

    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      setPermissionStatus('unsupported');
      setErrorMessage('Acelerómetro no detectado en este dispositivo.');
      return false;
    }

    const deviceMotion = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof deviceMotion.requestPermission === 'function') {
      try {
        const response = await deviceMotion.requestPermission();
        if (response === 'granted') {
          setPermissionStatus('granted');
          return true;
        } else {
          setPermissionStatus('denied');
          setErrorMessage('Permiso de movimiento denegado por el usuario.');
          return false;
        }
      } catch (err) {
        setPermissionStatus('denied');
        setErrorMessage(
          err instanceof Error
            ? `Error solicitando permisos de sensor: ${err.message}`
            : 'Error solicitando permisos de sensor.'
        );
        return false;
      }
    } else {
      // Android / Chromium
      setPermissionStatus('granted');
      return true;
    }
  }, []);

  /**
   * Process a single acceleration sample through the seismic pipeline
   */
  const processAccelerationSample = useCallback(
    (ax: number, ay: number, az: number, timestamp: number) => {
      const alpha = configRef.current.filterAlpha;

      // 1. RAW VECTOR TOTAL ACCELERATION:
      // Magnitude including gravity: sqrt(ax^2 + ay^2 + az^2)
      const rawMagnitudeMSS = Math.sqrt(ax * ax + ay * ay + az * az);
      const rawMagnitudeG = rawMagnitudeMSS / STANDARD_GRAVITY_MSS;

      // Indicator required: |sqrt(ax^2 + ay^2 + az^2) - 1G| in G
      const netVectorG = Math.abs(rawMagnitudeG - 1.0);

      // Raw vector in G units
      const rawG: Vector3D = {
        x: ax / STANDARD_GRAVITY_MSS,
        y: ay / STANDARD_GRAVITY_MSS,
        z: az / STANDARD_GRAVITY_MSS,
      };

      // 2. HIGH-PASS FILTER PIPELINE:
      // Track DC static gravity orientation vector using a low-pass complementary accumulator:
      // gravity[n] = alpha * gravity[n-1] + (1 - alpha) * raw[n]
      const g = gravityRef.current;
      g.x = alpha * g.x + (1 - alpha) * ax;
      g.y = alpha * g.y + (1 - alpha) * ay;
      g.z = alpha * g.z + (1 - alpha) * az;

      // High-pass linear acceleration: raw[n] - gravity[n]
      const linX = ax - g.x;
      const linY = ay - g.y;
      const linZ = az - g.z;

      const linXG = linX / STANDARD_GRAVITY_MSS;
      const linYG = linY / STANDARD_GRAVITY_MSS;
      const linZG = linZ / STANDARD_GRAVITY_MSS;

      // High-pass dynamic oscillatory magnitude (PGA in G)
      const dynamicPGA_G = Math.sqrt(linXG * linXG + linYG * linYG + linZG * linZG);

      // 3. CALIBRATION STATE HANDLING:
      if (stateRef.current === 'CALIBRANDO') {
        calibrationSamplesRef.current.push({ x: ax, y: ay, z: az });
        const elapsed = timestamp - calibrationStartTimeRef.current;

        if (elapsed >= configRef.current.calibrationDurationMs) {
          // Finalize calibration: set gravity reference from sample mean
          const samples = calibrationSamplesRef.current;
          if (samples.length > 0) {
            const sum = samples.reduce(
              (acc, s) => ({ x: acc.x + s.x, y: acc.y + s.y, z: acc.z + s.z }),
              { x: 0, y: 0, z: 0 }
            );
            gravityRef.current = {
              x: sum.x / samples.length,
              y: sum.y / samples.length,
              z: sum.z / samples.length,
            };
          }
          peakGRef.current = 0.0;
          setSensorState('MONITOREANDO');
          seismicAudio.playBeep(880, 0.15);
        }

        setTelemetry({
          raw: { x: ax, y: ay, z: az },
          rawG,
          filtered: { x: linX, y: linY, z: linZ },
          filteredG: { x: linXG, y: linYG, z: linZG },
          totalMagnitudeG: rawMagnitudeG,
          netVectorG,
          dynamicPGA_G,
          peakG: 0,
          sustainedDurationMs: 0,
          timestamp,
        });
        return;
      }

      if (stateRef.current !== 'MONITOREANDO' && stateRef.current !== 'ALERTA') {
        return;
      }

      // Update peak recorded acceleration
      if (dynamicPGA_G > peakGRef.current) {
        peakGRef.current = dynamicPGA_G;
      }

      // 4. SUSTAINED SHAKING THRESHOLD DETECTION:
      // Primary trigger: netVectorG or dynamicPGA_G exceeds threshold (default 0.25g)
      // Must be sustained for more than sustainedMs (default 150ms) to filter out single taps/drops.
      const currentThreshold = configRef.current.thresholdG;
      const requiredSustainedMs = configRef.current.sustainedMs;

      // An earthquake exhibits dynamic oscillation exceeding the threshold
      const isExceeding = netVectorG >= currentThreshold || dynamicPGA_G >= currentThreshold;

      let currentSustainedDuration = 0;

      if (isExceeding) {
        if (shakingStartTimeRef.current === null) {
          shakingStartTimeRef.current = timestamp;
        }
        lastAboveThresholdTimeRef.current = timestamp;
        currentSustainedDuration = timestamp - shakingStartTimeRef.current;

        // TRIGGER ALERTA IF SUSTAINED >= 150ms
        if (currentSustainedDuration >= requiredSustainedMs && stateRef.current !== 'ALERTA') {
          setSensorState('ALERTA');
          seismicAudio.startAlarm();

          // Set 10-second alert cooldown before allowing auto-reset back to monitoring
          if (alertCooldownTimeoutRef.current) {
            clearTimeout(alertCooldownTimeoutRef.current);
          }
          alertCooldownTimeoutRef.current = setTimeout(() => {
            if (stateRef.current === 'ALERTA') {
              seismicAudio.stopAlarm();
              setSensorState('MONITOREANDO');
            }
          }, 10000);
        }
      } else {
        // Zero-crossing tolerance: allow up to 80ms dip during sinusoidal wave reversal
        const lastExceeded = lastAboveThresholdTimeRef.current;
        if (lastExceeded && timestamp - lastExceeded > 85) {
          shakingStartTimeRef.current = null;
          lastAboveThresholdTimeRef.current = null;
          currentSustainedDuration = 0;
        } else if (shakingStartTimeRef.current) {
          currentSustainedDuration = timestamp - shakingStartTimeRef.current;
        }
      }

      setTelemetry({
        raw: { x: ax, y: ay, z: az },
        rawG,
        filtered: { x: linX, y: linY, z: linZ },
        filteredG: { x: linXG, y: linYG, z: linZG },
        totalMagnitudeG: rawMagnitudeG,
        netVectorG,
        dynamicPGA_G,
        peakG: peakGRef.current,
        sustainedDurationMs: currentSustainedDuration,
        timestamp,
      });

      prevRawRef.current = { x: ax, y: ay, z: az };
    },
    []
  );

  /**
   * Device motion hardware event listener
   */
  const handleDeviceMotion = useCallback(
    (event: DeviceMotionEvent) => {
      // Ignore physical sensor if test simulation is currently active
      if (isSimulating) return;

      const accWithGravity = event.accelerationIncludingGravity;
      if (!accWithGravity) return;

      const ax = accWithGravity.x ?? 0;
      const ay = accWithGravity.y ?? 0;
      const az = accWithGravity.z ?? STANDARD_GRAVITY_MSS;

      processAccelerationSample(ax, ay, az, performance.now());
    },
    [isSimulating, processAccelerationSample]
  );

  /**
   * Start sensor monitoring (handles permission and calibration)
   */
  const startMonitoring = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    // Reset calibration state
    calibrationSamplesRef.current = [];
    calibrationStartTimeRef.current = performance.now();
    peakGRef.current = 0.0;
    shakingStartTimeRef.current = null;
    lastAboveThresholdTimeRef.current = null;

    setSensorState('CALIBRANDO');
    seismicAudio.playBeep(660, 0.1);
  }, [requestPermission]);

  /**
   * Stop sensor monitoring and reset to Inactive
   */
  const stopMonitoring = useCallback(() => {
    if (simulationTimerRef.current) {
      cancelAnimationFrame(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    if (alertCooldownTimeoutRef.current) {
      clearTimeout(alertCooldownTimeoutRef.current);
      alertCooldownTimeoutRef.current = null;
    }
    seismicAudio.stopAlarm();
    setIsSimulating(false);
    setActiveSimulationMag(null);
    setSensorState('INACTIVO');
    shakingStartTimeRef.current = null;
    lastAboveThresholdTimeRef.current = null;
  }, []);

  /**
   * Acknowledge / dismiss active alert back to normal monitoring
   */
  const dismissAlert = useCallback(() => {
    if (alertCooldownTimeoutRef.current) {
      clearTimeout(alertCooldownTimeoutRef.current);
      alertCooldownTimeoutRef.current = null;
    }
    seismicAudio.stopAlarm();
    shakingStartTimeRef.current = null;
    lastAboveThresholdTimeRef.current = null;
    if (sensorState === 'ALERTA') {
      setSensorState('MONITOREANDO');
    }
  }, [sensorState]);

  /**
   * Reset peak PGA counter
   */
  const resetPeak = useCallback(() => {
    peakGRef.current = 0.0;
    setTelemetry((prev) => ({ ...prev, peakG: 0 }));
  }, []);

  /**
   * Realistic Seismic Waveform Simulator
   * Generates P-waves (compressional, high frequency) followed by S-waves (shear, high amplitude)
   */
  const simulateEarthquake = useCallback(
    (magnitude: SimulationMagnitude) => {
      // Ensure audio context is unlocked
      seismicAudio.playBeep(520, 0.08);

      if (simulationTimerRef.current) {
        cancelAnimationFrame(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }

      setIsSimulating(true);
      setActiveSimulationMag(magnitude);

      // Force into monitoring mode if inactive
      if (sensorState === 'INACTIVO' || sensorState === 'CALIBRANDO') {
        setSensorState('MONITOREANDO');
      }

      // Configuration per magnitude
      // Low: ~0.10g peak, doesn't exceed 0.25g. Should NOT trigger alert!
      // Medium: ~0.35g peak, exceeds 0.25g for > 150ms. Triggers ALERTA!
      // Critical: ~0.85g peak, severe chaotic shaking. Triggers ALERTA!
      const params = {
        low: {
          peakG: 0.12,
          freqHz: 7.5,
          durationMs: 3200,
          harmonicFactor: 0.2,
        },
        medium: {
          peakG: 0.38,
          freqHz: 4.8,
          durationMs: 4500,
          harmonicFactor: 0.35,
        },
        critical: {
          peakG: 0.88,
          freqHz: 3.6,
          durationMs: 6500,
          harmonicFactor: 0.5,
        },
      }[magnitude];

      const startTime = performance.now();
      const baseGravityZ = STANDARD_GRAVITY_MSS;

      const simLoop = () => {
        const now = performance.now();
        const elapsed = now - startTime;

        if (elapsed > params.durationMs) {
          setIsSimulating(false);
          setActiveSimulationMag(null);
          simulationTimerRef.current = null;
          // Stabilize to rest
          processAccelerationSample(0, 0, baseGravityZ, now);
          return;
        }

        // Normalized envelope curve (rapid rise, sustained shaking, exponential decay)
        const progress = elapsed / params.durationMs;
        let envelope = 0;
        if (progress < 0.15) {
          envelope = progress / 0.15; // fast rise
        } else if (progress < 0.6) {
          envelope = 1.0; // sustained shaking plateau
        } else {
          envelope = Math.exp(-3.5 * (progress - 0.6)); // decay
        }

        // Primary and secondary seismic oscillatory components
        const omega = 2 * Math.PI * params.freqHz;
        const tSec = elapsed / 1000;
        const primaryWave = Math.sin(omega * tSec);
        const secondaryWave = Math.cos(omega * 1.6 * tSec) * params.harmonicFactor;
        const microNoise = (Math.random() - 0.5) * 0.04;

        const oscillationG = (primaryWave + secondaryWave + microNoise) * params.peakG * envelope;
        const oscillationMSS = oscillationG * STANDARD_GRAVITY_MSS;

        // Multiaxial distribution (earthquakes shake horizontally in X/Y and vertically in Z)
        const simAx = oscillationMSS * 0.95;
        const simAy = oscillationMSS * 0.75 * Math.sin(tSec * 4);
        const simAz = baseGravityZ + oscillationMSS * 0.45 * Math.cos(tSec * 3);

        processAccelerationSample(simAx, simAy, simAz, now);

        simulationTimerRef.current = requestAnimationFrame(simLoop);
      };

      simulationTimerRef.current = requestAnimationFrame(simLoop);
    },
    [sensorState, processAccelerationSample]
  );

  /**
   * Stop active simulation early
   */
  const stopSimulation = useCallback(() => {
    if (simulationTimerRef.current) {
      cancelAnimationFrame(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    setActiveSimulationMag(null);
    processAccelerationSample(0, 0, STANDARD_GRAVITY_MSS, performance.now());
  }, [processAccelerationSample]);

  /**
   * Attach/detach devicemotion window listener
   */
  useEffect(() => {
    if (sensorState === 'INACTIVO') {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      return;
    }

    window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [sensorState, handleDeviceMotion]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) cancelAnimationFrame(simulationTimerRef.current);
      if (alertCooldownTimeoutRef.current) clearTimeout(alertCooldownTimeoutRef.current);
      seismicAudio.stopAlarm();
    };
  }, []);

  return {
    sensorState,
    permissionStatus,
    telemetry,
    errorMessage,
    config,
    isSimulating,
    activeSimulationMag,
    startMonitoring,
    stopMonitoring,
    requestPermission,
    dismissAlert,
    resetPeak,
    simulateEarthquake,
    stopSimulation,
  };
}
