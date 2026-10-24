import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CountryProfile } from '../data/countries195';
import type { ClusteredEvent } from '../utils/seismicClassifier';
import type { WaveSimulationState } from './SeismicMap';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  AlertTriangle,
  Radio,
  Share2,
  CheckSquare,
  Square as SquareIcon,
  PhoneCall,
  ShieldCheck,
  ShieldAlert,
  Building,
  Home,
  TreePine,
  MapPin,
  Car,
  Clock,
  Flashlight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import type { UserHomeLocation } from '../services/localityService';
import { soundAlarm } from '../utils/soundAlarm';

interface EmergencyCenterProps {
  country: CountryProfile;
  selectedEvent: ClusteredEvent | null;
  onUpdateWaveSimulation: (sim: WaveSimulationState | null) => void;
  userCoords: { lat: number; lng: number } | null;
  homeLocation?: UserHomeLocation | null;
  onNavigateToMap?: () => void;
}

type EmergencySubTab = 'protocol' | 'sos' | 'waves' | 'structure' | 'backpack';
type QuakeContext = 'building' | 'home' | 'rural' | 'street' | 'driving';
type QuakePhase = 'during' | 'before' | 'after';

// 72h Backpack Items
interface BackpackItem {
  id: string;
  category: string;
  label: string;
  detail: string;
  essential: boolean;
}

const DEFAULT_BACKPACK_ITEMS: BackpackItem[] = [
  // Agua y Alimentos
  {
    id: 'water',
    category: 'Agua & Alimentos',
    label: 'Agua embotellada (4L por persona)',
    detail: 'Mínimo para 72 horas (beber e higiene básica)',
    essential: true,
  },
  {
    id: 'food',
    category: 'Agua & Alimentos',
    label: 'Alimentos no perecederos enlatados',
    detail: 'Atún, legumbres, barritas energéticas y frutos secos',
    essential: true,
  },
  {
    id: 'can_opener',
    category: 'Agua & Alimentos',
    label: 'Abrelatas manual',
    detail: 'Para latas y conservas sin requerir electricidad',
    essential: true,
  },

  // Primeros Auxilios & Salud
  {
    id: 'first_aid',
    category: 'Salud & Botiquín',
    label: 'Botiquín de primeros auxilios completo',
    detail: 'Gasas estériles, vendas, antiséptico, tijeras y termómetro',
    essential: true,
  },
  {
    id: 'medicines',
    category: 'Salud & Botiquín',
    label: 'Medicamentos personales crónicos',
    detail: 'Reserva para 5-7 días con recetas médicas vigentes',
    essential: true,
  },
  {
    id: 'masks',
    category: 'Salud & Botiquín',
    label: 'Mascarillas KN95 antipolvo',
    detail: 'Protección contra polvo y partículas de escombros',
    essential: false,
  },

  // Herramientas & Comunicación
  {
    id: 'radio',
    category: 'Herramientas & Rescate',
    label: 'Radio portátil AM/FM a baterías o dinamo',
    detail: 'Para recibir boletines oficiales sin red celular',
    essential: true,
  },
  {
    id: 'flashlight',
    category: 'Herramientas & Rescate',
    label: 'Linterna LED de alta potencia + baterías extra',
    detail: 'Evita fósforos por posibles fugas de gas',
    essential: true,
  },
  {
    id: 'whistle',
    category: 'Herramientas & Rescate',
    label: 'Silbato acústico de alta penetración',
    detail: 'Para pedir auxilio acústico si quedas atrapado',
    essential: true,
  },
  {
    id: 'multi_tool',
    category: 'Herramientas & Rescate',
    label: 'Navaja o multiherramienta',
    detail: 'Con alicates, destornillador y cuchilla',
    essential: true,
  },
  {
    id: 'duct_tape',
    category: 'Herramientas & Rescate',
    label: 'Cinta adhesiva de alta resistencia (Duct tape)',
    detail: 'Sellado de ventanas y reparaciones provisionales',
    essential: false,
  },

  // Documentos & Finanzas
  {
    id: 'docs',
    category: 'Documentos & Efectivo',
    label: 'Copias plastificadas de identificaciones y títulos',
    detail: 'DNI, pasaportes, pólizas y escrituras en bolsa hermética',
    essential: true,
  },
  {
    id: 'cash',
    category: 'Documentos & Efectivo',
    label: 'Dinero en efectivo en billetes pequeños',
    detail: 'Cajeros automáticos y terminales fallan durante apagones',
    essential: true,
  },
  {
    id: 'key_contacts',
    category: 'Documentos & Efectivo',
    label: 'Directorio telefónico escrito en papel',
    detail: 'Números de familiares y emergencias ante batería agotada',
    essential: true,
  },

  // Ropa & Refugio
  {
    id: 'thermal_blanket',
    category: 'Ropa & Refugio',
    label: 'Manta térmica aluminizada de emergencia',
    detail: 'Retiene el 90% del calor corporal en intemperie',
    essential: true,
  },
  {
    id: 'warm_clothes',
    category: 'Ropa & Refugio',
    label: 'Muda de ropa abrigada y calzado resistente',
    detail: 'Evita cortes con cristales rotos en el suelo',
    essential: true,
  },
  {
    id: 'gloves',
    category: 'Ropa & Refugio',
    label: 'Guantes de trabajo de uso rudo',
    detail: 'Para mover escombros de forma segura',
    essential: false,
  },

  // Higiene & Mascotas
  {
    id: 'hygiene',
    category: 'Higiene & Mascotas',
    label: 'Gel antibacterial, papel higiénico y toallitas',
    detail: 'Prevención de infecciones en campamentos temporales',
    essential: false,
  },
  {
    id: 'pet_supplies',
    category: 'Higiene & Mascotas',
    label: 'Alimento, agua y correa para mascota',
    detail: 'Ración para 3 días y placa con número de contacto',
    essential: false,
  },
];

