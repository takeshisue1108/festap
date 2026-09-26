import type { GesturePatternId, MusicalGesture } from "../core/gestures/patterns";

// Spec §17.2: which pad plays which pattern is undecided, so it is data. Tentative, top to bottom.
// Slot 3 (spec update 2026-09-26) sits above the Vivi pad, half-height, instead of a fourth full pad.
export type GesturePadSlot = 0 | 1 | 2 | 3;
export const GESTURE_PAD_SLOTS: GesturePadSlot[] = [0, 1, 2, 3];

export const gestureMapping: Record<GesturePadSlot, MusicalGesture> = {
  0: { pattern: "simple_one_beat", durationBeats: 1.0 },
  1: { pattern: "complex_arpeggio", durationBeats: 1.0 },
  2: { pattern: "third_gesture", durationBeats: 1.0 },
  3: { pattern: "fourth_gesture", durationBeats: 1.0 },
};

/** Pictogram drawn on each pad (plan §6.11). Keyed by pattern so the art follows a remap. */
export const gestureGlyph: Record<GesturePatternId, "zigzag" | "sheaf" | "tangle" | "spiral"> = {
  simple_one_beat: "zigzag",
  complex_arpeggio: "sheaf",
  third_gesture: "tangle",
  fourth_gesture: "spiral",
};

/** Max gestures sounding at once per pad (plan §6.9). */
export const GESTURE_POLYPHONY_PER_PAD = 2;
