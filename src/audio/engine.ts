// Web Audio plumbing only; no music rules here (plan §5.1).

export type BusName = "drums" | "bass" | "gestures" | "oneshots" | "clap";

export interface Handle {
  when: number;
  cancel(): void;
  /** Slide this voice's pitch by `deltaSemitones`, if it can (a plain combined Handle cannot). */
  bend?(deltaSemitones: number, at: number): void;
}

const BUS_GAIN: Record<BusName, number> = {
  drums: 0.9,
  bass: 0.8,
  gestures: 0.7,
  oneshots: 1.0,
  clap: 0.8,
};

export class AudioEngine {
  readonly buses: Record<BusName, GainNode>;
  readonly master: GainNode;
  private noise: AudioBuffer | null = null;

  /** `limiter: false` is for render tests: Chrome's compressor adds a ~6 ms look-ahead delay. */
  constructor(
    readonly ctx: BaseAudioContext,
    opts: { limiter: boolean } = { limiter: true },
  ) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    if (!opts.limiter) this.master.connect(ctx.destination);
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 3;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    if (opts.limiter) this.master.connect(limiter).connect(ctx.destination);
    this.buses = Object.fromEntries(
      (Object.keys(BUS_GAIN) as BusName[]).map((name) => {
        const g = ctx.createGain();
        g.gain.value = BUS_GAIN[name];
        g.connect(this.master);
        return [name, g];
      }),
    ) as Record<BusName, GainNode>;
  }

  static createLive(): AudioEngine {
    return new AudioEngine(new AudioContext({ latencyHint: "interactive" }));
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  get live(): AudioContext | null {
    return typeof AudioContext !== "undefined" && this.ctx instanceof AudioContext ? this.ctx : null;
  }

  /**
   * Must run inside a user gesture (iOS). Also asks Safari 17+ to ignore the ring/silent switch
   * (plan §6.1) and plays one silent sample, which some iOS versions need to actually start output.
   */
  async unlock(): Promise<void> {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = "playback";
    } catch {
      // older Safari: silent switch mutes Web Audio; nothing more we can do
    }
    const live = this.live;
    if (!live) return;
    const src = live.createBufferSource();
    src.buffer = live.createBuffer(1, 1, live.sampleRate);
    src.connect(live.destination);
    src.start();
    if (live.state !== "running") await live.resume();
  }

  /** One second of white noise, shared by all noise-based voices. */
  noiseBuffer(): AudioBuffer {
    if (!this.noise) {
      const n = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = n.getChannelData(0);
      let seed = 1;
      for (let i = 0; i < d.length; i++) {
        seed = (seed * 16807) % 2147483647; // deterministic, so render tests are repeatable
        d[i] = (seed / 2147483647) * 2 - 1;
      }
      this.noise = n;
    }
    return this.noise;
  }
}

/**
 * A scheduled voice: its sources and the gain node that feeds the bus.
 * cancel() silences it even if it has not started yet (used when the tempo changes).
 */
export class Voice implements Handle {
  constructor(
    readonly when: number,
    private readonly out: AudioNode,
    private readonly sources: AudioScheduledSourceNode[],
    /** AudioParams that control this voice's pitch (oscillator frequency or sample playbackRate), with their starting value. */
    private readonly pitchParams: { param: AudioParam; base: number }[] = [],
  ) {}

  cancel(): void {
    this.out.disconnect();
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    }
  }

  /** Tonic-bar drag (spec update 2026-09-26): glide the pitch this voice is already sounding at. */
  bend(deltaSemitones: number, at: number, timeConstant = 0.03): void {
    const ratio = Math.pow(2, deltaSemitones / 12);
    for (const p of this.pitchParams) p.param.setTargetAtTime(p.base * ratio, at, timeConstant);
  }
}

export function combine(when: number, handles: Handle[]): Handle {
  return { when, cancel: () => handles.forEach((h) => h.cancel()) };
}
