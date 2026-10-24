import React, { useState } from 'react';
import type { SimulationMagnitude } from '../types/seismic';
import { Play, Square, X, AlertTriangle, ShieldCheck, Flame, Radio } from 'lucide-react';

interface SimulationFabProps {
  isSimulating: boolean;
  activeMagnitude: SimulationMagnitude | null;
  onSimulate: (magnitude: SimulationMagnitude) => void;
  onStopSimulation: () => void;
}

export const SimulationFab: React.FC<SimulationFabProps> = ({
  isSimulating,
  activeMagnitude,
  onSimulate,
  onStopSimulation,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      id: 'low' as SimulationMagnitude,
      name: 'Magnitud Baja',
      pga: '~0.12g',
      duration: '3.2s',
      color: 'border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300',
      badgeColor: 'bg-teal-500/30 text-teal-200',
      icon: ShieldCheck,
      description: 'Temblor leve (<0.25g). Comprueba que el filtro previene falsos positivos.',
      expectedResult: 'No dispara alerta sísmica',
    },
    {
      id: 'medium' as SimulationMagnitude,
      name: 'Magnitud Media',
      pga: '~0.38g',
      duration: '4.5s',
      color: 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300',
      badgeColor: 'bg-amber-500/30 text-amber-200',
      icon: AlertTriangle,
      description: 'Sismo moderado sostenido > 150ms. Supera el umbral estándar de 0.25g.',
      expectedResult: 'Activa ALERTA Sísmica',
    },
    {
      id: 'critical' as SimulationMagnitude,
      name: 'Magnitud Crítica',
      pga: '~0.88g',
      duration: '6.5s',
      color: 'border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300',
      badgeColor: 'bg-rose-500/30 text-rose-200',
      icon: Flame,
      description: 'Terremoto severo con alta aceleración caótica y ondas de corte S intensas.',
      expectedResult: 'Activa ALERTA Sísmica Máxima + Sirena',
    },
  ];

  const handleSelect = (mag: SimulationMagnitude) => {
    onSimulate(mag);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-3">
        {/* If simulating, show quick stop floating tag */}
        {isSimulating && (
          <button
            onClick={onStopSimulation}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-600 text-white font-mono text-xs font-bold shadow-lg shadow-rose-600/50 hover:bg-rose-700 animate-pulse transition-transform hover:scale-105"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Detener Sismo ({activeMagnitude?.toUpperCase()})</span>
          </button>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 border font-semibold text-sm ${
            isSimulating
              ? 'bg-amber-600 text-white border-amber-400 shadow-amber-600/40 animate-pulse'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-400/40 shadow-cyan-500/30 hover:scale-105'
          }`}
          aria-label="Simulador de sismos de prueba"
        >
          {isSimulating ? (
            <>
              <Radio className="w-5 h-5 animate-spin" />
              <span>Simulando Sismo...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Simular Sismo</span>
            </>
          )}
        </button>
      </div>

      {/* Modal / Dialog when FAB is opened */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-cyan-400 fill-current" />
                  Simulador de Telemetría Sísmica
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inyecta oscilaciones sintéticas para validar la lógica del sensor y filtros
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-3">
              {presets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col space-y-1.5 ${preset.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-bold text-sm">
                        <Icon className="w-4 h-4" />
                        <span>{preset.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${preset.badgeColor}`}>
                          PGA {preset.pga}
                        </span>
                        <span className="text-slate-400">{preset.duration}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 opacity-90">{preset.description}</p>

                    <div className="text-[11px] font-mono text-slate-400 pt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>Resultado: {preset.expectedResult}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-800">
              <span>Prueba de respuesta de fase de onda P y S</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-slate-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
