import { describe, expect, it } from "vitest";
import { calculateRhythmFromClaps } from "../../src/core/clap/calculateRhythmFromClaps";
import { IDLE, reduceClap, type ClapCaptureState, type ClapEvent } from "../../src/core/clap/clapCaptureMachine";

describe("calculateRhythmFromClaps (spec §6.5)", () => {
  it("reproduces the spec §6.6 example: 4 beats at 120 BPM", () => {
    expect(calculateRhythmFromClaps(0, 1.5, 2)).toEqual({
      meterBeats: 4,
      beatDurationSec: 0.5,
      bpm: 120,
      barDurationSec: 2,
    });
  });

  it("start + end only gives a 2-beat meter whose beat is the whole span", () => {
    const r = calculateRhythmFromClaps(10, 10.8, 0)!;
    expect(r.meterBeats).toBe(2);
    expect(r.beatDurationSec).toBeCloseTo(0.8);
    expect(r.bpm).toBeCloseTo(75);
  });

  it("matches the equivalent closed forms", () => {
    const r = calculateRhythmFromClaps(3, 7.3, 5)!;
    const N = 7;
    const T = 4.3;
    expect(r.bpm).toBeCloseTo((60 * (N - 1)) / T, 10);
    expect(r.barDurationSec).toBeCloseTo((T * N) / (N - 1), 10);
  });

  it("accepts huge meters (spec §7.2)", () => {
    expect(calculateRhythmFromClaps(0, 49.5, 98)!.meterBeats).toBe(100);
    expect(calculateRhythmFromClaps(0, 999.9, 9998)!.meterBeats).toBe(10000);
  });

  it.each([
    ["end before start", 5, 4, 2],
    ["zero span", 5, 5, 2],
    ["NaN time", NaN, 1, 2],
    ["infinite time", 0, Infinity, 2],
    ["too fast (beat < 30 ms)", 0, 0.001, 2],
    ["meter over the limit", 0, 1000, 20000],
  ])("rejects %s", (_name, start, end, count) => {
    expect(calculateRhythmFromClaps(start, end, count)).toBeNull();
  });

  it("allows very slow input", () => {
    expect(calculateRhythmFromClaps(0, 90, 0)!.bpm).toBeCloseTo(60 / 90);
  });
});

describe("clapCaptureMachine (spec §13)", () => {
  const run = (events: ClapEvent[]) => {
    let state: ClapCaptureState = IDLE;
    const effects = [];
    for (const e of events) {
      const t = reduceClap(state, e);
      state = t.state;
      effects.push(...t.effects);
    }
    return { state, effects };
  };

  it("idle + main clap starts capturing and claps", () => {
    const { state, effects } = run([{ type: "PRESS_MAIN_CLAP", time: 1 }]);
    expect(state).toEqual({ type: "capturing", startTime: 1, inputCount: 0 });
    expect(effects).toEqual([{ type: "PLAY_CLAP_NOW" }]);
  });

  it("taps anywhere while idle do nothing", () => {
    const { state, effects } = run([{ type: "PRESS_ANYWHERE", time: 1 }]);
    expect(state).toEqual(IDLE);
    expect(effects).toEqual([]);
  });

  it("full cycle commits N = inputs + 2 and claps on every press", () => {
    const { state, effects } = run([
      { type: "PRESS_MAIN_CLAP", time: 0 },
      { type: "PRESS_ANYWHERE", time: 0.5 },
      { type: "PRESS_ANYWHERE", time: 1.0 },
      { type: "PRESS_MAIN_CLAP", time: 1.5 },
    ]);
    expect(state).toEqual(IDLE);
    expect(effects.filter((e) => e.type === "PLAY_CLAP_NOW")).toHaveLength(4);
    const commit = effects.find((e) => e.type === "COMMIT_RHYTHM");
    expect(commit).toMatchObject({ result: { meterBeats: 4, bpm: 120 }, startTime: 0, endTime: 1.5 });
  });

  it("an invalid capture is rejected and returns to idle", () => {
    const { state, effects } = run([
      { type: "PRESS_MAIN_CLAP", time: 2 },
      { type: "PRESS_MAIN_CLAP", time: 2 },
    ]);
    expect(state).toEqual(IDLE);
    expect(effects.at(-1)).toEqual({ type: "REJECT_CAPTURE" });
  });

  it("ABORT drops a capture without committing", () => {
    const { state, effects } = run([
      { type: "PRESS_MAIN_CLAP", time: 0 },
      { type: "PRESS_ANYWHERE", time: 0.5 },
      { type: "ABORT" },
    ]);
    expect(state).toEqual(IDLE);
    expect(effects.some((e) => e.type === "COMMIT_RHYTHM")).toBe(false);
  });
});
