import { midiToHz } from "../../core/theory";
import { type AudioEngine, type BusName, Voice } from "../engine";
import { applyEnvelope, type Envelope, type Instrument } from "./instrument";

export interface SynthOptions {
  wave: OscillatorType;
  detuneCents: number[]; // one oscillator per entry
  env: Envelope;
  gain: number;
  filterHz: number;
  filterEnvHz: number; // extra cutoff at the attack peak
  filterQ: number;
}

/** Zero-asset oscillator voice: bring-up, fallback, and the placeholder pack (plan §10). */
export class SynthInstrument implements Instrument {
  constructor(
    private readonly engine: AudioEngine,
    private readonly bus: BusName,
    private readonly o: SynthOptions,
  ) {}

  play(midi: number, when: number, durSec: number, vel: number): Voice {
    const ctx = this.engine.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = this.o.filterQ;
    filter.frequency.setValueAtTime(this.o.filterHz + this.o.filterEnvHz * vel, when);
    filter.frequency.setTargetAtTime(this.o.filterHz, when + this.o.env.attack, this.o.env.decay / 2);
    const amp = ctx.createGain();
    const stopAt = applyEnvelope(amp.gain, when, durSec, this.o.gain * vel, this.o.env);
    filter.connect(amp).connect(this.engine.buses[this.bus]);

    const oscs = this.o.detuneCents.map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = this.o.wave;
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(when);
      osc.stop(stopAt);
      return osc;
    });
    return new Voice(when, amp, oscs);
  }
}

export const BASS_SYNTH: SynthOptions = {
  wave: "sawtooth",
  detuneCents: [0, -7],
  env: { attack: 0.004, decay: 0.25, sustain: 0.6, release: 0.08 },
  gain: 0.45,
  filterHz: 380,
  filterEnvHz: 900,
  filterQ: 4,
};

export const LEAD_SYNTH: SynthOptions = {
  wave: "triangle",
  detuneCents: [-6, 6],
  env: { attack: 0.004, decay: 0.3, sustain: 0.45, release: 0.15 },
  gain: 0.28,
  filterHz: 2400,
  filterEnvHz: 3000,
  filterQ: 1,
};
