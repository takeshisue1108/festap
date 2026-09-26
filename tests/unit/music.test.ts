import { describe, expect, it } from "vitest";
import { meterGrouping } from "../../src/core/display/meterGrouping";
import { autoBassNote, contextualBassNote } from "../../src/core/generators/bass";
import { autoDrumHits, contextualDrumHits, GM } from "../../src/core/generators/drum";
import { gesturePatterns } from "../../src/core/gestures/patterns";
import { chordName, diatonicHarmony, diatonicTriad } from "../../src/core/harmony/harmonyProvider";
import { keyName, snapToSemitone } from "../../src/core/theory";
import type { MusicalContext } from "../../src/core/transport/context";

function ctx(over: Partial<MusicalContext> = {}): MusicalContext {
  return {
    tonic: 4,
    scaleMode: "major",
    meterBeats: 4,
    bpm: 120,
    beatIndex: 0,
    beatPhase: 0,
    barPhase: 0,
    barIndex: 1,
    stepInBeat: 0,
    subdivision: 4,
    time: 0,
    beatDurationSec: 0.5,
    chordDegree: 0,
    ...over,
  };
}

describe("snapToSemitone (spec §5.3)", () => {
  it.each([
    [4.2, 4],
    [4.49, 4],
    [4.51, 5],
    [5.6, 6],
    [11.6, 0],
    [-0.4, 0],
    [-0.6, 11],
  ])("%d -> %d", (p, pc) => expect(snapToSemitone(p)).toBe(pc));

  it("keeps the mode when naming the key", () => {
    expect(keyName(4, "major")).toBe("E Major");
    expect(keyName(4, "minor")).toBe("E Minor");
  });
});

describe("meterGrouping (spec §7)", () => {
  it("4 beats = big + 3 small", () => {
    expect(meterGrouping(4).small).toEqual([
      { count: 1, labelled: false },
      { count: 1, labelled: false },
      { count: 1, labelled: false },
    ]);
  });

  it.each([
    [30, [10, 10, 9]],
    [101, [25, 25, 25, 25]],
    [10, [9]],
    [9, [8]],
  ])("%d beats -> %j", (meter, counts) => {
    expect(meterGrouping(meter).small.map((s) => s.count)).toEqual(counts);
  });

  it("stays readable and exact for every meter up to 10000", () => {
    for (let n = 2; n <= 10000; n++) {
      const g = meterGrouping(n);
      expect(g.small.length).toBeLessThanOrEqual(7);
      expect(g.small.reduce((a, s) => a + s.count, 0)).toBe(n - 1);
    }
  });
});

describe("drum rules (plan §6.7)", () => {
  it("downbeat -> kick, backbeat -> snare, offbeat -> hat", () => {
    expect(contextualDrumHits(ctx()).map((h) => h.note)).toContain(GM.kick);
    expect(contextualDrumHits(ctx({ beatIndex: 1 })).map((h) => h.note)).toEqual([GM.snare]);
    expect(contextualDrumHits(ctx({ beatIndex: 1, stepInBeat: 2 })).map((h) => h.note)).toEqual([GM.openHat]);
  });

  it("last beat of the bar -> tom fill (manual any bar, auto every 4th bar)", () => {
    expect(contextualDrumHits(ctx({ beatIndex: 3 }))[0].note).toBe(GM.hiTom);
    expect(autoDrumHits(ctx({ beatIndex: 3, barIndex: 3, subdivision: 2, stepInBeat: 1 }))[0].note).toBe(GM.lowMidTom);
    expect(autoDrumHits(ctx({ beatIndex: 3, barIndex: 2 })).map((h) => h.note)).toContain(GM.snare);
  });

  it("crash opens every 4-bar phrase in Auto", () => {
    expect(autoDrumHits(ctx({ barIndex: 8 })).map((h) => h.note)).toContain(GM.crash);
    expect(autoDrumHits(ctx({ barIndex: 9 })).map((h) => h.note)).not.toContain(GM.crash);
  });

  it("works for a 100-beat bar", () => {
    for (let b = 0; b < 100; b++) expect(autoDrumHits(ctx({ meterBeats: 100, beatIndex: b })).length).toBeGreaterThan(0);
  });
});

