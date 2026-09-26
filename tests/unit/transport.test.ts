import { describe, expect, it } from "vitest";
import { adaptiveSubdivisionGrid, drumPatternGrid, fixedGrid } from "../../src/core/onset/gridPolicies";
import { resolveNextMusicalOnset } from "../../src/core/onset/resolveNextMusicalOnset";
import { beatGroups, beatRole } from "../../src/core/transport/context";
import { TempoMap } from "../../src/core/transport/tempoMap";

const map120 = () => new TempoMap({ startTime: 1, beatDur: 0.5, meter: 4, startBar: 0 });

describe("TempoMap", () => {
  it("reports bar and beat positions", () => {
    const p = map120().positionAt(1 + 0.5 * 5 + 0.25);
    expect(p).toMatchObject({ beatIndex: 5, beatInBar: 1, barIndex: 1, beatPhase: 0.5 });
    expect(p.barPhase).toBeCloseTo(1.5 / 4);
  });

  it("finds the next grid point, keeping exact hits", () => {
    const m = map120();
    const q = () => 4; // 16ths at 0.125 s
    expect(m.nextGridTime(1.0, q)).toBe(1.0);
    expect(m.nextGridTime(1.01, q)).toBeCloseTo(1.125);
    expect(m.nextGridTime(1.125, q)).toBeCloseTo(1.125);
    expect(m.nextGridTime(1.125 + 1e-12, q)).toBeCloseTo(1.125);
  });

  it("commits a new tempo on a phrase boundary and snaps the grid to it", () => {
    const m = map120();
    // old grid 16ths: 1.0, 1.125, ... ; new tempo starts off the old grid at 2.3
    const seg = m.commit(2.3, 0.4, 3);
    expect(seg.startBar % 4).toBe(0);
    expect(m.nextGridTime(2.26, () => 4)).toBeCloseTo(2.3); // old grid point 2.375 is past the switch
    expect(m.nextGridTime(2.31, () => 1)).toBeCloseTo(2.7);
    expect(m.positionAt(2.3)).toMatchObject({ beatInBar: 0, barIndex: seg.startBar });
    expect(m.positionAt(2.3 + 0.4 * 4)).toMatchObject({ beatInBar: 1, barIndex: seg.startBar + 1 });
  });

  it("a second commit replaces a pending one", () => {
    const m = map120();
    m.commit(5, 0.4, 3);
    m.commit(4, 0.3, 5);
    expect(m.segments.map((s) => s.startTime)).toEqual([1, 4]);
  });

  it("prune keeps the segment in force", () => {
    const m = map120();
    m.commit(5, 0.4, 3);
    m.prune(6);
    expect(m.segments).toHaveLength(1);
    expect(m.segments[0].startTime).toBe(5);
  });
});

describe("resolveNextMusicalOnset (spec §10.4–10.5)", () => {
  const policy = adaptiveSubdivisionGrid(0.15);

  it.each([20, 45, 60, 90, 120, 151, 200, 300, 600])(
    "at %d BPM the onset is in the future, on the grid, and within the worst-case wait",
    (bpm) => {
      const beatDur = 60 / bpm;
      const m = new TempoMap({ startTime: 0, beatDur, meter: 4, startBar: 0 });
      const s = policy.subdivisionFor(m.segments[0]);
      const step = beatDur / s;
      const maxWait = Math.max(0.15, beatDur / 8); // adaptive bound; ≥ beat/8 only below 50 BPM
      for (let i = 0; i < 200; i++) {
        const req = 3 + i * 0.0137;
        const onset = resolveNextMusicalOnset(
          { kind: "drum", requestedAtAudioTime: req },
          { tempoMap: m, audioNow: req - 0.001, minLeadSec: 0, policyFor: () => policy },
        );
        expect(onset).toBeGreaterThanOrEqual(req - 1e-9);
        expect(onset - req).toBeLessThanOrEqual(maxWait + 1e-9);
        const k = onset / step;
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
      }
    },
  );

  it("never schedules closer than minLead to audioNow", () => {
    const m = map120();
    const onset = resolveNextMusicalOnset(
      { kind: "bass", requestedAtAudioTime: 0.9 }, // in the audible past
      { tempoMap: m, audioNow: 1.124, minLeadSec: 0.005, policyFor: () => fixedGrid(4) },
    );
    expect(onset).toBeCloseTo(1.25);
  });

  it("uses the policy of the intent kind", () => {
    const m = map120();
    const onset = resolveNextMusicalOnset(
      { kind: "instrumental_gesture", requestedAtAudioTime: 1.01 },
      {
        tempoMap: m,
        audioNow: 1,
        minLeadSec: 0,
        policyFor: (k) => (k === "instrumental_gesture" ? fixedGrid(1) : fixedGrid(4)),
      },
    );
    expect(onset).toBeCloseTo(1.5);
  });
});

describe("beat grouping (plan §6.7)", () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [3]],
    [4, [2, 2]],
    [5, [2, 3]],
    [7, [2, 2, 3]],
    [100, Array(50).fill(2)],
  ])("meter %d -> %j", (meter, groups) => {
    expect(beatGroups(meter)).toEqual(groups);
  });

  it("beatRole agrees with beatGroups for every beat up to meter 60", () => {
    for (let meter = 1; meter <= 60; meter++) {
      const groups = beatGroups(meter);
      let beat = 0;
      groups.forEach((size, gi) => {
        for (let p = 0; p < size; p++, beat++) {
          expect(beatRole(beat, meter)).toMatchObject({ groupIndex: gi, posInGroup: p, groupSize: size });
        }
      });
    }
  });
});

describe("drumPatternGrid (owner's rule, 2026-09-18)", () => {
  const policy = drumPatternGrid();
  const at = (bpm: number, req: number) =>
    resolveNextMusicalOnset(
      { kind: "instrumental_gesture", requestedAtAudioTime: req },
      { tempoMap: new TempoMap({ startTime: 0, beatDur: 60 / bpm, meter: 4, startBar: 0 }), audioNow: 0, minLeadSec: 0, policyFor: () => policy },
    );

  it("waits for the next 8th at 120 BPM, keeping exact hits", () => {
    expect(at(120, 0.01)).toBeCloseTo(0.25);
    expect(at(120, 0.25)).toBeCloseTo(0.25);
    expect(at(120, 0.26)).toBeCloseTo(0.5);
  });

  it("uses 16ths when the beat is slow (≥ 0.6 s), like the Auto groove", () => {
    expect(at(90, 0.01)).toBeCloseTo(60 / 90 / 4);
  });

  it("never waits more than one Auto-groove step", () => {
    for (const bpm of [30, 60, 99, 100, 120, 200, 400]) {
      const beat = 60 / bpm;
      const step = beat / (beat >= 0.6 ? 4 : 2);
      for (let r = 0.001; r < 3; r += 0.0371) expect(at(bpm, r) - r).toBeLessThanOrEqual(step + 1e-9);
    }
  });
});
