import { autoDrumHits, autoDrumSubdivision } from "../generators/drum";
import { buildMusicalContext } from "../transport/context";
import type { SubdivisionFor, TempoMap, TempoSegment } from "../transport/tempoMap";

export type PerformanceKind = "instrumental_gesture" | "drum" | "bass";

export interface OnsetGridPolicy {
  id: string;
  /** Steps per beat for this segment; the grid is beat / subdivision. */
  subdivisionFor: SubdivisionFor;
  /** Smallest valid onset ≥ earliest. */
  next(earliest: number, map: TempoMap): number;
}

/**
 * Plan §6.3: grid = beat / s, with s the smallest of `subdivisions` such that beat / s ≤ maxWaitSec.
 * Keeps the worst-case wait short at every tempo while staying on a musical grid.
 */
export function adaptiveSubdivisionGrid(
  maxWaitSec = 0.15,
  subdivisions: readonly number[] = [1, 2, 4, 8],
): OnsetGridPolicy {
  const subdivisionFor = (seg: TempoSegment): number => {
    for (const s of subdivisions) if (seg.beatDur / s <= maxWaitSec) return s;
    return subdivisions[subdivisions.length - 1];
  };
  return {
    id: `adaptive(${maxWaitSec})`,
    subdivisionFor,
    next: (earliest, map) => map.nextGridTime(earliest, subdivisionFor),
  };
}

/** A fixed grid, e.g. fixedGrid(2) = eighth notes in x/4. */
export function fixedGrid(subdivision: number): OnsetGridPolicy {
  const subdivisionFor = () => subdivision;
  return {
    id: `fixed(${subdivision})`,
    subdivisionFor,
    next: (earliest, map) => map.nextGridTime(earliest, subdivisionFor),
  };
}

/**
 * Owner's rule (2026-09-18): a quantized button waits for the next moment at which the drums would
 * hit if they were playing — the Auto groove's hit points, whether or not Drums Auto is on.
 * Evaluates the real Auto drum rules, so a sparser groove later automatically means fewer onsets.
 */
export function drumPatternGrid(): OnsetGridPolicy {
  const subdivisionFor = autoDrumSubdivision;
  // Drum rules do not depend on the key; any key gives the same hit positions.
  const anyKey = { tonic: 0, scaleMode: "major" as const, chordDegree: 0 };
  const drumsWouldHit = (map: TempoMap, t: number) =>
    autoDrumHits(buildMusicalContext(map.stepAt(t, subdivisionFor), anyKey)).length > 0;
  return {
    id: "drum-pattern",
    subdivisionFor,
    next(earliest, map) {
      let g = map.nextGridTime(earliest, subdivisionFor);
      // Bounded: a groove that never hits must not hang the UI (4096 steps ≫ any bar we accept).
      for (let i = 0; i < 4096 && !drumsWouldHit(map, g); i++) g = map.gridTimeAfter(g, subdivisionFor);
      return g;
    },
  };
}
