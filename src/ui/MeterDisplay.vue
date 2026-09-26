<script setup lang="ts">
import { computed } from "vue";
import { meterGrouping } from "../core/display/meterGrouping";
import { store } from "../state/store";

// Spec §7 + §11: BPM as an integer, beats as small claps (big clap = beat 1 is the button beside this).
const glyphs = computed(() => meterGrouping(store.meterBeats));
const bpm = computed(() => Math.round(store.bpm));
// Shrink long numbers (spec allows up to MAX_BPM) so they never run into the big clap.
const bpmScale = computed(() => Math.min(1, 3 / Math.max(3, String(bpm.value).length)));
</script>

<template>
  <div class="meter" :aria-label="`${bpm} BPM, ${store.meterBeats} beats per bar`">
    <div class="bpm"><small>BPM</small><span :style="{ fontSize: `calc(${bpmScale} * clamp(26px, 9cqw, 48px))` }">{{ bpm }}</span></div>
    <div class="claps">
      <span v-for="(icon, i) in glyphs.small" :key="i" class="clap">
        👏<b v-if="icon.labelled">{{ icon.count }}</b>
      </span>
    </div>
  </div>
</template>

<style scoped>
.meter {
  display: grid;
  grid-template-rows: auto auto;
  align-content: center;
  justify-items: end;
  min-width: 0;
}
.bpm {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.bpm small {
  font-size: clamp(11px, 3.4cqw, 18px);
}
.bpm span {
  font-size: clamp(26px, 9cqw, 48px);
  line-height: 1;
}
.claps {
  display: flex;
  flex-wrap: nowrap;
  gap: 2px;
  font-size: clamp(15px, 5cqw, 26px);
  line-height: 1.1;
}
.clap {
  position: relative;
}
.clap b {
  position: absolute;
  right: -4px;
  bottom: -4px;
  min-width: 1.1em;
  padding: 0 2px;
  border-radius: 8px;
  background: var(--ink);
  color: var(--paper);
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}
</style>
