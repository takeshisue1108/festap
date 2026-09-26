import { mod, pitchClassName, scaleSteps, type ScaleMode } from "../theory";
import type { MusicalContext } from "../transport/context";

export interface Chord {
  rootPc: number;
  /** Chord tones as semitones above the root, ascending (e.g. [0, 4, 7]). */
  intervals: number[];
}

/** Where bass and gestures get their chord from (plan §6.8). */
export interface HarmonyProvider {
  chordAt(ctx: MusicalContext): Chord;
}

/**
 * Triad built on scale degree `degree` (0 = tonic) of the current key, from the scale's own tones.
 * C major: 0 → C, 1 → Dm, 2 → Em, 3 → F, 4 → G, 5 → Am, 6 → Bdim. Minor uses natural minor.
 */
export function diatonicTriad(tonic: number, mode: ScaleMode, degree: number): Chord {
  const steps = scaleSteps(mode);
  const d = mod(degree, steps.length);
  const tone = (i: number) => steps[(d + i) % steps.length] + (d + i >= steps.length ? 12 : 0);
  const root = tone(0);
  return { rootPc: mod(tonic + root, 12), intervals: [0, tone(2) - root, tone(4) - root] };
}

/** "CM", "Dm", "Bdim" — major is written with M, as in the spec's examples. */
export function chordName(chord: Chord): string {
  const [, third, fifth] = chord.intervals;
  const quality =
    third === 4 && fifth === 7 ? "M" : third === 3 && fifth === 7 ? "m" : third === 3 && fifth === 6 ? "dim" : third === 4 && fifth === 8 ? "aug" : "";
  return pitchClassName(chord.rootPc) + quality;
}

/**
 * The chord chosen on the keyboard (spec §17.1 as settled on 2026-09-18). The keyboard stores a scale
 * degree, so the chord follows later tonic / Major–Minor changes and stays in key.
 */
export const diatonicHarmony: HarmonyProvider = {
  chordAt: (ctx) => diatonicTriad(ctx.tonic, ctx.scaleMode, ctx.chordDegree),
};
