// Plan §6.2: inputs carry PointerEvent.timeStamp (performance.now() clock, ms, monotonic).
// This maps such a time onto the AudioContext clock — specifically onto the audio time that was
// *audible* at that moment, so a clap is anchored to what the user heard.

export interface Clock {
  /** Audio-clock seconds corresponding to a performance.now() time in ms. */
  perfToAudio(perfMs: number): number;
}

export class AudioClock implements Clock {
  constructor(private readonly ctx: AudioContext) {}

  perfToAudio(perfMs: number): number {
    const ts = typeof this.ctx.getOutputTimestamp === "function" ? this.ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime && ts.performanceTime) {
      return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    return this.ctx.currentTime + (perfMs - performance.now()) / 1000;
  }
}
