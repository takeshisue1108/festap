import type { Chord } from "../harmony/harmonyProvider";
import { midiAtOrAbove, scaleNeighbor } from "../theory";
import { beatRole, type MusicalContext } from "../transport/context";

// Plan §6.8. Root-centred MVP rules; swappable (spec §17.4).

export interface BassNote {
  midi: number;
  durBeats: number;
  vel: number;
}

export const BASS_FLOOR = 28; // E1; roots land in 28..39, whole line stays within 28..52

function rootOf(chord: Chord): number {
  return midiAtOrAbove(chord.rootPc, BASS_FLOOR);
}

function fifthOf(chord: Chord): number {
  return rootOf(chord) + chord.intervals[2];
}

/** The key's scale tone next to the chord root, from below or above (stays in key for any chord). */
function approachNote(ctx: MusicalContext, chord: Chord, fromAbove: boolean): number {
  return scaleNeighbor(rootOf(chord), ctx.tonic, ctx.scaleMode, fromAbove ? 1 : -1);
}

function isHalfBeat(ctx: MusicalContext): boolean {
  return ctx.stepInBeat * 2 === ctx.subdivision;
}

/** Auto bass line: evaluated on every step of the Auto grid; null = rest. */
export function autoBassNote(ctx: MusicalContext, chord: Chord): BassNote | null {
  const role = beatRole(ctx.beatIndex, ctx.meterBeats);
  if (ctx.stepInBeat === 0) {
    if (role.isDownbeat) return { midi: rootOf(chord), durBeats: 0.9, vel: 0.95 };
    if (role.posInGroup === 0) {
      return { midi: role.groupIndex % 2 === 1 ? fifthOf(chord) : rootOf(chord), durBeats: 0.9, vel: 0.8 };
    }
    return { midi: rootOf(chord), durBeats: 0.45, vel: 0.6 };
  }
  if (role.isLastBeat && isHalfBeat(ctx)) {
    return { midi: approachNote(ctx, chord, false), durBeats: 0.45, vel: 0.7 };
  }
  return null;
}

/**
 * Manual tap (spec §9.1): the note that suits where the onset landed.
 * Strong positions get the root / fifth, the end of the bar leads back to the root,
 * anything else walks through the chord from the previous note.
 */
export function contextualBassNote(ctx: MusicalContext, chord: Chord, lastMidi: number | null): BassNote {
  const role = beatRole(ctx.beatIndex, ctx.meterBeats);
  const root = rootOf(chord);
  if (ctx.stepInBeat === 0 && role.isDownbeat) return { midi: root, durBeats: 1, vel: 1 };
  if (ctx.stepInBeat === 0 && role.posInGroup === 0) {
    return { midi: role.groupIndex % 2 === 1 ? fifthOf(chord) : root, durBeats: 0.9, vel: 0.9 };
  }
  if (role.isLastBeat && ctx.beatPhase >= 0.5) {
    const fromAbove = lastMidi !== null && lastMidi > root + 6;
    return { midi: approachNote(ctx, chord, fromAbove), durBeats: 0.5, vel: 0.85 };
  }
  const walk = [root, root + chord.intervals[1], fifthOf(chord), root + 12];
  const here = lastMidi === null ? -1 : nearestIndex(walk, lastMidi);
  return { midi: walk[(here + 1) % walk.length], durBeats: 0.5, vel: 0.8 };
}

function nearestIndex(values: number[], target: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
  }
  return best;
}
