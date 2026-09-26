<script setup lang="ts">
import { computed } from "vue";
import { controller } from "../app/controller";
import { store } from "../state/store";
import { usePress } from "./usePress";

// Spec §8 / §9: the icon is the manual pad (quantized), the switch beside it is Auto.
const props = defineProps<{ part: "drum" | "bass" }>();

const isDrum = computed(() => props.part === "drum");
const auto = computed(() => (isDrum.value ? store.drumAuto : store.bassAuto));
const { pressed, sounding, down, up, flashAt } = usePress();

function trigger(e: PointerEvent): void {
  down();
  flashAt(isDrum.value ? controller.drum(e) : controller.bass(e));
}

function toggleAuto(): void {
  if (isDrum.value) controller.setDrumAuto(!store.drumAuto);
  else controller.setBassAuto(!store.bassAuto);
}
</script>

<template>
  <div class="part" :class="part">
    <button
      class="pad"
      :class="{ pressed, sounding }"
      :aria-label="isDrum ? 'Drums' : 'Bass'"
      @pointerdown="trigger"
      @pointerup="up"
      @pointercancel="up"
      @pointerleave="up"
    >
      {{ isDrum ? "🥁" : "🎸" }}
    </button>
    <button class="auto" :class="{ on: auto }" role="switch" :aria-checked="auto" @pointerdown="toggleAuto">
      <span class="knob" />
      <span class="label">{{ isDrum ? "Drums" : "Bass" }}<br />Auto</span>
    </button>
  </div>
</template>

<style scoped>
.part {
  display: flex;
  align-items: center;
  gap: 4%;
  min-width: 0;
}
.bass {
  flex-direction: row-reverse;
}
.pad {
  flex: 0 0 auto;
  height: 100%;
  max-height: 92px;
  aspect-ratio: 1;
  border-radius: 20%;
  font-size: clamp(40px, 13cqw, 66px);
  line-height: 1;
  transition: transform 0.05s;
}
.pad.pressed {
  transform: scale(0.92);
}
.pad.sounding {
  background: var(--yellow);
}
.auto {
  position: relative;
  flex: 1 1 auto;
  height: 66%;
  max-height: 70px;
  max-width: 160px;
  border-radius: 999px;
  border: 4px solid var(--yellow);
  background: var(--paper);
  transition: background 0.12s;
}
.auto.on {
  background: var(--yellow);
}
.knob {
  position: absolute;
  top: 6%;
  left: 3%;
  height: 88%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--paper);
  box-shadow: inset 0 0 0 3px var(--yellow);
}
.auto.on .knob {
  left: auto;
  right: 3%;
  box-shadow: none;
}
.label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: clamp(12px, 3.8cqw, 20px);
  line-height: 1.15;
  padding-left: 34%;
}
.auto.on .label {
  padding: 0 34% 0 0;
}
</style>
