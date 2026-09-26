<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import { controller } from "../app/controller";
import { loadActivePack } from "../packs/activePack";
import { store } from "../state/store";

// Credits the active pack's sources require (e.g. "VOICEVOX:No.7"), shown on the start screen.
const credits = ref<string[]>([]);
onMounted(async () => (credits.value = (await loadActivePack()).credits ?? []));

// Clap capture overlay (spec §6.3): while capturing, any tap that is not the big clap is an input clap
// and nothing underneath fires. The big clap button sits above this layer.
const capturing = computed(() => store.clap.type === "capturing");
const beats = computed(() => (store.clap.type === "capturing" ? store.clap.inputCount + 1 : 0));

// Updates install in the background and apply only when tapped or on the next cold start (plan §3).
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });
</script>

<template>
  <div v-if="capturing" class="capture" @pointerdown.stop="controller.anywhereClap($event)">
    <div class="hint">
      <strong>{{ beats }}</strong>
      <span>tap anywhere · 👏 to finish</span>
    </div>
  </div>

  <div v-if="!store.audioStarted" class="veil start" @pointerdown.stop="controller.start()">
    <div class="start-card">
      <div class="logo">festap</div>
      <div>Tap to start</div>
      <div v-if="credits.length" class="credit">{{ credits.join(" / ") }}</div>
    </div>
  </div>

  <div class="veil rotate"><div>縦向きで使ってください<br />Please rotate to portrait</div></div>

  <button v-if="needRefresh" class="update" @pointerdown.stop="updateServiceWorker(true)">Update</button>
</template>

<style scoped>
.capture {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--accent) 30%, transparent);
  display: grid;
  place-items: center;
}
.hint {
  display: grid;
  justify-items: center;
  gap: 4px;
  pointer-events: none;
  opacity: 0.8;
}
.hint strong {
  font-size: 96px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.veil {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: var(--paper);
  text-align: center;
  font-size: 20px;
}
.start-card {
  display: grid;
  gap: 12px;
}
.logo {
  font-size: 44px;
  font-weight: 700;
  padding: 8px 20px;
  background: var(--accent);
  color: var(--on-accent);
  border-radius: 16px;
}
.credit {
  margin-top: 16px;
  font-size: 13px;
  opacity: 0.75;
}
.rotate {
  display: none;
  z-index: 200;
}
@media (orientation: landscape) and (max-height: 500px) {
  .rotate {
    display: grid;
  }
}
.update {
  position: fixed;
  /* Above the start veil (100), so a waiting update can be applied even if the start screen is stuck. */
  z-index: 150;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 6px);
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  font-size: 13px;
}
</style>
