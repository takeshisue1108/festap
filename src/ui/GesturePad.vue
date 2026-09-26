<script setup lang="ts">
import { computed, ref } from "vue";
import { controller } from "../app/controller";
import { gestureGlyph, gestureMapping, type GesturePadSlot } from "../config/gestureMapping";
import { GESTURE_HOLD_THRESHOLD_MS } from "../config/quantize";
import { usePress } from "./usePress";

// Spec §10: an instrumental one-beat gesture, quantized to the next musical onset.
// Spec update 2026-09-26: a tap plays once (unchanged); holding long enough latches it into
// repeating every beat, even after release, until the pad is tapped again to cut it off.
const props = defineProps<{ slot: GesturePadSlot }>();
const glyph = computed(() => gestureGlyph[gestureMapping[props.slot].pattern]);
const { pressed, sounding, down, up, flashAt } = usePress();
const holding = ref(false);
let holdTimer: number | null = null;

function clearHoldTimer(): void {
  if (holdTimer !== null) {
    window.clearTimeout(holdTimer);
    holdTimer = null;
  }
}

function trigger(e: PointerEvent): void {
  down();
  if (holding.value) {
    holding.value = false;
    controller.setGestureHold(props.slot, false);
    return;
  }
  flashAt(controller.gesture(props.slot, e));
  holdTimer = window.setTimeout(() => {
    holdTimer = null;
    holding.value = true;
    controller.setGestureHold(props.slot, true);
  }, GESTURE_HOLD_THRESHOLD_MS);
}

function release(): void {
  up();
  clearHoldTimer();
}

// Pictograms after the sketch's three waveforms (drawn fresh; the sketch itself is not shipped).
const zigzag = "M-10,54 L20,6 L55,54 L90,6 L125,54 L160,6 L195,54 L230,6";
const sheaf = Array.from({ length: 9 }, (_, i) => {
  const dx = i * 3;
  const dy = i * 2.2;
  return [0, 70, 140]
    .map((x0) => `M${x0 + dx},58 C${x0 + 25 + dx},${50 - dy} ${x0 + 38 + dx},${2 + dy} ${x0 + 48 + dx},${6 + dy} S${x0 + 58 + dx},58 ${x0 + 70},58`)
    .join(" ");
});
const tangle = [
  "M-5,40 C40,-10 80,70 130,20 S190,10 210,50",
  "M10,62 C30,10 70,0 100,40 S150,70 205,5",
  "M-5,15 C50,30 60,60 110,55 S170,-5 205,30",
  "M40,-5 C55,40 80,70 95,65",
  "M120,-5 C140,30 150,50 170,65",
  "M165,-5 C150,20 185,45 200,62",
];
const spiral = "M-10,30 Q10,0 30,30 Q50,60 70,30 Q90,0 110,30 Q130,60 150,30 Q170,0 190,30 Q210,60 230,30";
</script>

<template>
  <button
    class="gesture"
    :class="{ pressed, sounding, holding }"
    :aria-label="`Gesture ${slot + 1}: ${gestureMapping[slot].pattern}`"
    @pointerdown="trigger"
    @pointerup="release"
    @pointercancel="release"
    @pointerleave="release"
  >
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
      <path v-if="glyph === 'zigzag'" :d="zigzag" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="miter" />
      <template v-else-if="glyph === 'sheaf'">
        <path v-for="(d, i) in sheaf" :key="i" :d="d" fill="none" stroke="currentColor" stroke-width="1.4" />
      </template>
      <template v-else-if="glyph === 'tangle'">
        <path v-for="(d, i) in tangle" :key="i" :d="d" fill="none" stroke="currentColor" stroke-width="4" />
      </template>
      <path v-else :d="spiral" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
    </svg>
  </button>
</template>

<style scoped>
.gesture {
  position: relative;
  width: 100%;
  height: 100%;
  border: 3px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
  background: var(--fill);
  transition: transform 0.05s;
}
svg {
  position: absolute;
  inset: 4px 10px;
  width: calc(100% - 20px);
  height: calc(100% - 8px);
}
.pressed {
  transform: scale(0.97);
}
.sounding {
  background: var(--accent);
  color: var(--on-accent);
}
.holding {
  box-shadow: inset 0 0 0 4px var(--accent);
}
</style>
