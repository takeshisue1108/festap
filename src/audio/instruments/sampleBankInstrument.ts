import { type AudioEngine, type BusName, Voice } from "../engine";
import { applyEnvelope, type Envelope, type Instrument } from "./instrument";

/**
 * Pitched bank with sparse samples (e.g. every 3 semitones); other keys are played from the
 * nearest sample by playbackRate (plan §9).
 */
export class SampleBankInstrument implements Instrument {
  private readonly keys: number[];

  constructor(
    private readonly engine: AudioEngine,
    private readonly bus: BusName,
    private readonly samples: Map<number, AudioBuffer>,
    private readonly env: Envelope,
    private readonly gain: number,
  ) {
    this.keys = [...samples.keys()].sort((a, b) => a - b);
  }

  play(midi: number, when: number, durSec: number, vel: number): Voice {
    const ctx = this.engine.ctx;
    let key = this.keys[0];
    for (const k of this.keys) if (Math.abs(k - midi) < Math.abs(key - midi)) key = k;
    const buffer = this.samples.get(key)!;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = Math.pow(2, (midi - key) / 12);
    const amp = ctx.createGain();
    const natural = buffer.duration / src.playbackRate.value;
    const stopAt = applyEnvelope(amp.gain, when, Math.min(durSec, natural), this.gain * vel, this.env);
    src.connect(amp).connect(this.engine.buses[this.bus]);
    src.start(when);
    src.stop(stopAt);
    return new Voice(when, amp, [src], [{ param: src.playbackRate, base: src.playbackRate.value }]);
  }
}
