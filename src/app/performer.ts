import { combine, type AudioEngine, type Handle } from "../audio/engine";
import { OneShotPlayer } from "../audio/instruments/oneShot";
import { Scheduler } from "../audio/scheduler";
import { gestureMapping, GESTURE_POLYPHONY_PER_PAD, type GesturePadSlot } from "../config/gestureMapping";
import { MIN_LEAD_SEC, onsetPolicies, SCHEDULER_LOOKAHEAD_SEC } from "../config/quantize";
import type { ClapCaptureResult } from "../core/clap/calculateRhythmFromClaps";
import { autoBassNote, contextualBassNote } from "../core/generators/bass";
import { autoDrumHits, autoDrumSubdivision, contextualDrumHits } from "../core/generators/drum";
import { gesturePatterns } from "../core/gestures/patterns";
import { diatonicHarmony, type HarmonyProvider } from "../core/harmony/harmonyProvider";
import type { PerformanceKind } from "../core/onset/gridPolicies";
import { resolveNextMusicalOnset } from "../core/onset/resolveNextMusicalOnset";
import { buildMusicalContext, type KeyState, type MusicalContext } from "../core/transport/context";
import { TempoMap } from "../core/transport/tempoMap";
import type { Sounds } from "./sounds";

export const DRUM_PART = "drum";
export const BASS_PART = "bass";

// Auto bass grid: 8ths. (The Auto drum grid is autoDrumSubdivision, next to the drum rules.)
const autoBassSubdivision = () => 2;

/**
 * The musical heart, free of Vue and DOM: turns intents into scheduled sound (plan §1).
 * Manual intents: accept now → resolve the next musical onset → decide what to play there → schedule.
 */
export class Performer {
  readonly tempoMap: TempoMap;
  readonly scheduler: Scheduler;
  key: KeyState = { tonic: 0, scaleMode: "major", chordDegree: 0 };
  harmony: HarmonyProvider = diatonicHarmony;

  private lastBass: number | null = null;
  private gestureVoices = new Map<GesturePadSlot, Handle[]>();
  private readonly oneShots: OneShotPlayer;
  private readonly claps: OneShotPlayer;

  constructor(
    engine: AudioEngine,
    public sounds: Sounds,
    initial: { startTime: number; bpm: number; meter: number },
    /** Audio-clock "now"; render tests pass a simulated clock. */
    private readonly now: () => number = () => engine.now,
  ) {
    this.tempoMap = new TempoMap({ startTime: initial.startTime, beatDur: 60 / initial.bpm, meter: initial.meter, startBar: 0 });
    this.scheduler = new Scheduler(() => this.tempoMap, { lookaheadSec: SCHEDULER_LOOKAHEAD_SEC, minLeadSec: MIN_LEAD_SEC });
    this.oneShots = new OneShotPlayer(engine, "oneshots");
    this.claps = new OneShotPlayer(engine, "clap");

    this.scheduler.addPart({
      id: DRUM_PART,
      subdivisionFor: autoDrumSubdivision,
      render: (step) => {
        const ctx = buildMusicalContext(step, this.key);
        return autoDrumHits(ctx).map((h) => this.sounds.drums.hit(h.note, step.time, h.vel));
      },
    });
    this.scheduler.addPart({
      id: BASS_PART,
      subdivisionFor: autoBassSubdivision,
      render: (step) => {
        const ctx = buildMusicalContext(step, this.key);
        const note = autoBassNote(ctx, this.harmony.chordAt(ctx));
        if (!note) return [];
        this.lastBass = note.midi;
        return [this.sounds.bass.play(note.midi, step.time, note.durBeats * ctx.beatDurationSec, note.vel)];
      },
    });
  }

  /** Where a manual intent will sound, and the musical context there. */
  private resolve(kind: PerformanceKind, requestedAt: number): MusicalContext {
    const policy = onsetPolicies[kind];
    const onset = resolveNextMusicalOnset(
      { kind, requestedAtAudioTime: requestedAt },
      { tempoMap: this.tempoMap, audioNow: this.now(), minLeadSec: MIN_LEAD_SEC, policyFor: (k) => onsetPolicies[k] },
    );
    return buildMusicalContext(this.tempoMap.stepAt(onset, policy.subdivisionFor), this.key);
  }

  /** Spec §8.1 + §10.6. Returns the scheduled onset (audio time). */
  triggerContextualDrum(requestedAt: number): number {
    const ctx = this.resolve("drum", requestedAt);
    for (const h of contextualDrumHits(ctx)) this.sounds.drums.hit(h.note, ctx.time, h.vel);
    return ctx.time;
  }

  /** Spec §9.1 + §10.6. */
  triggerContextualBass(requestedAt: number): number {
    const ctx = this.resolve("bass", requestedAt);
    const note = contextualBassNote(ctx, this.harmony.chordAt(ctx), this.lastBass);
    this.lastBass = note.midi;
    this.sounds.bass.play(note.midi, ctx.time, note.durBeats * ctx.beatDurationSec, note.vel);
    return ctx.time;
  }

  /** Spec §10.2–10.3: one-beat gesture of the pad's pattern, starting on the next valid onset. */
  triggerGesture(slot: GesturePadSlot, requestedAt: number): number {
    const gesture = gestureMapping[slot];
    const ctx = this.resolve("instrumental_gesture", requestedAt);
    const events = gesturePatterns[gesture.pattern].render(ctx, this.harmony.chordAt(ctx), gesture.durationBeats);
    const beat = ctx.beatDurationSec;
    const handle = combine(
      ctx.time,
      events.map((e) => this.sounds.gestures.play(e.midi, ctx.time + e.offsetBeats * beat, e.durBeats * beat, e.vel)),
    );
    const live = (this.gestureVoices.get(slot) ?? []).filter((h) => h.when + beat * gesture.durationBeats > this.now());
    live.push(handle);
    while (live.length > GESTURE_POLYPHONY_PER_PAD) live.shift()!.cancel();
    this.gestureVoices.set(slot, live);
    return ctx.time;
  }

  /** Spec §10 one-shots: immediate, never quantized. */
  playOneShot(id: "kyui" | "vivi"): void {
    this.oneShots.play(this.sounds[id]);
  }

  /** Clap-capture feedback: immediate, never quantized (spec §10.7). */
  playClap(): void {
    this.claps.play(this.sounds.clap);
  }

  setDrumAuto(enabled: boolean): void {
    this.scheduler.setEnabled(DRUM_PART, enabled, this.now());
  }

  setBassAuto(enabled: boolean): void {
    this.scheduler.setEnabled(BASS_PART, enabled, this.now());
  }

  /**
   * Plan §6.5: the `end` clap is the last beat of the clapped bar, so the new tempo's bar 1 falls
   * one beat after it. Returns that start time.
   */
  commitRhythm(result: ClapCaptureResult, endAudioTime: number): number {
    const now = this.now();
    const startTime = Math.max(endAudioTime + result.beatDurationSec, now + MIN_LEAD_SEC);
    this.tempoMap.prune(now);
    this.tempoMap.commit(startTime, result.beatDurationSec, result.meterBeats);
    this.scheduler.onTempoCommit(startTime, now);
    return startTime;
  }

  tick(): void {
    this.scheduler.tick(this.now());
  }
}
