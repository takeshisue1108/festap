<script setup lang="ts">
import { computed } from "vue";
import { controller } from "../app/controller";
import { store } from "../state/store";

// Spec §4: Major = the accent color (Festa's hair pink), Minor = the whole toggle turns blue. The tonic is kept.
// (Until 2026-09-27 these were yellow and purple; the owner found white text on them unreadable.)
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
  --on: var(--accent);
  --on-text: var(--on-accent);
  display: flex;
  align-items: center;
  height: 100%;
  max-height: 64px;
}
.scale.minor {
  --on: var(--minor);
  --on-text: var(--ink);
}
.pill {
  position: relative;
  width: 100%;
  height: 78%;
  border-radius: 999px;
  background: var(--on);
  color: var(--on-text);
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
