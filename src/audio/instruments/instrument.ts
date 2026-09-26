import type { Handle } from "../engine";

/** A pitched instrument. `vel` is 0..1. */
export interface Instrument {
  play(midi: number, when: number, durSec: number, vel: number): Handle;
}

/** A percussion instrument addressed by General MIDI note number. */
export interface DrumKit {
  hit(note: number, when: number, vel: number): Handle;
}

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number; // fraction of peak
  release: number;
}

/** Schedule an ADSR on a gain param; returns the time the voice is silent. */
export function applyEnvelope(param: AudioParam, when: number, durSec: number, peak: number, env: Envelope): number {
  const end = when + Math.max(durSec, env.attack);
  param.setValueAtTime(0, when);
  param.linearRampToValueAtTime(peak, when + env.attack);
  param.setTargetAtTime(peak * env.sustain, when + env.attack, env.decay / 3);
  param.cancelScheduledValues(end);
  param.setTargetAtTime(0, end, env.release / 3);
  return end + env.release * 2;
}
