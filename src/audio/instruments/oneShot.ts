import { type AudioEngine, type BusName, type Handle, Voice } from "../engine";

/** Something that can be fired at a time: a decoded sample or a synth recipe. */
export type OneShotSound = AudioBuffer | ((engine: AudioEngine, when: number, bus: GainNode) => Handle);

const MAX_VOICES = 8;

/**
 * Immediate, spam-safe playback (spec §10 one-shots): every press starts a new voice,
 * up to MAX_VOICES; the oldest is stolen beyond that.
 */
export class OneShotPlayer {
  private voices: Handle[] = [];

  constructor(
    private readonly engine: AudioEngine,
    private readonly bus: BusName,
  ) {}

  play(sound: OneShotSound, when = this.engine.now): Handle {
    const bus = this.engine.buses[this.bus];
    let handle: Handle;
    if (typeof sound === "function") {
      handle = sound(this.engine, when, bus);
    } else {
      const src = this.engine.ctx.createBufferSource();
      src.buffer = sound;
      const amp = this.engine.ctx.createGain();
      src.connect(amp).connect(bus);
      src.start(when);
      handle = new Voice(when, amp, [src]);
      src.onended = () => (this.voices = this.voices.filter((v) => v !== handle));
    }
    this.voices.push(handle);
    while (this.voices.length > MAX_VOICES) this.voices.shift()!.cancel();
    return handle;
  }
}

// ---- Placeholder voice (plan §10): synthesized stand-in, always safe to publish. ----

/** "gue!": a short falling squawk with a growl. */
export const synthGue: OneShotSound = (engine, when, bus) => {
  const ctx = engine.ctx;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(230, when);
  osc.frequency.exponentialRampToValueAtTime(120, when + 0.22);
  const growl = ctx.createOscillator();
  growl.frequency.value = 32;
  const growlDepth = ctx.createGain();
  growlDepth.gain.value = 0.45;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, when);
  amp.gain.linearRampToValueAtTime(0.8, when + 0.012);
  amp.gain.setTargetAtTime(0, when + 0.16, 0.04);
  growl.connect(growlDepth).connect(amp.gain);
  const formant = ctx.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 750;
  formant.Q.value = 2;
  osc.connect(formant).connect(amp).connect(bus);
  osc.start(when);
  growl.start(when);
  osc.stop(when + 0.4);
  growl.stop(when + 0.4);
  return new Voice(when, amp, [osc, growl]);
};
