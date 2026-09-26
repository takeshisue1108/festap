// Festa tap (vault projects/festap/festa_tap/02_specification.md). Tunable values; the drawings live in the pack.

export type FestaFrameId = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11";

export interface FestaFrameTiming {
  id: FestaFrameId;
  durationMs: number;
  /** Share of the way from the drawn fingertip to the touch point (spec §7). */
  reachWeight: number;
  armOrder: "front" | "behind";
}

export const FESTA = {
  enabled: true,
  reactDuringClapCapture: true,
  opacityIdle: 1,
  opacityReacting: 1,
  /** Master px around the mirror axis where the previous side is kept (spec §12.5). */
  deadZone: 30,
  /** Consecutive presses (a touch while a reaction still plays) use the other hand (owner, 2026-09-27). */
  alternateHands: true,
  dprCap: 2,
  reducedMotionSequence: ["02", "09"] as FestaFrameId[],
  /**
   * Idle dance (owner, 2026-09-27): between reactions Festa steps on the beat through these frames, one frame
   * per 1/stepsPerBeat of a beat. 01 is the base pose, 10 shifts her weight, 11 is the step. With
   * mirrorAlternate every other pass is mirrored, so she steps to both sides; the flip falls on 01, where she
   * stands centered on the mirror axis.
   */
  idleDance: { enabled: true, sequence: ["01", "10", "11", "10"] as FestaFrameId[], stepsPerBeat: 2, mirrorAlternate: true },
  split: { ka: 0.4, kb: 0.15, slack: 20, sigmaMin: 0.8, sigmaMax: 1.25, thetaMax: (50 * Math.PI) / 180 },
  frames: [
    { id: "01", durationMs: 0, reachWeight: 0, armOrder: "behind" },
    { id: "02", durationMs: 133, reachWeight: 1, armOrder: "front" },
    { id: "03", durationMs: 67, reachWeight: 1, armOrder: "front" },
    { id: "04", durationMs: 83, reachWeight: 0.9, armOrder: "front" },
    { id: "05", durationMs: 67, reachWeight: 0.5, armOrder: "front" },
    { id: "06", durationMs: 83, reachWeight: 0.2, armOrder: "front" },
    { id: "07", durationMs: 83, reachWeight: 0.1, armOrder: "behind" },
    { id: "08", durationMs: 83, reachWeight: 0.05, armOrder: "behind" },
    { id: "09", durationMs: 100, reachWeight: 0, armOrder: "behind" },
    { id: "10", durationMs: 117, reachWeight: 0, armOrder: "behind" },
    { id: "11", durationMs: 133, reachWeight: 0, armOrder: "behind" },
  ] as FestaFrameTiming[],
};
