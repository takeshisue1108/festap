// Safety bounds for clap-captured rhythm (spec §14.1). Deliberately wide: the spec prefers
// "allow strange input" over protective limits. Results outside these are discarded, not clamped.
export const MIN_BPM = 0.1; // a 10-minute beat
export const MAX_BPM = 2000;
export const MIN_METER = 2; // N = inputCount + 2 can never be smaller
export const MAX_METER = 10000;

// Before any clap capture (plan §11, #3): matches the concept sketch.
export const DEFAULT_BPM = 120;
export const DEFAULT_METER = 4;
