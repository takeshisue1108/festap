// Plan §9: transcode vault sources into the Trickcal pack (src/assets/packs/trickcal/, gitignored).
// The CI runner cannot see the vault, so this runs locally; outputs are AAC in .m4a, mono, 48 kHz.
// Pitched banks keep every 3rd semitone of the range actually played; other keys use playbackRate.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const VAULT = process.env.FESTAP_VAULT ?? "/Users/user/Library/CloudStorage/GoogleDrive-takeshisue38920.27743@gmail.com/My Drive/vault";
const PYA = join(VAULT, "projects/pya-gakki");
const OUT = "src/assets/packs/trickcal";

// Every voice is VOICEVOX:No.7 (owner's decision, 2026-09-27); no game voices (vivi_drums, daya88, festa88, vie.mp3).
// The No.7 banks are built in pya-gakki from No.7's singing and speech (see banks/no7_88 and banks/no7_drums manifests).
// Publishing them requires the credit "VOICEVOX:No.7".
const SOURCES = {
  drums: join(PYA, "banks/no7_drums"),
  bass: { dir: join(PYA, "banks/no7_88"), from: 28, to: 52 },
  gestures: { dir: join(PYA, "banks/no7_88"), from: 48, to: 96 },
  oneshots: {
    vivi: join(PYA, "voice/no7_gue.wav"), // No.7 saying 「ぐえっ！」
    clap: join(PYA, "banks/no7_drums/039_clap.wav"),
  },
};

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

function toM4a(src, dst, { maxSec = 2.5 } = {}) {
  ffmpeg([
    "-i", src,
    "-af", "silenceremove=start_periods=1:start_threshold=-50dB",
    "-t", String(maxSec),
    "-ac", "1", "-ar", "48000", "-c:a", "aac", "-b:a", "96k",
    dst,
  ]);
}

function midiFiles(dir) {
  const map = new Map();
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(\d{3})_.*\.wav$/);
    if (m) map.set(Number(m[1]), join(dir, f));
  }
  return map;
}

function firstExisting(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of [".wav", ".mp3", ".m4a", ".aiff"]) if (existsSync(base + ext)) return base + ext;
  return null;
}

// Only this script's own folders: festa/ in the same pack belongs to tools/build-festa.mjs. art/ is from earlier runs.
for (const d of ["drums", "bass", "gestures", "oneshots", "art"]) rmSync(join(OUT, d), { recursive: true, force: true });
for (const d of ["drums", "bass", "gestures", "oneshots"]) mkdirSync(join(OUT, d), { recursive: true });

let count = 0;
for (const [note, src] of midiFiles(SOURCES.drums)) {
  toM4a(src, join(OUT, "drums", `${String(note).padStart(3, "0")}.m4a`), { maxSec: 1.5 });
  count++;
}
for (const kind of ["bass", "gestures"]) {
  const { dir, from, to } = SOURCES[kind];
  const files = midiFiles(dir);
  for (let n = from; n <= to; n += 3) {
    if (!files.has(n)) continue;
    toM4a(files.get(n), join(OUT, kind, `${String(n).padStart(3, "0")}.m4a`));
    count++;
  }
}
for (const [name, base] of Object.entries(SOURCES.oneshots)) {
  const src = firstExisting(base);
  if (!src) {
    console.warn(`build-assets: no source for one-shot "${name}" (${base}); the synth voice will be used`);
    continue;
  }
  toM4a(src, join(OUT, "oneshots", `${name}.m4a`), { maxSec: 1.5 });
  count++;
}

let bytes = 0;
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else bytes += statSync(p).size;
  }
})(OUT);
console.log(`build-assets: ${count} files, ${(bytes / 1024).toFixed(0)} KiB in ${OUT}`);
