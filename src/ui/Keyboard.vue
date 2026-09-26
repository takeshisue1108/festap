<script setup lang="ts">
import { computed } from "vue";
import { controller } from "../app/controller";
import { chordName, diatonicTriad } from "../core/harmony/harmonyProvider";
import { degreeOfKey, KEYBOARD_KEYS, store } from "../state/store";

// Spec §17.1 (settled 2026-09-18): white keys are ド レ ミ ファ ソ ラ シ ド from the top. Pressing one sets
// the current chord to the triad on that degree of the current key (tonic C: ド → CM, レ → Dm).
// Black keys have no role yet; they catch the touch so it does not fall through to a white key.
const SOLFEGE = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ", "ド"];
// Boundaries (counted from the top) that carry a black key: ド|レ, レ|ミ, ファ|ソ, ソ|ラ, ラ|シ.
const BLACK_AT = [1, 2, 4, 5, 6];

const keys = computed(() =>
  Array.from({ length: KEYBOARD_KEYS }, (_, i) => ({
    i,
    solfege: SOLFEGE[i],
    chord: chordName(diatonicTriad(store.tonic, store.scaleMode, degreeOfKey(i))),
  })),
);
</script>

<template>
  <div class="keys" role="group" aria-label="Chord keyboard">
    <button
      v-for="k in keys"
      :key="k.i"
      class="white"
      :class="{ current: store.chordKey === k.i }"
      :aria-pressed="store.chordKey === k.i"
      :aria-label="`${k.solfege}: ${k.chord}`"
      @pointerdown="controller.setChordKey(k.i)"
    >
      <span v-if="store.chordKey === k.i" class="chord">{{ k.chord }}</span>
    </button>
    <div
      v-for="b in BLACK_AT"
      :key="`b${b}`"
      class="black"
      :style="{ top: `calc(${(b / KEYBOARD_KEYS) * 100}% - var(--black-h) / 2)` }"
      aria-hidden="true"
      @pointerdown.stop
    />
  </div>
</template>

<style scoped>
.keys {
  --black-h: calc(100% / 8 * 0.56);
  position: relative;
  height: 100%;
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  border: var(--kb-border) solid var(--ink);
  box-sizing: border-box;
}
.white {
  position: relative;
  border-bottom: 2px solid var(--ink);
  background: var(--paper);
  text-align: left;
}
.white:last-of-type {
  border-bottom: 0;
}
.white.current {
  background: var(--yellow);
}
.chord {
  position: absolute;
  left: 6%;
  bottom: 8%;
  font-size: clamp(11px, 3.6cqw, 18px);
  font-weight: 700;
}
.black {
  position: absolute;
  right: 0;
  width: 60%;
  height: var(--black-h);
  background: var(--ink);
}
</style>
