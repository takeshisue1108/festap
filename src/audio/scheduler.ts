import type { GridStep, SubdivisionFor, TempoMap } from "../core/transport/tempoMap";
import type { Handle } from "./engine";

/** A part that plays by itself on a grid (Auto Drum, Auto Bass). */
export interface AutoPart {
  id: string;
  subdivisionFor: SubdivisionFor;
  render(step: GridStep): Handle[];
}

interface PartState {
  part: AutoPart;
  enabled: boolean;
  /** Last grid time already scheduled, or null to restart from `resumeFrom`. */
  last: number | null;
  resumeFrom: number;
}

interface Pending {
  handle: Handle;
  partId: string;
}

export interface SchedulerOptions {
  lookaheadSec: number;
  minLeadSec: number;
}

/**
 * Look-ahead scheduler for the Auto parts (plan §6.3, "a tale of two clocks").
 * tick(now) schedules every grid step in [now, now + lookahead] on the audio clock.
 * It never touches the DOM or timers itself, so tests can drive it with a fake clock.
 */
export class Scheduler {
  private parts = new Map<string, PartState>();
  private pending: Pending[] = [];

  constructor(
    private readonly tempoMap: () => TempoMap,
    private readonly opts: SchedulerOptions,
  ) {}

  addPart(part: AutoPart): void {
    this.parts.set(part.id, { part, enabled: false, last: null, resumeFrom: 0 });
  }

  isEnabled(id: string): boolean {
    return this.parts.get(id)?.enabled ?? false;
  }

  setEnabled(id: string, enabled: boolean, now: number): void {
    const s = this.parts.get(id);
    if (!s || s.enabled === enabled) return;
    s.enabled = enabled;
    s.last = null;
    s.resumeFrom = now + this.opts.minLeadSec;
    if (enabled) this.tick(now);
    else this.cancelWhere((p) => p.partId === id && p.handle.when > now);
  }

  tick(now: number): void {
    const map = this.tempoMap();
    const horizon = now + this.opts.lookaheadSec;
    for (const s of this.parts.values()) {
      if (!s.enabled) continue;
      const sub = s.part.subdivisionFor;
      let g =
        s.last === null
          ? map.nextGridTime(Math.max(s.resumeFrom, now + this.opts.minLeadSec), sub)
          : map.gridTimeAfter(s.last, sub);
      while (g < horizon) {
        for (const handle of s.part.render(map.stepAt(g, sub))) this.pending.push({ handle, partId: s.part.id });
        s.last = g;
        g = map.gridTimeAfter(g, sub);
      }
    }
    this.pending = this.pending.filter((p) => p.handle.when > now - 2);
  }

  /**
   * A new tempo starts at `startTime` (spec §14.2): drop Auto events already scheduled on the old
   * grid at or after it, and continue from the new bar 1.
   */
  onTempoCommit(startTime: number, now: number): void {
    const eps = 1e-6;
    this.cancelWhere((p) => p.handle.when >= startTime - eps);
    for (const s of this.parts.values()) {
      if (s.last !== null && s.last >= startTime - eps) {
        s.last = null;
        s.resumeFrom = startTime;
      }
    }
    this.tick(now);
  }

  /** Stop everything that has not started yet (backgrounding). */
  cancelFuture(now: number): void {
    this.cancelWhere((p) => p.handle.when > now);
    for (const s of this.parts.values()) {
      s.last = null;
      s.resumeFrom = now;
    }
  }

  private cancelWhere(pred: (p: Pending) => boolean): void {
    const keep: Pending[] = [];
    for (const p of this.pending) {
      if (pred(p)) p.handle.cancel();
      else keep.push(p);
    }
    this.pending = keep;
  }
}
