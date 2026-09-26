import { describe, expect, it } from "vitest";
import { FESTA } from "../../src/config/festa";
import { packFromFiles } from "../../src/packs/packManifest";
import {
  canvasMap,
  chooseSide,
  clientToMaster,
  MASTER_H,
  MASTER_W,
  posedFingertip,
  sideForPoke,
  solveComposite,
  solveSplit,
  toCanonical,
  type FrameAnchors,
  type Vec2,
} from "../../src/ui/festa/festaGeometry";

const fRef: Vec2 = { x: 970, y: 1089 };
const contact: FrameAnchors = {
  fingertip: fRef,
  shoulder: { x: 650, y: 1211 },
  bodyAnchor: { x: 585, y: 1261 },
  headCenter: { x: 485, y: 1011 },
};

function grid(step = 50): Vec2[] {
  const out: Vec2[] = [];
  for (let y = 0; y <= MASTER_H; y += step) for (let x = 0; x <= MASTER_W; x += step) out.push({ x, y });
  out.push({ x: MASTER_W, y: MASTER_H }, { x: 0, y: MASTER_H }, { x: MASTER_W, y: 0 });
  return out;
}

describe("festa geometry: the contact rule (spec §12.7)", () => {
  it("composite mode puts the contact fingertip exactly on every touch point", () => {
    for (const t of grid()) {
      const p = posedFingertip(contact.fingertip, solveComposite(1, t, fRef));
      expect(Math.hypot(p.x - t.x, p.y - t.y)).toBeLessThan(1e-6);
    }
  });

  it("split mode puts the contact fingertip exactly on every touch point, even when a clamp bites", () => {
    for (const t of grid()) {
      const p = posedFingertip(contact.fingertip, solveSplit(contact, 1, t, fRef, FESTA.split));
      expect(Math.hypot(p.x - t.x, p.y - t.y)).toBeLessThan(1e-6);
    }
  });

  it("without a clamp the body follows kb·d and the shoulder's extra movement stays within the slack", () => {
    const t = { x: fRef.x + 40, y: fRef.y - 30 }; // small reach: no clamp
    const pose = solveSplit(contact, 1, t, fRef, FESTA.split);
    const d = { x: 40, y: -30 };
    expect(pose.bodyOffset.x).toBeCloseTo(FESTA.split.kb * d.x, 9);
    expect(pose.bodyOffset.y).toBeCloseTo(FESTA.split.kb * d.y, 9);
    const extra = { x: pose.arm.pivotTo.x - contact.shoulder.x - pose.bodyOffset.x, y: pose.arm.pivotTo.y - contact.shoulder.y - pose.bodyOffset.y };
    expect(Math.hypot(extra.x, extra.y)).toBeLessThanOrEqual(FESTA.split.slack + 1e-9);
  });

  it("reach weight 0 leaves the drawing where it is", () => {
    const { offset } = solveComposite(0, { x: 10, y: 2000 }, fRef);
    expect(offset.x).toBeCloseTo(0, 9);
    expect(offset.y).toBeCloseTo(0, 9);
    const pose = solveSplit(contact, 0, { x: 10, y: 2000 }, fRef, FESTA.split);
    expect(pose.bodyOffset.x).toBeCloseTo(0, 9);
    expect(pose.arm.rotation).toBeCloseTo(0, 9);
    expect(pose.arm.scale).toBeCloseTo(1, 9);
  });
});

describe("festa geometry: sides and mirroring (spec §12.5)", () => {
  it("mirroring twice is the identity", () => {
    const p = { x: 123, y: 456 };
    expect(toCanonical(toCanonical(p, "mirrored", 585), "mirrored", 585)).toEqual(p);
    expect(toCanonical(p, "drawn", 585)).toEqual(p);
  });

  it("alternates hands on consecutive presses, and goes back to the touch position once idle", () => {
    // while a reaction plays: the other hand, whatever the position
    expect(sideForPoke(1000, 585, 30, "drawn", true, true)).toBe("mirrored");
    expect(sideForPoke(1000, 585, 30, "mirrored", true, true)).toBe("drawn");
    expect(sideForPoke(100, 585, 30, "mirrored", true, true)).toBe("drawn");
    // from idle: by position
    expect(sideForPoke(1000, 585, 30, "mirrored", false, true)).toBe("drawn");
    expect(sideForPoke(100, 585, 30, "drawn", false, true)).toBe("mirrored");
    // alternation switched off: always by position
    expect(sideForPoke(1000, 585, 30, "drawn", true, false)).toBe("drawn");
  });

  it("keeps the previous side inside the dead zone", () => {
    expect(chooseSide(100, 585, 30, "drawn")).toBe("mirrored");
    expect(chooseSide(1000, 585, 30, "mirrored")).toBe("drawn");
    expect(chooseSide(570, 585, 30, "drawn")).toBe("drawn");
    expect(chooseSide(600, 585, 30, "mirrored")).toBe("mirrored");
  });
});

describe("festa geometry: screen ↔ master (spec §12.6)", () => {
  it("is exactly ×3 on the installed iPhone 13 (390×844)", () => {
    const m = canvasMap({ left: 0, top: 0, width: 390, height: 844 });
    expect(m.scale).toBeCloseTo(1 / 3, 12);
    expect(m.left).toBeCloseTo(0, 9);
    const p = clientToMaster(m, 195, 363);
    expect(p.x).toBeCloseTo(585, 9);
    expect(p.y).toBeCloseTo(1089, 9);
  });

  it("centers the canvas in the UI tests' app box (372×664) and on wider screens", () => {
    for (const box of [{ left: 9, top: 0, width: 372, height: 664 }, { left: 0, top: 0, width: 375, height: 667 }]) {
      const m = canvasMap(box);
      const canvasW = MASTER_W * m.scale;
      expect(m.left - box.left).toBeCloseTo((box.width - canvasW) / 2, 9);
      const center = clientToMaster(m, box.left + box.width / 2, box.top);
      expect(center.x).toBeCloseTo(MASTER_W / 2, 9);
    }
  });
});

describe("festa assets in a pack", () => {
  it("picks up festa-runtime.json and the frame images from the festa/ folder", () => {
    const pack = packFromFiles("trickcal", {
      "../assets/packs/trickcal/festa/festa-runtime.json": "/u/festa-runtime.json",
      "../assets/packs/trickcal/festa/02_composite.webp": "/u/02.webp",
      "../assets/packs/trickcal/oneshots/vivi.m4a": "/u/vivi.m4a",
    });
    expect(pack.festa).toEqual({ data: "/u/festa-runtime.json", images: { "02_composite": "/u/02.webp" } });
    expect(pack.oneShots.vivi).toBe("/u/vivi.m4a");
  });

  it("has no festa when the folder is empty", () => {
    expect(packFromFiles("trickcal", {}).festa).toBeUndefined();
  });
});
