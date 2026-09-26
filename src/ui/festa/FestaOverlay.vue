<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { FESTA } from "../../config/festa";
import { loadActivePack } from "../../packs/activePack";
import { store } from "../../state/store";
import { festa } from "./festa";
import { loadFestaAssets } from "./festaAssets";
import { FestaTimeline } from "./festaMotion";
import { FestaRenderer, type BeatSource } from "./festaRenderer";

// Festa loads after the sounds (implementation plan §6.1), so she never delays the first sound.
// The beat comes in as a function from App.vue, so this layer never imports the music code.
const props = defineProps<{ beatAt?: BeatSource }>();
const canvas = ref<HTMLCanvasElement | null>(null);
let observer: ResizeObserver | null = null;
let started = false;

async function setup(): Promise<void> {
  if (started) return;
  started = true;
  const assets = await loadFestaAssets(await loadActivePack());
  const el = canvas.value;
  if (!assets || !el?.parentElement) return;
  const app = el.parentElement;
  const timeline = new FestaTimeline(FESTA.frames, FESTA.reducedMotionSequence, FESTA.idleDance);
  const renderer = new FestaRenderer(el, assets, timeline, props.beatAt);
  observer = new ResizeObserver(() => renderer.resize(app.clientWidth, app.clientHeight));
  observer.observe(app);
  renderer.resize(app.clientWidth, app.clientHeight);
  festa.attach(app, assets, renderer, timeline);
  renderer.kick(); // start the idle dance
}

onMounted(() => {
  if (!FESTA.enabled) return;
  watch(
    () => store.loadProgress >= 1,
    (done) => {
      if (done) void setup();
    },
    { immediate: true },
  );
});

onBeforeUnmount(() => {
  observer?.disconnect();
  festa.detach();
});
</script>

<template>
  <canvas ref="canvas" class="festa" aria-hidden="true" />
</template>

<style scoped>
/* z-index −1 inside the isolated .app: above the page background, below every control (spec §12.8). */
.festa {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}
</style>
