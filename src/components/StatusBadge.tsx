import React from 'react';
import type { SensorState } from '../types/seismic';
import { PowerOff, Compass, Radio, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  state: SensorState;
  isSimulating?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, isSimulating }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'INACTIVO':
        return {
          icon: PowerOff,
          label: 'INACTIVO',
          subtext: 'Acelerómetro en espera',
          color: 'text-slate-400 bg-slate-800/80 border-slate-700',
          dotColor: 'bg-slate-500',
          glow: '',
        };
      case 'CALIBRANDO':
        return {
          icon: Compass,
          label: 'CALIBRANDO',
          subtext: 'Estabilizando offset de 1G...',
          color: 'text-indigo-300 bg-indigo-950/50 border-indigo-500/40',
          dotColor: 'bg-indigo-400 animate-spin',
          glow: 'shadow-lg shadow-indigo-500/20',
        };
      case 'MONITOREANDO':
        return {
          icon: Radio,
          label: 'MONITOREANDO',
          subtext: isSimulating ? 'Inyección de Simulación Sísmica' : 'Vigilancia sísmica en tiempo real',
          color: 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40',
          dotColor: 'bg-emerald-400',
          glow: 'shadow-lg shadow-emerald-500/20',
        };
      case 'ALERTA':
        return {
          icon: AlertOctagon,
          label: '¡ALERTA SÍSMICA!',
          subtext: 'Aceleración anómala sostenida > 150ms',
          color: 'text-rose-100 bg-rose-600 border-rose-400 font-extrabold',
          dotColor: 'bg-white animate-ping',
          glow: 'shadow-2xl shadow-rose-600/70 animate-pulse',
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-300 ${config.color} ${config.glow}`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative p-2 rounded-xl bg-black/20">
          <Icon className={`w-6 h-6 ${state === 'ALERTA' ? 'animate-bounce' : ''}`} />
          {state === 'MONITOREANDO' && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-black tracking-wider uppercase">{config.label}</span>
            {isSimulating && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Simulador Activo
              </span>
            )}
          </div>
          <p className="text-xs opacity-85 mt-0.5">{config.subtext}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`w-3 h-3 rounded-full ${config.dotColor}`} />
      </div>
    </div>
  );
};
