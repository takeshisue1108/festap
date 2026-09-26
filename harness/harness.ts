// Render-test harness (plan §8): drives the real Performer against an OfflineAudioContext with
// impulse "click" instruments, then reads the onsets back out of the rendered audio.
import { Performer } from "../src/app/performer";
import type { Sounds } from "../src/app/sounds";
import { AudioEngine, Voice } from "../src/audio/engine";
import type { DrumKit, Instrument } from "../src/audio/instruments/instrument";
import { synthSounds } from "../src/app/sounds";

const SR = 48000;

function click(engine: AudioEngine, when: number): Voice {
  const ctx = engine.ctx;
  const buf = ctx.createBuffer(1, 1, SR);
  buf.getChannelData(0)[0] = 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  src.connect(g).connect(engine.buses.drums);
  src.start(when);
  return new Voice(when, g, [src]);
}

function clickSounds(engine: AudioEngine, drumTimes: number[]): Sounds {
  const kit: DrumKit = {
    hit: (_n, when) => {
      drumTimes.push(when);
      return click(engine, when);
    },
  };
  const inst: Instrument = { play: (_m, when) => click(engine, when) };
  return { ...synthSounds(engine), drums: kit, bass: inst, gestures: inst };
}

/** Sample times where the signal jumps above `threshold` after at least `gapSec` below it. */
function onsets(buf: AudioBuffer, threshold: number, gapSec: number): number[] {
  const d = buf.getChannelData(0);
  const gap = Math.round(gapSec * SR);
  const out: number[] = [];
  let quiet = gap;
  for (let i = 0; i < d.length; i++) {
    if (Math.abs(d[i]) > threshold) {
      if (quiet >= gap) out.push(i / SR);
      quiet = 0;
    } else quiet++;
  }
  return out;
}

interface Scenario {
  seconds: number;
  bpm: number;
  meter: number;
  startTime: number;
  realSynth?: boolean; // use the real synth voices instead of clicks
  actions: Array<
    | { at: number; do: "drum" | "bass" | "gesture0" | "gesture1" | "gesture2"; requestedAt: number }
    | { at: number; do: "drumAuto" | "bassAuto"; on: boolean }
    | { at: number; do: "commit"; beatDurationSec: number; meterBeats: number; endAudio: number }
  >;
  tickEvery?: number; // simulate the 25 ms scheduler timer until `seconds`
  threshold?: number;
  gapSec?: number;
}

async function run(s: Scenario) {
  const ctx = new OfflineAudioContext(1, Math.ceil(s.seconds * SR), SR);
  const engine = new AudioEngine(ctx, { limiter: false });
  let now = 0;
  const drumTimes: number[] = [];
  const performer = new Performer(
    engine,
    s.realSynth ? synthSounds(engine) : clickSounds(engine, drumTimes),
    { startTime: s.startTime, bpm: s.bpm, meter: s.meter },
    () => now,
  );
  const scheduled: Record<string, number> = {};
  const actions = [...s.actions].sort((a, b) => a.at - b.at);
  const step = s.tickEvery ?? 0.025;
  let ai = 0;
  for (now = 0; now < s.seconds; now += step) {
    while (ai < actions.length && actions[ai].at <= now) {
      const a = actions[ai++];
      if (a.do === "drum") scheduled[`drum@${a.requestedAt}`] = performer.triggerContextualDrum(a.requestedAt);
      else if (a.do === "bass") scheduled[`bass@${a.requestedAt}`] = performer.triggerContextualBass(a.requestedAt);
      else if (a.do.startsWith("gesture")) {
        const slot = Number(a.do.slice(-1)) as 0 | 1 | 2;
        scheduled[`${a.do}@${(a as { requestedAt: number }).requestedAt}`] = performer.triggerGesture(slot, (a as { requestedAt: number }).requestedAt);
      } else if (a.do === "drumAuto") performer.setDrumAuto(a.on);
      else if (a.do === "bassAuto") performer.setBassAuto(a.on);
      else if (a.do === "commit") {
        scheduled.commitStart = performer.commitRhythm(
          { beatDurationSec: a.beatDurationSec, meterBeats: a.meterBeats, bpm: 60 / a.beatDurationSec, barDurationSec: a.beatDurationSec * a.meterBeats },
          a.endAudio,
        );
      }
    }
    performer.tick();
  }
  const rendered = await ctx.startRendering();
  return { onsets: onsets(rendered, s.threshold ?? 0.3, s.gapSec ?? 0.0005), scheduled, drumTimes };
}

(window as unknown as { festapRender: typeof run }).festapRender = run;
document.title = "ready";
