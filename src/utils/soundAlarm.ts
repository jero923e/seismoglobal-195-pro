/**
 * Motor de Audio Web Nativo & Síntesis de Voz
 * Diseñado para iOS Safari, Android Chrome y Desktop
 * SeismoGlobal 195 Pro
 */

class SoundAlarmEngine {
  private ctx: AudioContext | null = null;
  private sirenInterval: number | null = null;
  private isSirenPlaying = false;
  private sirenOsc1: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  // Silbato ultrasónico 3000 Hz
  private whistleOsc: OscillatorNode | null = null;
  private whistleGain: GainNode | null = null;
  private isWhistlePlaying = false;

  /**
   * Obtiene o instancia el AudioContext respetando compatibilidad WebKit (iOS)
   */
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    return this.ctx;
  }

  /**
   * OBLIGATORIO: Desbloquea el audio context dentro del evento onClick sincrónico del usuario
   * Cumple con las restricciones de reproducción automática de iOS Safari y Chrome Mobile
   */
  public async ensureAudioUnlocked(): Promise<boolean> {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return false;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx.state === 'running';
    } catch (e) {
      console.warn('Error al desbloquear AudioContext:', e);
      return false;
    }
  }

  /**
   * Inicia la Sirena Sísmica Real de Doble Oscilador
   * Alterna frecuencias entre 880 Hz y 1320 Hz cada 350 ms con onda sawtooth y gainNode alto
   */
  public async startDualOscillatorSiren(): Promise<void> {
    if (this.isSirenPlaying) return;

    await this.ensureAudioUnlocked();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      this.isSirenPlaying = true;

      // Ganancia principal
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.75, ctx.currentTime);
      this.sirenGain.connect(ctx.destination);

      // Oscilador 1 (tono principal)
      this.sirenOsc1 = ctx.createOscillator();
      this.sirenOsc1.type = 'sawtooth';
      this.sirenOsc1.frequency.setValueAtTime(880, ctx.currentTime);
      this.sirenOsc1.connect(this.sirenGain);

      // Oscilador 2 (armónico para penetración acústica)
      this.sirenOsc2 = ctx.createOscillator();
      this.sirenOsc2.type = 'sine';
      this.sirenOsc2.frequency.setValueAtTime(880 * 1.5, ctx.currentTime); // 1320 Hz
      this.sirenOsc2.connect(this.sirenGain);

      this.sirenOsc1.start();
      this.sirenOsc2.start();

      // Alternar frecuencias entre 880 Hz y 1320 Hz cada 350 ms
      let toggleHigh = false;
      this.sirenInterval = window.setInterval(() => {
        if (!this.isSirenPlaying || !this.sirenOsc1 || !ctx) return;
        const targetFreq1 = toggleHigh ? 1320 : 880;
        const targetFreq2 = toggleHigh ? 1760 : 1100;
        const now = ctx.currentTime;

        this.sirenOsc1.frequency.exponentialRampToValueAtTime(targetFreq1, now + 0.12);
        if (this.sirenOsc2) {
          this.sirenOsc2.frequency.exponentialRampToValueAtTime(targetFreq2, now + 0.12);
        }
        toggleHigh = !toggleHigh;
      }, 350);

      // Vibración háptica en celulares soportados
      this.triggerHapticPattern();
    } catch (err) {
      console.warn('Error al iniciar sirena sísmica:', err);
      this.isSirenPlaying = false;
    }
  }

  /**
   * Detiene la sirena sísmica
   */
  public stopDualOscillatorSiren(): void {
    if (!this.isSirenPlaying) return;

    if (this.sirenInterval !== null) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }

    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      }

      setTimeout(() => {
        try {
          this.sirenOsc1?.stop();
          this.sirenOsc1?.disconnect();
          this.sirenOsc2?.stop();
          this.sirenOsc2?.disconnect();
          this.sirenGain?.disconnect();
        } catch {
          // Ignore
        }
        this.sirenOsc1 = null;
        this.sirenOsc2 = null;
        this.sirenGain = null;
        this.isSirenPlaying = false;
      }, 90);
    } catch {
      this.isSirenPlaying = false;
    }

    // Detener vibración
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Silbato de Supervivencia a 3000 Hz (frecuencia óptima de rescate)
   */
  public async startWhistle(freq = 3000): Promise<void> {
    if (this.isWhistlePlaying) return;

    await this.ensureAudioUnlocked();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      this.isWhistlePlaying = true;
      this.whistleGain = ctx.createGain();
      this.whistleGain.gain.setValueAtTime(0.85, ctx.currentTime);
      this.whistleGain.connect(ctx.destination);

      this.whistleOsc = ctx.createOscillator();
      this.whistleOsc.type = 'sine';
      this.whistleOsc.frequency.setValueAtTime(freq, ctx.currentTime);
      this.whistleOsc.connect(this.whistleGain);

      this.whistleOsc.start();
      this.triggerHapticPattern();
    } catch (e) {
      console.warn('Error al iniciar silbato:', e);
      this.isWhistlePlaying = false;
    }
  }

  public stopWhistle(): void {
    if (!this.isWhistlePlaying) return;
    try {
      if (this.whistleGain && this.ctx) {
        this.whistleGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      }
      setTimeout(() => {
        try {
          this.whistleOsc?.stop();
          this.whistleOsc?.disconnect();
          this.whistleGain?.disconnect();
        } catch {
          // Ignore
        }
        this.whistleOsc = null;
        this.whistleGain = null;
        this.isWhistlePlaying = false;
      }, 60);
    } catch {
      this.isWhistlePlaying = false;
    }
  }

  /**
   * Patrón de vibración háptica para dispositivos móviles
   */
  public triggerHapticPattern(pattern: number[] = [500, 200, 500, 200, 1000]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Guía por voz oficial con síntesis en español
   * Cancela obligatoriamente cualquier locución previa antes de hablar
   */
  public speakInstruction(text: string, onEnd?: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      // OBLIGATORIO: Cancelar locuciones en cola para evitar atascos en iOS y Chrome
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Buscar voz nativa en español
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(
        (v) =>
          v.lang.startsWith('es') ||
          v.lang.includes('es-ES') ||
          v.lang.includes('es-MX') ||
          v.lang.includes('es-US')
      );
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      if (onEnd) {
        utterance.onend = () => onEnd();
        utterance.onerror = () => onEnd();
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Error en síntesis de voz:', e);
      if (onEnd) onEnd();
    }
  }

  public stopAll(): void {
    this.stopDualOscillatorSiren();
    this.stopWhistle();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const soundAlarm = new SoundAlarmEngine();
export default soundAlarm;
