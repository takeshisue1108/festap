// Build checks for GitHub Pages (plan §3, §9): no root-absolute URLs outside the base, and the size budget.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = process.argv[2] ?? "dist";
const BASE = "/festap/";
const BUDGET_TOTAL = 6 * 1024 * 1024;
const BUDGET_FILE = 1 * 1024 * 1024;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const problems = [];
let total = 0;
for (const f of files) {
  const size = statSync(f).size;
  total += size;
  if (size > BUDGET_FILE) problems.push(`${relative(DIST, f)} is ${(size / 1024).toFixed(0)} KiB (> 1 MiB)`);
  if (/\.(html|js|css|webmanifest|json)$/.test(f)) {
    const text = readFileSync(f, "utf8");
    // src="/x", href="/x", url(/x) that do not start with the base path
    for (const m of text.matchAll(/(?:src|href)=["'](\/[^"'/][^"']*)["']|url\((\/[^)/][^)]*)\)/g)) {
      const url = m[1] ?? m[2];
      if (!url.startsWith(BASE)) problems.push(`${relative(DIST, f)}: root-absolute URL ${url}`);
    }
  }
}
if (total > BUDGET_TOTAL) problems.push(`total ${(total / 1024 / 1024).toFixed(2)} MiB (> 6 MiB)`);

console.log(`check-dist: ${files.length} files, ${(total / 1024).toFixed(0)} KiB total`);
if (problems.length) {
  console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log("check-dist: OK");
