// Utilitário de áudio para feedback sonoro no Prátic System utilizando Web Audio API
// Garante execução exclusiva no lado do cliente e sons procedurais premium

type SoundType = 'success' | 'error' | 'info' | 'warning';

class SoundManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  public play(type: SoundType) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (type) {
        case 'success':
          this.playTone(ctx, 523.25, now, 0.08, 'sine', 0.15); // C5
          this.playTone(ctx, 659.25, now + 0.08, 0.08, 'sine', 0.15); // E5
          this.playTone(ctx, 783.99, now + 0.16, 0.15, 'sine', 0.2); // G5
          break;

        case 'error':
          this.playTone(ctx, 220, now, 0.12, 'sawtooth', 0.15); // A3 grave
          this.playTone(ctx, 180, now + 0.12, 0.18, 'sawtooth', 0.2); // mais grave
          break;

        case 'info':
          this.playTone(ctx, 440, now, 0.08, 'sine', 0.1); // A4
          this.playTone(ctx, 880, now + 0.08, 0.12, 'sine', 0.15); // A5 cristalino
          break;

        case 'warning':
          this.playTone(ctx, 587.33, now, 0.1, 'triangle', 0.15); // D5
          this.playTone(ctx, 587.33, now + 0.15, 0.15, 'triangle', 0.2); // D5 repetido
          break;
      }
    } catch (err) {
      console.warn('Erro ao reproduzir feedback sonoro:', err);
    }
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine',
    maxGain: number = 0.15
  ) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Envelope de volume (Attack, Decay suave)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundManager();
export const playSound = (type: SoundType) => soundManager.play(type);
