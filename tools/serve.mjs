// Tiny static server that mimics GitHub Pages: dist/ at /festap/, dist-harness/ at /festap/harness/.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.argv[2] ?? 4179);
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".m4a": "audio/mp4", ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let root = null;
  let rest = "";
  if (url.startsWith("/festap/harness/")) [root, rest] = ["dist-harness", url.slice("/festap/harness/".length)];
  else if (url.startsWith("/festap/")) [root, rest] = ["dist", url.slice("/festap/".length)];
  if (!root) return res.writeHead(404).end();
  let file = normalize(join(root, rest));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "max-age=600" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving on http://127.0.0.1:${port}/festap/`));
