import React, { useRef, useEffect } from 'react';
import type { SeismicTelemetry } from '../types/seismic';
import { Activity } from 'lucide-react';

interface LiveSeismographProps {
  telemetry: SeismicTelemetry;
  thresholdG: number;
  isAlert: boolean;
}

interface WavePoint {
  net: number;
  x: number;
  y: number;
  z: number;
  time: number;
}

export const LiveSeismograph: React.FC<LiveSeismographProps> = ({
  telemetry,
  thresholdG,
  isAlert,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<WavePoint[]>([]);
  const maxPoints = 240; // ~4 seconds at 60Hz

  // Push incoming telemetry sample into circular display buffer
  useEffect(() => {
    bufferRef.current.push({
      net: telemetry.netVectorG,
      x: telemetry.filteredG.x,
      y: telemetry.filteredG.y,
      z: telemetry.filteredG.z,
      time: telemetry.timestamp,
    });

    if (bufferRef.current.length > maxPoints) {
      bufferRef.current.shift();
    }
  }, [telemetry]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark telemetry background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';

      // Horizontal grid
      const gridSteps = 4;
      for (let i = 1; i < gridSteps; i++) {
        const y = (height / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical grid
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Baseline reference (bottom baseline at 85% height)
      const baselineY = height * 0.85;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(width, baselineY);
      ctx.stroke();

      // Threshold line (0.25g)
      // Scale: 0g is at baselineY, 1.0g is at height * 0.15
      const availableHeight = baselineY - height * 0.15;
      const thresholdY = baselineY - Math.min(thresholdG, 1.0) * availableHeight;

      ctx.strokeStyle = isAlert ? '#ef4444' : '#f59e0b';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Threshold label
      ctx.font = '10px monospace';
      ctx.fillStyle = isAlert ? '#ef4444' : '#f59e0b';
      ctx.fillText(`UMBRAL SÍSMICO (${thresholdG.toFixed(2)}g)`, 10, thresholdY - 4);

      // Draw Waveforms if buffer has data
      const buffer = bufferRef.current;
      if (buffer.length > 1) {
        const stepX = width / (maxPoints - 1);

        // 1. Draw Net Vector Waveform (Cyan thick glowing trace)
        ctx.strokeStyle = isAlert ? '#ff2a5f' : '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = isAlert ? 'rgba(255, 42, 95, 0.6)' : 'rgba(0, 242, 254, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        buffer.forEach((pt, idx) => {
          const x = idx * stepX;
          const y = baselineY - Math.min(pt.net, 1.2) * availableHeight;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset blur

        // 2. Draw subtle X/Y linear traces centered on mid line
        const midY = height * 0.45;
        const subScale = height * 0.25;

        // X channel (Subtle Red)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        buffer.forEach((pt, idx) => {
          const x = idx * stepX;
          const y = midY - pt.x * subScale;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Y channel (Subtle Emerald)
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath();
        buffer.forEach((pt, idx) => {
          const x = idx * stepX;
          const y = midY - pt.y * subScale;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [thresholdG, isAlert]);

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 md:p-5 shadow-xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${isAlert ? 'text-rose-500 animate-spin' : 'text-cyan-400'}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 m-0">
            Sismograma de Banda Ancha en Tiempo Real
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
            <span>Vector Neto</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-red-400/60 rounded-full" />
            <span>Lin X</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-emerald-400/60 rounded-full" />
            <span>Lin Y</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400" />
            <span>Umbral (0.25g)</span>
          </span>
        </div>
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          className="w-full h-44 sm:h-52 block"
        />

        {/* Live status badge overlay */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400">
          60 FPS Telemetry Stream
        </div>
      </div>
    </div>
  );
};
