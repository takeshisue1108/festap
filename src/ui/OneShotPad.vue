<script setup lang="ts">
import { ref } from "vue";
import { controller } from "../app/controller";
import { usePress } from "./usePress";

// Spec §10 one-shot: immediate, never quantized, spam-safe. Vivi's hit reaction: "ぐえっ！".
const { pressed, down, up } = usePress();
const bump = ref(0);

function trigger(): void {
  down();
  controller.playVivi();
  bump.value++;
}
</script>

<template>
  <button class="oneshot" :class="{ pressed }" aria-label="ぐえっ！" @pointerdown="trigger" @pointerup="up" @pointercancel="up" @pointerleave="up">
    <!-- Vivi's face, traced from her in-game portrait into original line art (same technique as コミー_正面_首から上.svg). -->
    <svg viewBox="0 0 100 80" aria-hidden="true">
      <path d="M32,16 C29,7 32,1 37,2 C41,4 41,10 38,18 Z" fill="#3a3a3a" />
      <path d="M68,16 C71,7 68,1 63,2 C59,4 59,10 62,18 Z" fill="#3a3a3a" />
      <path
        d="M14,34 C10,18 26,6 50,6 C74,6 90,18 86,34 C84,44 80,50 80,60 L72,52 C68,58 66,64 66,70 L58,58 C55,64 52,66 50,66 C48,66 45,64 42,58 L34,70 C34,64 32,58 28,52 L20,60 C20,50 16,44 14,34 Z"
        fill="#e9e7e5"
      />
      <ellipse cx="50" cy="46" rx="34" ry="27" fill="#fdf0ee" />
      <path d="M20,58 C24,50 30,48 34,52 M80,58 C76,50 70,48 66,52" fill="none" stroke="#e9e7e5" stroke-width="6" stroke-linecap="round" />
      <circle cx="30" cy="58" r="7" fill="#f4a6a6" />
      <circle cx="70" cy="58" r="7" fill="#f4a6a6" />
      <path
        d="M24,55 L22,62 M28,54 L27,62 M32,55 L32,62 M76,55 L78,62 M72,54 L73,62 M68,55 L68,62"
        stroke="#e08888"
        stroke-width="1.2"
        stroke-linecap="round"
      />
      <path d="M27,38 q9,-8 18,-1" fill="none" stroke="#4a3634" stroke-width="2.4" stroke-linecap="round" />
      <path d="M55,37 q9,-9 19,0" fill="none" stroke="#4a3634" stroke-width="2.4" stroke-linecap="round" />
      <ellipse cx="36" cy="46" rx="7" ry="8" fill="#e0453f" />
      <ellipse cx="64" cy="46" rx="7" ry="8" fill="#e0453f" />
      <circle cx="33.5" cy="42.5" r="1.8" fill="#fff" />
      <circle cx="61.5" cy="42.5" r="1.8" fill="#fff" />
      <ellipse cx="50" cy="63" rx="9" ry="6.5" fill="#c23b3b" />
      <path d="M44,64 q6,7 12,0 z" fill="#e2696f" />
    </svg>
    <span :key="bump" class="burst" :class="{ show: bump > 0 }">ぐえっ！</span>
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
  background: var(--fill);
  display: grid;
  place-items: center;
  transition: transform 0.05s;
}
.pressed {
  transform: scale(0.94);
}
svg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
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
