import React from 'react';

interface IntensityScaleProps {
  currentG: number;
}

const SCALE_LEVELS = [
  { label: 'I - II', desc: 'No perceptible', minG: 0, maxG: 0.02, color: 'bg-emerald-500' },
  { label: 'III - IV', desc: 'Leve', minG: 0.02, maxG: 0.10, color: 'bg-teal-500' },
  { label: 'V', desc: 'Moderado', minG: 0.10, maxG: 0.25, color: 'bg-amber-500' },
  { label: 'VI - VII', desc: 'Fuerte (Alerta)', minG: 0.25, maxG: 0.60, color: 'bg-orange-500' },
  { label: 'VIII+', desc: 'Crítico / Destructivo', minG: 0.60, maxG: 1.5, color: 'bg-rose-600' },
];

export const IntensityScale: React.FC<IntensityScaleProps> = ({ currentG }) => {
  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">
          Escala de Intensidad Sísmica Instrumental (MMI / PGA)
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          Actual: <span className="text-cyan-400 font-bold">{currentG.toFixed(3)}g</span>
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mt-2">
        {SCALE_LEVELS.map((level, idx) => {
          const isActive = currentG >= level.minG && (idx === SCALE_LEVELS.length - 1 || currentG < level.maxG);
          const isPassed = currentG >= level.maxG;

          return (
            <div key={level.label} className="flex flex-col space-y-1">
              <div
                className={`h-2 rounded-full transition-all duration-150 ${
                  isActive
                    ? `${level.color} shadow-lg shadow-current ring-2 ring-white/50 scale-y-125`
                    : isPassed
                    ? `${level.color} opacity-60`
                    : 'bg-slate-800 opacity-40'
                }`}
              />
              <div className="text-center">
                <div
                  className={`text-[10px] font-bold font-mono transition-colors ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {level.label}
                </div>
                <div
                  className={`text-[9px] truncate transition-colors hidden sm:block ${
                    isActive ? 'text-slate-200 font-medium' : 'text-slate-600'
                  }`}
                >
                  {level.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
