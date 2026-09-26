import { defineConfig, devices } from "@playwright/test";

// Uses the locally installed Google Chrome (no browser download). Serves builds under /festap/,
// the same subpath as GitHub Pages, so base-path mistakes fail here (plan §8).
export default defineConfig({
  testDir: "tests/render",
  timeout: 60_000,
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    channel: "chrome",
    baseURL: "http://127.0.0.1:4179/festap/",
  },
  webServer: {
    command: "node tools/serve.mjs 4179",
    url: "http://127.0.0.1:4179/festap/",
    reuseExistingServer: false,
  },
});
