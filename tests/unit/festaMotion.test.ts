import { describe, expect, it } from "vitest";
import { FESTA } from "../../src/config/festa";
import { FestaTimeline } from "../../src/ui/festa/festaMotion";

const idOf = (i: number) => FESTA.frames[i].id;
const T = { x: 800, y: 900 };

function timeline() {
  return new FestaTimeline(FESTA.frames, FESTA.reducedMotionSequence);
}

describe("festa timeline (spec §7, §12.3–12.4, §12.9)", () => {
  it("is idle on frame 01 before any touch", () => {
    const s = timeline().sample(1000);
    expect(idOf(s.frameIndex)).toBe("01");
    expect(s.animating).toBe(false);
    expect(s.target).toBeNull();
  });

  it("shows the contact frame 02 first, at elapsed time 0", () => {
    const tl = timeline();
    tl.poke(1000, T, "drawn");
    const s = tl.sample(1000);
    expect(idOf(s.frameIndex)).toBe("02");
    expect(s.target).toEqual(T);
    expect(s.animating).toBe(true);
  });

  it("follows the cumulative durations and returns to idle after frame 11", () => {
    const tl = timeline();
    tl.poke(0, T, "mirrored");
    let t = 0;
    for (const f of FESTA.frames.slice(1)) {
      expect(idOf(tl.sample(t + 1).frameIndex)).toBe(f.id);
      expect(idOf(tl.sample(t + f.durationMs - 1).frameIndex)).toBe(f.id);
      t += f.durationMs;
    }
    expect(t).toBe(949);
    const end = tl.sample(t);
    expect(idOf(end.frameIndex)).toBe("01");
    expect(end.animating).toBe(false);
    expect(end.side).toBe("mirrored");
  });

  it("restarts at frame 02 with the new target and side, whatever frame is showing", () => {
    const tl = timeline();
    tl.poke(0, T, "drawn");
    for (const at of [50, 300, 700, 940]) {
      const target = { x: at, y: at };
      tl.poke(at, target, "mirrored");
      const s = tl.sample(at);
      expect(idOf(s.frameIndex)).toBe("02");
      expect(s.target).toEqual(target);
      expect(s.side).toBe("mirrored");
    }
  });

  it("at 8 taps per second every tap shows its own contact", () => {
    const tl = timeline();
    for (let i = 0; i < 16; i++) {
      const at = i * 125;
      const target = { x: 100 + i, y: 200 + i };
      tl.poke(at, target, "drawn");
      const s = tl.sample(at + 16); // the next display refresh
      expect(idOf(s.frameIndex)).toBe("02");
      expect(s.target).toEqual(target);
    }
  });

  describe("idle dance (owner, 2026-09-27)", () => {
    const dancer = () => new FestaTimeline(FESTA.frames, FESTA.reducedMotionSequence, FESTA.idleDance);
    const seq = FESTA.idleDance.sequence;
    const perStep = 1 / FESTA.idleDance.stepsPerBeat;

    it("steps through the dance frames on the beat, mirroring every other pass", () => {
      const tl = dancer();
      for (let k = 0; k < 20; k++) {
        const s = tl.sample(1000, k * perStep + 0.01);
        expect(s.dancing).toBe(true);
        expect(s.animating).toBe(false);
        expect(idOf(s.frameIndex)).toBe(seq[k % seq.length]);
        const mirroredPass = Math.floor(k / seq.length) % 2 === 1;
        expect(s.side, `step ${k}`).toBe(mirroredPass ? "mirrored" : "drawn");
      }
    });

    it("flips on frame 01, where she stands centered", () => {
      const tl = dancer();
      const flipStep = seq.length; // first step of the mirrored pass
      expect(idOf(tl.sample(0, flipStep * perStep + 0.01).frameIndex)).toBe("01");
    });

    it("works for beats before the downbeat too (negative beat positions)", () => {
      const s = dancer().sample(0, -perStep + 0.01);
      expect(idOf(s.frameIndex)).toBe(seq[seq.length - 1]);
    });

    it("a touch interrupts the dance with the contact frame, and the dance resumes after the reaction", () => {
      const tl = dancer();
      tl.poke(0, T, "drawn");
      const during = tl.sample(10, 3.02);
      expect(idOf(during.frameIndex)).toBe("02");
      expect(during.dancing).toBe(false);
      const after = tl.sample(2000, 3.02);
      expect(after.dancing).toBe(true);
      expect(idOf(after.frameIndex)).toBe(seq[Math.floor(3.02 * FESTA.idleDance.stepsPerBeat) % seq.length]);
    });

    it("holds frame 01 without a music clock or with reduced motion", () => {
      expect(idOf(dancer().sample(0, null).frameIndex)).toBe("01");
      const reduced = dancer().sample(0, 1.51, true);
      expect(idOf(reduced.frameIndex)).toBe("01");
      expect(reduced.dancing).toBe(false);
    });
  });

  it("with reduced motion plays 02 then 09, then idles", () => {
    const tl = timeline();
    tl.poke(0, T, "drawn", true);
    const d02 = FESTA.frames.find((f) => f.id === "02")!.durationMs;
    const d09 = FESTA.frames.find((f) => f.id === "09")!.durationMs;
    expect(idOf(tl.sample(1).frameIndex)).toBe("02");
    expect(idOf(tl.sample(d02 + 1).frameIndex)).toBe("09");
    expect(tl.sample(d02 + d09).animating).toBe(false);
  });
});
