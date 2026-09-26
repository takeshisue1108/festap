<script setup lang="ts">
import { computed } from "vue";
import { controller } from "../app/controller";
import { store } from "../state/store";

// Spec §4: Major = yellow, Minor = the whole toggle turns purple. The tonic is kept.
const minor = computed(() => store.scaleMode === "minor");
</script>

<template>
  <div class="scale" :class="{ minor }" role="group" aria-label="Scale">
    <button class="cap major-cap" aria-label="Major" @pointerdown="controller.setScale('major')">M</button>
    <button
      class="pill"
      role="switch"
      :aria-checked="minor"
      @pointerdown="controller.setScale(minor ? 'major' : 'minor')"
    >
      <span class="knob" />
      <span class="label">{{ minor ? "Minor" : "Major" }}</span>
    </button>
    <button class="cap minor-cap" aria-label="Minor" @pointerdown="controller.setScale('minor')">m</button>
  </div>
</template>

<style scoped>
.scale {
  --on: var(--yellow);
  display: grid;
  grid-template-columns: 1fr 2.6fr 1fr;
  gap: 4%;
  align-items: center;
  height: 100%;
  max-height: 64px;
}
.scale.minor {
  --on: var(--purple);
}
.cap {
  aspect-ratio: 1;
  border-radius: 22%;
  font-size: clamp(22px, 7cqw, 38px);
  line-height: 1;
  display: grid;
  place-items: center;
}
.major-cap {
  background: var(--on);
}
.minor-cap {
  background: var(--purple);
}
.pill {
  position: relative;
  height: 78%;
  border-radius: 999px;
  background: var(--on);
  transition: background 0.12s;
}
.knob {
  position: absolute;
  top: 9%;
  left: 5%;
  height: 82%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--paper);
  transition: left 0.12s;
}
.minor .knob {
  left: auto;
  right: 5%;
}
.label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-left: 30%;
  font-size: clamp(14px, 4.4cqw, 24px);
}
.minor .label {
  padding: 0 30% 0 0;
}
</style>
