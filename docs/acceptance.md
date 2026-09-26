# Acceptance checklist (spec §16)

Legend: **auto** = covered by an automated test; **device** = still needs a check on a real iPhone.

## 16.1 Scale
- [x] Major / Minor can be switched — auto (`ui.spec` toggle test)
- [x] Minor turns the toggle purple — auto (computed colour `rgb(200,108,230)`)

## 16.2 Tonic
- [x] Dragging the green bar changes pitch continuously — auto for the UI (knob follows, label changes mid-drag); the glide sound itself — device
- [x] Release snaps to the nearest semitone — auto (`snapToSemitone` unit tests; knob lands exactly on E in `ui.spec`)
- [x] The snapped pitch becomes the tonic, mode is kept — auto

## 16.3 Clap capture
- [x] First big clap starts, taps anywhere add inputs with a clap sound, second big clap ends — auto (`ui.spec`, `clapCaptureMachine` tests)
- [x] Controls underneath do not fire during capture — auto (Drums Auto and the scale pill stay unchanged)
- [x] `N = input + 2`, `beat = T / (N − 1)`, BPM updated — auto (spec §6.6 example in unit tests)
- [x] 4 beats show big clap + 3 small — auto
- [x] 100+ beats do not crash; icons group (101 beats → four "25") — auto
- [x] Impossible input (beat < 30 ms, NaN, end ≤ start) keeps the old tempo, with a visible shake — auto

## 16.4 / 16.5 Drum and Bass
- [x] Manual tap plays a context-dependent sound — auto (rule unit tests; render test shows the onset)
- [x] Auto plays by itself — auto (render test)
- [x] Follows BPM / meter changes from the new bar 1, old-grid events cancelled — auto (render test, including an event already queued in the look-ahead)
- [x] Bass follows tonic / scale — auto (unit tests)

## 16.6 Instrumental gestures / quantized trigger
- [x] "Simple one beat" and "complex arpeggio" exist; the third gesture is a swappable registry entry — auto
- [x] An off-grid press does not sound at press time; it sounds on the next valid onset — auto (render test, ±1 sample)
- [x] Scheduling is on the audio clock — auto (render test reads onsets from rendered audio)
- [x] Manual drum / bass use the same path — auto
- [x] Visual press feedback is immediate — auto for the class; feel — device

## 17.1 Keyboard (settled 2026-09-18)
- [x] 8 white keys, ド … ド from the top — auto
- [x] A key sets the chord for the current tonic (C: ド → CM, レ → Dm); the chord follows a later tonic change — auto (unit + `ui.spec`)
- [x] Bass and gestures play the selected chord and stay in key — auto (unit)
- [x] Tonic bar pitches line up with the keys (C at the top key, E level with ミ, F# at its black key, octave C at the bottom key) — auto (`ui.spec`, ±1 px)

## 16.7 One-shots
- [x] Cucumber → 「キュウイ！」, Vivi → 「ぐえっ！」 — placeholder synth voices; Trickcal pack has 「ぐえっ」 candidate only (see plan §9)
- [x] Not quantized, immediate — by construction (`OneShotPlayer.play(now)`)
- [x] Spamming works (8-voice cap) — auto (no errors after 40 rapid taps)

## Device checks still open
- [ ] Tap-to-sound latency of one-shots and claps (240 fps video) — M2 gate
- [ ] How the quantization wait feels at 60 / 120 / 240 BPM
- [ ] Ring/silent switch, backgrounding mid-capture, resume
- [ ] Home Screen install, offline start, update badge (needs HTTPS: after GitHub Pages)
