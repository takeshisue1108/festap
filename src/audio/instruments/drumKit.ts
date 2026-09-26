import { GM } from "../../core/generators/drum";
import { type AudioEngine, type Handle, Voice } from "../engine";
import type { DrumKit } from "./instrument";

/** Synthesized kit: the placeholder pack and the fallback for any missing sample. */
export class SynthDrumKit implements DrumKit {
  constructor(private readonly engine: AudioEngine) {}

  hit(note: number, when: number, vel: number): Handle {
    switch (note) {
      case GM.kick:
      case 35:
        return this.kick(when, vel);
      case GM.snare:
      case 40:
        return this.snare(when, vel);
      case GM.clap:
        return this.clap(when, vel);
      case GM.openHat:
        return this.noiseHit(when, vel * 0.5, "highpass", 7000, 0.7, 0.32);
      case GM.crash:
      case 57:
        return this.noiseHit(when, vel * 0.5, "highpass", 4500, 0.5, 1.3);
      case GM.hiTom:
        return this.tom(when, vel, 230);
      case GM.hiMidTom:
        return this.tom(when, vel, 185);
      case GM.lowMidTom:
        return this.tom(when, vel, 150);
      case GM.lowTom:
        return this.tom(when, vel, 120);
      case GM.floorTom:
      case 43:
        return this.tom(when, vel, 95);
      default:
        return this.noiseHit(when, vel * 0.45, "highpass", 8000, 0.7, 0.06);
    }
  }

  private out(when: number, peak: number, decay: number): { amp: GainNode; stopAt: number } {
    const amp = this.engine.ctx.createGain();
    amp.gain.setValueAtTime(peak, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    amp.connect(this.engine.buses.drums);
    return { amp, stopAt: when + decay + 0.01 };
  }

  private kick(when: number, vel: number): Handle {
    const ctx = this.engine.ctx;
    const { amp, stopAt } = this.out(when, vel, 0.35);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);
    osc.connect(amp);
    osc.start(when);
    osc.stop(stopAt);
    return new Voice(when, amp, [osc]);
  }

  private tom(when: number, vel: number, hz: number): Handle {
    const ctx = this.engine.ctx;
    const { amp, stopAt } = this.out(when, vel * 0.8, 0.3);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(hz, when);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.6, when + 0.25);
    osc.connect(amp);
    osc.start(when);
    osc.stop(stopAt);
    return new Voice(when, amp, [osc]);
  }

  private noiseSource(when: number, stopAt: number): AudioBufferSourceNode {
    const src = this.engine.ctx.createBufferSource();
    src.buffer = this.engine.noiseBuffer();
    src.loop = true;
    src.start(when, Math.random() * 0.5);
    src.stop(stopAt);
    return src;
  }

  private noiseHit(when: number, vel: number, type: BiquadFilterType, hz: number, q: number, decay: number): Handle {
    const ctx = this.engine.ctx;
    const { amp, stopAt } = this.out(when, vel, decay);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = hz;
    filter.Q.value = q;
    const src = this.noiseSource(when, stopAt);
    src.connect(filter).connect(amp);
    return new Voice(when, amp, [src]);
  }

  private snare(when: number, vel: number): Handle {
    const ctx = this.engine.ctx;
    const { amp, stopAt } = this.out(when, vel * 0.7, 0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;
    const src = this.noiseSource(when, stopAt);
    src.connect(filter).connect(amp);
    const body = ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(200, when);
    body.frequency.exponentialRampToValueAtTime(160, when + 0.1);
    const bodyAmp = ctx.createGain();
    bodyAmp.gain.setValueAtTime(0.6, when);
    bodyAmp.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    body.connect(bodyAmp).connect(amp);
    body.start(when);
    body.stop(stopAt);
    return new Voice(when, amp, [src, body]);
  }

  clap(when: number, vel: number, bus: GainNode = this.engine.buses.drums): Handle {
    const ctx = this.engine.ctx;
    const amp = ctx.createGain();
    // three quick bursts, then a short tail
    amp.gain.setValueAtTime(0, when);
    for (const [i, t] of [0, 0.011, 0.022].entries()) {
      amp.gain.setValueAtTime(vel * (1 - i * 0.15), when + t);
      amp.gain.exponentialRampToValueAtTime(vel * 0.1, when + t + 0.009);
    }
    amp.gain.setValueAtTime(vel * 0.7, when + 0.033);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    amp.connect(bus);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 1.2;
    const src = this.noiseSource(when, when + 0.21);
    src.connect(filter).connect(amp);
    return new Voice(when, amp, [src]);
  }
}

/** Sampled kit (e.g. pya-gakki/banks/vivi_drums); unknown notes fall back to the synth kit. */
export class SampleDrumKit implements DrumKit {
  constructor(
    private readonly engine: AudioEngine,
    private readonly samples: Map<number, AudioBuffer>,
    private readonly fallback: DrumKit,
  ) {}

  hit(note: number, when: number, vel: number): Handle {
    const buffer = this.samples.get(note);
    if (!buffer) return this.fallback.hit(note, when, vel);
    const src = this.engine.ctx.createBufferSource();
    src.buffer = buffer;
    const amp = this.engine.ctx.createGain();
    amp.gain.value = vel;
    src.connect(amp).connect(this.engine.buses.drums);
    src.start(when);
    return new Voice(when, amp, [src]);
  }
}
