<script setup lang="ts">
import { controller } from "../app/controller";
import type { GesturePadSlot } from "../config/gestureMapping";
import ClapButton from "./ClapButton.vue";
import GesturePad from "./GesturePad.vue";
import Keyboard from "./Keyboard.vue";
import MeterDisplay from "./MeterDisplay.vue";
import OneShotPad from "./OneShotPad.vue";
import PartControl from "./PartControl.vue";
import ScaleToggle from "./ScaleToggle.vue";
import TonicBar from "./TonicBar.vue";
import Veils from "./Veils.vue";

// Layout after the concept sketch (plan §6.11); the sketch's own pixels are not used.
const slots: GesturePadSlot[] = [0, 1, 2];

// Any touch resumes audio if iOS suspended it (e.g. after backgrounding).
function wake(): void {
  void controller.start();
}
</script>

<template>
  <div class="app" @pointerdown.capture="wake">
    <header class="top">
      <ScaleToggle class="scale" />
      <MeterDisplay class="meter" />
      <ClapButton class="clap" />
    </header>
    <section class="parts">
      <PartControl part="drum" />
      <PartControl part="bass" />
    </section>
    <main class="stage">
      <Keyboard />
      <TonicBar />
      <div class="right">
        <GesturePad v-for="s in slots" :key="s" :slot="s" />
        <div class="lowerRight">
          <GesturePad :slot="3" />
          <OneShotPad />
        </div>
      </div>
    </main>
    <Veils />
  </div>
</template>

<style scoped>
.app {
  box-sizing: border-box;
  /* Phone-shaped column; on a desktop browser the app stays portrait in the middle. */
  width: 100%;
  max-width: calc(100dvh * 0.56);
  container-type: inline-size;
  height: 100dvh;
  padding: calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + var(--gutter))
    calc(env(safe-area-inset-bottom) + 12px) calc(env(safe-area-inset-left) + var(--gutter));
  display: grid;
  grid-template-rows: 13fr 12fr 75fr;
  gap: 2.2dvh;
  overflow: hidden;
}
.top {
  display: grid;
  grid-template-columns: 50% 1fr auto;
  align-items: center;
  gap: 3%;
  min-height: 0;
}
.parts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6%;
  min-height: 0;
}
.stage {
  display: grid;
  grid-template-columns: 30% 13% 1fr;
  gap: 2.5%;
  min-height: 0;
}
.right {
  display: grid;
  grid-template-rows: 1fr 1fr 1fr 1.45fr;
  gap: 3.2%;
  min-height: 0;
}
.lowerRight {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 3.2%;
  min-height: 0;
}
</style>
