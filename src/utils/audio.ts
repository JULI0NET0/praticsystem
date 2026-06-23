type SoundType = 'success' | 'error' | 'info' | 'warning' | 'chat' | 'mention';

class SoundManager {
  private audioCtx: AudioContext | null = null;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Cls = window.AudioContext || (window as any).webkitAudioContext;
      if (Cls) this.audioCtx = new Cls();
    }
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    return this.audioCtx;
  }

  public play(type: SoundType) {
    try {
      const ctx = this.getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;

      switch (type) {
        case 'success':
          this.tone(ctx, 523.25, t,        0.08, 'sine', 0.15);
          this.tone(ctx, 659.25, t + 0.08, 0.08, 'sine', 0.15);
          this.tone(ctx, 783.99, t + 0.16, 0.15, 'sine', 0.2);
          break;

        case 'error':
          this.tone(ctx, 220, t,        0.12, 'sawtooth', 0.15);
          this.tone(ctx, 180, t + 0.12, 0.18, 'sawtooth', 0.2);
          break;

        case 'info':
          this.tone(ctx, 440, t,        0.08, 'sine', 0.1);
          this.tone(ctx, 880, t + 0.08, 0.12, 'sine', 0.15);
          break;

        case 'warning':
          this.tone(ctx, 587.33, t,        0.1,  'triangle', 0.15);
          this.tone(ctx, 587.33, t + 0.15, 0.15, 'triangle', 0.2);
          break;

        // ──────────────────────────────────────────────
        // CHAT: "pop" suave tipo iMessage
        //  • glide de frequência no ataque (caráter de sino)
        //  • harmônicos inarmônicos (soam naturais, não sintéticos)
        //  • burst de ruído de impacto ultra-curto (sensação física)
        // ──────────────────────────────────────────────
        case 'chat':
          this.bell(ctx, 1046.5, t, 0.13, 0.13);   // C6 fundamental
          this.impact(ctx, t, 0.04);
          break;

        // ──────────────────────────────────────────────
        // MENTION: dois sinos ascendentes tipo Slack
        //  • A5 → E6 com 130 ms de intervalo
        //  • segundo sino levemente mais alto
        // ──────────────────────────────────────────────
        case 'mention':
          this.bell(ctx, 880,    t,        0.15, 0.10);  // A5
          this.impact(ctx, t, 0.045);
          this.bell(ctx, 1318.5, t + 0.13, 0.17, 0.12);  // E6
          this.impact(ctx, t + 0.13, 0.05);
          break;
      }
    } catch (err) {
      console.warn('Erro no SoundManager:', err);
    }
  }

  /**
   * Sino com harmônicos inarmônicos e pitch glide no ataque.
   * @param freq   frequência fundamental
   * @param tau    constante de decaimento (quanto maior, mais longo o sino)
   */
  private bell(ctx: AudioContext, freq: number, startTime: number, gain: number, tau: number) {
    // Parciais inarmônicas aproximadas de um sino real
    const partials: [ratio: number, amp: number][] = [
      [1,     1.00],
      [2.0,   0.40],   // oitava
      [3.12,  0.18],   // 3ª parcial
      [4.24,  0.06],   // 4ª parcial (suave)
    ];

    for (const [ratio, amp] of partials) {
      const osc  = ctx.createOscillator();
      const gnd  = ctx.createGain();

      osc.type = 'sine';

      // Glide: começa ligeiramente acima e cai até a nota alvo em 22 ms
      const target = freq * ratio;
      osc.frequency.setValueAtTime(target * 1.018, startTime);
      osc.frequency.exponentialRampToValueAtTime(target, startTime + 0.022);

      // Envelope: ataque rapidíssimo (6 ms) + decaimento exponencial suave
      const peak = gain * amp;
      gnd.gain.setValueAtTime(0, startTime);
      gnd.gain.linearRampToValueAtTime(peak, startTime + 0.006);
      gnd.gain.setTargetAtTime(0, startTime + 0.010, tau);

      osc.connect(gnd);
      gnd.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + tau * 6);
    }
  }

  /**
   * Burst de ruído filtrado em alta frequência — simula o impacto físico
   * do dedo/martelo ao tocar o sino, adicionando presença e realismo.
   */
  private impact(ctx: AudioContext, startTime: number, gain: number) {
    const sampleRate = ctx.sampleRate;
    const dur = 0.018; // 18 ms de ruído
    const buf = ctx.createBuffer(1, Math.floor(sampleRate * dur), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gnd    = ctx.createGain();

    src.buffer = buf;

    // Passa-alta em 4 kHz → soa como "click" cristalino, não como ruído bruto
    filter.type = 'highpass';
    filter.frequency.value = 4000;
    filter.Q.value = 0.8;

    gnd.gain.setValueAtTime(gain, startTime);
    gnd.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    src.connect(filter);
    filter.connect(gnd);
    gnd.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + dur);
  }

  /**
   * Tom simples para os sons legados (success, error, info, warning).
   */
  private tone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine',
    maxGain: number = 0.15
  ) {
    const osc  = ctx.createOscillator();
    const gnd  = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gnd.gain.setValueAtTime(0, startTime);
    gnd.gain.linearRampToValueAtTime(maxGain, startTime + 0.02);
    gnd.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gnd);
    gnd.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundManager = new SoundManager();
export const playSound = (type: SoundType) => soundManager.play(type);
