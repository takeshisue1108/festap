import { describe, expect, it } from "vitest";
import { keyPosOfPitch, pitchAtKeyPos } from "../../src/core/display/keyboardAxis";

describe("tonic bar axis against the keyboard", () => {
  it.each([
    [0, 0], // C at the top key
    [1, 2], // D
    [2, 4], // E
    [3, 5], // F
    [6, 11], // B
    [7, 12], // octave C at the bottom key
    [0.5, 1], // C# on the ド|レ boundary (black key)
    [3.5, 6], // F# on the ファ|ソ boundary
    [2.5, 4.5], // no black key between ミ and ファ: halfway is a quarter tone
    [-1, 0], // clamped
    [9, 12],
  ])("key position %d -> pitch %d", (pos, pitch) => expect(pitchAtKeyPos(pos)).toBeCloseTo(pitch, 10));

  it("round-trips", () => {
    for (let p = 0; p <= 12; p += 0.25) expect(pitchAtKeyPos(keyPosOfPitch(p))).toBeCloseTo(p, 10);
  });
});
