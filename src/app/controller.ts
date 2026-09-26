import { AudioClock } from "../audio/clock";
import { AudioEngine } from "../audio/engine";
import type { GesturePadSlot } from "../config/gestureMapping";
import { INPUT_LATENCY_COMPENSATION_SEC, SCHEDULER_INTERVAL_MS } from "../config/quantize";
import { reduceClap, type ClapEvent } from "../core/clap/clapCaptureMachine";
import { snapToSemitone, type ScaleMode } from "../core/theory";
import { loadActivePack } from "../packs/activePack";
import { degreeOfKey, store } from "../state/store";
import { Performer } from "./performer";
import { loadPackSounds, synthSounds } from "./sounds";

/**
 * Glue between the view (pointer events, store) and the Performer (audio + music logic).
 * Every handler takes the PointerEvent so its timeStamp — not the handler's run time — is the request time.
 */
class Controller {
  private engine: AudioEngine | null = null;
  private performer: Performer | null = null;
  private clock: AudioClock | null = null;
  private starting: Promise<void> | null = null;
  /** Semitone position the tonic bar drag started from, so bendPitch gets a relative delta. */
  private tonicDragOrigin: number | null = null;

  /** First touch (plan §6.1). Safe to call repeatedly; later calls just resume a suspended context. */
  start(): Promise<void> {
    if (this.starting) return this.resume();
    this.starting = (async () => {
      const engine = AudioEngine.createLive();
      await engine.unlock();
      this.engine = engine;
      this.clock = new AudioClock(engine.ctx as AudioContext);
      const performer = new Performer(engine, synthSounds(engine), {
        startTime: engine.now + 0.05,
        bpm: store.bpm,
        meter: store.meterBeats,
      });
      this.performer = performer;
      this.syncKey();
      window.setInterval(() => performer.tick(), SCHEDULER_INTERVAL_MS);
      document.addEventListener("visibilitychange", this.onVisibility);
      store.audioStarted = true;

      const pack = await loadActivePack();
      await loadPackSounds(
        engine,
        pack,
        (partial) => (performer.sounds = { ...performer.sounds, ...partial }),
        (f) => (store.loadProgress = f),
      );
    })();
    return this.starting;
  }

  private async resume(): Promise<void> {
    const live = this.engine?.live;
    if (live && live.state !== "running") await live.resume();
  }

  private onVisibility = () => {
    if (!this.engine || !this.performer) return;
    if (document.hidden) {
      // Plan §6.5 / spec §14.1: backgrounding aborts a capture and silences what has not started.
      this.dispatchClap({ type: "ABORT" });
      this.performer.scheduler.cancelFuture(this.engine.now);
      void this.engine.live?.suspend();
    } else {
      void this.resume();
    }
  };

  private requestTime(e: PointerEvent): number {
    return this.clock ? this.clock.perfToAudio(e.timeStamp) : 0;
  }

  /**
   * The beat audible at a performance.now() time, as a float (0 = bar 1, beat 1 of the current tempo), or null
   * before audio starts. For visuals that follow the music, such as Festa's idle dance.
   */
  beatAt(perfMs: number): number | null {
    if (!this.performer || !this.clock) return null;
    return this.performer.tempoMap.positionAt(this.clock.perfToAudio(perfMs)).beatFloat;
  }

  /** Run fn when audio time t is (roughly) audible — for visual flashes only. */
  atAudioTime(t: number, fn: () => void): void {
    if (!this.engine) return;
    const latency = this.engine.live?.outputLatency ?? 0;
    window.setTimeout(fn, Math.max(0, (t - this.engine.now + latency) * 1000));
  }

  // ---- scale / tonic ----

  setScale(mode: ScaleMode): void {
    store.scaleMode = mode;
    this.syncKey();
  }

  tonicDragStart(pitch: number): void {
    store.tonicDragPitch = pitch;
    this.tonicDragOrigin = pitch;
  }

  /** Spec update 2026-09-26: no preview tone; slide whatever is already sounding instead. */
  tonicDragMove(pitch: number): void {
    store.tonicDragPitch = pitch;
    if (this.tonicDragOrigin !== null && this.performer && this.engine) {
      this.performer.bendPitch(pitch - this.tonicDragOrigin, this.engine.now);
    }
  }

  /** Spec §5.3–5.4: snap to the nearest semitone; that pitch class becomes the tonic. */
  tonicDragEnd(pitch: number): void {
    const pc = snapToSemitone(pitch);
    this.tonicDragOrigin = null;
    store.tonicDragPitch = null;
    store.tonicBarPitch = Math.min(12, Math.max(0, Math.round(pitch)));
    store.tonic = pc;
    this.syncKey();
  }

  /**
   * Keyboard (spec §17.1, settled 2026-09-18): the pressed key sets the current chord, a diatonic
   * triad on that scale degree of the current key. Takes effect at once; notes already scheduled keep theirs.
   */
  setChordKey(key: number): void {
    store.chordKey = key;
    this.syncKey();
  }

  private syncKey(): void {
    if (this.performer) {
      this.performer.key = { tonic: store.tonic, scaleMode: store.scaleMode, chordDegree: degreeOfKey(store.chordKey) };
    }
  }

  // ---- clap capture (spec §6, §13) ----

  mainClap(e: PointerEvent): void {
    this.dispatchClap({ type: "PRESS_MAIN_CLAP", time: e.timeStamp / 1000 });
  }

  anywhereClap(e: PointerEvent): void {
    this.dispatchClap({ type: "PRESS_ANYWHERE", time: e.timeStamp / 1000 });
  }

  private dispatchClap(event: ClapEvent): void {
    const { state, effects } = reduceClap(store.clap, event);
    store.clap = state;
    store.clapCaptureMode = state.type === "capturing";
    for (const fx of effects) {
      if (fx.type === "PLAY_CLAP_NOW") this.performer?.playClap();
      else if (fx.type === "REJECT_CAPTURE") store.captureRejectedAt = performance.now();
      else if (fx.type === "COMMIT_RHYTHM") {
        const r = fx.result;
        Object.assign(store, {
          meterBeats: r.meterBeats,
          beatDurationSec: r.beatDurationSec,
          bpm: r.bpm,
          barDurationSec: r.barDurationSec,
        });
        if (this.performer && this.clock) {
          const endAudio = this.clock.perfToAudio(fx.endTime * 1000) + INPUT_LATENCY_COMPENSATION_SEC;
          this.performer.commitRhythm(r, endAudio);
        }
      }
    }
  }

  // ---- quantized instruments (spec §10) ----

  drum(e: PointerEvent): number | null {
    return this.performer ? this.performer.triggerContextualDrum(this.requestTime(e)) : null;
  }

  bass(e: PointerEvent): number | null {
    return this.performer ? this.performer.triggerContextualBass(this.requestTime(e)) : null;
  }

  gesture(slot: GesturePadSlot, e: PointerEvent): number | null {
    return this.performer ? this.performer.triggerGesture(slot, this.requestTime(e)) : null;
  }

  setDrumAuto(on: boolean): void {
    store.drumAuto = on;
    this.performer?.setDrumAuto(on);
  }

  setBassAuto(on: boolean): void {
    store.bassAuto = on;
    this.performer?.setBassAuto(on);
  }

  /** Spec update 2026-09-26: long-press latches a gesture pad; tapping it again cuts it off. */
  setGestureHold(slot: GesturePadSlot, on: boolean): void {
    this.performer?.setGestureHold(slot, on);
  }

  // ---- one-shot (immediate) ----

  playVivi(): void {
    this.performer?.playVivi();
  }
}

export const controller = new Controller();
