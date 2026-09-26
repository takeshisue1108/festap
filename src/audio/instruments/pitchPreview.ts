import { midiToHz } from "../../core/theory";
import type { AudioEngine } from "../engine";

// Tonic bar feedback (plan §6.4): a continuous "otamatone" glide while dragging.
// Pitch values are semitones above C4; the glide target is a strategy so spec §5.5 can change later.

const BASE_MIDI = 60;
const GLIDE_TIME_CONSTANT = 0.012;

export class PitchPreview {
  private osc: OscillatorNode | null = null;
  private vibrato: OscillatorNode | null = null;
  private amp: GainNode | null = null;

  constructor(private readonly engine: AudioEngine) {}

  start(pitch: number): void {
    this.stopNow();
    const ctx = this.engine.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(midiToHz(BASE_MIDI + pitch), now);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 12; // cents
    vibrato.connect(vibratoDepth).connect(osc.detune);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 6;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(0.5, now + 0.02);
    osc.connect(filter).connect(amp).connect(this.engine.buses.preview);
    osc.start(now);
    vibrato.start(now);
    this.osc = osc;
    this.vibrato = vibrato;
    this.amp = amp;
  }

  /** Continuous pitch while dragging. */
  glide(pitch: number): void {
    if (!this.osc) return;
    this.osc.frequency.setTargetAtTime(midiToHz(BASE_MIDI + pitch), this.engine.now, GLIDE_TIME_CONSTANT);
  }

  /** Settle on the snapped pitch, then fade out. */
  release(snappedPitch: number): void {
    if (!this.osc || !this.amp) return;
    const now = this.engine.now;
    this.osc.frequency.setTargetAtTime(midiToHz(BASE_MIDI + snappedPitch), now, 0.03);
    this.amp.gain.setTargetAtTime(0, now + 0.18, 0.06);
    this.osc.stop(now + 0.6);
    this.vibrato?.stop(now + 0.6);
    this.osc = null;
    this.vibrato = null;
    this.amp = null;
  }

  stopNow(): void {
    try {
      this.osc?.stop();
      this.vibrato?.stop();
    } catch {
      // already stopped
    }
    this.amp?.disconnect();
    this.osc = null;
    this.vibrato = null;
    this.amp = null;
  }
}
