// The tonic bar is laid out against the keyboard beside it (settled 2026-09-18): pitch rises downward,
// each natural note sits level with the centre of its white key (C at the top key, the octave C at the
// bottom key), and each sharp sits level with its black key, i.e. on the boundary between two white keys.
// Positions are in "key units": 0 = centre of the top key, 7 = centre of the bottom key.

// [key position, pitch in semitones above C] for the white-key centres.
const ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], // C
  [1, 2], // D
  [2, 4], // E
  [3, 5], // F
  [4, 7], // G
  [5, 9], // A
  [6, 11], // B
  [7, 12], // C
];

export const AXIS_MIN = 0;
export const AXIS_MAX = ANCHORS.length - 1;

/** Continuous pitch at a key position (clamped to the top and bottom key centres). */
export function pitchAtKeyPos(pos: number): number {
  const p = Math.min(AXIS_MAX, Math.max(AXIS_MIN, pos));
  const i = Math.min(AXIS_MAX - 1, Math.floor(p));
  const [x0, y0] = ANCHORS[i];
  const [x1, y1] = ANCHORS[i + 1];
  return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
}

/** Key position of a pitch (inverse of pitchAtKeyPos); pitch is taken within 0..12. */
export function keyPosOfPitch(pitch: number): number {
  const y = Math.min(12, Math.max(0, pitch));
  for (let i = 0; i < AXIS_MAX; i++) {
    const [x0, y0] = ANCHORS[i];
    const [x1, y1] = ANCHORS[i + 1];
    if (y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  return AXIS_MAX;
}
