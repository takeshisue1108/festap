<script setup lang="ts">
import { ref } from "vue";
import { controller } from "../app/controller";
import { usePress } from "./usePress";

// Spec §10 one-shots: immediate, never quantized, spam-safe.
const props = defineProps<{ id: "kyui" | "vivi"; art?: string }>();
const { pressed, down, up } = usePress();
const bump = ref(0);

function trigger(): void {
  down();
  controller.oneShot(props.id);
  bump.value++;
}
</script>

<template>
  <button
    class="oneshot"
    :class="[id, { pressed }]"
    :aria-label="id === 'kyui' ? 'キュウイ！' : 'ぐえっ！'"
    @pointerdown="trigger"
    @pointerup="up"
    @pointercancel="up"
    @pointerleave="up"
  >
    <img v-if="art" :src="art" alt="" draggable="false" />
    <span v-else-if="id === 'kyui'" class="cucumber">🥒</span>
    <!-- Placeholder face: a generic horned chibi drawn in SVG, not game art (plan §10). -->
    <svg v-else viewBox="0 0 100 80" aria-hidden="true">
      <path d="M18,30 L8,4 L32,20 Z M82,30 L92,4 L68,20 Z" fill="#555" />
      <ellipse cx="50" cy="48" rx="42" ry="30" fill="#fff" stroke="#bbb" stroke-width="2" />
      <path d="M12,40 C20,14 80,14 88,40 C70,30 30,30 12,40 Z" fill="#ddd" />
      <path d="M28,50 q6,-6 12,0 M60,50 q6,-6 12,0" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="26" cy="60" r="7" fill="#f7b6c2" />
      <circle cx="74" cy="60" r="7" fill="#f7b6c2" />
      <path d="M45,60 q5,8 10,0 z" fill="#e85a6b" />
    </svg>
    <span :key="bump" class="burst" :class="{ show: bump > 0 }">{{ id === "kyui" ? "キュウイ！" : "ぐえっ！" }}</span>
  </button>
</template>

<style scoped>
.oneshot {
  position: relative;
  height: 100%;
  width: 100%;
  border: 3px solid var(--ink);
  border-radius: 18px;
  overflow: hidden;
  background: var(--paper);
  display: grid;
  place-items: center;
  transition: transform 0.05s;
}
.pressed {
  transform: scale(0.94);
}
img,
svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.cucumber {
  font-size: clamp(40px, 14cqw, 72px);
  transform: rotate(-20deg);
}
.burst {
  position: absolute;
  left: 50%;
  top: 8%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-weight: 700;
  font-size: clamp(12px, 3.6cqw, 18px);
  opacity: 0;
  pointer-events: none;
}
.burst.show {
  animation: pop 0.45s ease-out forwards;
}
@keyframes pop {
  0% {
    opacity: 1;
    transform: translate(-50%, 6px) scale(0.8);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -10px) scale(1.1);
  }
}
</style>
