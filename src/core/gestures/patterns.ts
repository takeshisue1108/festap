import type { Chord } from "../harmony/harmonyProvider";
import { midiAtOrAbove, mod, pentatonicSteps } from "../theory";
import type { MusicalContext } from "../transport/context";

// Spec §10.2. Patterns are data in a registry; pads map to IDs in config/gestureMapping.ts.
export type GesturePatternId = "simple_one_beat" | "complex_arpeggio" | "third_gesture" | "fourth_gesture";

export interface MusicalGesture {
  pattern: GesturePatternId;
  durationBeats: number; // spec default 1.0
}

/** One note of a gesture, relative to the gesture's onset. */
export interface NoteEvent {
  offsetBeats: number;
  durBeats: number;
  midi: number;
  vel: number; // 0..1
}

export interface GesturePattern {
  id: GesturePatternId;
  render(ctx: MusicalContext, chord: Chord, durationBeats: number): NoteEvent[];
}

// Voice gestures around middle C.
const GESTURE_FLOOR = 60;

function chordTonesUp(chord: Chord, floor: number, count: number): number[] {
  const root = midiAtOrAbove(chord.rootPc, floor);
  const out: number[] = [];
  for (let i = 0; out.length < count; i++) {
    const octave = Math.floor(i / chord.intervals.length);
    out.push(root + 12 * octave + chord.intervals[i % chord.intervals.length]);
  }
  return out;
}

/** A. The whole beat as one simple sound: the current triad, held. */
export const simpleOneBeat: GesturePattern = {
  id: "simple_one_beat",
  render(_ctx, chord, durationBeats) {
    return chordTonesUp(chord, GESTURE_FLOOR, 3).map((midi) => ({
      offsetBeats: 0,
      durBeats: durationBeats * 0.95,
      midi,
      vel: 0.55,
    }));
  },
};

/** B. Eight chord tones up two octaves and back down, all inside the beat; accents on notes 1 and 5. */
export const complexArpeggio: GesturePattern = {
  id: "complex_arpeggio",
  render(_ctx, chord, durationBeats) {
    const up = chordTonesUp(chord, GESTURE_FLOOR, 7);
    const order = [0, 1, 2, 3, 4, 5, 4, 3];
    const slot = durationBeats / order.length;
    return order.map((idx, i) => ({
      offsetBeats: i * slot,
      durBeats: slot * 1.1,
      midi: up[idx],
      vel: i === 0 || i === 4 ? 0.8 : 0.5,
    }));
  },
};

/** C. Placeholder "sparkle": a fast pentatonic run in the first half-beat, then the top note rings. */
export const thirdGesture: GesturePattern = {
  id: "third_gesture",
  render(ctx, chord, durationBeats) {
    // The key's pentatonic tones, rising from the current chord's root (so the run stays in key).
    const pent = pentatonicSteps(ctx.scaleMode).map((s) => mod(ctx.tonic + s, 12));
    const run: number[] = [];
    for (let m = midiAtOrAbove(chord.rootPc, GESTURE_FLOOR + 12); run.length < 6; m++) {
      if (pent.includes(mod(m, 12))) run.push(m);
    }
    const half = durationBeats / 2;
    const slot = half / run.length;
    const events: NoteEvent[] = run.map((midi, i) => ({
      offsetBeats: i * slot,
      durBeats: slot * 1.5,
      midi,
      vel: 0.35 + 0.08 * i,
    }));
    events.push({ offsetBeats: half, durBeats: half * 0.95, midi: run[run.length - 1] + 12, vel: 0.6 });
    return events;
  },
};

/** D. A four-note broken-chord bounce (root, fifth, third, octave), all inside the beat. */
export const fourthGesture: GesturePattern = {
  id: "fourth_gesture",
  render(_ctx, chord, durationBeats) {
    const up = chordTonesUp(chord, GESTURE_FLOOR, 4);
    const order = [0, 2, 1, 3];
    const slot = durationBeats / order.length;
    return order.map((idx, i) => ({
      offsetBeats: i * slot,
      durBeats: slot * 1.2,
      midi: up[idx],
      vel: i === order.length - 1 ? 0.75 : 0.5,
    }));
  },
};

export const gesturePatterns: Record<GesturePatternId, GesturePattern> = {
  simple_one_beat: simpleOneBeat,
  complex_arpeggio: complexArpeggio,
  third_gesture: thirdGesture,
  fourth_gesture: fourthGesture,
};
