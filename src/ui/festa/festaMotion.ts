import type { FestaFrameId, FestaFrameTiming } from "../../config/festa";
import type { Side, Vec2 } from "./festaGeometry";

export interface MotionSample {
  /** Index into the frame list; 0 is frame 01. */
  frameIndex: number;
  /** Canonical target while reacting, null at rest. */
  target: Vec2 | null;
  side: Side;
  /** A reaction is playing. */
  animating: boolean;
  /** At rest, stepping on the beat (the idle dance). */
  dancing: boolean;
}

export interface IdleDance {
  enabled: boolean;
  sequence: FestaFrameId[];
  stepsPerBeat: number;
  /** Every other pass through the sequence is mirrored (owner, 2026-09-27). */
  mirrorAlternate?: boolean;
}

/**
 * Time-based playback (spec §12.3–12.4). Every poke restarts at frame 02, so the contact frame is always the
 * first frame drawn after a touch; a slow display only skips later frames. At rest Festa dances: the frame
 * follows the beat, so she steps in time with the music (owner, 2026-09-27).
 */
export class FestaTimeline {
  private start = 0;
  private seq: number[] = [];
  private target: Vec2 | null = null;
  private side: Side = "drawn";
  private readonly idleSeq: number[];

  constructor(
    private readonly frames: FestaFrameTiming[],
    private readonly reducedSequence: FestaFrameId[],
    private readonly idle: IdleDance = { enabled: false, sequence: [], stepsPerBeat: 1 },
  ) {
    this.idleSeq = idle.sequence.map((id) => frames.findIndex((f) => f.id === id)).filter((i) => i >= 0);
  }

  poke(at: number, target: Vec2, side: Side, reducedMotion = false): void {
    const ids = reducedMotion ? this.reducedSequence : this.frames.slice(1).map((f) => f.id);
    this.seq = ids.map((id) => this.frames.findIndex((f) => f.id === id));
    this.start = at;
    this.target = target;
    this.side = side;
  }

  /** `beat` is the audible beat as a float (null before audio starts). */
  sample(now: number, beat: number | null = null, reducedMotion = false): MotionSample {
    let t = Math.max(0, now - this.start);
    for (const i of this.seq) {
      if (t < this.frames[i].durationMs) return { frameIndex: i, target: this.target, side: this.side, animating: true, dancing: false };
      t -= this.frames[i].durationMs;
    }
    this.seq = [];
    const dancing = this.idle.enabled && !reducedMotion && beat !== null && this.idleSeq.length > 0;
    if (!dancing) return { frameIndex: 0, target: null, side: this.side, animating: false, dancing: false };
    const n = this.idleSeq.length;
    const cycle = this.idle.mirrorAlternate ? 2 * n : n;
    const k = ((Math.floor(beat * this.idle.stepsPerBeat) % cycle) + cycle) % cycle;
    const flip = k >= n;
    const side: Side = flip ? (this.side === "drawn" ? "mirrored" : "drawn") : this.side;
    return { frameIndex: this.idleSeq[k % n], target: null, side, animating: false, dancing: true };
  }
}
