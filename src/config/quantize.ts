import { drumPatternGrid, type OnsetGridPolicy, type PerformanceKind } from "../core/onset/gridPolicies";

// One policy per intent kind. Owner's rule (2026-09-18): every quantized button waits for the next point
// where the drums would hit if they were playing. (adaptiveSubdivisionGrid, the plan's first idea, is
// still available but snapped to points where no drum plays, which did not sound right.)
const shared = drumPatternGrid();

export const onsetPolicies: Record<PerformanceKind, OnsetGridPolicy> = {
  instrumental_gesture: shared,
  drum: shared,
  bass: shared,
};

/** Never schedule closer to ctx.currentTime than this. */
export const MIN_LEAD_SEC = 0.005;

/** Look-ahead scheduler for the Auto parts (plan §6.3). */
export const SCHEDULER_INTERVAL_MS = 25;
export const SCHEDULER_LOOKAHEAD_SEC = 0.12;

/** Added to the audio time of a clap before anchoring a new tempo (plan §6.2). */
export const INPUT_LATENCY_COMPENSATION_SEC = 0;

/** Spec update 2026-09-26: hold a gesture pad this long to latch it into repeating every beat. */
export const GESTURE_HOLD_THRESHOLD_MS = 350;
