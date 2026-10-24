/**
 * Web Audio API synthesizer for seismic early warning sounds.
 * Avoids external MP3 dependencies that could fail to load or get blocked.
 */
class SeismicAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private sirenOscillator: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isAlarmPlaying = false;
  private isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isAlarmPlaying) {
      this.stopAlarm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play a brief confirmation beep (e.g., when calibrating or sensor activates)
   */
  public playBeep(freq = 880, duration = 0.12) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy catch
    }
  }

  /**
   * Start pulsating emergency seismic alarm siren
   */
  public startAlarm() {
    if (this.isAlarmPlaying || this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.isAlarmPlaying = true;

      // Master siren gain
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      // Main siren oscillator (frequency modulates 850Hz to 1200Hz)
      this.sirenOscillator = this.ctx.createOscillator();
      this.sirenOscillator.type = 'sawtooth';
      this.sirenOscillator.frequency.setValueAtTime(900, this.ctx.currentTime);

      // Low frequency oscillator (LFO) to create siren sweep
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(3.5, this.ctx.currentTime); // 3.5 cycles per second
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(350, this.ctx.currentTime); // +/- 350 Hz amplitude

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOscillator.frequency);

      this.sirenOscillator.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.lfo.start();
      this.sirenOscillator.start();

      // Trigger mobile haptic vibration pattern if supported
      this.triggerVibration();
    } catch {
      // Fail gracefully
    }
  }

  /**
   * Stop the active seismic alarm siren
   */
  public stopAlarm() {
    if (!this.isAlarmPlaying) return;
    try {
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        try {
          this.sirenOscillator?.stop();
          this.sirenOscillator?.disconnect();
          this.lfo?.stop();
          this.lfo?.disconnect();
          this.sirenGain?.disconnect();
        } catch {
          // Ignore
        }
        this.sirenOscillator = null;
        this.lfo = null;
        this.sirenGain = null;
        this.isAlarmPlaying = false;
      }, 120);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(0);
      }
    } catch {
      this.isAlarmPlaying = false;
    }
  }

  /**
   * Emergency haptic pattern for mobile devices
   */
  public triggerVibration() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        // [vibrate, pause, vibrate, pause, long vibrate]
        navigator.vibrate([250, 100, 250, 100, 500, 150, 600]);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Play the evacuation siren for a specified duration in seconds then stop automatically
   */
  public playEvacuationAlarm(durationSeconds = 3) {
    this.startAlarm();
    setTimeout(() => {
      this.stopAlarm();
    }, durationSeconds * 1000);
  }
}

export const seismicAudio = new SeismicAudioSynthesizer();
