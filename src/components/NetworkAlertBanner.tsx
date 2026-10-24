import React from 'react';
import type { NetworkAlertState } from '../types/seismic';
import { Radio, AlertOctagon, Timer, MapPin, CheckCircle2, Waves } from 'lucide-react';

interface NetworkAlertBannerProps {
  alertState: NetworkAlertState;
  onDismiss: () => void;
}

export const NetworkAlertBanner: React.FC<NetworkAlertBannerProps> = ({
  alertState,
  onDismiss,
}) => {
  const { earthquake, etaSeconds, wavePhase } = alertState;
  if (!earthquake) return null;

  const isCritical = earthquake.mag >= 6.0;
  const isArrived = etaSeconds <= 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-2xl border-2 transition-all duration-300 animate-pulse ${
        isCritical
          ? 'bg-gradient-to-r from-red-900 via-rose-800 to-red-950 border-rose-500 text-white'
          : 'bg-gradient-to-r from-amber-950 via-orange-900 to-amber-900 border-amber-500 text-white'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Wave Icon & Magnitude */}
        <div className="flex items-start space-x-4">
          <div className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 text-white shrink-0 animate-bounce">
            {isArrived ? (
              <AlertOctagon className="w-8 h-8 text-rose-400" />
            ) : (
              <Waves className="w-8 h-8 text-amber-300" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/50 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-ping" />
                Pre-Alerta de Red Sísmica (USGS)
              </span>

              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                M {earthquake.mag.toFixed(1)}
              </span>

              <span className="text-[11px] font-mono text-slate-200 bg-black/30 px-2 py-0.5 rounded-full">
                {earthquake.distanceKm} km de distancia
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1.5 text-white">
              {isArrived
                ? '¡ONDA SÍSMICA EN ZONA DE IMPACTO!'
                : '¡PRE-ALERTA! ONDA SÍSMICA EN TRAYECTO HACIA TU UBICACIÓN'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 mt-1 flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Epicentro: {earthquake.place} (Profundidad: {earthquake.depthKm} km)</span>
            </p>
          </div>
        </div>

        {/* Center: Live ETA Countdown Gauge */}
        <div className="bg-black/50 border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[200px] shadow-inner backdrop-blur-md">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-300 uppercase">
            <Timer className="w-3.5 h-3.5 animate-spin" />
            <span>Tiempo Estimado Arribo (ETA)</span>
          </div>

          <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mt-1">
            {isArrived ? (
              <span className="text-rose-400 text-3xl">IMPACTO</span>
            ) : (
              <>
                <span className="text-amber-400">{etaSeconds}</span>
                <span className="text-lg text-slate-300 font-normal ml-1">seg</span>
              </>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-300 mt-1 uppercase tracking-wider">
            {wavePhase === 'P_WAVE_APPROACHING' && 'Onda P rápida aproximándose'}
            {wavePhase === 'S_WAVE_INCOMING' && '⚠️ Onda S destructiva en camino'}
            {wavePhase === 'IMPACT_ZONE' && 'Oscilación en desarrollo'}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center self-end md:self-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-xl hover:bg-slate-100 transition-all hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Confirmar Notificación</span>
          </button>
        </div>
      </div>
    </div>
  );
};
