<script setup lang="ts">
import { computed, ref } from "vue";
import { controller } from "../app/controller";
import { keyPosOfPitch, pitchAtKeyPos } from "../core/display/keyboardAxis";
import { pitchClassName } from "../core/theory";
import { KEYBOARD_KEYS, store } from "../state/store";

// The bar reads like the keyboard beside it (settled 2026-09-18): C level with the top key, pitch rising
// downward, naturals at white-key centres, sharps at the black keys, the octave C at the bottom key.
// `.axis` has the same inset as the keyboard's border, so the two line up exactly.
const axis = ref<HTMLElement | null>(null);
const dragging = ref(false);

const pitch = computed(() => store.tonicDragPitch ?? store.tonicBarPitch);
const knobTop = computed(() => `${((keyPosOfPitch(pitch.value) + 0.5) / KEYBOARD_KEYS) * 100}%`);
const label = computed(() => pitchClassName(pitch.value));

function pitchAt(e: PointerEvent): number {
  const r = axis.value!.getBoundingClientRect();
  return pitchAtKeyPos(((e.clientY - r.top) / r.height) * KEYBOARD_KEYS - 0.5);
}

function down(e: PointerEvent): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  dragging.value = true;
  controller.tonicDragStart(pitchAt(e));
}

function move(e: PointerEvent): void {
  if (dragging.value) controller.tonicDragMove(pitchAt(e));
}

function up(e: PointerEvent): void {
  if (!dragging.value) return;
  dragging.value = false;
  controller.tonicDragEnd(pitchAt(e));
}
</script>

<template>
  <div
    class="tonic"
    role="slider"
    aria-label="Tonic"
    :aria-valuetext="label"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <div class="rail" />
    <div ref="axis" class="axis">
      <div class="knob" :class="{ dragging }" :style="{ top: knobTop }">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.tonic {
  position: relative;
  height: 100%;
  touch-action: none;
}
.rail {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 28%;
  max-width: 28px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: var(--green-track);
}
.knob {
  position: absolute;
  left: 50%;
  width: 90%;
  max-width: 64px;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--green-knob);
  color: var(--paper);
  display: grid;
  place-items: center;
  font-size: clamp(14px, 4.5cqw, 22px);
  font-weight: 600;
  transition: top 0.12s ease-out;
}
.axis {
  position: absolute;
  inset: var(--kb-border) 0;
  pointer-events: none;
}
.knob.dragging {
  transition: none;
}
</style>