// Structural Test Questions
interface StructuralQuestion {
  id: number;
  question: string;
  severity: 'critical' | 'high' | 'moderate';
  explanation: string;
}

const STRUCTURAL_QUESTIONS: StructuralQuestion[] = [
  {
    id: 1,
    question: '¿Hay grietas diagonales en forma de "X" o a 45° en muros de concreto, columnas o vigas maestras?',
    severity: 'critical',
    explanation: 'Las grietas a 45° o en X indican falla por esfuerzo cortante en elementos portantes estructurales.',
  },
  {
    id: 2,
    question: '¿Se percibe olor a gas, chispas eléctricas o fuga evidente de agua en la edificación?',
    severity: 'critical',
    explanation: 'Riesgo inminente de explosión o electrocución. Cierra llaves generales inmediatamente.',
  },
  {
    id: 3,
    question: '¿Se aprecian columnas, muros o pisos visiblemente inclinados, hundidos o losas desprendidas?',
    severity: 'critical',
    explanation: 'Indica colapso inminente o asentamiento diferencial severo del suelo.',
  },
  {
    id: 4,
    question: '¿Presentan las escaleras de emergencia grietas profundas, fisuras o separación del muro?',
    severity: 'high',
    explanation: 'Las escaleras son la única ruta de evacuación; una falla puede atrapar a los ocupantes.',
  },
  {
    id: 5,
    question: '¿Hay fisuras o hundimientos nuevos en el suelo exterior, veredas o patio de la construcción?',
    severity: 'high',
    explanation: 'Posible licuefacción o deslizamiento del terreno de cimentación.',
  },
  {
    id: 6,
    question: '¿Existe peligro inminente por caída de vidrios, mampostería pesada o desplome de edificios vecinos?',
    severity: 'moderate',
    explanation: 'Peligro perimetral por objetos en voladizo debilitados que caerán con réplicas.',
  },
];

