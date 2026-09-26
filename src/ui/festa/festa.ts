import { FESTA } from "../../config/festa";
import { store } from "../../state/store";
import type { FestaAssets } from "./festaAssets";
import { canvasMap, clientToMaster, sideForPoke, toCanonical, type Side } from "./festaGeometry";
import type { FestaTimeline } from "./festaMotion";
import type { FestaRenderer } from "./festaRenderer";

/**
 * Entry point from App.vue's capture-phase pointerdown (spec §12.1–12.2). Festa is a picture only:
 * she never touches audio, and an error here never reaches the pointer handler.
 */
class Festa {
  private app: HTMLElement | null = null;
  private assets: FestaAssets | null = null;
  private renderer: FestaRenderer | null = null;
  private timeline: FestaTimeline | null = null;
  private side: Side = "drawn";

  attach(app: HTMLElement, assets: FestaAssets, renderer: FestaRenderer, timeline: FestaTimeline): void {
    Object.assign(this, { app, assets, renderer, timeline });
  }

  detach(): void {
    Object.assign(this, { app: null, assets: null, renderer: null, timeline: null });
  }

  poke(e: PointerEvent): void {
    try {
      const { app, assets, renderer, timeline } = this;
      if (!app || !assets || !renderer || !timeline || !FESTA.enabled || !store.audioStarted) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (store.clap.type === "capturing" && !FESTA.reactDuringClapCapture) return;
      const p = clientToMaster(canvasMap(app.getBoundingClientRect()), e.clientX, e.clientY);
      const reacting = timeline.sample(e.timeStamp).animating;
      this.side = sideForPoke(p.x, assets.mirrorAxisX, FESTA.deadZone, this.side, reacting, FESTA.alternateHands);
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      timeline.poke(e.timeStamp, toCanonical(p, this.side, assets.mirrorAxisX), this.side, reduced);
      renderer.kick();
    } catch (err) {
      console.warn("festap: Festa poke failed", err);
    }
  }
}

export const festa = new Festa();
