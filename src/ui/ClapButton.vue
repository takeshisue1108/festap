<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { controller } from "../app/controller";
import { store } from "../state/store";

// Spec §6.2: the big clap starts and ends capture. It sits above the capture overlay (z-index),
// so during capture a press here is always PRESS_MAIN_CLAP (spec §6.3, §13).
const capturing = computed(() => store.clap.type === "capturing");
// A capture outside config/limits.ts keeps the old tempo; shake briefly so it doesn't look ignored.
const rejected = ref(false);
watch(
  () => store.captureRejectedAt,
  () => {
    rejected.value = true;
    window.setTimeout(() => (rejected.value = false), 600);
  },
);
const beatsSoFar = computed(() => (store.clap.type === "capturing" ? store.clap.inputCount + 1 : 0));
</script>

<template>
  <button
    class="big-clap"
    :class="{ capturing, rejected }"
    :aria-pressed="capturing"
    aria-label="Clap in tempo and meter"
    @pointerdown.stop="controller.mainClap($event)"
  >
    <span class="hand">👏</span>
    <span v-if="capturing" class="count">{{ beatsSoFar }}</span>
  </button>
</template>

<style scoped>
.big-clap {
  position: relative;
  z-index: 60;
  height: 100%;
  max-height: 96px;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.hand {
  font-size: clamp(44px, 15cqw, 76px);
  line-height: 1;
}
.capturing {
  background: var(--yellow);
  box-shadow: 0 0 0 4px var(--ink);
  animation: pulse 0.8s ease-in-out infinite;
}
.count {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 26px;
  padding: 2px 6px;
  border-radius: 14px;
  background: var(--ink);
  color: var(--paper);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.rejected {
  animation: shake 0.5s;
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 8px var(--ink);
  }
}
</style>
