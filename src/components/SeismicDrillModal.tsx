import React, { useState, useEffect, useRef } from 'react';
import type { CountryProfile } from '../data/countries195';
import type { FavoriteLocation } from './FavoriteLocations';
import { getNearestFault } from '../services/faultsService';
import { soundAlarm } from '../utils/soundAlarm';
import {
  AlertTriangle,
  Play,
  Square,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  Award,
} from 'lucide-react';

interface SeismicDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  country: CountryProfile;
  favorites: FavoriteLocation[];
  onTriggerMapWave: (sim: {
    active: boolean;
    epicenterLat: number;
    epicenterLng: number;
    radiusPKm: number;
    radiusSKm: number;
    etaSeconds: number;
    mag: number;
    locationName: string;
  } | null) => void;
}

type DrillMagnitude = 5.2 | 6.8 | 8.2;
type DrillState = 'setup' | 'running' | 'completed';

export const SeismicDrillModal: React.FC<SeismicDrillModalProps> = ({
  isOpen,
  onClose,
  country,
  favorites,
  onTriggerMapWave,
}) => {
  const [magnitude, setMagnitude] = useState<DrillMagnitude>(6.8);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('casa');
  const [useNearestFault, setUseNearestFault] = useState<boolean>(true);
  const [customDistanceKm, setCustomDistanceKm] = useState<number>(85);

  const [drillState, setDrillState] = useState<DrillState>('setup');
  const [etaRemaining, setEtaRemaining] = useState<number>(24);
  const [elapsedEvacuationSeconds, setElapsedEvacuationSeconds] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Drill evaluation checklist
  const [stepsCompleted, setStepsCompleted] = useState<{
    covered: boolean;
    utilitiesCut: boolean;
    awayFromGlass: boolean;
    backpackGrabbed: boolean;
  }>({
    covered: false,
    utilitiesCut: false,
    awayFromGlass: false,
    backpackGrabbed: false,
  });

  const drillTimerRef = useRef<number | null>(null);
  const evacuationTimerRef = useRef<number | null>(null);

  // Determine target location (Casa, Colegio, etc. or country capital)
  const targetLocation = favorites.find((f) => f.id === selectedTargetId && f.isSet) || {
    name: `Capital (${country.capital})`,
    lat: country.lat,
    lng: country.lng,
    isSet: true,
  };

  const nearestFaultResult = getNearestFault(targetLocation.lat, targetLocation.lng);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      soundAlarm.stopAll();
      if (drillTimerRef.current) window.clearInterval(drillTimerRef.current);
      if (evacuationTimerRef.current) window.clearInterval(evacuationTimerRef.current);
      onTriggerMapWave(null);
    };
  }, [onTriggerMapWave]);

  // Start Drill Execution - Synchronous click handler unlocks AudioContext
  const handleStartDrill = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. OBLIGATORIO: Desbloqueo sincrónico en gesto de usuario (iOS & Android)
    await soundAlarm.ensureAudioUnlocked();

    setDrillState('running');
    setStepsCompleted({
      covered: false,
      utilitiesCut: false,
      awayFromGlass: false,
      backpackGrabbed: false,
    });

    // Calculate epicenter coordinates
    let epicenterLat = targetLocation.lat;
    let epicenterLng = targetLocation.lng;
    let initialDist = customDistanceKm;

    if (useNearestFault && nearestFaultResult.fault) {
      const firstCoord = nearestFaultResult.fault.coordinates[0];
      epicenterLat = firstCoord[0];
      epicenterLng = firstCoord[1];
      initialDist = Math.max(30, nearestFaultResult.distanceKm);
    } else {
      epicenterLat = targetLocation.lat + initialDist / 111;
      epicenterLng = targetLocation.lng + initialDist / 111;
    }

    // Speeds: P-wave ~ 6.0 km/s, S-wave ~ 3.5 km/s
    const speedP = 6.0;
    const speedS = 3.5;
    const totalEtaSeconds = Math.max(8, Math.round(initialDist / speedS));
    setEtaRemaining(totalEtaSeconds);
    setElapsedEvacuationSeconds(0);

    // 2. Iniciar Sirena Dual y Háptica
    if (!isAudioMuted) {
      await soundAlarm.startDualOscillatorSiren();
    }

    // 3. Guía por Voz Oficial
    soundAlarm.speakInstruction(
      `Alerta de simulacro sísmico oficial. Sismo simulado magnitud ${magnitude} en ${
        useNearestFault ? nearestFaultResult.fault.shortName : 'zona cercana'
      }. Onda secundaria destructiva aproximándose en ${totalEtaSeconds} segundos. Mantén la calma, aléjate de vidrios y estantes, ubícate en zona de menor riesgo, agáchate, cúbrete y sujétate con fuerza.`
    );

    let currentElapsed = 0;

    // Timer loop
    drillTimerRef.current = window.setInterval(() => {
      currentElapsed += 0.5;
      const curRadiusP = currentElapsed * speedP;
      const curRadiusS = currentElapsed * speedS;
      const remaining = Math.max(0, Math.round(totalEtaSeconds - currentElapsed));

      setEtaRemaining(remaining);

      // Trigger map wave propagation
      onTriggerMapWave({
        active: true,
        epicenterLat,
        epicenterLng,
        radiusPKm: curRadiusP,
        radiusSKm: curRadiusS,
        etaSeconds: remaining,
        mag: magnitude,
        locationName: `SIMULACRO SÍSMICO (M ${magnitude})`,
      });

      if (remaining === 10) {
        soundAlarm.speakInstruction('Diez segundos para el impacto de la onda destructiva. Permanece agachado bajo mueble resistente.');
      } else if (remaining === 0) {
        soundAlarm.speakInstruction('Impacto de onda destructiva. Sujétate de las patas del mueble hasta el cese total.');
      }

      if (remaining <= 0 && curRadiusS >= initialDist * 1.3) {
        if (drillTimerRef.current) window.clearInterval(drillTimerRef.current);
        soundAlarm.stopAll();
        setDrillState('completed');
      }
    }, 500);

    // Evacuation counter
    evacuationTimerRef.current = window.setInterval(() => {
      setElapsedEvacuationSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStopDrill = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (drillTimerRef.current) window.clearInterval(drillTimerRef.current);
    if (evacuationTimerRef.current) window.clearInterval(evacuationTimerRef.current);
    soundAlarm.stopAll();
    onTriggerMapWave(null);
    setDrillState('setup');
  };

  // Calculate score
  const completedCount = Object.values(stepsCompleted).filter(Boolean).length;
  const drillScorePercent = Math.round((completedCount / 4) * 100);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-slate-900 border-2 border-rose-500/70 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl relative overflow-hidden space-y-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 uppercase tracking-widest">
                  Protección Civil Oficial
                </span>
                <span className="text-xs text-slate-400 font-mono">195 PRO</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Simulacro Sísmico Interactivo
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStopDrill(e);
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar ventana de simulacro"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* PHASE 1: SETUP                                            */}
        {/* ========================================================= */}
        {drillState === 'setup' && (
          <div className="space-y-5">
            {/* Scenario Magnitude Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                1. Selecciona la Magnitud del Sismo Simulado:
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMagnitude(5.2);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    magnitude === 5.2
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-base font-black text-amber-400">5.2 Mw</div>
                  <div className="text-[10px] text-slate-300 font-bold">Moderado</div>
                  <div className="text-[9px] text-slate-500">Alerta preventiva</div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMagnitude(6.8);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    magnitude === 6.8
                      ? 'bg-orange-500/20 border-orange-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-base font-black text-orange-400">6.8 Mw</div>
                  <div className="text-[10px] text-slate-300 font-bold">Fuerte</div>
                  <div className="text-[9px] text-slate-500">Daños estructurales</div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMagnitude(8.2);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    magnitude === 8.2
                      ? 'bg-rose-500/20 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-base font-black text-rose-500">8.2 Mw</div>
                  <div className="text-[10px] text-slate-300 font-bold">Megaterremoto</div>
                  <div className="text-[9px] text-slate-500">Destrucción severa</div>
                </button>
              </div>
            </div>

            {/* Target Location Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                2. Punto de Impacto (Tu Ubicación a Proteger):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {favorites.map((fav) => (
                  <button
                    type="button"
                    key={fav.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTargetId(fav.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition-all ${
                      selectedTargetId === fav.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{fav.emoji}</span>
                    <span className="truncate">{fav.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Origin Epicenter Selection */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>3. Origen del Epicentro Sísmico:</span>
                <span className="text-amber-400 font-mono text-[11px]">
                  Falla: {nearestFaultResult.fault.shortName} ({nearestFaultResult.distanceKm} km)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="radio"
                    checked={useNearestFault}
                    onChange={() => setUseNearestFault(true)}
                    className="accent-cyan-500"
                  />
                  <span>En la Falla Geológica Activa más cercana</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="radio"
                    checked={!useNearestFault}
                    onChange={() => setUseNearestFault(false)}
                    className="accent-cyan-500"
                  />
                  <span>Distancia personalizada ({customDistanceKm} km)</span>
                </label>
              </div>

              {!useNearestFault && (
                <div className="pt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={25}
                    max={250}
                    step={5}
                    value={customDistanceKm}
                    onChange={(e) => setCustomDistanceKm(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <span className="text-xs font-mono text-cyan-400 font-bold w-16 text-right">
                    {customDistanceKm} km
                  </span>
                </div>
              )}
            </div>

            {/* Audio Toggle & Start Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAudioMuted((prev) => !prev);
                }}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span>{isAudioMuted ? 'Sirena Silenciada' : 'Sirena Acústica Habilitada'}</span>
              </button>

              <button
                type="button"
                onClick={handleStartDrill}
                className="py-3 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-xl shadow-rose-600/30 transition-all"
              >
                <Play className="w-4 h-4" />
                <span>🚨 INICIAR SIMULACRO AHORA</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 2: DRILL RUNNING IN REAL TIME                       */}
        {/* ========================================================= */}
        {drillState === 'running' && (
          <div className="space-y-6">
            {/* Giant Countdown Clock Banner */}
            <div className="p-6 rounded-3xl bg-slate-950 border-2 border-rose-500 shadow-2xl text-center space-y-2 relative overflow-hidden">
              <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                <span>Alerta Temprana en Progreso • Onda Destructiva S</span>
              </div>

              <div className="text-6xl sm:text-7xl font-black font-mono text-white tracking-tight animate-pulse">
                {etaRemaining > 0 ? `${etaRemaining}s` : '¡IMPACTO!'}
              </div>

              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {etaRemaining > 0
                  ? `La Onda S destructiva llegará a ${targetLocation.name} en ${etaRemaining} segundos. ¡Ejecuta tus acciones de repliegue de inmediato!`
                  : 'Movimiento sísmico en curso. Sujétate firmemente y no intentes evacuar escaleras mientras dure la sacudida.'}
              </p>
            </div>

            {/* Interactive Safety Steps Checklist during Drill */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                Pasos de Supervivencia a Ejecutar:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStepsCompleted((prev) => ({ ...prev, covered: !prev.covered }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 select-none ${
                    stepsCompleted.covered
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  {stepsCompleted.covered ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-slate-600 shrink-0" />}
                  <span>1. Agacharse, cubrirse y sujetarse bajo mesa</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStepsCompleted((prev) => ({ ...prev, awayFromGlass: !prev.awayFromGlass }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 select-none ${
                    stepsCompleted.awayFromGlass
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  {stepsCompleted.awayFromGlass ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-slate-600 shrink-0" />}
                  <span>2. Alejarse de ventanas, vidrios y estantes</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStepsCompleted((prev) => ({ ...prev, utilitiesCut: !prev.utilitiesCut }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 select-none ${
                    stepsCompleted.utilitiesCut
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  {stepsCompleted.utilitiesCut ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-slate-600 shrink-0" />}
                  <span>3. Cerrar paso de gas y bajar interruptor</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStepsCompleted((prev) => ({ ...prev, backpackGrabbed: !prev.backpackGrabbed }));
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 select-none ${
                    stepsCompleted.backpackGrabbed
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  {stepsCompleted.backpackGrabbed ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-slate-600 shrink-0" />}
                  <span>4. Tomar mochila de emergencia de 72 horas</span>
                </button>
              </div>
            </div>

            {/* Abort button */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-mono text-slate-400">
                Tiempo de simulación: <strong>{elapsedEvacuationSeconds}s</strong>
              </span>

              <button
                type="button"
                onClick={(e) => handleStopDrill(e)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2"
              >
                <Square className="w-4 h-4 text-rose-400" />
                <span>Detener Simulacro</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PHASE 3: EVALUATION & REPORT                              */}
        {/* ========================================================= */}
        {drillState === 'completed' && (
          <div className="space-y-6 text-center">
            <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 space-y-3">
              <Award className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                Evaluación Oficial del Simulacro Sísmico
              </div>
              <h3 className="text-2xl font-black text-white">
                {drillScorePercent >= 75 ? '¡Excelente Capacidad de Respuesta!' : 'Simulacro Finalizado'}
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Completaste el simulacro de magnitud {magnitude} Mw hacia tu ubicación ({targetLocation.name}) en {elapsedEvacuationSeconds} segundos.
              </p>

              {/* Score Metric */}
              <div className="pt-2 flex items-center justify-center gap-6">
                <div>
                  <span className="text-3xl font-black font-mono text-emerald-400">{drillScorePercent}%</span>
                  <span className="text-[10px] text-slate-400 block uppercase">Protocolo Cumplido</span>
                </div>
                <div className="h-10 w-[1px] bg-slate-800"></div>
                <div>
                  <span className="text-3xl font-black font-mono text-cyan-400">{elapsedEvacuationSeconds}s</span>
                  <span className="text-[10px] text-slate-400 block uppercase">Tiempo Total</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDrillState('setup');
                }}
                className="py-2.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Repetir Simulacro</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="py-2.5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg"
              >
                Finalizar y Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeismicDrillModal;
