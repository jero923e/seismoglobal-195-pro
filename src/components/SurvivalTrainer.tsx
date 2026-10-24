import React, { useState, useCallback, useMemo } from 'react';
import {
  Award,
  CheckCircle,
  XCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  Shield,
  Star,
  Brain,
  Zap,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────
interface ScenarioOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

interface Scenario {
  id: string;
  title: string;
  context: string;
  emoji: string;
  options: ScenarioOption[];
}

// ─── Scenario Database ─────────────────────────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: 'lab',
    title: '🔬 En el Laboratorio del Colegio',
    context: 'Estás en clase de Química en el laboratorio del colegio. Hay mecheros Bunsen encendidos, estantes con frascos de vidrio y reactivos. Comienza un temblor fuerte. ¿Qué haces primero?',
    emoji: '🔬',
    options: [
      {
        id: 'lab-a',
        text: 'Correr hacia la puerta de salida inmediatamente',
        isCorrect: false,
        explanation: 'INCORRECTO. Correr durante un sismo es peligroso: puedes caer, ser golpeado por objetos, o pisar vidrios rotos. Primero asegura el entorno.',
      },
      {
        id: 'lab-b',
        text: 'Apagar los mecheros Bunsen, cerrar llaves de gas, alejarte de estantes y cubrirte bajo una mesa sólida',
        isCorrect: true,
        explanation: 'CORRECTO. En un laboratorio, la prioridad es eliminar fuentes de ignición (gas/fuego), alejarse de estantes con químicos y vidrios, y luego protegerse bajo una superficie sólida. Esto evita incendios, derrames tóxicos y heridas por vidrios.',
      },
      {
        id: 'lab-c',
        text: 'Quedarte quieto donde estás y esperar a que pase',
        isCorrect: false,
        explanation: 'INCORRECTO. Quedarse inmóvil junto a mecheros encendidos y estantes con químicos es extremadamente peligroso. Se debe actuar rápidamente para eliminar riesgos de incendio y derrames.',
      },
      {
        id: 'lab-d',
        text: 'Intentar salvar los equipos costosos del laboratorio',
        isCorrect: false,
        explanation: 'INCORRECTO. Tu seguridad personal siempre es más importante que cualquier equipo. Nunca priorices objetos materiales sobre tu integridad física durante un sismo.',
      },
    ],
  },
  {
    id: 'elevator',
    title: '🛗 Atrapado en un Ascensor',
    context: 'Vas subiendo en el ascensor de un edificio de 8 pisos cuando sientes un temblor. El ascensor se detiene entre pisos. ¿Cuál es tu mejor acción?',
    emoji: '🛗',
    options: [
      {
        id: 'elev-a',
        text: 'Intentar abrir las puertas manualmente y saltar al piso más cercano',
        isCorrect: false,
        explanation: 'INCORRECTO. Forzar las puertas y saltar es extremadamente peligroso. Podrías caer al vacío del ducto del ascensor, especialmente si hay réplicas.',
      },
      {
        id: 'elev-b',
        text: 'Presionar todos los botones de pisos para intentar moverlo',
        isCorrect: false,
        explanation: 'INCORRECTO. No se debe intentar mover el ascensor durante un sismo. Los mecanismos pueden estar dañados y el movimiento podría provocar una caída libre.',
      },
      {
        id: 'elev-c',
        text: 'Presionar el botón de emergencia, agacharte en una esquina y cubrir tu cabeza con los brazos',
        isCorrect: true,
        explanation: 'CORRECTO. En un ascensor detenido: 1) Presiona el botón de emergencia/alarma para notificar al personal. 2) Agáchate en una esquina (estructura más fuerte). 3) Protege tu cabeza. Los ascensores modernos tienen frenos de seguridad automáticos.',
      },
      {
        id: 'elev-d',
        text: 'Gritar pidiendo ayuda sin parar',
        isCorrect: false,
        explanation: 'PARCIALMENTE. Gritar puede ayudar, pero no es la prioridad. Primero protégete físicamente y usa el botón de emergencia (es más efectivo que gritar).',
      },
    ],
  },
  {
    id: 'rural',
    title: '⛰️ En una Vereda con Riesgo de Derrumbe',
    context: 'Estás en una vereda rural en zona montañosa. Ha llovido intensamente los últimos 3 días y ahora sientes un sismo de moderado a fuerte. ¿Qué haces?',
    emoji: '⛰️',
    options: [
      {
        id: 'rural-a',
        text: 'Permanecer dentro de la casa de bahareque hasta que pase el temblor',
        isCorrect: false,
        explanation: 'INCORRECTO. Las casas de bahareque o adobe no son sismo-resistentes y pueden colapsar. Además, la combinación lluvia intensa + sismo en zona montañosa genera alto riesgo de deslizamiento.',
      },
      {
        id: 'rural-b',
        text: 'Salir rápidamente de la edificación, alejarse de laderas empinadas y ríos/quebradas, dirigirse a terreno elevado y firme',
        isCorrect: true,
        explanation: 'CORRECTO. La combinación de lluvia prolongada + sismo en zona montañosa es extremadamente peligrosa por riesgo de deslizamiento y avalancha de lodo. Debes: 1) Abandonar estructuras vulnerables. 2) Alejarte de laderas y cauces de agua. 3) Buscar terreno elevado, estable y abierto.',
      },
      {
        id: 'rural-c',
        text: 'Bajar por el camino de la vereda hacia la carretera principal',
        isCorrect: false,
        explanation: 'INCORRECTO. Los caminos rurales en laderas son las zonas más vulnerables a derrumbes durante y después de un sismo con suelo saturado. Los deslizamientos suelen cortar las vías.',
      },
      {
        id: 'rural-d',
        text: 'Refugiarse junto al río/quebrada donde el terreno es plano',
        isCorrect: false,
        explanation: 'INCORRECTO. Los cauces de ríos y quebradas son zonas de máximo riesgo en esta situación. Pueden formarse represamientos naturales que luego se rompen generando avalanchas de lodo (lahares).',
      },
    ],
  },
  {
    id: 'night',
    title: '🌙 En la Cama a Medianoche',
    context: 'Son las 2:30 AM y te despiertas con un sismo fuerte. Está completamente oscuro. El temblor es intenso y los objetos caen de los estantes. ¿Qué haces?',
    emoji: '🌙',
    options: [
      {
        id: 'night-a',
        text: 'Levantarte corriendo descalzo para salir de la casa',
        isCorrect: false,
        explanation: 'INCORRECTO. Correr descalzo en la oscuridad durante un sismo es extremadamente peligroso. Puedes pisar vidrios rotos, tropezar con muebles caídos o caer por las escaleras.',
      },
      {
        id: 'night-b',
        text: 'Quedarte en la cama, cubrirte con la almohada sobre la cabeza y protegerte bajo el colchón o al lado de la cama',
        isCorrect: true,
        explanation: 'CORRECTO. Si estás en la cama durante un sismo nocturno: 1) NO te levantes corriendo en la oscuridad. 2) Usa la almohada para proteger tu cabeza de objetos que caen. 3) Si tu cama tiene estructura sólida, quédate debajo. 4) Si no, rueda al suelo junto a la cama (zona de protección). Ten siempre zapatos y linterna al alcance de la cama.',
      },
      {
        id: 'night-c',
        text: 'Buscar tu celular para activar la linterna antes de moverte',
        isCorrect: false,
        explanation: 'PARCIALMENTE. Buscar el celular te quita segundos valiosos de protección. La prioridad es cubrirte inmediatamente. El celular debería estar siempre al lado de la cama en la mesa de noche.',
      },
      {
        id: 'night-d',
        text: 'Correr al marco de la puerta más cercana',
        isCorrect: false,
        explanation: 'MITO OBSOLETO. Los marcos de puertas NO son más seguros en construcciones modernas. Este consejo era válido para casas de adobe antiguas. En edificaciones actuales, debajo de un mueble sólido es más seguro.',
      },
    ],
  },
  {
    id: 'mall',
    title: '🛍️ En un Centro Comercial',
    context: 'Estás en el segundo piso de un centro comercial concurrido cuando comienza un sismo fuerte. Hay cientos de personas, escaleras mecánicas, vitrinas de vidrio y estructuras colgantes. ¿Qué haces?',
    emoji: '🛍️',
    options: [
      {
        id: 'mall-a',
        text: 'Correr hacia las escaleras mecánicas para bajar al primer piso',
        isCorrect: false,
        explanation: 'INCORRECTO. Las escaleras mecánicas pueden detenerse abruptamente o colapsar durante un sismo. Además, la estampida humana en escaleras es una de las principales causas de lesiones en lugares concurridos.',
      },
      {
        id: 'mall-b',
        text: 'Alejarte de vitrinas/vidrios y estructuras colgantes, agacharte junto a un pilar o muro estructural, cubrirte la cabeza',
        isCorrect: true,
        explanation: 'CORRECTO. En un centro comercial: 1) Aléjate de vitrinas, vidrios, anaqueles altos y decoraciones colgantes. 2) Ubica un pilar de concreto o muro estructural (los más gruesos). 3) Agáchate, cúbrete y sujétate. 4) NO uses ascensores ni escaleras mecánicas. 5) Espera a que cese el movimiento antes de evacuar ordenadamente.',
      },
      {
        id: 'mall-c',
        text: 'Quedarte exactamente donde estás sin moverte',
        isCorrect: false,
        explanation: 'INCORRECTO. Si estás junto a una vitrina de vidrio, un anaquel alto o bajo una estructura decorativa colgante, debes moverte a una zona más segura, incluso durante el temblor.',
      },
      {
        id: 'mall-d',
        text: 'Seguir a la multitud hacia donde todos corren',
        isCorrect: false,
        explanation: 'INCORRECTO. Seguir a la multitud sin criterio puede llevarte a una estampida mortal. Las multitudes en pánico frecuentemente toman las peores decisiones de evacuación.',
      },
    ],
  },
  {
    id: 'driving',
    title: '🚗 Conduciendo en la Carretera',
    context: 'Vas conduciendo por una autopista a 80 km/h cuando sientes que el vehículo se balancea extrañamente. Te das cuenta de que es un sismo fuerte. ¿Qué haces?',
    emoji: '🚗',
    options: [
      {
        id: 'drive-a',
        text: 'Frenar bruscamente y salir corriendo del vehículo',
        isCorrect: false,
        explanation: 'INCORRECTO. Frenar bruscamente en autopista puede causar un accidente en cadena. Además, fuera del vehículo estás más expuesto a escombros y tráfico.',
      },
      {
        id: 'drive-b',
        text: 'Reducir gradualmente la velocidad, estacionar al borde de la vía lejos de puentes/pasos elevados, y permanecer dentro del vehículo con el cinturón puesto',
        isCorrect: true,
        explanation: 'CORRECTO. 1) Reduce velocidad gradualmente (no frenes de golpe). 2) Enciende las luces de emergencia. 3) Estaciona al costado, lejos de puentes, pasos elevados, cables eléctricos y edificios. 4) Permanece dentro del vehículo (actúa como escudo). 5) Solo sal cuando el sismo termine completamente.',
      },
      {
        id: 'drive-c',
        text: 'Acelerar para llegar más rápido a un lugar seguro',
        isCorrect: false,
        explanation: 'INCORRECTO. Acelerar durante un sismo es extremadamente peligroso. La carretera puede tener grietas, derrumbes o el pavimento puede estar ondulando. Perder el control del vehículo a alta velocidad es casi seguro.',
      },
      {
        id: 'drive-d',
        text: 'Detenerte bajo un puente o paso elevado para protegerte',
        isCorrect: false,
        explanation: 'INCORRECTO. Los puentes y pasos elevados son estructuras que pueden colapsar durante un sismo fuerte. NUNCA te detengas debajo de uno.',
      },
    ],
  },
];

