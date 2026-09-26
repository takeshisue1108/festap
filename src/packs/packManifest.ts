// Plan §10: an asset pack says which sounds the build uses. Anything a pack leaves out falls
// back to a synthesized voice, so a pack can be partial.

export interface AssetPack {
  id: "placeholder" | "trickcal";
  oneShots: { vivi?: string; clap?: string }; // URLs
  drums: Record<number, string>; // GM note -> URL
  bass: Record<number, string>; // MIDI note -> URL (sparse; others by playbackRate)
  gestures: Record<number, string>;
  /** Festa tap frames (vault festa_tap spec §10): runtime data URL and image URLs by file stem. */
  festa?: { data: string; images: Record<string, string> };
  /** Credits the pack's sources require, shown on the start screen (e.g. "VOICEVOX:No.7"). */
  credits?: string[];
}

/** Build a pack from Vite glob results laid out as <kind>/<name>.<ext>. */
export function packFromFiles(id: AssetPack["id"], files: Record<string, string>): AssetPack {
  const pack: AssetPack = { id, oneShots: {}, drums: {}, bass: {}, gestures: {} };
  const festaImages: Record<string, string> = {};
  let festaData: string | undefined;
  for (const [path, url] of Object.entries(files)) {
    const m = path.match(/([^/]+)\/([^/]+)\.[a-z0-9]+$/i);
    if (!m) continue;
    const [, kind, name] = m;
    if (kind === "festa") {
      if (name === "festa-runtime") festaData = url;
      else festaImages[name] = url;
    } else if (kind === "oneshots" && (name === "vivi" || name === "clap")) pack.oneShots[name] = url;
    else if (kind === "drums" || kind === "bass" || kind === "gestures") {
      const n = parseInt(name, 10);
      if (Number.isFinite(n)) pack[kind][n] = url;
    }
  }
  if (festaData) pack.festa = { data: festaData, images: festaImages };
  return pack;
}
