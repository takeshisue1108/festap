import { reactive } from "vue";
import { DEFAULT_BPM, DEFAULT_METER } from "../config/limits";
import { IDLE, type ClapCaptureState } from "../core/clap/clapCaptureMachine";
import type { ScaleMode } from "../core/theory";

/** Spec §3 MusicState, plus UI-only flags. Single source of truth for the view. */
export interface MusicState {
  tonic: number; // 0-11, C=0
  scaleMode: ScaleMode;
  meterBeats: number;
  beatDurationSec: number;
  bpm: number;
  barDurationSec: number;
  drumAuto: boolean;
  bassAuto: boolean;
  clapCaptureMode: boolean;
  chordKey: number; // keyboard key that set the current chord: 0 = top ド … 7 = bottom ド
}

export interface UiState {
  clap: ClapCaptureState;
  audioStarted: boolean;
  loadProgress: number; // 0..1
  packId: string;
  tonicDragPitch: number | null; // continuous pitch while the tonic bar is held
  tonicBarPitch: number; // snapped bar position 0..12 (keeps the low and high C apart on the bar)
  captureRejectedAt: number; // performance.now() of the last rejected capture, 0 = never
}

/** Spec §17.1 (settled 2026-09-18): keys are ド レ ミ ファ ソ ラ シ ド from the top. */
export const KEYBOARD_KEYS = 8;
export function degreeOfKey(key: number): number {
  return key % 7;
}

export const store = reactive<MusicState & UiState>({
  tonic: 0,
  scaleMode: "major",
  meterBeats: DEFAULT_METER,
  beatDurationSec: 60 / DEFAULT_BPM,
  bpm: DEFAULT_BPM,
  barDurationSec: (60 / DEFAULT_BPM) * DEFAULT_METER,
  drumAuto: false,
  bassAuto: false,
  clapCaptureMode: false,
  chordKey: 0,
  clap: IDLE,
  audioStarted: false,
  loadProgress: 0,
  packId: import.meta.env.VITE_ASSET_PACK ?? "placeholder",
  tonicDragPitch: null,
  tonicBarPitch: 0,
  captureRejectedAt: 0,
});
