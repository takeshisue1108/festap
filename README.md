# festap

Portrait one-screen performance app, delivered as a static site (GitHub Pages, not yet pushed).

- Spec: `vault/projects/festap/やりたいこと/music_app_requirements_v2.md`
- Plan: `vault/projects/festap/implementation_plan.md`
- The concept sketch `festap.png` is a layout reference only; nothing from it ships.

## Commands

| | |
|---|---|
| `npm run dev` | Dev server on the LAN (`http://<mac-ip>:5173/festap/`), placeholder sounds |
| `npm run dev:trickcal` | Same, with the Trickcal pack (run `npm run assets` first) |
| `npm run assets` | Transcode vault sources into `src/assets/packs/trickcal/` (gitignored) |
| `npm test` | Unit tests for `src/core` (Vitest) |
| `npm run test:render` | Build app + harness, then Playwright in local Chrome: render tests (onsets read from an `OfflineAudioContext`) and UI smoke tests at iPhone size under `/festap/` |
| `npm run build` | Production build, placeholder pack, then `tools/check-dist.mjs` (base path + size budget) |
| `npm run build:trickcal` | Production build with the Trickcal pack (do not publish until plan §10 is decided) |

The dev server is plain HTTP, so there is no service worker there and the iOS silent-switch override
(`navigator.audioSession`) may not apply; use the ring switch "on" when testing on the phone.

## Layout

```text
src/core      pure music logic (no DOM, no Web Audio): clap → rhythm, tempo map, onset resolver,
              gesture patterns, drum / bass rules, meter icon grouping
src/audio     Web Audio only: engine, scheduler, instruments, loader, clock
src/app       Performer (intents → scheduled sound) and the UI controller
src/ui        Vue components after the sketch's layout
src/config    swappable choices: grid policy, gesture ↔ pad mapping, limits
src/packs     asset packs: placeholder (all synth) / trickcal (built by `npm run assets`)
harness/      OfflineAudioContext harness used by tests/render
```

## Status against the spec (§16)

See `docs/acceptance.md`. Everything is implemented and checked locally in desktop Chrome at phone size.
**Not yet checked on a real iPhone** (latency, silent switch, backgrounding, Home Screen install).
