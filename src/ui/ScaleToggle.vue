<script setup lang="ts">
import { computed } from "vue";
import { controller } from "../app/controller";
import { store } from "../state/store";

// Spec §4: Major = yellow, Minor = the whole toggle turns purple. The tonic is kept.
const minor = computed(() => store.scaleMode === "minor");
</script>

<template>
  <div class="scale" :class="{ minor }" role="group" aria-label="Scale">
    <button
      class="pill"
      role="switch"
      :aria-checked="minor"
      aria-label="Major / Minor"
      @pointerdown="controller.setScale(minor ? 'major' : 'minor')"
    >
      <span class="knob" />
      <span class="label">{{ minor ? "Minor" : "Major" }}</span>
    </button>
  </div>
</template>

<style scoped>
.scale {
  --on: var(--yellow);
  display: flex;
  align-items: center;
  height: 100%;
  max-height: 64px;
}
.scale.minor {
  --on: var(--purple);
}
.pill {
  position: relative;
  width: 100%;
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
