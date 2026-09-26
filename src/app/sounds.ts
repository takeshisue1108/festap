import { SampleDrumKit, SynthDrumKit } from "../audio/instruments/drumKit";
import type { DrumKit, Instrument } from "../audio/instruments/instrument";
import { synthGue, type OneShotSound } from "../audio/instruments/oneShot";
import { SampleBankInstrument } from "../audio/instruments/sampleBankInstrument";
import { BASS_SYNTH, LEAD_SYNTH, SynthInstrument } from "../audio/instruments/synthInstrument";
import { loadBuffer, loadBufferMap } from "../audio/loader";
import type { AudioEngine } from "../audio/engine";
import type { AssetPack } from "../packs/packManifest";

export interface Sounds {
  drums: DrumKit;
  bass: Instrument;
  gestures: Instrument;
  vivi: OneShotSound;
  clap: OneShotSound;
}

/** Everything synthesized: usable the instant the AudioContext exists. */
export function synthSounds(engine: AudioEngine): Sounds {
  const kit = new SynthDrumKit(engine);
  return {
    drums: kit,
    bass: new SynthInstrument(engine, "bass", BASS_SYNTH),
    gestures: new SynthInstrument(engine, "gestures", LEAD_SYNTH),
    vivi: synthGue,
    clap: (_e, when, bus) => kit.clap(when, 0.9, bus),
  };
}

/**
 * Plan §6.1: one-shots and drums first (they gate the start veil), pitched banks after.
 * `onUpgrade` receives each group as soon as it is decoded; until then the synth voice plays.
 */
export async function loadPackSounds(
  engine: AudioEngine,
  pack: AssetPack,
  onUpgrade: (partial: Partial<Sounds>) => void,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const ctx = engine.ctx;
  const total =
    Object.keys(pack.oneShots).length +
    Object.keys(pack.drums).length +
    Object.keys(pack.bass).length +
    Object.keys(pack.gestures).length;
  let done = 0;
  const tick = () => onProgress(total ? ++done / total : 1);
  if (!total) onProgress(1);

  const one = async (url: string | undefined) => {
    if (!url) return undefined;
    try {
      return await loadBuffer(ctx, url);
    } catch (e) {
      console.warn("festap: could not load", url, e);
      return undefined;
    } finally {
      tick();
    }
  };
  const [vivi, clap, drumMap] = await Promise.all([
    one(pack.oneShots.vivi),
    one(pack.oneShots.clap),
    loadBufferMap(ctx, pack.drums, tick),
  ]);
  const early: Partial<Sounds> = {};
  if (vivi) early.vivi = vivi;
  if (clap) early.clap = clap;
  if (drumMap.size) early.drums = new SampleDrumKit(engine, drumMap, new SynthDrumKit(engine));
  onUpgrade(early);

  const [bassMap, gestureMap] = await Promise.all([
    loadBufferMap(ctx, pack.bass, tick),
    loadBufferMap(ctx, pack.gestures, tick),
  ]);
  const late: Partial<Sounds> = {};
  if (bassMap.size) {
    late.bass = new SampleBankInstrument(engine, "bass", bassMap, { attack: 0.003, decay: 0.3, sustain: 0.8, release: 0.06 }, 0.9);
  }
  if (gestureMap.size) {
    late.gestures = new SampleBankInstrument(engine, "gestures", gestureMap, { attack: 0.003, decay: 0.3, sustain: 0.8, release: 0.1 }, 0.6);
  }
  onUpgrade(late);
}
