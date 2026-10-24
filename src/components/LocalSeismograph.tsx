import React, { useState, useEffect, useRef } from 'react';
import type { CountryProfile } from '../data/countries195';
import { useSeismicSensor } from '../hooks/useSeismicSensor';
import {
  Activity,
  Play,
  Square,
  AlertTriangle,
  Volume2,
  VolumeX,
  Radio,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { seismicAudio } from '../utils/audioAlert';

interface LocalSeismographProps {
  country: CountryProfile;
}

export const LocalSeismograph: React.FC<LocalSeismographProps> = ({ country }) => {
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    sensorState,
    telemetry,
    isSimulating,
    activeSimulationMag,
    startMonitoring,
    stopMonitoring,
    dismissAlert,
    simulateEarthquake,
    stopSimulation,
  } = useSeismicSensor({
    thresholdG: 0.25,
    sustainedMs: 150,
  });

  // Toggle sound
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    seismicAudio.setMuted(next);
  };

  // Circular trace buffer for Helicorder canvas
  const traceBufferRef = useRef<number[]>([]);
  const maxBufferPoints = 320;

  useEffect(() => {
    traceBufferRef.current.push(telemetry.netVectorG);
    if (traceBufferRef.current.length > maxBufferPoints) {
      traceBufferRef.current.shift();
    }
  }, [telemetry.netVectorG]);

  // Helicorder Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Dark seismological drum background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, w, h);

      // Draw Helicorder Grid Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';

      // Horizontal reference tracks
      const tracks = 5;
      for (let i = 1; i <= tracks; i++) {
        const y = (h / (tracks + 1)) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Time ticks
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Draw Baseline
      const centerY = h * 0.72;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      // Threshold Line (0.25g)
      const scaleH = h * 0.55;
      const thresholdY = centerY - 0.25 * scaleH;

      ctx.strokeStyle = sensorState === 'ALERTA' ? '#ef4444' : '#f59e0b';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(w, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      ctx.fillStyle = sensorState === 'ALERTA' ? '#ef4444' : '#f59e0b';
      ctx.font = '10px monospace';
      ctx.fillText('UMBRAL SÍSMICO (0.25g)', 10, thresholdY - 4);

      // Draw Seismic Trace
      const buf = traceBufferRef.current;
      if (buf.length > 1) {
        const stepX = w / (maxBufferPoints - 1);

        ctx.strokeStyle =
          sensorState === 'ALERTA'
            ? '#ff2a5f'
            : isSimulating
            ? '#f59e0b'
            : '#00f2fe';
        ctx.lineWidth = 2.2;
        ctx.shadowColor =
          sensorState === 'ALERTA'
            ? 'rgba(255, 42, 95, 0.6)'
            : 'rgba(0, 242, 254, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        buf.forEach((val, idx) => {
          const x = idx * stepX;
          const y = centerY - Math.min(val, 1.2) * scaleH;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [sensorState, isSimulating]);

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-xl backdrop-blur-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
              <span>Sismógrafo Helicorder en Tiempo Real</span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  sensorState === 'ALERTA'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : sensorState === 'MONITOREANDO'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : sensorState === 'CALIBRANDO'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {sensorState}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acelerómetro con filtro de paso alto y alarma sonora Web Audio API
            </p>
          </div>
        </div>

        {/* Audio Mute & Monitor Start */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className={`p-2.5 rounded-xl border transition-colors ${
              isMuted
                ? 'bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}
            title={isMuted ? 'Activar sonido de sirena' : 'Silenciar sirena'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {sensorState === 'INACTIVO' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startMonitoring();
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Activar Sensor</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopMonitoring();
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Detener</span>
            </button>
          )}
        </div>
      </div>

      {/* Emergency Alert Banner if Triggered */}
      {sensorState === 'ALERTA' && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-700 to-red-600 p-4 text-white shadow-xl border-2 border-rose-400 animate-pulse flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-7 h-7 text-white shrink-0 animate-bounce" />
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded-full">
                ¡ALERTA SÍSMICA LOCAL!
              </span>
              <p className="text-sm font-extrabold mt-1">
                Aceleración anómala sostenida ({telemetry.netVectorG.toFixed(3)}g &gt; 0.25g)
              </p>
              <p className="text-xs text-rose-100 mt-0.5">
                Protocolo {country.name}: {country.protocol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissAlert();
            }}
            className="px-4 py-2 rounded-xl bg-white text-rose-700 font-black text-xs shadow-lg hover:bg-rose-50 transition-transform active:scale-95 shrink-0"
          >
            Silenciar / Confirmar
          </button>
        </div>
      )}

      {/* Real-Time Helicorder Canvas Display */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#080c14]">
        <canvas
          ref={canvasRef}
          width={750}
          height={210}
          className="w-full h-44 sm:h-52 block"
        />

        {/* Live Vector Gauge Overlay */}
        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-right font-mono">
          <div className="text-[10px] text-slate-400 uppercase">Aceleración Neta</div>
          <div className="text-lg font-black text-cyan-400">
            {telemetry.netVectorG.toFixed(3)} <span className="text-xs text-slate-400 font-normal">g</span>
          </div>
        </div>

        {/* Shaking Persistence Gauge */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-2 font-mono text-xs">
          <span className="text-[10px] text-slate-400">Persistencia:</span>
          <span className="font-bold text-amber-400">{telemetry.sustainedDurationMs} ms</span>
          <span className="text-[10px] text-slate-500">/ 150 ms</span>
        </div>
      </div>

      {/* Wave Simulation Mode for PC Testing */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Simulador de Ondas Sísmicas P y S (Pruebas en PC)</span>
          </div>
          {isSimulating && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopSimulation();
              }}
              className="text-[11px] font-bold text-rose-400 hover:underline flex items-center gap-1"
            >
              <Square className="w-3 h-3" />
              <span>Detener Simulación</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Low */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              simulateEarthquake('low');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSimulationMag === 'low'
                ? 'bg-teal-500/20 border-teal-500 text-teal-200 ring-1 ring-teal-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-bold text-xs text-teal-300 flex items-center justify-between">
              <span>Sismo Leve (~0.12g)</span>
              <span className="text-[10px] font-mono">PGA 0.12g</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Prueba de inmunidad: no supera el umbral de 0.25g.
            </p>
          </button>

          {/* Medium */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              simulateEarthquake('medium');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSimulationMag === 'medium'
                ? 'bg-amber-500/20 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-bold text-xs text-amber-300 flex items-center justify-between">
              <span>Sismo Moderado (~0.38g)</span>
              <span className="text-[10px] font-mono">PGA 0.38g</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Supera 0.25g sostenido &gt;150ms: activa ALERTA.
            </p>
          </button>

          {/* Critical */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              simulateEarthquake('critical');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeSimulationMag === 'critical'
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 ring-1 ring-rose-500'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <div className="font-bold text-xs text-rose-300 flex items-center justify-between">
              <span>Sismo Crítico (~0.88g)</span>
              <span className="text-[10px] font-mono">PGA 0.88g</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Terremoto violento con ondas de corte destructivas.
            </p>
          </button>
        </div>
      </div>

      {/* Official Country Emergency Box */}
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-300">
          <span className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Resguardo Oficial en {country.name} ({country.flag})</span>
          </span>
          <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergencias: {country.emergencyPhone}</span>
          </span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          {country.protocol}
        </p>
        <p className="text-[10px] text-slate-500 font-mono">
          Autoridad competente: {country.agency}
        </p>
      </div>
    </div>
  );
};