// ─── Badge System ──────────────────────────────────────────────────────
function getBadge(score: number, total: number): { name: string; emoji: string; color: string; description: string } {
  const pct = (score / total) * 100;
  if (pct === 100) return { name: 'Experto en Supervivencia Sísmica', emoji: '🏆', color: 'text-amber-400', description: '¡Perfecto! Dominas todos los protocolos de protección civil.' };
  if (pct >= 80) return { name: 'Ciudadano Preparado en Prevención Sísmica', emoji: '🛡️', color: 'text-emerald-400', description: 'Excelente conocimiento. Eres un referente de prevención para tu comunidad.' };
  if (pct >= 60) return { name: 'Aprendiz de Protección Civil', emoji: '📚', color: 'text-cyan-400', description: 'Buen inicio. Repasa los escenarios donde fallaste para mejorar tu preparación.' };
  return { name: 'Novato Sísmico', emoji: '🎓', color: 'text-slate-400', description: 'Necesitas mejorar. La preparación sísmica puede salvar tu vida. Repite el entrenamiento.' };
}

// ─── Component ─────────────────────────────────────────────────────────
export function SurvivalTrainer() {
  const [currentScenario, setCurrentScenario] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  const scenario = SCENARIOS[currentScenario];
  const selectedOption = scenario?.options.find((o) => o.id === selectedAnswer);

  const handleSelectAnswer = useCallback(
    (optionId: string) => {
      if (showExplanation) return; // Already answered
      setSelectedAnswer(optionId);
      setShowExplanation(true);

      const option = scenario.options.find((o) => o.id === optionId);
      if (option?.isCorrect) {
        setScore((prev) => prev + 1);
      }
      setAnswers((prev) => ({ ...prev, [scenario.id]: option?.isCorrect ?? false }));
    },
    [scenario, showExplanation]
  );

  const handleNext = () => {
    if (currentScenario < SCENARIOS.length - 1) {
      setCurrentScenario((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentScenario(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers({});
    setIsFinished(false);
  };

  const badge = useMemo(() => getBadge(score, SCENARIOS.length), [score]);

  if (isFinished) {
    return (
      <div className="space-y-4">
        {/* Results */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 border-2 border-indigo-500/40 shadow-2xl text-center space-y-5">
          <div className="text-6xl">{badge.emoji}</div>
          <div>
            <h3 className={`text-xl font-black ${badge.color}`}>{badge.name}</h3>
            <p className="text-xs text-slate-400 mt-1">{badge.description}</p>
          </div>
          <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{score}</div>
              <div className="text-[10px] text-emerald-400 font-bold">Correctas</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">{SCENARIOS.length - score}</div>
              <div className="text-[10px] text-red-400 font-bold">Incorrectas</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">{Math.round((score / SCENARIOS.length) * 100)}%</div>
              <div className="text-[10px] text-cyan-400 font-bold">Puntuación</div>
            </div>
          </div>

          {/* Scenario results */}
          <div className="space-y-1.5 text-left">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className={`p-2 rounded-lg flex items-center gap-2 text-xs ${
                  answers[sc.id]
                    ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-950/30 border border-red-500/20 text-red-300'
                }`}
              >
                <span>{answers[sc.id] ? '✅' : '❌'}</span>
                <span className="font-bold">{sc.title}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRestart}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            Repetir Entrenamiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/40 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                Simulador de Decisiones Rápidas
              </div>
              <h3 className="text-lg font-black text-white">Entrenador de Supervivencia Sísmica</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-mono font-bold">
              {currentScenario + 1} / {SCENARIOS.length}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mt-2">
          {SCENARIOS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < currentScenario
                  ? answers[SCENARIOS[i].id]
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                  : i === currentScenario
                  ? 'bg-indigo-500 animate-pulse'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scenario */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{scenario.emoji}</span>
          <div>
            <h4 className="text-sm font-black text-white mb-2">{scenario.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{scenario.context}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {scenario.options.map((opt) => {
            const isSelected = selectedAnswer === opt.id;
            const showResult = showExplanation;

            let optionClass = 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800';
            if (showResult && opt.isCorrect) {
              optionClass = 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30';
            } else if (showResult && isSelected && !opt.isCorrect) {
              optionClass = 'bg-red-950/50 border-red-500/50 text-red-200 ring-1 ring-red-500/30';
            } else if (showResult) {
              optionClass = 'bg-slate-800/40 border-slate-700/50 text-slate-500 opacity-60';
            }

            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => handleSelectAnswer(opt.id)}
                disabled={showExplanation}
                className={`w-full p-3 rounded-xl border text-left text-xs font-bold flex items-start gap-2 transition-all ${optionClass}`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {showResult && opt.isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : showResult && isSelected && !opt.isCorrect ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-current opacity-40" />
                  )}
                </span>
                <span className="leading-relaxed">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && selectedOption && (
          <div
            className={`p-4 rounded-xl border ${
              selectedOption.isCorrect
                ? 'bg-emerald-950/40 border-emerald-500/30'
                : 'bg-red-950/40 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Explicación Científica de Protección Civil</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedOption.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            {currentScenario < SCENARIOS.length - 1 ? (
              <>
                <span>Siguiente Escenario</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                <span>Ver Resultados e Insignia</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Score so far */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-500">
        <span>
          Puntuación parcial: <span className="text-emerald-400 font-bold">{score}</span> / {currentScenario + (showExplanation ? 1 : 0)}
        </span>
        <button
          type="button"
          onClick={handleRestart}
          className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reiniciar
        </button>
      </div>
    </div>
  );
}

export default SurvivalTrainer;
