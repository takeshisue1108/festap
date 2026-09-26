import { beatRole, type MusicalContext } from "../transport/context";
import type { TempoSegment } from "../transport/tempoMap";

// Plan §6.7. MVP rules; the whole module is swappable (spec §17.3).

/** General MIDI percussion numbers, matching pya-gakki/banks/vivi_drums. */
export const GM = {
  kick: 36,
  snare: 38,
  clap: 39,
  floorTom: 41,
  closedHat: 42,
  openHat: 46,
  lowTom: 45,
  lowMidTom: 47,
  hiMidTom: 48,
  crash: 49,
  hiTom: 50,
} as const;

export interface DrumHit {
  note: number;
  vel: number;
}

/** Grid of the Auto groove: 8th notes, or 16ths when the beat is slow (≥ 0.6 s). */
export function autoDrumSubdivision(seg: TempoSegment): number {
  return seg.beatDur >= 0.6 ? 4 : 2;
}

const FILL_TOMS = [GM.hiTom, GM.hiMidTom, GM.lowMidTom, GM.lowTom];

function isFillBar(barIndex: number): boolean {
  return ((barIndex % 4) + 4) % 4 === 3;
}

function isPhraseStart(barIndex: number): boolean {
  return ((barIndex % 4) + 4) % 4 === 0;
}

function tomFor(ctx: MusicalContext): number {
  const quarter = Math.min(3, Math.floor((ctx.stepInBeat / ctx.subdivision) * FILL_TOMS.length));
  return FILL_TOMS[quarter];
}

/** Auto groove: evaluated on every step of the Auto grid. */
export function autoDrumHits(ctx: MusicalContext): DrumHit[] {
  const role = beatRole(ctx.beatIndex, ctx.meterBeats);
  const onBeat = ctx.stepInBeat === 0;

  if (isFillBar(ctx.barIndex) && role.isLastBeat && ctx.meterBeats >= 3) {
    return [{ note: tomFor(ctx), vel: 0.8 }];
  }
  if (!onBeat) {
    const half = ctx.stepInBeat * 2 === ctx.subdivision;
    return [{ note: GM.closedHat, vel: half ? 0.4 : 0.25 }];
  }
  if (role.isDownbeat) {
    return [
      { note: GM.kick, vel: 1.0 },
      isPhraseStart(ctx.barIndex) ? { note: GM.crash, vel: 0.7 } : { note: GM.closedHat, vel: 0.55 },
    ];
  }
  if (role.posInGroup === 0) return [{ note: GM.kick, vel: 0.85 }, { note: GM.closedHat, vel: 0.5 }];
  if (role.posInGroup === 1) return [{ note: GM.snare, vel: 0.9 }, { note: GM.closedHat, vel: 0.5 }];
  return [{ note: GM.closedHat, vel: 0.55 }];
}

/**
 * Manual tap (spec §8.1): the most characteristic hit for where the onset landed.
 * The user asks for "drums here"; the position decides kick / snare / hat / fill.
 */
export function contextualDrumHits(ctx: MusicalContext): DrumHit[] {
  const role = beatRole(ctx.beatIndex, ctx.meterBeats);
  if (role.isLastBeat && ctx.meterBeats >= 3) return [{ note: tomFor(ctx), vel: 0.95 }];
  if (ctx.stepInBeat !== 0) {
    const half = ctx.stepInBeat * 2 === ctx.subdivision;
    return [{ note: half ? GM.openHat : GM.closedHat, vel: 0.7 }];
  }
  if (role.isDownbeat) return [{ note: GM.kick, vel: 1.0 }, { note: GM.crash, vel: 0.75 }];
  if (role.posInGroup === 0) return [{ note: GM.kick, vel: 0.95 }];
  if (role.posInGroup === 1) return [{ note: GM.snare, vel: 1.0 }];
  return [{ note: GM.snare, vel: 0.65 }];
}
