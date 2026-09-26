// Festa tap frames → runtime assets in the Trickcal pack (implementation design §5.2).
// Local only: it reads the masters from the vault, which CI cannot see. Output is gitignored with the rest of the pack.
// Each frame is trimmed to the figure, scaled to RUNTIME_SCALE, and encoded as WebP with alpha by ffmpeg.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const VAULT = process.env.FESTAP_VAULT ?? "/Users/user/Library/CloudStorage/GoogleDrive-takeshisue38920.27743@gmail.com/My Drive/vault";
const SRC = join(VAULT, "projects/festap/アセット/festa_tap");
const OUT = "src/assets/packs/trickcal/festa";
const W = 1170;
const H = 2532;
const RUNTIME_SCALE = 2 / 3;
const MARGIN = 2;
const QUALITY = 82;
const FILE_LIMIT = 1024 * 1024;
const IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];

function fail(msg) {
  console.error(`build-festa: ${msg}`);
  process.exit(1);
}

function rgba(file) {
  const buf = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgba", "-"], {
    maxBuffer: W * H * 4 + 1024,
  });
  if (buf.length !== W * H * 4) fail(`${file} is not ${W}×${H}`);
  return buf;
}

/** Bounding box of pixels with alpha > 2, plus MARGIN, clamped to the canvas. */
function alphaBox(buf) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = 0; x < W; x++) {
      if (buf[row + x * 4 + 3] > 2) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - MARGIN);
  y0 = Math.max(0, y0 - MARGIN);
  x1 = Math.min(W - 1, x1 + MARGIN);
  y1 = Math.min(H - 1, y1 + MARGIN);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const tapPath = join(SRC, "festa-tap.json");
if (!existsSync(tapPath)) fail(`missing ${tapPath}`);
const tap = JSON.parse(readFileSync(tapPath, "utf8"));
if (tap.version !== 1) fail(`festa-tap.json version ${tap.version}, expected 1`);
if (tap.frames.map((f) => f.id).join() !== IDS.join()) fail(`frames ${tap.frames.map((f) => f.id)} expected ${IDS}`);
if (!tap.fRef) fail("fRef is not recorded");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const frames = [];
let total = 0;
for (const f of tap.frames) {
  const master = join(SRC, "master", f.master);
  if (!existsSync(master)) fail(`missing ${master}`);
  const box = alphaBox(rgba(master));
  if (!box) fail(`${f.master} is empty`);
  const file = `${f.id}_composite.webp`;
  const w = Math.round(box.w * RUNTIME_SCALE);
  const h = Math.round(box.h * RUNTIME_SCALE);
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", master,
    "-vf", `crop=${box.w}:${box.h}:${box.x}:${box.y},scale=${w}:${h}:flags=lanczos,format=yuva420p`,
    "-c:v", "libwebp", "-quality", String(QUALITY), "-lossless", "0",
    join(OUT, file),
  ]);
  const size = statSync(join(OUT, file)).size;
  if (size > FILE_LIMIT) fail(`${file} is ${(size / 1024).toFixed(0)} KiB (> 1 MiB)`);
  total += size;
  frames.push({ id: f.id, anchors: f.anchors ?? null, images: { composite: { file, ...box } } });
  console.log(`build-festa: ${file}  box ${box.x},${box.y} ${box.w}×${box.h}  → ${w}×${h}  ${(size / 1024).toFixed(0)} KiB`);
}

const runtime = { version: 1, canvas: { width: W, height: H }, runtimeScale: RUNTIME_SCALE, mirrorAxisX: tap.mirrorAxisX, fRef: tap.fRef, frames };
writeFileSync(join(OUT, "festa-runtime.json"), JSON.stringify(runtime, null, 2));
console.log(`build-festa: ${frames.length} frames, ${(total / 1024).toFixed(0)} KiB in ${OUT}`);
