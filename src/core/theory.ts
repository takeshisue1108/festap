export type ScaleMode = "major" | "minor";

export const PITCH_CLASS_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
// Natural minor (plan §6.8).
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function scaleSteps(mode: ScaleMode): readonly number[] {
  return mode === "major" ? MAJOR_STEPS : MINOR_STEPS;
}

export function pentatonicSteps(mode: ScaleMode): readonly number[] {
  return mode === "major" ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
}

/** Spec §5.3: nearest 12-TET pitch class of a continuous pitch value (semitones above C). */
export function snapToSemitone(pitch: number): number {
  return mod(Math.round(pitch), 12);
}

export function pitchClassName(pc: number): string {
  return PITCH_CLASS_NAMES[mod(Math.round(pc), 12)];
}

/** MIDI note of a scale degree. Degree 0 = tonic at `tonicMidi`; negative and >6 wrap into other octaves. */
export function degreeToMidi(tonicMidi: number, mode: ScaleMode, degree: number): number {
  const steps = scaleSteps(mode);
  const octave = Math.floor(degree / steps.length);
  return tonicMidi + octave * 12 + steps[mod(degree, steps.length)];
}

/** Lowest MIDI note >= `floor` whose pitch class is `pc`. */
export function midiAtOrAbove(pc: number, floor: number): number {
  return floor + mod(pc - floor, 12);
}

/** Pitch classes of the key's scale. */
export function scalePitchClasses(tonic: number, mode: ScaleMode): number[] {
  return scaleSteps(mode).map((s) => mod(tonic + s, 12));
}

/** The nearest note of the key's scale strictly below (dir -1) or above (dir +1) `midi`. */
export function scaleNeighbor(midi: number, tonic: number, mode: ScaleMode, dir: 1 | -1): number {
  const pcs = scalePitchClasses(tonic, mode);
  let m = midi + dir;
  while (!pcs.includes(mod(m, 12))) m += dir;
  return m;
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function keyName(tonic: number, mode: ScaleMode): string {
  return `${pitchClassName(tonic)} ${mode === "major" ? "Major" : "Minor"}`;
}
