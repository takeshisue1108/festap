// Festa canvas harness (implementation design §8.2): the real facade, timeline, and renderer, driven by
// synthetic frames. Each frame is a solid square at its drawn fingertip, in a color unique to the frame,
// so reading the canvas at the touch point tells which frame is drawn and whether it landed there.
import { FESTA } from "../src/config/festa";
import { store } from "../src/state/store";
import { festa } from "../src/ui/festa/festa";
import type { FestaAssets, FestaImage } from "../src/ui/festa/festaAssets";
import { FestaTimeline } from "../src/ui/festa/festaMotion";
import { FestaRenderer } from "../src/ui/festa/festaRenderer";

const fRef = { x: 970, y: 1089 };
const SIZE = 60; // master px

/** Frame i's marker color: red for the contact frame 02, other colors for the rest. */
export function markerColor(i: number): [number, number, number] {
  return i === 1 ? [255, 0, 0] : [0, 40 + i * 18, 255 - i * 18];
}

async function square(i: number): Promise<FestaImage> {
  const c = new OffscreenCanvas(SIZE, SIZE);
  const g = c.getContext("2d")!;
  const [r, gr, b] = markerColor(i);
  g.fillStyle = `rgb(${r},${gr},${b})`;
  g.fillRect(0, 0, SIZE, SIZE);
  return { bitmap: await createImageBitmap(c), x: fRef.x - SIZE / 2, y: fRef.y - SIZE / 2, w: SIZE, h: SIZE };
}

async function main(): Promise<void> {
  const frames = await Promise.all(FESTA.frames.map(async (_, i) => ({ anchors: null, composite: await square(i) })));
  const assets: FestaAssets = { mode: "composite", mirrorAxisX: 585, fRef, frames };
  const app = document.getElementById("app")!;
  const canvas = document.getElementById("festa") as HTMLCanvasElement;
  const timeline = new FestaTimeline(FESTA.frames, FESTA.reducedMotionSequence);
  const renderer = new FestaRenderer(canvas, assets, timeline);
  renderer.resize(app.clientWidth, app.clientHeight);
  festa.attach(app, assets, renderer, timeline);
  store.audioStarted = true;

  const w = window as unknown as Record<string, unknown>;
  w.festaLastPoke = null;
  w.festaControlHits = 0;
  app.addEventListener(
    "pointerdown",
    (e) => {
      w.festaLastPoke = e.timeStamp;
      festa.poke(e);
    },
    { capture: true },
  );
  document.getElementById("control")!.addEventListener("pointerdown", () => {
    w.festaControlHits = (w.festaControlHits as number) + 1;
  });
  /** Draw the moment `ms` after the last poke and return the canvas pixel under a client point. */
  w.festaPixelAt = (ms: number, clientX: number, clientY: number) => {
    const sample = renderer.renderAt((w.festaLastPoke as number) + ms);
    const rect = canvas.getBoundingClientRect();
    const px = Math.round(((clientX - rect.left) * canvas.width) / rect.width);
    const py = Math.round(((clientY - rect.top) * canvas.height) / rect.height);
    const d = canvas.getContext("2d")!.getImageData(px, py, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], alpha: d[3], frameIndex: sample.frameIndex, side: sample.side };
  };
  w.festaMarkerColor = markerColor;
  document.title = "ready";
}

void main();
