// Pure geometry for Festa (spec §12.5–12.7). All points are in master-canvas pixels unless noted.

export interface Vec2 {
  x: number;
  y: number;
}
export type Side = "drawn" | "mirrored";

export interface FrameAnchors {
  fingertip: Vec2;
  shoulder: Vec2;
  bodyAnchor: Vec2;
  headCenter: Vec2;
}

export const MASTER_W = 1170;
export const MASTER_H = 2532;

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
const len = (a: Vec2): number => Math.hypot(a.x, a.y);
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const rotate = (a: Vec2, t: number): Vec2 => ({ x: a.x * Math.cos(t) - a.y * Math.sin(t), y: a.x * Math.sin(t) + a.y * Math.cos(t) });
const limit = (a: Vec2, r: number): Vec2 => {
  const l = len(a);
  return l > r ? mul(a, r / l) : a;
};
const wrapAngle = (t: number): number => {
  let w = t % (2 * Math.PI);
  if (w <= -Math.PI) w += 2 * Math.PI;
  if (w > Math.PI) w -= 2 * Math.PI;
  return w;
};

/** Screen ↔ master mapping for an app box: scaled to its height, centered horizontally (spec §12.6). */
export interface CanvasMap {
  /** CSS px per master px. */
  scale: number;
  /** Client coordinates of master (0, 0). */
  left: number;
  top: number;
}

export function canvasMap(app: { left: number; top: number; width: number; height: number }): CanvasMap {
  const scale = app.height / MASTER_H;
  return { scale, left: app.left + (app.width - MASTER_W * scale) / 2, top: app.top };
}

export function clientToMaster(m: CanvasMap, clientX: number, clientY: number): Vec2 {
  return { x: (clientX - m.left) / m.scale, y: (clientY - m.top) / m.scale };
}

export function chooseSide(x: number, axisX: number, deadZone: number, previous: Side): Side {
  if (x < axisX - deadZone) return "mirrored";
  if (x > axisX + deadZone) return "drawn";
  return previous;
}

/**
 * Side for a new touch (spec §12.5): from idle, by the touch position; while a reaction is still playing,
 * the other hand, so consecutive presses alternate left and right (owner, 2026-09-27).
 */
export function sideForPoke(x: number, axisX: number, deadZone: number, previous: Side, reacting: boolean, alternate: boolean): Side {
  if (reacting && alternate) return previous === "drawn" ? "mirrored" : "drawn";
  return chooseSide(x, axisX, deadZone, previous);
}

export function toCanonical(p: Vec2, side: Side, axisX: number): Vec2 {
  return side === "mirrored" ? { x: 2 * axisX - p.x, y: p.y } : p;
}

export interface CompositePose {
  kind: "composite";
  offset: Vec2;
}

export interface SplitPose {
  kind: "split";
  bodyOffset: Vec2;
  arm: { pivotFrom: Vec2; pivotTo: Vec2; rotation: number; scale: number };
}

export interface SplitParams {
  ka: number;
  kb: number;
  slack: number;
  sigmaMin: number;
  sigmaMax: number;
  thetaMax: number;
}

/** Spec §12.7.1: the whole frame moves by w·d. In the contact frame the drawn fingertip is fRef, so it lands on the target. */
export function solveComposite(w: number, target: Vec2, fRef: Vec2): CompositePose {
  return { kind: "composite", offset: mul(sub(target, fRef), w) };
}

/** Spec §12.7.2, steps 1–6. Any clamp is absorbed by moving the whole figure, so the fingertip still lands on F + w·d. */
export function solveSplit(a: FrameAnchors, w: number, target: Vec2, fRef: Vec2, p: SplitParams): SplitPose {
  const d = sub(target, fRef);
  let b = mul(d, p.kb * w);
  let sStar = add(add(a.shoulder, b), limit(mul(d, (p.ka - p.kb) * w), p.slack));
  const fStar = add(a.fingertip, mul(d, w));
  const v = sub(a.fingertip, a.shoulder);
  const vStar = sub(fStar, sStar);
  const scale = clamp(len(vStar) / len(v), p.sigmaMin, p.sigmaMax);
  const rotation = clamp(wrapAngle(Math.atan2(vStar.y, vStar.x) - Math.atan2(v.y, v.x)), -p.thetaMax, p.thetaMax);
  const r = sub(fStar, add(sStar, mul(rotate(v, rotation), scale)));
  b = add(b, r);
  sStar = add(sStar, r);
  return { kind: "split", bodyOffset: b, arm: { pivotFrom: a.shoulder, pivotTo: sStar, rotation, scale } };
}

/** Where the drawn fingertip ends up under a pose. */
export function posedFingertip(fingertip: Vec2, pose: CompositePose | SplitPose): Vec2 {
  if (pose.kind === "composite") return add(fingertip, pose.offset);
  const { pivotFrom, pivotTo, rotation, scale } = pose.arm;
  return add(pivotTo, mul(rotate(sub(fingertip, pivotFrom), rotation), scale));
}
