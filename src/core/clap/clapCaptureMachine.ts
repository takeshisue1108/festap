import { calculateRhythmFromClaps, type ClapCaptureResult } from "./calculateRhythmFromClaps";

// Spec §13. Times are seconds on one monotonic clock (the caller decides which).
export type ClapCaptureState =
  | { type: "idle" }
  | { type: "capturing"; startTime: number; inputCount: number };

export type ClapEvent =
  | { type: "PRESS_MAIN_CLAP"; time: number }
  | { type: "PRESS_ANYWHERE"; time: number }
  | { type: "ABORT" }; // backgrounding / audio interruption (plan §6.5)

export type ClapEffect =
  | { type: "PLAY_CLAP_NOW" }
  | { type: "COMMIT_RHYTHM"; result: ClapCaptureResult; startTime: number; endTime: number }
  | { type: "REJECT_CAPTURE" };

export interface ClapTransition {
  state: ClapCaptureState;
  effects: ClapEffect[];
}

export const IDLE: ClapCaptureState = { type: "idle" };

export function reduceClap(state: ClapCaptureState, event: ClapEvent): ClapTransition {
  if (event.type === "ABORT") return { state: IDLE, effects: [] };

  if (state.type === "idle") {
    if (event.type === "PRESS_MAIN_CLAP") {
      return {
        state: { type: "capturing", startTime: event.time, inputCount: 0 },
        effects: [{ type: "PLAY_CLAP_NOW" }],
      };
    }
    return { state, effects: [] };
  }

  if (event.type === "PRESS_ANYWHERE") {
    return {
      state: { ...state, inputCount: state.inputCount + 1 },
      effects: [{ type: "PLAY_CLAP_NOW" }],
    };
  }

  const result = calculateRhythmFromClaps(state.startTime, event.time, state.inputCount);
  return {
    state: IDLE,
    effects: [
      { type: "PLAY_CLAP_NOW" },
      result
        ? { type: "COMMIT_RHYTHM", result, startTime: state.startTime, endTime: event.time }
        : { type: "REJECT_CAPTURE" },
    ],
  };
}