export const EmergencyCenter: React.FC<EmergencyCenterProps> = ({
  country,
  selectedEvent,
  onUpdateWaveSimulation,
  userCoords,
  homeLocation,
  onNavigateToMap,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EmergencySubTab>('protocol');

  // --- FUNCIÓN 1: PROTOCOLO & VOZ ---
  const [quakePhase, setQuakePhase] = useState<QuakePhase>('during');
  const [quakeContext, setQuakeContext] = useState<QuakeContext>('building');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // --- FUNCIÓN 2: KIT SOS OFFLINE ---
  const [isWhistleActive, setIsWhistleActive] = useState<boolean>(false);
  const [whistleMode, setWhistleMode] = useState<'continuous' | 'sos'>('continuous');
  const sosIntervalRef = useRef<number | null>(null);

  const [isStrobeActive, setIsStrobeActive] = useState<boolean>(false);
  const [strobeColor, setStrobeColor] = useState<'white' | 'black'>('black');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // --- FUNCIÓN 3: SIMULADOR DE ONDAS P & S ---
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simDistanceKm, setSimDistanceKm] = useState<number>(120);
  const [simMagnitude, setSimMagnitude] = useState<number>(selectedEvent ? selectedEvent.mag : 6.8);
  const [simRadiusPKm, setSimRadiusPKm] = useState<number>(0);
  const [simRadiusSKm, setSimRadiusSKm] = useState<number>(0);
  const [simEtaSeconds, setSimEtaSeconds] = useState<number>(34);
  const simTimerRef = useRef<number | null>(null);

  // --- FUNCIÓN 4: EVALUADOR ESTRUCTURAL ---
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  // --- FUNCIÓN 5: MOCHILA 72H ---
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('seismoglobal_backpack_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save backpack to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('seismoglobal_backpack_items', JSON.stringify(checkedItems));
    } catch {
      // Ignore
    }
  }, [checkedItems]);

  const toggleBackpackItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const backpackPercentage = Math.round(
    (Object.values(checkedItems).filter(Boolean).length / DEFAULT_BACKPACK_ITEMS.length) * 100
  );

  // --- WEB AUDIO API 3000 Hz WHISTLE ---
  const stopWhistle = useCallback(() => {
    if (sosIntervalRef.current) {
      window.clearInterval(sosIntervalRef.current);
      sosIntervalRef.current = null;
    }
    soundAlarm.stopWhistle();
    setIsWhistleActive(false);
  }, []);

  const startWhistle = useCallback(async () => {
    stopWhistle();
    try {
      await soundAlarm.ensureAudioUnlocked();
      await soundAlarm.startWhistle(3000);
      soundAlarm.triggerHapticPattern([500, 200, 500, 200, 1000]);
      setIsWhistleActive(true);

      if (whistleMode === 'sos') {
        let isBeeping = true;
        sosIntervalRef.current = window.setInterval(async () => {
          if (isBeeping) {
            soundAlarm.stopWhistle();
          } else {
            await soundAlarm.startWhistle(3000);
          }
          isBeeping = !isBeeping;
        }, 350);
      }
    } catch {
      setIsWhistleActive(false);
    }
  }, [whistleMode, stopWhistle]);

  // Clean up audio & speech on unmount
  useEffect(() => {
    return () => {
      stopWhistle();
      soundAlarm.stopAll();
      if (simTimerRef.current) {
        window.clearInterval(simTimerRef.current);
      }
    };
  }, [stopWhistle]);

  // --- VISUAL STROBE (MORSE SOS) ---
  useEffect(() => {
    let interval: number | null = null;
    if (isStrobeActive) {
      interval = window.setInterval(() => {
        setStrobeColor((prev) => (prev === 'white' ? 'black' : 'white'));
      }, 100);
    } else {
      setStrobeColor('black');
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isStrobeActive]);

  // --- TEXT TO SPEECH (SPEECH SYNTHESIS) ---
  const handleToggleSpeech = () => {
    if (isSpeaking) {
      soundAlarm.stopAll();
      setIsSpeaking(false);
      return;
    }

    let textToSpeak = '';
    if (quakePhase === 'during') {
      if (quakeContext === 'building') {
        textToSpeak = 'Atención, alerta sísmica en curso. Mantén la calma. Aléjate de ventanas, cristales y objetos colgantes. Agáchate, cúbrete bajo un escritorio o mueble resistente y sujétate con fuerza. No utilices elevadores bajo ninguna circunstancia. Si no hay muebles, ubícate junto a una columna o muro de carga en posición fetal.';
      } else if (quakeContext === 'home') {
        textToSpeak = 'Alerta sísmica en vivienda. Mantén la calma. Abre las puertas de salida si es seguro para evitar que queden bloqueadas. Aléjate de la cocina y estantes altos. Agáchate, cúbrete bajo una mesa firme y sujétate hasta que el movimiento cese por completo.';
      } else if (quakeContext === 'rural') {
        textToSpeak = 'Atención, alerta sísmica en zona rural o vereda. Mantén la calma. Aléjate de laderas o cerros empinados por riesgo inminente de deslizamientos de tierra o derrumbes. Aléjate de árboles viejos, postes eléctricos y cauces de ríos por posibles represamientos. Permanece en un terreno llano al aire libre, agáchate y protege tu cabeza con los brazos.';
      } else if (quakeContext === 'street') {
        textToSpeak = 'Alerta sísmica en la vía pública. Aléjate de postes eléctricos, transformadores, marquesinas y cables caídos. Dirígete de inmediato al centro de calles despejadas o parques abiertos. Protege tu cabeza con tus brazos.';
      } else {
        textToSpeak = 'Alerta sísmica al conducir. Disminuye la velocidad gradualmente y enciende las luces intermitentes. Estaciónate en un lugar seguro lejos de puentes, pasos a desnivel y postes. Permanece dentro del automóvil hasta que termine el temblor.';
      }
    } else if (quakePhase === 'before') {
      textToSpeak = 'Medidas de preparación sísmica: Identifica zonas de menor riesgo en tu hogar, finca y vereda. Prepara tu mochila de emergencia de 72 horas. Fija muebles pesados a la pared y realiza simulacros familiares con regularidad.';
    } else {
      textToSpeak = 'Protocolo posterior al sismo: Verifica si hay personas heridas y aplícales primeros auxilios si estás capacitado. Revisa olores a gas o fugas de agua. No enciendas cerillos ni interruptores eléctricos. Prepárate para réplicas y mantente informado por radio oficial.';
    }

    setIsSpeaking(true);
    soundAlarm.speakInstruction(textToSpeak, () => {
      setIsSpeaking(false);
    });
  };

  // --- "ESTOY A SALVO" MESSAGE GENERATOR ---
  const generateSafeMessage = () => {
    const coords = homeLocation
      ? { lat: homeLocation.lat, lng: homeLocation.lng }
      : userCoords || { lat: country.lat, lng: country.lng };
    const mapsLink = `https://maps.google.com/?q=${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

    const locationBreakdown = homeLocation
      ? `• País: ${homeLocation.country}\n• Municipio / Ciudad: ${homeLocation.municipality || 'N/A'}\n• Vereda / Sector: ${homeLocation.vereda || homeLocation.name}`
      : `• País: ${country.name} (${country.capital})`;

    return `🚨 MENSAJE DE EMERGENCIA SEISMOGLOBAL 195 PRO 🚨\n\nESTOY A SALVO: Me encuentro en buen estado de salud tras el sismo.\n\n📍 Ubicación Exacta de mi Vivienda / Vereda:\n${locationBreakdown}\n• Coordenadas GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}\n\nMapa en vivo:\n${mapsLink}\n\nPor favor mantengan la calma y usen sólo mensajes de texto (SMS / WhatsApp) para evitar saturar las redes celulares de rescate.`;
  };

  const handleCopySafeMessage = async () => {
    const text = generateSafeMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      alert('Copia el mensaje manualmente:\n\n' + text);
    }
  };

  // --- FUNCIÓN 3: ONDAS P & S SIMULATION ENGINE ---
  const handleStartWaveSimulation = () => {
    if (simTimerRef.current) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    const targetCoords = userCoords || { lat: country.lat, lng: country.lng };
    const epicenterLat = selectedEvent ? selectedEvent.lat : targetCoords.lat + (simDistanceKm / 111);
    const epicenterLng = selectedEvent ? selectedEvent.lng : targetCoords.lng + (simDistanceKm / 111);

    // Speeds: P-wave ~ 6.5 km/s, S-wave ~ 3.5 km/s
    const speedP = 6.5; // km/s
    const speedS = 3.5; // km/s
    const initialDistance = simDistanceKm;
    const totalEta = Math.round(initialDistance / speedS);

    setSimRadiusPKm(0);
    setSimRadiusSKm(0);
    setSimEtaSeconds(totalEta);
    setSimActive(true);

    let elapsed = 0;

    const interval = window.setInterval(() => {
      elapsed += 0.5;

      const currentRadiusP = elapsed * speedP;
      const currentRadiusS = elapsed * speedS;
      const remainingEta = Math.max(0, Math.round(totalEta - elapsed));

      setSimRadiusPKm(currentRadiusP);
      setSimRadiusSKm(currentRadiusS);
      setSimEtaSeconds(remainingEta);

      // Notify map component
      onUpdateWaveSimulation({
        active: true,
        epicenterLat,
        epicenterLng,
        radiusPKm: currentRadiusP,
        radiusSKm: currentRadiusS,
        etaSeconds: remainingEta,
        mag: simMagnitude,
        locationName: selectedEvent ? selectedEvent.place : `Epicentro Simulado (${simDistanceKm} km)`,
      });

      if (remainingEta <= 0 && currentRadiusS >= initialDistance * 1.5) {
        window.clearInterval(interval);
        simTimerRef.current = null;
      }
    }, 500);

    simTimerRef.current = interval;
  };

  const handleStopWaveSimulation = () => {
    if (simTimerRef.current) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setSimActive(false);
    setSimRadiusPKm(0);
    setSimRadiusSKm(0);
    onUpdateWaveSimulation(null);
  };

  // --- FUNCIÓN 4: STRUCTURAL EVALUATION SCORER ---
  const calculateStructuralSafety = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount === 0) return null;

    let hasCriticalYes = false;
    let highYesCount = 0;
    let moderateYes = false;

    STRUCTURAL_QUESTIONS.forEach((q) => {
      if (answers[q.id]) {
        if (q.severity === 'critical') hasCriticalYes = true;
        if (q.severity === 'high') highYesCount++;
        if (q.severity === 'moderate') moderateYes = true;
      }
    });

    if (hasCriticalYes || highYesCount >= 2) {
      return {
        level: 'RED',
        title: 'EVACUAR INMEDIATAMENTE POR RIESGO EN RÉPLICAS',
        color: 'text-rose-400 bg-rose-950/80 border-rose-600',
        badge: 'EVACUAR INMEDIATAMENTE',
        advice:
          'Se detectaron daños estructurales graves o fuga de gas. Desaloja el inmueble de inmediato hacia un punto de reunión abierto. No permitas que nadie ingrese hasta el dictamen de Protección Civil y Bomberos.',
      };
    }

    if (highYesCount === 1 || moderateYes) {
      return {
        level: 'YELLOW',
        title: 'PRECAUCIÓN / REQUIERE INSPECCIÓN TÉCNICA ANTES DE HABITAR',
        color: 'text-amber-400 bg-amber-950/80 border-amber-600',
        badge: 'PRECAUCIÓN',
        advice:
          'La edificación presenta afectaciones que podrían comprometer la estabilidad ante réplicas de consideración. Evita permanecer en zonas afectadas hasta que un ingeniero estructurista o Protección Civil lo autorice.',
      };
    }

    return {
      level: 'GREEN',
      title: 'VIVIENDA SEGURA / DAÑOS SUPERFICIALES LEVES',
      color: 'text-emerald-400 bg-emerald-950/80 border-emerald-600',
      badge: 'VIVIENDA SEGURA',
      advice:
        'No se identificaron afectaciones estructurales de primer orden. Permanece alerta a posibles réplicas y mantén tu mochila de emergencia lista cerca de la salida.',
    };
  };

  const structuralResult = calculateStructuralSafety();

  return (
    <div className="space-y-6">
      {/* Fullscreen Strobe Beacon Screen Overlay */}
      {isStrobeActive && (
        <div
          onClick={() => setIsStrobeActive(false)}
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer select-none transition-colors duration-75 ${
            strobeColor === 'white' ? 'bg-white text-black' : 'bg-black text-white'
          }`}
        >
          <div className="text-center space-y-4">
            <Flashlight className="w-20 h-20 mx-auto animate-bounce" />
            <div className="text-4xl font-black tracking-widest font-mono">
              SOS LUMINOSO
            </div>
            <div className="text-lg font-bold">
              Código Morse Óptico (... --- ...)
            </div>
            <p className="text-sm opacity-80 max-w-sm mx-auto">
              Toca la pantalla en cualquier lugar para apagar la baliza de rescate.
            </p>
          </div>
        </div>
      )}

      {/* Emergency Center Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-900/80 p-2 rounded-3xl border border-slate-800 shadow-xl">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSubTab('protocol');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'protocol'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>Guía Vital & Voz</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSubTab('sos');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'sos'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-4 h-4 shrink-0" />
          <span>Kit SOS Rescate</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSubTab('waves');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'waves'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>Ondas P & S (ETA)</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSubTab('structure');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'structure'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building className="w-4 h-4 shrink-0" />
          <span>Test Estructural</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveSubTab('backpack');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold col-span-2 sm:col-span-1 transition-all ${
            activeSubTab === 'backpack'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>Mochila 72h ({backpackPercentage}%)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* FUNCIÓN 1: PROTOCOLO INTERACTIVO Y GUÍA POR VOZ                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'protocol' && (
        <div className="space-y-6">
          {/* Audio Voice Synthesizer Trigger Header */}
          <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 p-6 rounded-3xl border border-cyan-800/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
                  Protocolo Interactivo y Guía Auditiva
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Instrucciones Vitales de Protección Civil ({country.name})
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Escucha la guía oficial por síntesis de voz en español calmada y clara para mantener el orden y proteger tu integridad en cada escenario.
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await soundAlarm.ensureAudioUnlocked();
                  handleToggleSpeech();
                }}
                className={`flex items-center space-x-2 px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-xl transition-all ${
                  isSpeaking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/30'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/30'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-4 h-4" />
                    <span>Detener Voz</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Escuchar Guía Vital por Voz</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Temporal Phase Selector (DURANTE, ANTES, DESPUÉS) */}
          <div className="flex items-center justify-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 max-w-lg mx-auto">
            <button
              onClick={() => setQuakePhase('during')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all ${
                quakePhase === 'during'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DURANTE EL SISMO
            </button>
            <button
              onClick={() => setQuakePhase('before')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all ${
                quakePhase === 'before'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ANTES (Prevención)
            </button>
            <button
              onClick={() => setQuakePhase('after')}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-black transition-all ${
                quakePhase === 'after'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DESPUÉS (Rescate)
            </button>
          </div>

          {/* DURING THE QUAKE: Context Buttons (Edificio, Casa, Calle, Conduciendo) */}
          {quakePhase === 'during' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setQuakeContext('home')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    quakeContext === 'home'
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Home className="w-5 h-5 text-amber-400 mb-1.5" />
                  <div className="font-bold text-xs sm:text-sm">En una Casa</div>
                  <div className="text-[10px] text-slate-400">Espacios residenciales</div>
                </button>

                <button
                  onClick={() => setQuakeContext('building')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    quakeContext === 'building'
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building className="w-5 h-5 text-cyan-400 mb-1.5" />
                  <div className="font-bold text-xs sm:text-sm">En Edificio</div>
                  <div className="text-[10px] text-slate-400">Pisos intermedios y altos</div>
                </button>

                <button
                  onClick={() => setQuakeContext('rural')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    quakeContext === 'rural'
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <TreePine className="w-5 h-5 text-emerald-400 mb-1.5" />
                  <div className="font-bold text-xs sm:text-sm">Zona Rural / Vereda</div>
                  <div className="text-[10px] text-slate-400">Fincas, campos y laderas</div>
                </button>

                <button
                  onClick={() => setQuakeContext('street')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    quakeContext === 'street'
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <MapPin className="w-5 h-5 text-blue-400 mb-1.5" />
                  <div className="font-bold text-xs sm:text-sm">En la Calle</div>
                  <div className="text-[10px] text-slate-400">Vía pública abierta</div>
                </button>

                <button
                  onClick={() => setQuakeContext('driving')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    quakeContext === 'driving'
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Car className="w-5 h-5 text-rose-400 mb-1.5" />
                  <div className="font-bold text-xs sm:text-sm">Conduciendo</div>
                  <div className="text-[10px] text-slate-400">Vehículo en marcha</div>
                </button>
              </div>

              {/* Contextual Action Cards */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-base">
                  <AlertTriangle className="w-5 h-5" />
                  <span>
                    Protocolo Activo: {quakeContext === 'building' ? 'Edificio y Pisos Elevados' : quakeContext === 'home' ? 'Hogar y Vivienda' : quakeContext === 'rural' ? 'Zona Rural, Finca y Vereda' : quakeContext === 'street' ? 'Vía Pública y Espacios Abiertos' : 'Vehículo en Movimiento'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs">1</span>
                      <span>Agáchate, Cúbrete y Sujétate</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Adopta posición fetal bajo un escritorio, mesa de madera maciza o estructura firme. Sujétate de las patas del mueble para que no se desplace con el sacudimiento.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-mono text-xs">2</span>
                      <span>Aléjate de Riesgos Inmediatos</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Mantente lejos de ventanales de vidrio, espejos, vitrinas, libreros altos o estantes que puedan volcarse. No utilices elevadores ni te precipites hacia las escaleras en pleno movimiento.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs">3</span>
                      <span>Zona de Seguridad Estructural</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Si no hay mesas disponibles, recuéstate junto a una columna o trabe de concreto armado (Muro de carga). Cubre tu cuello y cabeza con ambas manos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BEFORE: Preparation */}
          {quakePhase === 'before' && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-blue-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Medidas Preventivas de Protección Civil</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Fijación de Muebles y Equipos</div>
                  <p className="text-slate-400 leading-relaxed">
                    Asegura libreros, alacenas y televisiones pesadas a la pared con esquineros metálicos. Guarda objetos pesados en los estantes inferiores.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Plan de Evacuación Familiar</div>
                  <p className="text-slate-400 leading-relaxed">
                    Define un punto de encuentro seguro en el exterior. Asegúrate de que todos los integrantes sepan cómo cerrar las llaves de paso de gas y agua.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AFTER: Immediate Recovery */}
          {quakePhase === 'after' && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Protocolo Posterior al Movimiento Telúrico</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Inspección de Gas y Electricidad</div>
                  <p className="text-slate-400 leading-relaxed">
                    No enciendas cerillos, velas ni interruptores eléctricos si sospechas de fugas. Cierra la llave general de gas.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Usa Mensajes de Texto (SMS)</div>
                  <p className="text-slate-400 leading-relaxed">
                    Las redes de voz se saturan rápidamente. Utiliza SMS o WhatsApp para comunicar que estás a salvo y mantén libres las líneas telefónicas para rescate.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-white text-sm">Prepárate para Réplicas</div>
                  <p className="text-slate-400 leading-relaxed">
                    Los terremotos principales suelen detonar réplicas en minutos u horas. Mantén calzado puesto para evitar cortes y tu mochila de emergencia a mano.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FUNCIÓN 2: KIT SOS DE RESCATE OFFLINE                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'sos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Silbato Acústico 3000 Hz */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm mb-2">
                  <Radio className="w-5 h-5" />
                  <span>Silbato Acústico 3000 Hz</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Genera una onda de audio pura a 3000 Hz de máxima penetración acústica reconocida por equipos de rescate (SAR) para localizarte sin gastar tu voz.
                </p>
              </div>

              {/* Mode switch (Continuous / SOS) */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhistleMode('continuous');
                      if (isWhistleActive) startWhistle();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      whistleMode === 'continuous'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    Tono Continuo
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWhistleMode('sos');
                      if (isWhistleActive) startWhistle();
                    }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      whistleMode === 'sos'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400'
                    }`}
                  >
                    Patrón SOS (...)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (isWhistleActive) {
                      stopWhistle();
                    } else {
                      await soundAlarm.ensureAudioUnlocked();
                      await startWhistle();
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
                    isWhistleActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-600/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isWhistleActive ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  <span>{isWhistleActive ? 'Detener Silbato' : 'Activar Silbato SOS 3000Hz'}</span>
                </button>
              </div>
            </div>

            {/* Baliza Visual SOS (Morse Strobe) */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-2">
                  <Flashlight className="w-5 h-5" />
                  <span>Baliza Visual SOS Morse</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Activa un destello estroboscópico de pantalla completa de alto contraste en código Morse luminoso (... --- ...) para señalizar tu posición a brigadas de noche o en la oscuridad.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStrobeActive(true);
                  }}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20"
                >
                  <Flashlight className="w-5 h-5" />
                  <span>Iniciar Baliza Estroboscópica</span>
                </button>
              </div>
            </div>

            {/* Botón "Estoy a Salvo" */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
                  <Share2 className="w-5 h-5" />
                  <span>Botón "Estoy a Salvo"</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Genera automáticamente un mensaje con tus coordenadas GPS actuales y enlace de Google Maps para informar a tus seres queridos por WhatsApp o SMS en un solo clic.
                </p>
              </div>

              <div className="space-y-2 pt-3">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(generateSafeMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <span>Enviar por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`sms:?body=${encodeURIComponent(generateSafeMessage())}`}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Enviar por SMS</span>
                </a>

                <button
                  onClick={handleCopySafeMessage}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors text-center"
                >
                  {copyFeedback ? '✓ ¡Mensaje Copiado al Portapapeles!' : 'Copiar Texto al Portapapeles'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FUNCIÓN 3: SIMULADOR DE ONDAS P Y S CON CUENTA REGRESIVA ETA              */}
      {/* ========================================================================= */}
      {activeSubTab === 'waves' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Simulador de Propagación Geofísica de Ondas</span>
              </div>
              <h3 className="text-xl font-black text-white mt-1">
                Ondas P (Primarias) y Ondas S (Secundarias / Destructivas)
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl mt-1">
                La Onda P viaja a ~6.5 km/s y da la primera alerta. La Onda S viaja a ~3.5 km/s y causa la sacudida violenta. La diferencia de tiempo es tu ventana de salvamento (ETA).
              </p>
            </div>

            {/* Countdown ETA Badge */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 text-center min-w-[140px] shadow-xl">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">ETA de Llegada (S)</span>
              <span className="text-3xl font-black font-mono text-amber-400">
                {simEtaSeconds}s
              </span>
            </div>
          </div>

          {/* Interactive Simulation Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Distancia Epicentral:</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={30}
                  max={450}
                  step={10}
                  value={simDistanceKm}
                  onChange={(e) => setSimDistanceKm(parseInt(e.target.value))}
                  disabled={simActive}
                  className="w-full accent-cyan-500"
                />
                <span className="text-xs font-mono font-bold text-cyan-400 w-16 text-right">
                  {simDistanceKm} km
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Magnitud Sísmica (Mw):</label>
              <select
                value={simMagnitude}
                onChange={(e) => setSimMagnitude(parseFloat(e.target.value))}
                disabled={simActive}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value={5.5}>M 5.5 - Fuerte (Alerta local)</option>
                <option value={6.8}>M 6.8 - Severo (Daños moderados)</option>
                <option value={7.8}>M 7.8 - Mayor (Daños extensos)</option>
                <option value={8.4}>M 8.4 - Terremoto Catastrófico</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (simActive) {
                    handleStopWaveSimulation();
                  } else {
                    handleStartWaveSimulation();
                  }
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl ${
                  simActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                }`}
              >
                {simActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{simActive ? 'Pausar Simulación' : 'Iniciar Simulación de Ondas'}</span>
              </button>
            </div>
          </div>

          {/* Real-time wave telemetry meters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                  Frente Onda P (Compresional)
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300">
                  {Math.round(simRadiusPKm)} km / {simDistanceKm} km
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (simRadiusPKm / simDistanceKm) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500">
                Velocidad teórica: ~6.5 km/s • No destructiva, activa sensores de alerta temprana.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  Frente Onda S (Cizallamiento)
                </span>
                <span className="text-xs font-mono font-bold text-rose-300">
                  {Math.round(simRadiusSKm)} km / {simDistanceKm} km
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (simRadiusSKm / simDistanceKm) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500">
                Velocidad teórica: ~3.5 km/s • Destructiva, causa el movimiento horizontal severo.
              </p>
            </div>
          </div>

          {/* Quick link to view waves expanding on the map */}
          {onNavigateToMap && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToMap();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline inline-flex items-center gap-1"
              >
                <span>Ver los anillos de propagación expandiéndose en el Mapa Cartográfico ↗</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FUNCIÓN 4: EVALUADOR DE DAÑO ESTRUCTURAL POST-SISMO                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'structure' && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Building className="w-4 h-4" />
              <span>Diagnóstico Rápido de Daño Estructural Post-Sismo</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              Evaluación Visual de Seguridad del Inmueble (6 Criterios Clave)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Responde con veracidad para calcular el semáforo de riesgo y determinar si la edificación es segura o requiere desalojo inmediato.
            </p>
          </div>

          {/* Result Card if evaluated */}
          {structuralResult && (
            <div className={`p-5 rounded-2xl border ${structuralResult.color} space-y-2 animate-fade-in`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/40">
                  {structuralResult.badge}
                </span>
                <span className="text-xs font-mono">
                  {Object.values(answers).filter(Boolean).length} alertas detectadas
                </span>
              </div>
              <h4 className="text-lg font-black">{structuralResult.title}</h4>
              <p className="text-xs leading-relaxed">{structuralResult.advice}</p>
            </div>
          )}

          {/* 6 Questions List */}
          <div className="space-y-3">
            {STRUCTURAL_QUESTIONS.map((q) => {
              const currentVal = answers[q.id];
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center font-bold">
                        {q.id}
                      </span>
                      <span className="font-bold text-sm text-slate-200">{q.question}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-7">{q.explanation}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswers((prev) => ({ ...prev, [q.id]: true }));
                      }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentVal === true
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswers((prev) => ({ ...prev, [q.id]: false }));
                      }}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        currentVal === false
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAnswers({});
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Cuestionario</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FUNCIÓN 5: CHECKLIST DE MOCHILA DE 72H Y DIRECTORIO DEL PAÍS             */}
      {/* ========================================================================= */}
      {activeSubTab === 'backpack' && (
        <div className="space-y-6">
          {/* Backpack Progress Header */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  Equipamiento de Supervivencia 72 Horas
                </div>
                <h3 className="text-xl font-black text-white mt-1">
                  Mochila de Emergencia Vital (Persistente en Dispositivo)
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {backpackPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">Completada</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${backpackPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Two-Column Layout: Checklist + Country Rescue Directory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Checklist Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-sm font-bold text-white">Artículos Requeridos</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const all: Record<string, boolean> = {};
                        DEFAULT_BACKPACK_ITEMS.forEach((i) => (all[i.id] = true));
                        setCheckedItems(all);
                      }}
                      className="text-emerald-400 hover:underline"
                    >
                      Marcar todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckedItems({});
                      }}
                      className="text-slate-400 hover:underline"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {DEFAULT_BACKPACK_ITEMS.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleBackpackItem(item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0 text-emerald-400">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <SquareIcon className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isChecked ? 'line-through opacity-70' : ''}`}>
                              {item.label}
                            </span>
                            {item.essential && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                                Vital
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Country Emergency Contact Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <PhoneCall className="w-4 h-4" />
                  <span>Directorio de Emergencia Oficial: {country.name}</span>
                </div>

                <div className="space-y-3">
                  {/* Central Emergency */}
                  <a
                    href={`tel:${country.emergencyPhone.split(' ')[0]}`}
                    className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between hover:bg-rose-900/40 transition-colors group"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-rose-300 uppercase block font-bold">
                        Central Nacional de Emergencias
                      </span>
                      <span className="text-xl font-black font-mono text-white group-hover:text-rose-300">
                        {country.emergencyPhone}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Policía • Bomberos • Ambulancia
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-600 text-white shadow-lg">
                      <PhoneCall className="w-4 h-4 animate-bounce" />
                    </div>
                  </a>

                  {/* Geological & Civil Protection Agency */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase block font-bold">
                      Agencia Sismológica y Protección Civil Oficial
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {country.agency}
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2">
                      <strong>Protocolo Nacional:</strong> {country.protocol}
                    </p>
                  </div>

                  {/* Regional Geological Risk Badge */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase block font-bold">
                      Entorno Geotectónico
                    </span>
                    <div className="text-xs text-slate-300">
                      <strong>Placas Tectónicas:</strong> {country.tectonicPlates}
                    </div>
                    <div className="text-xs text-slate-300">
                      <strong>Nivel de Amenaza Sísmica:</strong>{' '}
                      <span className="font-bold text-amber-300">{country.riskLevel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
