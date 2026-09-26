import { MAX_BPM, MAX_METER, MIN_BPM, MIN_METER } from "../../config/limits";

export interface ClapCaptureResult {
  meterBeats: number;
  beatDurationSec: number;
  bpm: number;
  barDurationSec: number;
}

/**
 * Spec §6.5 (provisional formula, kept isolated so it can be swapped — spec §6.7).
 *   N = inputCount + 2, T = end - start, beat = T / (N - 1)
 * Returns null when the input cannot produce a finite rhythm within config/limits.ts.
 */
export function calculateRhythmFromClaps(
  startTime: number,
  endTime: number,
  inputCount: number,
): ClapCaptureResult | null {
  const T = endTime - startTime;
  const N = Math.floor(inputCount) + 2;
  if (!(T > 0) || !Number.isFinite(T)) return null;
  if (N < MIN_METER || N > MAX_METER) return null;

  const beatDurationSec = T / (N - 1);
  const bpm = 60 / beatDurationSec;
  const barDurationSec = beatDurationSec * N;
  if (![beatDurationSec, bpm, barDurationSec].every(Number.isFinite)) return null;
  if (bpm < MIN_BPM || bpm > MAX_BPM) return null;

  return { meterBeats: N, beatDurationSec, bpm, barDurationSec };
}
