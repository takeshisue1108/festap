import type { ScaleMode } from "../theory";
import type { GridStep } from "./tempoMap";

/** Spec §8.3, extended with the grid step the event lands on. */
export interface MusicalContext {
  tonic: number;
  scaleMode: ScaleMode;
  meterBeats: number;
  bpm: number;
  beatIndex: number; // beat within the bar (spec: "current beat position")
  beatPhase: number;
  barPhase: number;
  // extensions
  barIndex: number;
  stepInBeat: number;
  subdivision: number;
  time: number; // audio-clock onset time
  beatDurationSec: number;
  chordDegree: number; // current chord as a scale degree (0 = tonic), set by the keyboard
}

export interface KeyState {
  tonic: number;
  scaleMode: ScaleMode;
  chordDegree: number;
}

export function buildMusicalContext(step: GridStep, key: KeyState): MusicalContext {
  return {
    tonic: key.tonic,
    scaleMode: key.scaleMode,
    meterBeats: step.segment.meter,
    bpm: 60 / step.segment.beatDur,
    beatIndex: step.beatInBar,
    beatPhase: step.beatPhase,
    barPhase: step.barPhase,
    barIndex: step.barIndex,
    stepInBeat: step.stepInBeat,
    subdivision: step.subdivision,
    time: step.time,
    beatDurationSec: step.segment.beatDur,
    chordDegree: key.chordDegree,
  };
}

/**
 * Split any meter into groups of 2 and 3 beats (plan §6.7): 4 = 2+2, 5 = 2+3, 7 = 2+2+3, 100 = 2×50.
 * This is what lets 7, 30 or 100 beats sound sensible without special cases.
 */
export function beatGroups(meter: number): number[] {
  if (meter <= 3) return [meter];
  const groups: number[] = [];
  let left = meter;
  while (left > 0) {
    if (left === 3) {
      groups.push(3);
      left = 0;
    } else {
      groups.push(2);
      left -= 2;
    }
  }
  return groups;
}

export interface BeatRole {
  groupIndex: number;
  posInGroup: number; // 0 = group start
  groupSize: number;
  isDownbeat: boolean;
  isLastBeat: boolean;
}

export function beatRole(beatInBar: number, meter: number): BeatRole {
  // Groups are 2s with at most one trailing 3, so this is O(1) instead of walking beatGroups().
  const groupsOf2 = meter % 2 === 1 && meter > 3 ? (meter - 3) / 2 : Math.floor(meter / 2);
  let groupIndex: number;
  let posInGroup: number;
  let groupSize: number;
  if (meter <= 3) {
    groupIndex = 0;
    posInGroup = beatInBar;
    groupSize = meter;
  } else if (beatInBar < groupsOf2 * 2) {
    groupIndex = Math.floor(beatInBar / 2);
    posInGroup = beatInBar % 2;
    groupSize = 2;
  } else {
    groupIndex = groupsOf2;
    posInGroup = beatInBar - groupsOf2 * 2;
    groupSize = 3;
  }
  return {
    groupIndex,
    posInGroup,
    groupSize,
    isDownbeat: beatInBar === 0,
    isLastBeat: beatInBar === meter - 1,
  };
}
