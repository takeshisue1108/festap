// Plan §10: an asset pack says which sounds and art the build uses. Anything a pack leaves out
// falls back to a synthesized voice, so a pack can be partial (e.g. no "キュウイ！" clip yet).

export interface AssetPack {
  id: "placeholder" | "trickcal";
  oneShots: { kyui?: string; vivi?: string; clap?: string }; // URLs
  drums: Record<number, string>; // GM note -> URL
  bass: Record<number, string>; // MIDI note -> URL (sparse; others by playbackRate)
  gestures: Record<number, string>;
  art: { kyui?: string; vivi?: string };
}

/** Build a pack from Vite glob results laid out as <kind>/<name>.<ext>. */
export function packFromFiles(id: AssetPack["id"], files: Record<string, string>): AssetPack {
  const pack: AssetPack = { id, oneShots: {}, drums: {}, bass: {}, gestures: {}, art: {} };
  for (const [path, url] of Object.entries(files)) {
    const m = path.match(/([^/]+)\/([^/]+)\.[a-z0-9]+$/i);
    if (!m) continue;
    const [, kind, name] = m;
    if (kind === "oneshots" && (name === "kyui" || name === "vivi" || name === "clap")) pack.oneShots[name] = url;
    else if (kind === "art" && (name === "kyui" || name === "vivi")) pack.art[name] = url;
    else if (kind === "drums" || kind === "bass" || kind === "gestures") {
      const n = parseInt(name, 10);
      if (Number.isFinite(n)) pack[kind][n] = url;
    }
  }
  return pack;
}
