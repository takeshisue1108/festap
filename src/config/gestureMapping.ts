import type { GesturePatternId, MusicalGesture } from "../core/gestures/patterns";

// Spec §17.2: which pad plays which pattern is undecided, so it is data. Tentative, top to bottom.
export type GesturePadSlot = 0 | 1 | 2;

export const gestureMapping: Record<GesturePadSlot, MusicalGesture> = {
  0: { pattern: "simple_one_beat", durationBeats: 1.0 },
  1: { pattern: "complex_arpeggio", durationBeats: 1.0 },
  2: { pattern: "third_gesture", durationBeats: 1.0 },
};

/** Pictogram drawn on each pad (plan §6.11). Keyed by pattern so the art follows a remap. */
export const gestureGlyph: Record<GesturePatternId, "zigzag" | "sheaf" | "tangle"> = {
  simple_one_beat: "zigzag",
  complex_arpeggio: "sheaf",
  third_gesture: "tangle",
};

/** Max gestures sounding at once per pad (plan §6.9). */
export const GESTURE_POLYPHONY_PER_PAD = 2;
