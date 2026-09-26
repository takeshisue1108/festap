// Plan §10: an asset pack says which sounds the build uses. Anything a pack leaves out falls
// back to a synthesized voice, so a pack can be partial.

export interface AssetPack {
  id: "placeholder" | "trickcal";
  oneShots: { vivi?: string; clap?: string }; // URLs
  drums: Record<number, string>; // GM note -> URL
  bass: Record<number, string>; // MIDI note -> URL (sparse; others by playbackRate)
  gestures: Record<number, string>;
}

/** Build a pack from Vite glob results laid out as <kind>/<name>.<ext>. */
export function packFromFiles(id: AssetPack["id"], files: Record<string, string>): AssetPack {
  const pack: AssetPack = { id, oneShots: {}, drums: {}, bass: {}, gestures: {} };
  for (const [path, url] of Object.entries(files)) {
    const m = path.match(/([^/]+)\/([^/]+)\.[a-z0-9]+$/i);
    if (!m) continue;
    const [, kind, name] = m;
    if (kind === "oneshots" && (name === "vivi" || name === "clap")) pack.oneShots[name] = url;
    else if (kind === "drums" || kind === "bass" || kind === "gestures") {
      const n = parseInt(name, 10);
      if (Number.isFinite(n)) pack[kind][n] = url;
    }
  }
  return pack;
}
