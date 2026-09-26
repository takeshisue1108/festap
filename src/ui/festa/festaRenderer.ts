import { FESTA } from "../../config/festa";
import type { FestaAssets, FestaImage } from "./festaAssets";
import { MASTER_H, MASTER_W, solveComposite, solveSplit, type Vec2 } from "./festaGeometry";
import type { FestaTimeline, MotionSample } from "./festaMotion";

/** The audible beat at a performance.now() time, or null when there is no music clock yet. */
export type BeatSource = (perfMs: number) => number | null;

/**
 * Draws Festa on a canvas that covers the app box, behind every control (spec §12.8).
 * The animation loop runs while a reaction plays or while she dances at rest, and it redraws only when
 * what is on screen changes (the dance changes frame a few times per beat).
 */
export class FestaRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
  private running = false;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private drawn = "";

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: FestaAssets,
    private readonly timeline: FestaTimeline,
    private readonly beatAt: BeatSource = () => null,
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize(cssW: number, cssH: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, FESTA.dprCap);
    this.cssW = cssW;
    this.cssH = cssH;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    if (!this.running) this.renderAt(performance.now());
  }

  kick(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  private loop = (now: number): void => {
    const s = this.renderAt(now);
    if (s.animating || s.dancing) requestAnimationFrame(this.loop);
    else this.running = false;
  };

  renderAt(now: number): MotionSample {
    const s = this.timeline.sample(now, this.beatAt(now), this.reduced?.matches ?? false);
    const key = `${s.frameIndex}|${s.side}|${s.target?.x},${s.target?.y}|${this.cssW}x${this.cssH}@${this.dpr}`;
    if (key === this.drawn) return s;
    this.drawn = key;
    const { ctx, assets } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.cssW || !this.cssH) return s;

    const scale = this.cssH / MASTER_H;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate((this.cssW - MASTER_W * scale) / 2, 0);
    ctx.scale(scale, scale);
    if (s.side === "mirrored") {
      ctx.translate(2 * assets.mirrorAxisX, 0);
      ctx.scale(-1, 1);
    }
    ctx.globalAlpha = s.animating ? FESTA.opacityReacting : FESTA.opacityIdle;
    ctx.imageSmoothingQuality = "high";

    const frame = assets.frames[s.frameIndex];
    const timing = FESTA.frames[s.frameIndex];
    const w = s.target ? timing.reachWeight : 0;
    const target = s.target ?? assets.fRef;

    if (assets.mode === "composite") {
      draw(ctx, frame.composite!, solveComposite(w, target, assets.fRef).offset);
      return s;
    }
    const pose = solveSplit(frame.anchors!, w, target, assets.fRef, FESTA.split);
    const drawArm = () => {
      ctx.save();
      ctx.translate(pose.arm.pivotTo.x, pose.arm.pivotTo.y);
      ctx.rotate(pose.arm.rotation);
      ctx.scale(pose.arm.scale, pose.arm.scale);
      ctx.translate(-pose.arm.pivotFrom.x, -pose.arm.pivotFrom.y);
      draw(ctx, frame.arm!, { x: 0, y: 0 });
      ctx.restore();
    };
    if (timing.armOrder === "behind") drawArm();
    draw(ctx, frame.body!, pose.bodyOffset);
    if (timing.armOrder === "front") drawArm();
    return s;
  }
}

function draw(ctx: CanvasRenderingContext2D, img: FestaImage, offset: Vec2): void {
  ctx.drawImage(img.bitmap, img.x + offset.x, img.y + offset.y, img.w, img.h);
}