describe("bass rules (plan §6.8)", () => {
  const chordOf = (c: MusicalContext) => diatonicHarmony.chordAt(c);

  it("downbeat root follows the tonic (E -> 28, A -> 33)", () => {
    expect(contextualBassNote(ctx(), chordOf(ctx()), null).midi).toBe(28);
    const a = ctx({ tonic: 9 });
    expect(autoBassNote(a, chordOf(a))!.midi).toBe(33);
  });

  it("approach note before the downbeat: leading tone in major, subtonic in minor", () => {
    const major = ctx({ beatIndex: 3, stepInBeat: 2, beatPhase: 0.5, tonic: 0 });
    expect(autoBassNote(major, chordOf(major))!.midi).toBe(36 - 1);
    const minor = ctx({ beatIndex: 3, stepInBeat: 2, beatPhase: 0.5, tonic: 0, scaleMode: "minor" });
    expect(autoBassNote(minor, chordOf(minor))!.midi).toBe(36 - 2);
  });

  it("stays within the bass register", () => {
    for (let tonic = 0; tonic < 12; tonic++) {
      for (let beat = 0; beat < 7; beat++) {
        const c = ctx({ tonic, meterBeats: 7, beatIndex: beat, stepInBeat: 1, beatPhase: 0.25 });
        const n = contextualBassNote(c, chordOf(c), 40);
        expect(n.midi).toBeGreaterThanOrEqual(26);
        expect(n.midi).toBeLessThanOrEqual(52);
      }
    }
  });
});

describe("gesture patterns (spec §10.2)", () => {
  for (const pattern of Object.values(gesturePatterns)) {
    it(`${pattern.id} fits inside one beat and follows the key`, () => {
      for (const mode of ["major", "minor"] as const) {
        const c = ctx({ scaleMode: mode });
        const events = pattern.render(c, diatonicHarmony.chordAt(c), 1);
        expect(events.length).toBeGreaterThan(0);
        for (const e of events) {
          expect(e.offsetBeats).toBeGreaterThanOrEqual(0);
          expect(e.offsetBeats).toBeLessThan(1);
        }
      }
    });
  }

  it("the arpeggio has 8 notes and the simple gesture is the triad", () => {
    const c = ctx({ tonic: 0 });
    expect(gesturePatterns.complex_arpeggio.render(c, diatonicHarmony.chordAt(c), 1)).toHaveLength(8);
    const minor = ctx({ tonic: 0, scaleMode: "minor" });
    expect(gesturePatterns.simple_one_beat.render(minor, diatonicHarmony.chordAt(minor), 1).map((e) => e.midi)).toEqual([
      60, 63, 67,
    ]);
  });
});

describe("keyboard chords (spec §17.1, settled 2026-09-18)", () => {
  const names = (tonic: number, mode: "major" | "minor") =>
    Array.from({ length: 8 }, (_, key) => chordName(diatonicTriad(tonic, mode, key % 7)));

  it("tonic C major: ド→CM, レ→Dm … シ→Bdim, bottom ド→CM", () => {
    expect(names(0, "major")).toEqual(["CM", "Dm", "Em", "FM", "GM", "Am", "Bdim", "CM"]);
  });

  it("follows the tonic: in D major, レ is Em", () => {
    expect(chordName(diatonicTriad(2, "major", 1))).toBe("Em");
  });

  it("minor uses natural minor: A minor gives Am Bdim CM Dm Em FM GM", () => {
    expect(names(9, "minor").slice(0, 7)).toEqual(["Am", "Bdim", "CM", "Dm", "Em", "FM", "GM"]);
  });

  it("gestures and bass play the selected chord", () => {
    const dm = ctx({ tonic: 0, chordDegree: 1 });
    expect(gesturePatterns.simple_one_beat.render(dm, diatonicHarmony.chordAt(dm), 1).map((e) => e.midi)).toEqual([62, 65, 69]);
    expect(contextualBassNote(dm, diatonicHarmony.chordAt(dm), null).midi).toBe(38); // D on the downbeat
  });

  it("the bass approach note stays in key for a non-tonic chord (Dm in C: C, not C#)", () => {
    const c = ctx({ tonic: 0, chordDegree: 1, beatIndex: 3, stepInBeat: 2, beatPhase: 0.5 });
    expect(autoBassNote(c, diatonicHarmony.chordAt(c))!.midi).toBe(36);
  });

  it("every gesture note stays in the key for every chord", () => {
    for (const mode of ["major", "minor"] as const) {
      for (let degree = 0; degree < 7; degree++) {
        const c = ctx({ tonic: 7, scaleMode: mode, chordDegree: degree });
        const inKey = new Set(diatonicTriad(7, mode, 0) && [0, 1, 2, 3, 4, 5, 6].map((d) => diatonicTriad(7, mode, d).rootPc));
        for (const p of Object.values(gesturePatterns)) {
          for (const e of p.render(c, diatonicHarmony.chordAt(c), 1)) expect(inKey.has(e.midi % 12), `${p.id} ${mode} ${degree} ${e.midi}`).toBe(true);
        }
      }
    }
  });
});
