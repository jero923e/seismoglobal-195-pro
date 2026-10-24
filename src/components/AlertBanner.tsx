import React from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

interface AlertBannerProps {
  onDismiss: () => void;
  peakG: number;
  currentG: number;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  onDismiss,
  peakG,
  currentG,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 text-white p-5 md:p-6 shadow-2xl border-2 border-rose-400 animate-pulse">
      {/* Background strobe elements */}
      <div className="absolute inset-0 bg-red-600/30 mix-blend-overlay pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Emergency Status */}
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg animate-bounce">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/40 text-rose-200 border border-white/20">
                Alerta Sísmica Temprana Activa
              </span>
              <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                PGA Pico: {peakG.toFixed(3)}g
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
              ¡MOVIMIENTO TELÚRICO DETECTADO!
            </h2>
            <p className="text-sm font-medium text-rose-100 mt-1 max-w-xl">
              Aceleración sostenida superó el umbral de seguridad de 0.25g. Active protocolo de evacuación y resguardo.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white text-rose-700 font-extrabold text-sm shadow-xl hover:bg-rose-50 transition-all hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar / Silenciar</span>
          </button>
        </div>
      </div>

      {/* Protocol Advice Bar */}
      <div className="relative z-10 mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-rose-100">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">1</span>
            Agáchate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">2</span>
            Cúbrete la cabeza
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">3</span>
            Sujétate firme
          </span>
        </div>

        <div className="font-mono text-white/90">
          Aceleración instantánea: {currentG.toFixed(3)}g
        </div>
      </div>
    </div>
  );
};
