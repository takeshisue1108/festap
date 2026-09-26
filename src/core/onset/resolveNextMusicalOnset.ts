import type { GesturePatternId } from "../gestures/patterns";
import type { TempoMap } from "../transport/tempoMap";
import type { OnsetGridPolicy, PerformanceKind } from "./gridPolicies";

/** Spec §10.5. */
export interface PerformanceIntent {
  kind: PerformanceKind;
  requestedAtAudioTime: number;
  gesturePattern?: GesturePatternId;
}

export interface OnsetContext {
  tempoMap: TempoMap;
  audioNow: number; // ctx.currentTime when resolving
  minLeadSec: number;
  policyFor: (kind: PerformanceKind) => OnsetGridPolicy;
}

/**
 * The nearest musically valid onset that is still in the future (spec §10.4).
 * A request exactly on a grid point keeps that point, as long as it can still be scheduled.
 */
export function resolveNextMusicalOnset(intent: PerformanceIntent, context: OnsetContext): number {
  const earliest = Math.max(intent.requestedAtAudioTime, context.audioNow + context.minLeadSec);
  return context.policyFor(intent.kind).next(earliest, context.tempoMap);
}
