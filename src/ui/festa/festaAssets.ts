import { FESTA } from "../../config/festa";
import type { AssetPack } from "../../packs/packManifest";
import type { FrameAnchors, Vec2 } from "./festaGeometry";

/** An image and where it sits on the master canvas (master px). */
export interface FestaImage {
  bitmap: ImageBitmap;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FestaFrameAssets {
  anchors: FrameAnchors | null;
  composite?: FestaImage;
  body?: FestaImage;
  arm?: FestaImage;
}

export interface FestaAssets {
  mode: "composite" | "split";
  mirrorAxisX: number;
  fRef: Vec2;
  frames: FestaFrameAssets[];
}

interface RuntimeImage {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `festa-runtime.json`, written by tools/build-festa.mjs (implementation design §5.4). */
interface RuntimeData {
  version: number;
  mirrorAxisX: number;
  fRef: Vec2;
  frames: { id: string; anchors: FrameAnchors | null; images: { composite?: RuntimeImage; body?: RuntimeImage; arm?: RuntimeImage } }[];
}

async function bitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return createImageBitmap(await res.blob());
}

/** Decodes every frame up front, so a tap never waits for an image. Returns null when the pack has no Festa or anything fails. */
export async function loadFestaAssets(pack: AssetPack): Promise<FestaAssets | null> {
  if (!pack.festa) return null;
  const { data: dataUrl, images } = pack.festa;
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`${dataUrl}: HTTP ${res.status}`);
    const data = (await res.json()) as RuntimeData;
    const ids = data.frames.map((f) => f.id).join(",");
    const expected = FESTA.frames.map((f) => f.id).join(",");
    if (data.version !== 1 || ids !== expected) throw new Error(`festa-runtime.json frames ${ids}, expected ${expected}`);

    const load = async (img?: RuntimeImage): Promise<FestaImage | undefined> => {
      if (!img) return undefined;
      const url = images[img.file.replace(/\.[a-z0-9]+$/i, "")];
      if (!url) throw new Error(`missing image ${img.file}`);
      return { bitmap: await bitmap(url), x: img.x, y: img.y, w: img.w, h: img.h };
    };
    const frames = await Promise.all(
      data.frames.map(async (f) => ({
        anchors: f.anchors,
        composite: await load(f.images.composite),
        body: await load(f.images.body),
        arm: await load(f.images.arm),
      })),
    );
    const split = frames.every((f) => f.body && f.arm && f.anchors);
    if (!split && !frames.every((f) => f.composite)) throw new Error("frames have neither complete parts nor composites");
    return { mode: split ? "split" : "composite", mirrorAxisX: data.mirrorAxisX, fRef: data.fRef, frames };
  } catch (e) {
    console.warn("festap: Festa is off,", e);
    return null;
  }
}
