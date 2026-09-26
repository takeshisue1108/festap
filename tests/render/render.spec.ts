import { expect, test, type Page } from "@playwright/test";

// Plan §8 render tests: the real Performer + scheduler rendered in an OfflineAudioContext.
// Onsets are read back from the audio, so a wrong start time or a failed cancel shows up as sound.

const SAMPLE = 1 / 48000;

async function render(
  page: Page,
  scenario: unknown,
): Promise<{ onsets: number[]; scheduled: Record<string, number>; drumTimes: number[] }> {
  await page.goto("harness/harness/harness.html");
  await page.waitForFunction(() => document.title === "ready");
  return page.evaluate((s) => (window as any).festapRender(s), scenario);
}

function expectOnGrid(times: number[], origin: number, step: number, tol = SAMPLE) {
  for (const t of times) {
    const k = Math.round((t - origin) / step);
    expect(Math.abs(origin + k * step - t), `onset ${t} on grid ${origin}+k*${step}`).toBeLessThanOrEqual(tol);
  }
}

test("off-grid drum taps wait for the next point where the drums would hit: 8ths at 120 BPM (spec §10.3–10.6)", async ({ page }) => {
  const requests = [0.61, 1.07, 1.52, 2.33, 3.0];
  const { onsets } = await render(page, {
    seconds: 4,
    bpm: 120,
    meter: 4,
    startTime: 0.5,
    actions: requests.map((r) => ({ at: r - 0.03, do: "drum", requestedAt: r })),
  });
  const expected = [0.75, 1.25, 1.75, 2.5, 3.0]; // 3.0 is exactly on the grid and keeps its time
  expect(onsets).toHaveLength(expected.length);
  onsets.forEach((t, i) => expect(Math.abs(t - expected[i])).toBeLessThanOrEqual(SAMPLE));
});

test("a gesture starts on the drum grid and all 8 arpeggio notes fall inside one beat", async ({ page }) => {
  // 90 BPM: beat 0.667 s ≥ 0.6 s, so the drum groove (and the onset grid) is in 16ths = beat/4.
  const beat = 60 / 90;
  const start = 0.2;
  const { onsets, scheduled } = await render(page, {
    seconds: 3,
    bpm: 90,
    meter: 4,
    startTime: start,
    actions: [{ at: 1.0, do: "gesture1", requestedAt: 1.03 }],
  });
  const onset = scheduled["gesture1@1.03"];
  expect(onset).toBeGreaterThanOrEqual(1.03);
  expect(onset - 1.03).toBeLessThanOrEqual(beat / 4);
  expectOnGrid([onset], start, beat / 4);
  expect(onsets).toHaveLength(8);
  onsets.forEach((t, i) => expect(Math.abs(t - (onset + (i * beat) / 8))).toBeLessThanOrEqual(SAMPLE));
  expect(onsets.at(-1)!).toBeLessThan(onset + beat);
});

test("Auto drums switch to the new tempo at the new bar 1 and drop old-grid events (spec §14.2)", async ({ page }) => {
  // Old: 100 BPM (beat 0.6, Auto grid = 16ths of 0.15 s) from 0.1.
  // At now=1.225 the scheduler has already queued the old-grid hit at 1.30 (look-ahead 120 ms).
  // The capture ends at 0.97 with a 0.3 s beat, so the new bar 1 is at 1.27 and 1.30 must be cancelled.
  const { onsets, scheduled } = await render(page, {
    seconds: 2.5,
    bpm: 100,
    meter: 4,
    startTime: 0.1,
    actions: [
      { at: 0, do: "drumAuto", on: true },
      { at: 1.21, do: "commit", beatDurationSec: 0.3, meterBeats: 3, endAudio: 0.97 },
    ],
  });
  expect(scheduled.commitStart).toBeCloseTo(1.27, 9);
  const before = onsets.filter((t) => t < 1.27 - SAMPLE);
  const after = onsets.filter((t) => t >= 1.27 - SAMPLE);
  expectOnGrid(before, 0.1, 0.15);
  expect(before.at(-1)!).toBeCloseTo(1.15, 4);
  expect(after[0]).toBeCloseTo(1.27, 4);
  expectOnGrid(after, 1.27, 0.15); // new beat 0.3 s → Auto grid of 8ths = 0.15 s
  expect(onsets.some((t) => Math.abs(t - 1.3) < 0.001)).toBe(false);
  // the new grid keeps going without gaps
  expect(after.length).toBe(Math.floor((2.5 - 1.27) / 0.15) + 1);
});

test("real synth voices start on the scheduled sample too", async ({ page }) => {
  const { onsets, scheduled } = await render(page, {
    seconds: 3,
    bpm: 120,
    meter: 4,
    startTime: 0.5,
    realSynth: true,
    threshold: 0.001,
    gapSec: 0.2,
    actions: [
      { at: 0.4, do: "drum", requestedAt: 0.51 }, // lands on the "and" of beat 1: an open hat
      { at: 1.4, do: "bass", requestedAt: 1.43 },
    ],
  });
  const expected = [scheduled["drum@0.51"], scheduled["bass@1.43"]];
  expect(expected).toEqual([0.75, 1.5]);
  expect(onsets.length).toBeGreaterThanOrEqual(2);
  expected.forEach((t, i) => expect(Math.abs(onsets[i] - t)).toBeLessThanOrEqual(0.001));
});

test("every button onset coincides with a hit of the Auto drums (owner's rule, 2026-09-18)", async ({ page }) => {
  // Auto drums on, gestures pressed at awkward times, across tempos and meters; each gesture must start
  // exactly when the drums play.
  for (const [bpm, meter] of [
    [120, 4],
    [90, 4],
    [150, 7],
    [61, 3],
  ]) {
    const presses = Array.from({ length: 12 }, (_, i) => 0.37 + i * 0.263);
    const { scheduled, drumTimes } = await render(page, {
      seconds: 4,
      bpm,
      meter,
      startTime: 0.1,
      actions: [
        { at: 0, do: "drumAuto", on: true },
        ...presses.map((r, i) => ({ at: r - 0.02, do: `gesture${i % 3}`, requestedAt: r })),
      ],
    });
    const onsets = Object.entries(scheduled).filter(([k]) => k.startsWith("gesture"));
    expect(onsets).toHaveLength(presses.length);
    for (const [k, t] of onsets) {
      expect(
        drumTimes.some((d) => Math.abs(d - t) < 1e-9),
        `${bpm} BPM ${meter}/x: ${k} -> ${t} is not a drum hit`,
      ).toBe(true);
    }
  }
});

test("after a clap capture, buttons follow the new drum grid from the new bar 1", async ({ page }) => {
  const { scheduled } = await render(page, {
    seconds: 3,
    bpm: 120,
    meter: 4,
    startTime: 0.1,
    actions: [
      { at: 0.5, do: "commit", beatDurationSec: 0.4, meterBeats: 3, endAudio: 0.6 }, // new bar 1 at 1.0
      { at: 1.1, do: "gesture0", requestedAt: 1.13 },
    ],
  });
  expect(scheduled.commitStart).toBeCloseTo(1.0, 9);
  expect(scheduled["gesture0@1.13"]).toBeCloseTo(1.2, 9); // new 8ths: 1.0, 1.2, …
});
