/// <reference types="vitest/config" />
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves the site from /<repo>/ (plan §3). Change here if the repo name changes.
const BASE = "/festap/";
const harness = !!process.env.FESTAP_HARNESS;
// The render-test harness is served next to the app, at /festap/harness/ (tools/serve.mjs).

export default defineConfig({
  base: harness ? `${BASE}harness/` : BASE,
  plugins: [
    vue(),
    !harness &&
      VitePWA({
        // Never reload mid-performance: a new version waits for a tap on the update badge
        // or the next cold start (plan §3).
        registerType: "prompt",
        injectRegister: false,
        includeAssets: ["icons/*.png", "icons/*.svg"],
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,webp,m4a,json}"],
          maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        },
        manifest: {
          name: "festap",
          short_name: "festap",
          description: "Portrait one-screen performance app",
          start_url: "./",
          scope: "./",
          display: "standalone",
          orientation: "portrait",
          background_color: "#121212",
          theme_color: "#121212",
          icons: [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
  ],
  build: {
    // Keep audio as real files (cacheable, not base64 in JS); let Vite decide for everything else.
    assetsInlineLimit: (file: string) => (file.endsWith(".m4a") ? false : undefined),
    ...(harness
      ? {
          rollupOptions: {
            input: {
              harness: resolve(import.meta.dirname, "harness/harness.html"),
              festa: resolve(import.meta.dirname, "harness/festa.html"),
            },
          },
        }
      : {}),
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
