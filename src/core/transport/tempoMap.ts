// Piecewise-constant tempo on the audio clock. Each segment starts on bar 1, beat 1 of its own grid,
// so a tempo change is always a clean bar boundary (plan §6.5).

export interface TempoSegment {
  startTime: number; // audio-clock seconds
  beatDur: number; // seconds per beat
  meter: number; // beats per bar
  startBar: number; // global bar number at startTime
}

export interface TransportPosition {
  segmentIndex: number;
  segment: TempoSegment;
  beatFloat: number; // beats since segment start (can be fractional)
  beatIndex: number; // integer beat since segment start
  beatInBar: number; // 0 .. meter-1
  barIndex: number; // global bar number
  beatPhase: number; // 0 ≤ x < 1 within the beat
  barPhase: number; // 0 ≤ x < 1 within the bar
}

/** Position of a grid step: which subdivision of which beat. */
export interface GridStep extends TransportPosition {
  time: number;
  subdivision: number; // steps per beat
  stepInBeat: number; // 0 .. subdivision-1
}

export type SubdivisionFor = (segment: TempoSegment) => number;

// Tolerance in grid steps: a time within this of a grid point counts as on it.
const GRID_EPS = 1e-6;

export class TempoMap {
  private segs: TempoSegment[];

  constructor(initial: TempoSegment) {
    this.segs = [{ ...initial }];
  }

  get segments(): readonly TempoSegment[] {
    return this.segs;
  }

  /** Segment in force at time t (the first one for times before it starts). */
  segmentIndexAt(t: number): number {
    let i = 0;
    while (i + 1 < this.segs.length && this.segs[i + 1].startTime <= t) i++;
    return i;
  }

  segmentAt(t: number): TempoSegment {
    return this.segs[this.segmentIndexAt(t)];
  }

  nextSegmentStart(index: number): number {
    return index + 1 < this.segs.length ? this.segs[index + 1].startTime : Infinity;
  }

  positionAt(t: number): TransportPosition {
    const segmentIndex = this.segmentIndexAt(t);
    const segment = this.segs[segmentIndex];
    const beatFloat = (t - segment.startTime) / segment.beatDur;
    // Snap values a hair below an integer (float error) up to it.
    const beatIndex = Math.floor(beatFloat + GRID_EPS);
    const beatPhase = Math.max(0, beatFloat - beatIndex);
    const barOffset = Math.floor(beatIndex / segment.meter);
    const beatInBar = beatIndex - barOffset * segment.meter;
    return {
      segmentIndex,
      segment,
      beatFloat,
      beatIndex,
      beatInBar,
      barIndex: segment.startBar + barOffset,
      beatPhase,
      barPhase: (beatInBar + beatPhase) / segment.meter,
    };
  }

  /**
   * Smallest grid time ≥ t, where the grid of each segment is beat / subdivisionFor(segment).
   * A segment boundary is itself a grid point, so the grid never straddles a tempo change.
   */
  nextGridTime(t: number, subdivisionFor: SubdivisionFor): number {
    const i = this.segmentIndexAt(t);
    const seg = this.segs[i];
    const step = seg.beatDur / subdivisionFor(seg);
    const k = Math.ceil((t - seg.startTime) / step - GRID_EPS);
    const g = seg.startTime + k * step;
    const next = this.nextSegmentStart(i);
    return g >= next - GRID_EPS * step ? next : g;
  }

  /** Smallest grid time strictly after t (for walking the grid step by step). */
  gridTimeAfter(t: number, subdivisionFor: SubdivisionFor): number {
    const i = this.segmentIndexAt(t);
    const seg = this.segs[i];
    const step = seg.beatDur / subdivisionFor(seg);
    const k = Math.floor((t - seg.startTime) / step + GRID_EPS) + 1;
    const g = seg.startTime + k * step;
    const next = this.nextSegmentStart(i);
    return g >= next - GRID_EPS * step ? next : g;
  }

  /** Describe a time that lies on the grid of `subdivisionFor`. */
  stepAt(time: number, subdivisionFor: SubdivisionFor): GridStep {
    const pos = this.positionAt(time);
    const subdivision = subdivisionFor(pos.segment);
    const stepInBeat = Math.min(subdivision - 1, Math.floor(pos.beatPhase * subdivision + GRID_EPS));
    return { ...pos, time, subdivision, stepInBeat };
  }

  /**
   * Start a new tempo at `startTime` (bar 1, beat 1 of the new grid). Any segment that starts at or
   * after `startTime` is replaced. The new segment's bar number is rounded up to a multiple of 4 so the
   * 4-bar phrase logic (crash, fills) restarts cleanly with the new tempo.
   */
  commit(startTime: number, beatDur: number, meter: number): TempoSegment {
    this.segs = this.segs.filter((s, i) => i === 0 || s.startTime < startTime);
    const prev = this.positionAt(startTime);
    const startBar = Math.ceil((prev.barIndex + 1) / 4) * 4;
    const seg: TempoSegment = { startTime, beatDur, meter, startBar };
    if (this.segs.length === 1 && this.segs[0].startTime >= startTime) this.segs = [seg];
    else this.segs.push(seg);
    return seg;
  }

  /** Forget segments that ended before t (keeps the one in force at t). */
  prune(t: number): void {
    const i = this.segmentIndexAt(t);
    if (i > 0) this.segs = this.segs.slice(i);
  }
}
