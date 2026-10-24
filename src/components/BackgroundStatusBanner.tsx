import React, { useState, useEffect, useCallback } from 'react';
import type { FavoriteLocation } from './FavoriteLocations';
import { seismicAudio } from '../utils/audioAlert';
import {
  Moon,
  Sun,
  Bell,
  Volume2,
} from 'lucide-react';

interface BackgroundStatusBannerProps {
  favorites: FavoriteLocation[];
  onOpenSOS?: () => void;
  onOpenDrill?: () => void;
}

export const BackgroundStatusBanner: React.FC<BackgroundStatusBannerProps> = ({
  favorites,
  onOpenSOS,
  onOpenDrill,
}) => {
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [wakeLockObj, setWakeLockObj] = useState<any>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [lastWorkerSync, setLastWorkerSync] = useState<Date | null>(new Date());
  const [isDaemonOnline, setIsDaemonOnline] = useState<boolean>(true);
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);
  const [workerRef, setWorkerRef] = useState<Worker | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Initialize and communicate with Web Worker (src/workers/seismicDaemon.js)
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/seismicDaemon.js', import.meta.url), {
        type: 'module',
      });
      setWorkerRef(worker);

      worker.postMessage({
        type: 'START',
        payload: {
          favorites,
        },
      });

      worker.onmessage = (e) => {
        const { type, payload } = e.data || {};
        if (type === 'DAEMON_HEARTBEAT') {
          setIsDaemonOnline(true);
          setLastWorkerSync(new Date());
        } else if (type === 'SEISMIC_ALERTS_DETECTED') {
          // Play emergency audio & forward to Service Worker for OS push notification
          seismicAudio.playEvacuationAlarm(4);
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'DISPATCH_SEISMIC_ALERT',
              payload: payload?.alerts?.[0],
            });
          }
        }
      };
    } catch {
      // Si Web Workers no están disponibles en el entorno
    }

    return () => {
      if (worker) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
      }
    };
  }, []);

  // Update favorites in Web Worker when changed
  useEffect(() => {
    if (workerRef) {
      workerRef.postMessage({
        type: 'UPDATE_FAVORITES',
        payload: { favorites },
      });
    }
  }, [favorites, workerRef]);

  // Request / Release Wake Lock (Modo Centinela Nocturno)
  const toggleWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      alert('Tu navegador o dispositivo no soporta Screen Wake Lock API nativa.');
      return;
    }

    if (isWakeLockActive && wakeLockObj) {
      try {
        await wakeLockObj.release();
        setWakeLockObj(null);
        setIsWakeLockActive(false);
      } catch {
        // Ignore
      }
    } else {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLockObj(lock);
        setIsWakeLockActive(true);

        lock.addEventListener('release', () => {
          setIsWakeLockActive(false);
          setWakeLockObj(null);
        });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  }, [isWakeLockActive, wakeLockObj]);

  // Request Notification Permission & trigger persistent status bar notification
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta Web Notifications API.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);

      if (res === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.active) {
          reg.active.postMessage({
            type: 'SHOW_PERSISTENT_MONITOR',
            payload: {
              body: 'Vigilando 🏠 Casa, 🎓 Colegio, 💼 Trabajo y 🌿 Finca 24/7 sin interrupciones.',
            },
          });
        }
      }
    } catch {
      // Ignore
    }
  };

  // Trigger persistent notification via Service Worker
  const handleShowPersistentBar = async () => {
    if (notificationPermission !== 'granted') {
      await handleEnableNotifications();
      return;
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SHOW_PERSISTENT_MONITOR',
          payload: {
            body: 'Vigilando 🏠 Casa, 🎓 Colegio, 💼 Trabajo y 🌿 Finca 24/7.',
          },
        });
      }
    }
  };

  const handleTestAudio = () => {
    setIsTestingAudio(true);
    seismicAudio.playEvacuationAlarm(2);
    setTimeout(() => {
      setIsTestingAudio(false);
    }, 2500);
  };

  const activePointsCount = favorites.filter((f) => f.isSet).length;

  return (
    <section
      aria-label="Estado de Monitoreo Sísmico 24/7 en Segundo Plano"
      className="rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-cyan-950/40 border border-emerald-500/30 shadow-2xl backdrop-blur-md relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: 24/7 Daemon Indicator & Watched Locations */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase shadow-sm ${
              isDaemonOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isDaemonOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span>{isDaemonOnline ? '🟢 SeismoGlobal 24/7 Activo' : '⚪ Centinela Pausado'}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 text-[10px] font-mono border border-slate-700">
              Web Worker + SW Centinela
            </span>

            {isWakeLockActive && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold animate-pulse">
                <Moon className="w-3 h-3 text-amber-400" />
                <span>Centinela Nocturno ON</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">Vigilando en tiempo real:</span>
            <div className="flex items-center gap-1.5 font-mono text-emerald-300 text-[11px]">
              <span title="Mi Casa">🏠 Casa</span>
              <span>•</span>
              <span title="Colegio">🎓 Colegio</span>
              <span>•</span>
              <span title="Trabajo">💼 Trabajo</span>
              <span>•</span>
              <span title="Finca">🌿 Finca</span>
              <span className="text-slate-400">({activePointsCount}/4 configurados)</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            Último escaneo USGS:{' '}
            <span className="text-cyan-300">
              {lastWorkerSync ? lastWorkerSync.toLocaleTimeString() : 'Iniciando...'}
            </span>
            {' • '}
            Intervalo continuo: <span className="text-slate-300">cada 30s</span>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
          {/* Persistent Notification in Status Bar Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShowPersistentBar();
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all shadow-md ${
              notificationPermission === 'granted'
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-400 animate-pulse'
            }`}
            title="Mostrar u omitir notificación fija 24/7 en la barra de estado del celular/PC"
          >
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {notificationPermission === 'granted'
                ? '📌 Notificación 24/7'
                : '🔔 Activar Alertas 24/7'}
            </span>
          </button>

          {/* Night Sentinel Mode (Screen WakeLock) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWakeLock();
            }}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all border shadow-md ${
              isWakeLockActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Mantiene la pantalla y el acelerómetro activos toda la noche mientras el celular se carga"
          >
            {isWakeLockActive ? (
              <Moon className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Centinela Nocturno: {isWakeLockActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Audio Siren Test */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTestAudio();
            }}
            disabled={isTestingAudio}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
            title="Probar sonido oficial de alarma sísmica (Web Audio API)"
          >
            <Volume2 className={`w-3.5 h-3.5 ${isTestingAudio ? 'text-rose-400 animate-ping' : 'text-slate-400'}`} />
            <span>{isTestingAudio ? 'Sonando...' : 'Test Sirena'}</span>
          </button>

          {/* Quick Drill Trigger */}
          {onOpenDrill && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDrill();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-all"
              title="Iniciar Simulacro Sísmico Oficial"
            >
              <span>🚨 Simulacro</span>
            </button>
          )}

          {/* Quick SOS Trigger */}
          {onOpenSOS && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSOS();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all"
              title="Abrir Centro de Emergencias y Supervivencia SOS"
            >
              <span>🚨 SOS</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default BackgroundStatusBanner;
