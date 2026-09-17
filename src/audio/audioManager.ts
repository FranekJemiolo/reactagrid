/**
 * Dynamic Procedural Audio Engine for ReactaGrid
 * Powered by the Web Audio API with zero external MP3/WAV dependencies.
 * Implements microsecond procedural synthesis (bubbling, explosions, sizzling, boiling)
 * and an Event Throttler to prevent audio clipping and CPU spikes under high reaction load.
 */

export interface AudioEventOptions {
  heatYield?: number;
  intensity?: number;
}

export interface SynthesizedAudioCall {
  type: 'boil' | 'bubble' | 'explosion' | 'sizzle' | 'click' | 'discovery';
  count: number;
  volume: number;
  metadata?: Record<string, number | string>;
  timestamp: number;
}

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    // Lazy AudioContext initialization upon user interaction
  }

  public getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Generates a burst of pink noise (equal energy per octave: 1/f)
   * Essential for deep, physically grounded explosions with rich sub-frequencies.
   */
  private generatePinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  /**
   * Generates white noise buffer for whistling, bubbling, and sizzling
   */
  private generateWhiteNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const bufferSize = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Procedural Bubbling:
   * Low-pass filtered white noise modulated by a low-frequency oscillator (LFO)
   * simulating air cavities rising through viscous liquids.
   */
  public synthesizeBubbling(volume = 0.08): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.15;

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this.generateWhiteNoiseBuffer(ctx, duration);

      // Bandpass resonant filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(4.0, now);

      // LFO modulation (6 Hz sine)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(6.0 + Math.random() * 3.0, now);
      lfoGain.gain.setValueAtTime(220, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Gain Envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.min(0.2, volume), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      noiseSource.start(now);

      lfo.stop(now + duration);
      noiseSource.stop(now + duration);
    } catch {
      // Gracefully handle browser autoplay or context constraints
    }
  }

  /**
   * Procedural Explosion:
   * Pink noise burst with rapid exponential decay envelope, scaled by heat_yield.
   */
  public synthesizeExplosion(heatYield = 200, volume = 0.3): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const normalizedYield = Math.max(0.1, Math.min(1.0, Math.abs(heatYield) / 500));
      const duration = 0.25 + normalizedYield * 0.4;

      // Pink noise rumble
      const noise = ctx.createBufferSource();
      noise.buffer = this.generatePinkNoiseBuffer(ctx, duration);

      // Lowpass sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + normalizedYield * 600, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      // Sub-bass sine drop for physical impact
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + duration * 0.7);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(Math.min(0.35, volume * 0.9), now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.45, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      subOsc.start(now);
      noise.start(now);

      subOsc.stop(now + duration);
      noise.stop(now + duration);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Procedural Sizzling:
   * High-pitched granular bandpass noise synthesis when hot cells contact liquid.
   */
  public synthesizeSizzling(volume = 0.12): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.18;

      const noise = ctx.createBufferSource();
      noise.buffer = this.generateWhiteNoiseBuffer(ctx, duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4500 + Math.random() * 1500, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.min(0.2, volume), now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Procedural Boiling Hiss:
   * Aggregated broad-spectrum steam hiss for thermodynamic phase shifts.
   */
  public synthesizeBoil(volume = 0.15, _pixelCount = 1): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.22;

      const noise = ctx.createBufferSource();
      noise.buffer = this.generateWhiteNoiseBuffer(ctx, duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.min(0.3, volume), now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Procedural UI Click sound
   */
  public synthesizeClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Procedural Discovery Chord (C-E-G-C arpeggio)
   */
  public synthesizeDiscovery(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      // Ignore audio failure
    }
  }
}

/**
 * Event Throttler:
 * Batches high-volume simulation events (e.g. thousands of reactions/boils per frame)
 * into a single debounced and scaled procedural audio call per 16ms window.
 */
export class AudioManager {
  private soundEngine: ProceduralAudioEngine;
  private queue: Map<
    'boil' | 'bubble' | 'explosion' | 'sizzle',
    { count: number; maxHeatYield: number; maxIntensity: number }
  > = new Map();
  private throttleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private synthesizedCalls: SynthesizedAudioCall[] = [];
  public throttleWindowMs = 16; // 1 frame (~60 FPS)

  constructor(engine?: ProceduralAudioEngine) {
    this.soundEngine = engine ?? new ProceduralAudioEngine();
  }

  public getSoundEngine(): ProceduralAudioEngine {
    return this.soundEngine;
  }

  public toggleMute(): boolean {
    return this.soundEngine.toggleMute();
  }

  public isMuted(): boolean {
    return this.soundEngine.getIsMuted();
  }

  /**
   * Enqueues an event into the current 16ms aggregation window.
   */
  public trigger(
    type: 'boil' | 'bubble' | 'explosion' | 'sizzle',
    options?: AudioEventOptions,
  ): void {
    const heatYield = options?.heatYield ?? 0;
    const intensity = options?.intensity ?? 1.0;

    const entry = this.queue.get(type) ?? {
      count: 0,
      maxHeatYield: 0,
      maxIntensity: 0,
    };

    entry.count++;
    if (Math.abs(heatYield) > Math.abs(entry.maxHeatYield)) {
      entry.maxHeatYield = heatYield;
    }
    if (intensity > entry.maxIntensity) {
      entry.maxIntensity = intensity;
    }
    this.queue.set(type, entry);

    if (this.throttleTimeoutId === null) {
      this.throttleTimeoutId = setTimeout(() => {
        this.flush();
      }, this.throttleWindowMs);
    }
  }

  /**
   * Immediately flushes the aggregated audio queue.
   */
  public flush(): void {
    if (this.throttleTimeoutId !== null) {
      clearTimeout(this.throttleTimeoutId);
      this.throttleTimeoutId = null;
    }

    for (const [type, data] of this.queue.entries()) {
      if (data.count === 0) continue;

      // Scale volume logarithmically by count to prevent audio clipping:
      // vol = min(1.0, base + scaling * log10(count))
      const logFactor = Math.log10(Math.max(1, data.count));

      switch (type) {
        case 'boil': {
          const volume = Math.min(0.4, 0.08 + 0.08 * logFactor);
          this.soundEngine.synthesizeBoil(volume, data.count);
          this.recordCall('boil', data.count, volume);
          break;
        }
        case 'bubble': {
          const volume = Math.min(0.25, 0.06 + 0.06 * logFactor);
          this.soundEngine.synthesizeBubbling(volume);
          this.recordCall('bubble', data.count, volume);
          break;
        }
        case 'explosion': {
          const volume = Math.min(0.5, 0.2 + 0.1 * logFactor);
          this.soundEngine.synthesizeExplosion(data.maxHeatYield, volume);
          this.recordCall('explosion', data.count, volume, { heatYield: data.maxHeatYield });
          break;
        }
        case 'sizzle': {
          const volume = Math.min(0.3, 0.08 + 0.07 * logFactor);
          this.soundEngine.synthesizeSizzling(volume);
          this.recordCall('sizzle', data.count, volume);
          break;
        }
      }
    }

    this.queue.clear();
  }

  public playClick(): void {
    this.soundEngine.synthesizeClick();
    this.recordCall('click', 1, 0.08);
  }

  public playDiscovery(): void {
    this.soundEngine.synthesizeDiscovery();
    this.recordCall('discovery', 1, 0.1);
  }

  private recordCall(
    type: SynthesizedAudioCall['type'],
    count: number,
    volume: number,
    metadata?: Record<string, number | string>,
  ): void {
    this.synthesizedCalls.push({
      type,
      count,
      volume,
      metadata,
      timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    });
  }

  public getSynthesizedCalls(): SynthesizedAudioCall[] {
    return this.synthesizedCalls;
  }

  public resetMetrics(): void {
    this.synthesizedCalls = [];
    this.queue.clear();
    if (this.throttleTimeoutId !== null) {
      clearTimeout(this.throttleTimeoutId);
      this.throttleTimeoutId = null;
    }
  }
}

export const audioManager = new AudioManager();
